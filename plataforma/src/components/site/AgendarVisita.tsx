"use client";

import { useState } from "react";
import { Botao, Campo, CampoSelecao, CampoTexto } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import { useDados } from "@/lib/store";
import { paraISO } from "@/lib/format";
import type { Imovel } from "@/lib/types";

const horarios = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

/**
 * Agendamento pedido pelo site.
 *
 * Gera três registros de uma vez: o lead no CRM, o cliente correspondente e a
 * visita — que nasce pendente de confirmação da equipe, conforme a regra do
 * produto.
 */
export function AgendarVisita({
  imovel,
  anuncioId,
  aoConcluir,
}: {
  imovel: Imovel;
  anuncioId: string;
  aoConcluir: () => void;
}) {
  const { criarLead, converterLeadEmCliente, criarVisita, registrarInteracao } = useDados();
  const { avisar } = useAviso();
  const [enviando, setEnviando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);

  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    data: paraISO(amanha),
    hora: "10:00",
    modalidade: "presencial" as "presencial" | "virtual",
    observacao: "",
  });

  function validar() {
    const novos: Record<string, string> = {};
    if (form.nome.trim().length < 3) novos.nome = "Informe seu nome completo.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(form.email)) novos.email = "Informe um e-mail válido.";
    if (form.telefone.replace(/\D/g, "").length < 10) novos.telefone = "Informe um telefone com DDD.";
    if (form.data < paraISO(new Date())) novos.data = "Escolha uma data futura.";
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;

    setEnviando(true);
    await new Promise((r) => setTimeout(r, 550));

    const mensagem =
      form.observacao.trim() ||
      `Solicitação de visita ${form.modalidade} em ${form.data} às ${form.hora}.`;

    const lead = criarLead({
      nome: form.nome.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim(),
      mensagem,
      canal: "agendamento",
      imovelId: imovel.id,
      anuncioId,
    });

    const cliente = converterLeadEmCliente(lead.id, imovel.corretorId);
    if (cliente) {
      const [h, min] = form.hora.split(":").map(Number);
      const fim = `${String(h + 1).padStart(2, "0")}:${String(min).padStart(2, "0")}`;

      criarVisita(
        {
          clienteId: cliente.id,
          imovelId: imovel.id,
          corretorId: imovel.corretorId,
          data: form.data,
          horaInicio: form.hora,
          horaFim: fim,
          modalidade: form.modalidade,
          pontoEncontro:
            form.modalidade === "virtual"
              ? "Videochamada — link enviado por WhatsApp"
              : `${imovel.endereco.logradouro}, ${imovel.endereco.numero} — ${imovel.endereco.bairro}`,
        },
        "site",
      );

      registrarInteracao(cliente.id, {
        tipo: "visita",
        titulo: `Visita solicitada pelo site — ${imovel.titulo}`,
        detalhe: mensagem,
        data: new Date().toISOString(),
        autorId: imovel.corretorId,
      });
    }

    setEnviando(false);
    avisar("Visita solicitada. Nossa equipe confirma o horário em instantes.");
    aoConcluir();
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <Campo
        rotulo="Nome completo"
        required
        autoComplete="name"
        value={form.nome}
        erro={erros.nome}
        onChange={(e) => setForm({ ...form, nome: e.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="E-mail"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          erro={erros.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Campo
          rotulo="Telefone / WhatsApp"
          type="tel"
          required
          autoComplete="tel"
          placeholder="(48) 99999-0000"
          value={form.telefone}
          erro={erros.telefone}
          onChange={(e) => setForm({ ...form, telefone: e.target.value })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          rotulo="Data"
          type="date"
          required
          min={paraISO(new Date())}
          value={form.data}
          erro={erros.data}
          onChange={(e) => setForm({ ...form, data: e.target.value })}
        />
        <CampoSelecao
          rotulo="Horário"
          value={form.hora}
          onChange={(e) => setForm({ ...form, hora: e.target.value })}
          opcoes={horarios.map((h) => ({ valor: h, texto: h }))}
        />
        <CampoSelecao
          rotulo="Modalidade"
          value={form.modalidade}
          onChange={(e) =>
            setForm({ ...form, modalidade: e.target.value as "presencial" | "virtual" })
          }
          opcoes={[
            { valor: "presencial", texto: "Presencial" },
            { valor: "virtual", texto: "Virtual" },
          ]}
        />
      </div>

      <CampoTexto
        rotulo="Alguma observação?"
        rows={3}
        placeholder="Ex.: prefiro o período da manhã, vou com arquiteto, tenho pet…"
        value={form.observacao}
        onChange={(e) => setForm({ ...form, observacao: e.target.value })}
      />

      <div className="rounded-sm bg-areia-100 p-3.5 text-xs leading-relaxed text-grafite-500">
        O horário escolhido é uma preferência. Confirmamos a disponibilidade do corretor e
        retornamos por WhatsApp em até 2 horas úteis.
      </div>

      <Botao type="submit" tamanho="lg" disabled={enviando} className="w-full">
        {enviando ? "Enviando…" : "Solicitar visita"}
      </Botao>
    </form>
  );
}
