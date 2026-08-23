/**
 * Cliente da WhatsApp Business Platform (Cloud API) da Meta.
 *
 * Só roda no servidor — nunca importar este arquivo de um componente
 * client. O token de acesso (`WHATSAPP_ACCESS_TOKEN`) vive só em variável
 * de ambiente e nunca deve chegar ao navegador.
 *
 * Mensagens iniciadas pela empresa (fora da janela de 24h de atendimento)
 * só podem usar um WhatsApp Message Template aprovado pela Meta — por isso
 * o envio abaixo sempre usa `type: "template"`, nunca texto livre.
 */

const VERSAO_PADRAO = "v21.0";

export interface ResultadoEnvioWhatsapp {
  sucesso: boolean;
  mensagemId?: string;
  erro?: string;
}

/**
 * Normaliza um telefone brasileiro para o formato exigido pela Cloud API
 * (E.164 sem o "+": código do país + DDD + número). Retorna `null` quando
 * não é possível reconhecer um número válido — o cadastro de telefone do
 * lead não tem garantia de formato, então nunca assumimos que está certo.
 */
export function normalizarTelefoneWhatsapp(telefoneBruto: string | null | undefined): string | null {
  if (!telefoneBruto) return null;
  const digitos = telefoneBruto.replace(/\D/g, "");
  if (!digitos) return null;

  // Já vem com código do país: 55 + DDD (2) + número (8 ou 9 dígitos).
  if (digitos.startsWith("55") && (digitos.length === 12 || digitos.length === 13)) {
    return digitos;
  }
  // DDD + número, sem código do país.
  if (digitos.length === 10 || digitos.length === 11) {
    return `55${digitos}`;
  }
  return null;
}

function credenciaisConfiguradas() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) return null;
  return {
    token,
    phoneNumberId,
    versao: process.env.WHATSAPP_API_VERSION || VERSAO_PADRAO,
  };
}

/**
 * Envia o template de confirmação de conversão de lead. Usa
 * `lead_conversion_confirmation` (com o nome como variável {{1}}) quando o
 * nome está disponível, e `lead_conversion_confirmation_sem_nome` (sem
 * variáveis) caso contrário — os nomes dos templates são configuráveis via
 * env para o caso de precisarem ser recriados/reaprovados na Meta.
 */
export async function enviarMensagemConversao(params: {
  telefoneE164: string;
  nome: string;
}): Promise<ResultadoEnvioWhatsapp> {
  const credenciais = credenciaisConfiguradas();
  if (!credenciais) {
    return { sucesso: false, erro: "CREDENCIAIS_NAO_CONFIGURADAS" };
  }

  const nomeLimpo = params.nome?.trim();
  const template = nomeLimpo
    ? process.env.WHATSAPP_TEMPLATE_NAME || "lead_conversion_confirmation"
    : process.env.WHATSAPP_TEMPLATE_NAME_SEM_NOME || "lead_conversion_confirmation_sem_nome";
  const idioma = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR";

  const corpoRequisicao = {
    messaging_product: "whatsapp",
    to: params.telefoneE164,
    type: "template",
    template: {
      name: template,
      language: { code: idioma },
      ...(nomeLimpo
        ? { components: [{ type: "body", parameters: [{ type: "text", text: nomeLimpo }] }] }
        : {}),
    },
  };

  try {
    const resposta = await fetch(
      `https://graph.facebook.com/${credenciais.versao}/${credenciais.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credenciais.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpoRequisicao),
      },
    );

    const corpo = await resposta.json().catch(() => null);

    if (!resposta.ok) {
      const motivo =
        corpo?.error?.message || corpo?.error?.error_user_msg || `HTTP_${resposta.status}`;
      return { sucesso: false, erro: motivo };
    }

    const mensagemId = corpo?.messages?.[0]?.id;
    return { sucesso: true, mensagemId };
  } catch (erro) {
    return { sucesso: false, erro: erro instanceof Error ? erro.message : "ERRO_DESCONHECIDO" };
  }
}
