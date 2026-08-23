import { NextResponse, after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { criarRotaCrud } from "@/lib/rota-crud";
import { exigirPermissao } from "@/lib/sessao-servidor";
import { lerCorpoJson } from "@/lib/http";
import { dispararMensagemConversaoWhatsapp } from "@/lib/whatsapp-conversao";

/**
 * Leads do site.
 *
 * A criação é pública por definição — é o formulário de contato e o
 * agendamento de visita. O visitante informa como quer ser contatado e sobre
 * qual imóvel; a quem o lead é atribuído e em que etapa do funil ele entra são
 * decisões do painel, e por isso `corretor_id`, `cliente_id` e `status` não
 * entram pela porta pública.
 *
 * Ler, alterar e excluir passaram a exigir sessão: a lista de leads é uma
 * relação de pessoas interessadas, com telefone e e-mail.
 */
const rota = criarRotaCrud({
  tabela: "leads",
  rotulo: "os leads",
  ler: "ver_leads",
  criar: "atribuir_lead",
  editar: "ver_leads",
  excluir: "atribuir_lead",
  criacaoPublica: {
    campos: [
      "id",
      "nome",
      "email",
      "telefone",
      "mensagem",
      "canal",
      "imovel_id",
      "anuncio_id",
    ],
  },
});

export const GET = rota.GET;
export const POST = rota.POST;
export const DELETE = rota.DELETE;

/**
 * PATCH próprio: além de gravar, converter um lead em cliente dispara a
 * mensagem de WhatsApp. Exigir sessão aqui também impede que alguém de fora
 * provoque envios em nome da imobiliária marcando leads como convertidos.
 */
export async function PATCH(request: Request) {
  try {
    const auth = await exigirPermissao("ver_leads", request);
    if (!auth.ok) return auth.resposta;

    const leitura = await lerCorpoJson<{ id?: string; updates?: Record<string, unknown> }>(
      request
    );
    if (!leitura.ok) return leitura.resposta;

    const { id, updates } = leitura.corpo;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Erro ao atualizar lead:", error.message);
      return NextResponse.json({ error: "Não foi possível salvar o lead." }, { status: 400 });
    }

    // Lead virou Cliente: dispara a notificação de WhatsApp depois da
    // resposta (não atrasa o retorno) sem depender do processo continuar
    // vivo após o response, como um fire-and-forget comum faria.
    if (updates.status === "convertido" && data) {
      after(() => dispararMensagemConversaoWhatsapp(data));
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de leads:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
