import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { enviarMensagemConversao, normalizarTelefoneWhatsapp } from "./whatsapp";

const TIPO_MENSAGEM_CONVERSAO = "lead_conversion_confirmation";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Dispara a mensagem de boas-vindas por WhatsApp quando um Lead vira
 * Cliente. Chamado pelo PATCH de /api/sync/leads depois que a conversão já
 * foi confirmada no banco (lead com status "convertido", cliente já
 * existe) — por isso qualquer falha aqui fica só registrada em
 * `whatsapp_mensagens`, nunca desfaz a conversão nem impede a criação do
 * cliente.
 *
 * A linha em `whatsapp_mensagens` é criada de forma atômica (INSERT com
 * ON CONFLICT DO NOTHING na constraint única lead_id+tipo_mensagem) antes
 * de chamar a Meta, para garantir no máximo um envio por conversão mesmo
 * se este disparo acontecer mais de uma vez para o mesmo lead.
 */
export async function dispararMensagemConversaoWhatsapp(lead: {
  id: string;
  nome: string;
  telefone: string | null;
  cliente_id: string | null;
}): Promise<void> {
  const supabase = getSupabase();

  try {
    const { data: linha, error: erroInsercao } = await supabase
      .from("whatsapp_mensagens")
      .insert({
        id: randomUUID(),
        lead_id: lead.id,
        cliente_id: lead.cliente_id,
        telefone: lead.telefone ?? "",
        tipo_mensagem: TIPO_MENSAGEM_CONVERSAO,
        status: "pendente",
      })
      .select()
      .single();

    if (erroInsercao) {
      if (erroInsercao.code === "23505") {
        console.log(`Lead ${lead.id}: mensagem de conversão já registrada, envio ignorado.`);
        return;
      }
      console.error(
        `Lead ${lead.id}: falha ao registrar tentativa de envio do WhatsApp.`,
        erroInsercao.message,
      );
      return;
    }

    console.log(`Lead ${lead.id} convertido para Cliente. WhatsApp notification initiated.`);

    const telefoneNormalizado = normalizarTelefoneWhatsapp(lead.telefone);
    if (!telefoneNormalizado) {
      console.error(`Lead ${lead.id}: WhatsApp notification failed. Reason: TELEFONE_INVALIDO`);
      await supabase
        .from("whatsapp_mensagens")
        .update({ status: "erro", erro: "TELEFONE_INVALIDO" })
        .eq("id", linha.id);
      return;
    }

    const resultado = await enviarMensagemConversao({
      telefoneE164: telefoneNormalizado,
      nome: lead.nome,
    });

    if (resultado.sucesso) {
      console.log(
        `Lead ${lead.id}: WhatsApp message sent successfully. WhatsApp message ID: ${resultado.mensagemId}`,
      );
      await supabase
        .from("whatsapp_mensagens")
        .update({
          status: "enviado",
          whatsapp_message_id: resultado.mensagemId ?? null,
          telefone: telefoneNormalizado,
          enviado_em: new Date().toISOString(),
        })
        .eq("id", linha.id);
    } else {
      console.error(`Lead ${lead.id}: WhatsApp notification failed. Reason: ${resultado.erro}`);
      await supabase
        .from("whatsapp_mensagens")
        .update({ status: "erro", erro: resultado.erro ?? "ERRO_DESCONHECIDO", telefone: telefoneNormalizado })
        .eq("id", linha.id);
    }
  } catch (erro) {
    console.error(`Lead ${lead.id}: erro inesperado ao processar notificação WhatsApp.`, erro);
  }
}
