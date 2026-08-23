import { NextResponse } from "next/server";
import { marcarParaPublicacao, publicarAnuncio } from "@/lib/instagram-publicacao";
import { exigirPermissao } from "@/lib/sessao-servidor";
import { lerCorpoJson } from "@/lib/http";

/**
 * Publicação de anúncios no Instagram.
 *
 * Nada aqui acontece sem ação explícita do usuário: o POST só é disparado
 * pelo botão de confirmação do modal, e a permissão é revalidada no servidor
 * a cada chamada.
 *
 * Quem está publicando vem do cookie de sessão, não do corpo da requisição.
 * Antes o `usuarioId` era informado pelo cliente e o servidor apenas relia
 * aquele id no banco para conferir a permissão — como o id de um usuário não é
 * segredo (aparece na listagem da equipe), bastava enviar o id do
 * administrador para publicar no perfil da empresa sem estar logado.
 *
 * A publicação pode levar dezenas de segundos: a Meta baixa cada imagem e
 * processa o container antes de aceitar o publish.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const auth = await exigirPermissao("publicar_instagram", request);
    if (!auth.ok) return auth.resposta;

    const leitura = await lerCorpoJson<{
      anuncioId?: string;
      legenda?: string;
      republicar?: boolean;
    }>(request);
    if (!leitura.ok) return leitura.resposta;

    const { anuncioId, legenda, republicar } = leitura.corpo;

    if (!anuncioId) {
      return NextResponse.json({ error: "anuncioId obrigatório" }, { status: 400 });
    }

    const resultado = await publicarAnuncio({
      anuncioId,
      usuarioId: auth.usuario.id,
      legenda,
      republicar,
    });

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.mensagem }, { status: resultado.status });
    }

    return NextResponse.json(
      {
        mensagem: resultado.mensagem,
        postId: resultado.postId,
        postUrl: resultado.postUrl,
        publicadoEm: resultado.publicadoEm,
      },
      { status: 200 },
    );
  } catch (erro) {
    console.error("Erro no API route de publicação no Instagram:", erro);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

/** Liga/desliga a marcação "Publicar no Instagram", sem publicar. */
export async function PATCH(request: Request) {
  try {
    const auth = await exigirPermissao("publicar_instagram", request);
    if (!auth.ok) return auth.resposta;

    const leitura = await lerCorpoJson<{ anuncioId?: string; habilitado?: boolean }>(request);
    if (!leitura.ok) return leitura.resposta;

    const { anuncioId, habilitado } = leitura.corpo;

    if (!anuncioId || typeof habilitado !== "boolean") {
      return NextResponse.json(
        { error: "anuncioId e habilitado obrigatórios" },
        { status: 400 },
      );
    }

    const resultado = await marcarParaPublicacao({
      anuncioId,
      usuarioId: auth.usuario.id,
      habilitado,
    });

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.mensagem }, { status: resultado.status });
    }

    return NextResponse.json({ mensagem: resultado.mensagem }, { status: 200 });
  } catch (erro) {
    console.error("Erro no API route de marcação do Instagram:", erro);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
