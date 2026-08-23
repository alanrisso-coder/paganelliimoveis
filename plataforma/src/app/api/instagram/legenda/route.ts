import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { gerarLegendaIA, mensagemErroIA } from "@/lib/ia-legenda";
import { montarLegendaPadrao } from "@/lib/instagram-conteudo";
import {
  converterDbAnuncioParaAnuncio,
  converterDbImovelParaImovel,
} from "@/lib/supabase-sync-store";
import { exigirPermissao } from "@/lib/sessao-servidor";
import { lerCorpoJson } from "@/lib/http";

/**
 * Gera uma sugestão de legenda para o anúncio.
 *
 * Devolve texto para o usuário revisar — nunca publica. Se a IA não estiver
 * configurada ou falhar, responde com a legenda padrão montada a partir dos
 * dados do imóvel, para o campo nunca ficar vazio.
 */
export const maxDuration = 120;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(request: Request) {
  try {
    // Exige sessão porque cada chamada consome crédito da API de IA: aberta,
    // a rota seria um gerador de texto pago por conta da imobiliária.
    const auth = await exigirPermissao("publicar_anuncio", request);
    if (!auth.ok) return auth.resposta;

    const leitura = await lerCorpoJson<{ anuncioId?: string }>(request);
    if (!leitura.ok) return leitura.resposta;

    const { anuncioId } = leitura.corpo;

    if (!anuncioId) {
      return NextResponse.json({ error: "anuncioId obrigatório" }, { status: 400 });
    }

    const supabase = getSupabase();
    const { data: anuncioDb } = await supabase
      .from("anuncios")
      .select("*")
      .eq("id", anuncioId)
      .single();

    if (!anuncioDb) {
      return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });
    }

    const { data: imovelDb } = await supabase
      .from("imoveis")
      .select("*")
      .eq("id", anuncioDb.imovel_id)
      .single();

    if (!imovelDb) {
      return NextResponse.json({ error: "Imóvel do anúncio não encontrado" }, { status: 404 });
    }

    const anuncio = converterDbAnuncioParaAnuncio(anuncioDb);
    const imovel = converterDbImovelParaImovel(imovelDb);

    const resultado = await gerarLegendaIA(anuncio, imovel);

    if (!resultado.sucesso) {
      // Degrada para a legenda padrão em vez de deixar o usuário sem nada.
      return NextResponse.json(
        {
          legenda: montarLegendaPadrao(anuncio, imovel),
          origem: "padrao",
          aviso: mensagemErroIA(resultado.erro ?? ""),
        },
        { status: 200 },
      );
    }

    return NextResponse.json({ legenda: resultado.legenda, origem: "ia" }, { status: 200 });
  } catch (erro) {
    console.error("Erro no API route de geração de legenda:", erro);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
