import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { criarRotaCrud } from "@/lib/rota-crud";
import { autenticar } from "@/lib/sessao-servidor";

/**
 * Anúncios da vitrine.
 *
 * A leitura é pública, mas com dois limites que antes não existiam:
 *
 * 1. Visitante recebe apenas anúncios publicados. O filtro dependia do
 *    parâmetro `?publicos=true` enviado pelo cliente — bastava omiti-lo para
 *    receber rascunhos, anúncios expirados e os marcados como internos.
 * 2. Os campos `instagram_*` não saem para fora: são estado interno de
 *    publicação (token de post, erro da Meta, status do fluxo).
 */

const COLUNAS_PUBLICAS = [
  "id", "codigo", "imovel_id", "titulo", "subtitulo", "descricao_comercial",
  "status", "visibilidade", "publicar_em", "expirar_em",
  "destaque_home", "capa_indice", "ordem_galeria", "selos", "metricas",
  "corretor_id", "criado_em", "atualizado_em",
].join(", ");

export async function GET(request: Request) {
  try {
    const auth = await autenticar();
    const autenticado = auth.ok;

    const { searchParams } = new URL(request.url);
    const imovelId = searchParams.get("imovel_id");
    // Sem sessão o recorte público é imposto, não pedido: o parâmetro só tem
    // efeito para quem está logado e quer ver a vitrine como o visitante vê.
    const apenasPublicos = !autenticado || searchParams.get("publicos") === "true";

    const supabase = getSupabaseAdmin();
    let consulta = supabase
      .from("anuncios")
      .select(autenticado ? "*" : COLUNAS_PUBLICAS)
      .order("criado_em", { ascending: false });

    if (apenasPublicos) {
      consulta = consulta.eq("status", "publicado").eq("visibilidade", "publico");
    }
    if (imovelId) {
      consulta = consulta.eq("imovel_id", imovelId);
    }

    const { data, error } = await consulta;

    if (error) {
      console.error("Erro ao listar anúncios:", error.message);
      return NextResponse.json(
        { error: "Não foi possível carregar os anúncios." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de anúncios:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

const rota = criarRotaCrud({
  tabela: "anuncios",
  rotulo: "os anúncios",
  ler: "ver_anuncios",
  criar: "publicar_anuncio",
  editar: "publicar_anuncio",
  excluir: "deletar_anuncio",
  // O site conta visualizações a partir do navegador do visitante, e essa
  // contagem vive em `metricas`. É o único campo que um PATCH sem sessão
  // alcança — título, preço e status do anúncio ficam fora.
  edicaoPublica: { campos: ["metricas"] },
});

export const POST = rota.POST;
export const PATCH = rota.PATCH;
export const DELETE = rota.DELETE;
