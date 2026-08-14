"use client";

import { useState } from "react";
import { Botao, Campo, CampoTexto } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import { useDados } from "@/lib/store";
import type { CanalLead } from "@/lib/types";

interface Props {
  canal: CanalLead;
  imovelId?: string;
  anuncioId?: string;
  mensagemInicial?: string;
  rotuloEnvio?: string;
  aoEnviar?: () => void;
  compacto?: boolean;
}

/**
 * Único ponto de entrada dos formulários públicos. Toda submissão cria um lead
 * no CRM e dispara notificação interna — ver `criarLead` em `lib/store.tsx`.
 */
export function FormularioLead({
  canal,
  imovelId,
  anuncioId,
  mensagemInicial = "",
  rotuloEnvio = "Enviar solicitação",
  aoEnviar,
  compacto = false,
}: Props) {
  const { criarLead } = useDados();
  const { avisar } = useAviso();
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    nome: "",
    email: "",
    telefone: "",
    mensagem: mensagemInicial,
  });

  function validar() {
    const novos: Record<string, string> = {};
    if (form.nome.trim().length < 3) novos.nome = "Informe seu nome completo.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(form.email)) novos.email = "Informe um e-mail válido.";
    if (form.telefone.replace(/\D/g, "").length < 10) novos.telefone = "Informe um telefone com DDD.";
    setErros(novos);
    return Object.keys(novos).length === 0;
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!validar()) return;

    setEnviando(true);
    // Latência simulada: mantém o estado de carregamento visível e realista.
    await new Promise((r) => setTimeout(r, 550));

    criarLead({
      nome: form.nome.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim(),
      mensagem: form.mensagem.trim() || "Contato enviado pelo site institucional.",
      canal,
      imovelId,
      anuncioId,
    });

    setEnviando(false);
    setEnviado(true);
    avisar("Solicitação enviada e registrada no CRM da Paganelli.");
    aoEnviar?.();
  }

  if (enviado) {
    return (
      <div className="rounded-sm border border-verde-100 bg-verde-50 p-6 text-center">
        <p className="font-display text-xl text-verde-900">Recebemos o seu contato.</p>
        <p className="mt-2 text-sm leading-relaxed text-grafite-500">
          Um especialista da Paganelli responde em até 2 horas úteis. Sua solicitação já está
          registrada no nosso atendimento.
        </p>
        <Botao
          variante="contorno"
          tamanho="sm"
          className="mt-5"
          onClick={() => {
            setEnviado(false);
            setForm({ nome: "", email: "", telefone: "", mensagem: mensagemInicial });
          }}
        >
          Enviar outra solicitação
        </Botao>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} noValidate className="space-y-4">
      <div className={compacto ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
        <Campo
          rotulo="Nome completo"
          required
          autoComplete="name"
          value={form.nome}
          erro={erros.nome}
          onChange={(e) => setForm({ ...form, nome: e.target.value })}
          className={compacto ? "" : "sm:col-span-2"}
        />
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

      <CampoTexto
        rotulo="Como podemos ajudar?"
        rows={compacto ? 3 : 4}
        value={form.mensagem}
        onChange={(e) => setForm({ ...form, mensagem: e.target.value })}
      />

      <Botao type="submit" tamanho="lg" disabled={enviando} className="w-full">
        {enviando ? "Enviando…" : rotuloEnvio}
      </Botao>

      <p className="text-xs leading-relaxed text-grafite-400">
        Ao enviar, você concorda com o tratamento dos seus dados conforme a nossa{" "}
        <a href="/privacidade" className="underline underline-offset-2 hover:text-verde-800">
          política de privacidade
        </a>
        .
      </p>
    </form>
  );
}
