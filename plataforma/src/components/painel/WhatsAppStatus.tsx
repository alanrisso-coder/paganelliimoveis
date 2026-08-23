"use client";

import { useEffect, useState } from "react";
import { Modal, Selo } from "@/components/ui";
import { obterMensagensWhatsappPorCliente, type DbWhatsappMensagem } from "@/lib/supabase-client";
import { formatarDataHora, formatarTelefone } from "@/lib/format";

const rotuloStatus: Record<DbWhatsappMensagem["status"], string> = {
  pendente: "Pendente",
  enviado: "Enviado",
  erro: "Erro",
};

const tomStatus: Record<DbWhatsappMensagem["status"], "dourado" | "verde" | "erro"> = {
  pendente: "dourado",
  enviado: "verde",
  erro: "erro",
};

/**
 * Indicador do envio automático de WhatsApp na conversão de Lead em
 * Cliente (ver src/lib/whatsapp-conversao.ts). Some da tela quando o
 * cliente não veio de uma conversão de lead — não há nada para mostrar.
 */
export function WhatsAppStatus({ clienteId }: { clienteId: string }) {
  const [mensagem, setMensagem] = useState<DbWhatsappMensagem | null | undefined>(undefined);
  const [modalAberto, setModalAberto] = useState(false);

  useEffect(() => {
    let ativo = true;
    obterMensagensWhatsappPorCliente(clienteId).then((lista) => {
      if (ativo) setMensagem(lista[0] ?? null);
    });
    return () => {
      ativo = false;
    };
  }, [clienteId]);

  if (!mensagem) return null;

  return (
    <div>
      <dt className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
        Notificação automática
      </dt>
      <dd className="mt-0.5">
        <button
          type="button"
          onClick={() => setModalAberto(true)}
          className="inline-flex items-center gap-1.5 hover:opacity-80"
        >
          <Selo tom={tomStatus[mensagem.status]}>WhatsApp · {rotuloStatus[mensagem.status]}</Selo>
        </button>
      </dd>

      <Modal
        aberto={modalAberto}
        aoFechar={() => setModalAberto(false)}
        titulo="Mensagem de WhatsApp"
        descricao="Notificação automática enviada na conversão do lead em cliente."
      >
        <dl className="space-y-3 text-sm">
          {[
            { rotulo: "Status", valor: rotuloStatus[mensagem.status] },
            { rotulo: "Número utilizado", valor: formatarTelefone(mensagem.telefone) },
            {
              rotulo: "Data/hora do envio",
              valor: mensagem.enviado_em ? formatarDataHora(mensagem.enviado_em) : "—",
            },
            { rotulo: "ID da mensagem na Meta", valor: mensagem.whatsapp_message_id ?? "—" },
            ...(mensagem.status === "erro"
              ? [{ rotulo: "Mensagem de erro", valor: mensagem.erro ?? "Erro não especificado." }]
              : []),
          ].map((linha) => (
            <div key={linha.rotulo} className="border-b border-linha pb-2.5 last:border-0 last:pb-0">
              <dt className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                {linha.rotulo}
              </dt>
              <dd className="mt-0.5 text-grafite-900">{linha.valor}</dd>
            </div>
          ))}
        </dl>
      </Modal>
    </div>
  );
}
