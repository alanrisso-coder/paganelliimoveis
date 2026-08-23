import { NextResponse } from "next/server";
import { marcarParaPublicacao, publicarAnuncio } from "@/lib/instagram-publicacao";

/**
 * Publicação de anúncios no Instagram.
 *
 * Nada aqui acontece sem ação explícita do usuário: o POST só é disparado
 * pelo botão de confirmação do modal, e a permissão é revalidada no servidor
 * a cada chamada (ver `instagram-publicacao.ts`), não confiando na sessão
 * enviada pelo cliente.
 *
 * A publicação pode levar dezenas de segundos: a Meta baixa cada imagem e
 * processa o container antes de aceitar o publish.
 */
export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { anuncioId, usuarioId, legenda, republicar } = await request.json();

    if (!anuncioId) {
      return NextResponse.json({ error: "anuncioId obrigatório" }, { status: 400 });
    }

    const resultado = await publicarAnuncio({ anuncioId, usuarioId, legenda, republicar });

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
    const { anuncioId, usuarioId, habilitado } = await request.json();

    if (!anuncioId || typeof habilitado !== "boolean") {
      return NextResponse.json(
        { error: "anuncioId e habilitado obrigatórios" },
        { status: 400 },
      );
    }

    const resultado = await marcarParaPublicacao({ anuncioId, usuarioId, habilitado });

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.mensagem }, { status: resultado.status });
    }

    return NextResponse.json({ mensagem: resultado.mensagem }, { status: 200 });
  } catch (erro) {
    console.error("Erro no API route de marcação do Instagram:", erro);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
