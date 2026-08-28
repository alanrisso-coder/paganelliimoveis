/**
 * Orquestra a publicação de um anúncio no Instagram.
 *
 * Só roda no servidor. Concentra as três garantias que a rota precisa ter:
 *
 * 1. **Permissão de verdade.** A checagem em `permissoes.ts` é de interface —
 *    esconde botão, não protege endpoint. Aqui o perfil é relido da tabela
 *    `usuarios` a cada publicação, então adulterar a sessão no localStorage
 *    não basta para postar no perfil público da empresa.
 *
 * 2. **Trava contra publicação duplicada.** O UPDATE condicional de
 *    `instagram_status` é atômico no Postgres: duas requisições simultâneas
 *    disputam a mesma linha e só uma sai com dados. A que perder recebe
 *    `JA_EM_PUBLICACAO` e nunca chega a chamar a Meta. Ao contrário de uma
 *    constraint única, isso ainda permite a republicação explícita.
 *
 * 3. **Trilha de auditoria.** Toda tentativa vira linha em
 *    `instagram_publicacoes`, com o erro técnico da Meta — enquanto o anúncio
 *    guarda só a mensagem amigável mostrada no painel.
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { podeFazer } from "./permissoes";
import type { PerfilAcesso } from "./types";
import { mensagemAmigavel, publicarNoInstagram } from "./instagram";
import { prepararImagens } from "./instagram-imagem";
import {
  MAX_CARACTERES_LEGENDA,
  fotosDoAnuncio,
  montarLegendaPadrao,
} from "./instagram-conteudo";
import { converterDbAnuncioParaAnuncio, converterDbImovelParaImovel } from "./supabase-sync-store";
import { CONTATO } from "./contato";
import { MAX_IMAGENS_CARROSSEL } from "./instagram";

/** Estados a partir dos quais uma publicação normal pode começar. */
const ESTADOS_PUBLICAVEIS = ["NOT_REQUESTED", "READY", "FAILED"];
/** Republicar aceita, além dos acima, um anúncio já publicado. */
const ESTADOS_REPUBLICAVEIS = [...ESTADOS_PUBLICAVEIS, "PUBLISHED"];

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export interface ResultadoOperacao {
  ok: boolean;
  status: number;
  /** Mensagem pronta para exibir ao usuário. */
  mensagem: string;
  postId?: string;
  postUrl?: string;
  publicadoEm?: string;
}

/**
 * Confere que o usuário existe, está ativo e tem a permissão. Nunca confia no
 * perfil que veio na requisição — só no `id`, que é usado para reler o banco.
 */
async function autorizar(
  usuarioId: string | undefined,
): Promise<{ ok: true; usuarioId: string } | { ok: false; status: number; mensagem: string }> {
  if (!usuarioId) {
    return { ok: false, status: 401, mensagem: "Sessão não identificada. Entre novamente no painel." };
  }

  const supabase = getSupabase();
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, perfil, ativo")
    .eq("id", usuarioId)
    .single();

  if (error || !usuario) {
    return { ok: false, status: 401, mensagem: "Usuário não encontrado. Entre novamente no painel." };
  }
  if (!usuario.ativo) {
    return { ok: false, status: 403, mensagem: "Este usuário está inativo." };
  }
  if (!podeFazer(usuario.perfil as PerfilAcesso, "publicar_instagram")) {
    return {
      ok: false,
      status: 403,
      mensagem: "Seu perfil não tem permissão para publicar no Instagram da empresa.",
    };
  }

  return { ok: true, usuarioId: usuario.id };
}

/**
 * Publica (ou republica) o anúncio. `republicar` só deve vir true quando o
 * usuário confirmou a ação separada de republicação no painel.
 */
export async function publicarAnuncio(params: {
  anuncioId: string;
  usuarioId?: string;
  legenda?: string;
  republicar?: boolean;
}): Promise<ResultadoOperacao> {
  const autorizacao = await autorizar(params.usuarioId);
  if (!autorizacao.ok) {
    return { ok: false, status: autorizacao.status, mensagem: autorizacao.mensagem };
  }

  const supabase = getSupabase();
  const estadosAceitos = params.republicar ? ESTADOS_REPUBLICAVEIS : ESTADOS_PUBLICAVEIS;

  // Trava atômica: quem conseguir mudar o status para PUBLISHING segue; os
  // demais param aqui, antes de qualquer chamada à Meta.
  const { data: anuncioDb, error: erroTrava } = await supabase
    .from("anuncios")
    .update({ instagram_status: "PUBLISHING", instagram_error: null })
    .eq("id", params.anuncioId)
    .in("instagram_status", estadosAceitos)
    .select()
    .single();

  if (erroTrava || !anuncioDb) {
    const { data: atual } = await supabase
      .from("anuncios")
      .select("instagram_status, instagram_published_at")
      .eq("id", params.anuncioId)
      .single();

    if (!atual) {
      return { ok: false, status: 404, mensagem: "Anúncio não encontrado." };
    }
    if (atual.instagram_status === "PUBLISHING") {
      return {
        ok: false,
        status: 409,
        mensagem: "Este anúncio já está sendo publicado neste momento. Aguarde a conclusão.",
      };
    }
    if (atual.instagram_status === "PUBLISHED") {
      return {
        ok: false,
        status: 409,
        mensagem: "Este anúncio já foi publicado no Instagram. Use “Republicar” se quiser publicar de novo.",
      };
    }
    return { ok: false, status: 409, mensagem: "Não foi possível iniciar a publicação deste anúncio." };
  }

  const registroId = randomUUID();

  try {
    const { data: imovelDb } = await supabase
      .from("imoveis")
      .select("*")
      .eq("id", anuncioDb.imovel_id)
      .single();

    if (!imovelDb) {
      return await falhar(registroId, params, anuncioDb.instagram_status, "IMOVEL_NAO_ENCONTRADO");
    }

    const anuncio = converterDbAnuncioParaAnuncio(anuncioDb);
    const imovel = converterDbImovelParaImovel(imovelDb);

    const legenda = (params.legenda?.trim() || montarLegendaPadrao(anuncio, imovel)).slice(
      0,
      MAX_CARACTERES_LEGENDA,
    );
    const fotos = fotosDoAnuncio(anuncio, imovel).slice(0, MAX_IMAGENS_CARROSSEL);

    if (fotos.length === 0) {
      return await falhar(registroId, params, anuncioDb.instagram_status, "SEM_IMAGENS");
    }

    await supabase.from("instagram_publicacoes").insert({
      id: registroId,
      anuncio_id: params.anuncioId,
      usuario_id: autorizacao.usuarioId,
      status: "pendente",
      republicacao: Boolean(params.republicar),
      legenda,
      quantidade_imagens: fotos.length,
    });

    const imagens = await prepararImagens(fotos, params.anuncioId);
    if (!imagens.ok) {
      return await falhar(registroId, params, anuncioDb.instagram_status, imagens.erro);
    }

    const resultado = await publicarNoInstagram({ imagensUrls: imagens.urls, legenda });
    if (!resultado.sucesso) {
      return await falhar(registroId, params, anuncioDb.instagram_status, resultado.erro ?? "ERRO_DESCONHECIDO");
    }

    const publicadoEm = new Date().toISOString();
    // O permalink é o único link confiável para o post: o id da mídia não é o
    // shortcode que aparece em /p/, e pelo Windsor pode nem vir. Sem ele, o
    // painel manda para o perfil, que sempre existe — melhor que um link morto.
    const postUrl = resultado.permalink || CONTATO.redes.instagram;

    await supabase
      .from("anuncios")
      .update({
        instagram_enabled: true,
        instagram_status: "PUBLISHED",
        instagram_caption: legenda,
        instagram_published_at: publicadoEm,
        instagram_post_id: resultado.postId,
        instagram_post_url: postUrl,
        instagram_error: null,
      })
      .eq("id", params.anuncioId);

    await supabase
      .from("instagram_publicacoes")
      .update({
        status: "publicado",
        instagram_post_id: resultado.postId,
        instagram_post_url: postUrl,
        publicado_em: publicadoEm,
      })
      .eq("id", registroId);

    console.log(
      `Anúncio ${params.anuncioId} publicado no Instagram. Post ID: ${resultado.postId}`,
    );

    return {
      ok: true,
      status: 200,
      mensagem: "Anúncio publicado no Instagram.",
      postId: resultado.postId,
      postUrl,
      publicadoEm,
    };
  } catch (erro) {
    const motivo = erro instanceof Error ? erro.message : "ERRO_INESPERADO";
    return await falhar(registroId, params, anuncioDb.instagram_status, motivo);
  }
}

/**
 * Marca a tentativa como falha e devolve o anúncio a um estado utilizável.
 *
 * Devolver para FAILED (e não deixar preso em PUBLISHING) é o que permite ao
 * usuário tentar de novo — um anúncio travado em PUBLISHING por causa de um
 * erro de rede seria impossível de republicar pela interface.
 */
async function falhar(
  registroId: string,
  params: { anuncioId: string },
  statusAnterior: string,
  erroTecnico: string,
): Promise<ResultadoOperacao> {
  const supabase = getSupabase();
  const amigavel = mensagemAmigavel(erroTecnico);

  console.error(`Anúncio ${params.anuncioId}: falha ao publicar no Instagram. Motivo: ${erroTecnico}`);

  // Um anúncio que já estava publicado e falhou ao republicar continua
  // publicado — o post antigo segue no ar.
  const novoStatus = statusAnterior === "PUBLISHED" ? "PUBLISHED" : "FAILED";

  await supabase
    .from("anuncios")
    .update({ instagram_status: novoStatus, instagram_error: amigavel })
    .eq("id", params.anuncioId);

  await supabase
    .from("instagram_publicacoes")
    .update({ status: "erro", erro: erroTecnico })
    .eq("id", registroId);

  return { ok: false, status: 502, mensagem: amigavel };
}

/**
 * Liga/desliga a marcação "Publicar no Instagram" sem publicar nada.
 * Alterna entre NOT_REQUESTED e READY, e nunca toca num anúncio já publicado
 * ou em publicação.
 */
export async function marcarParaPublicacao(params: {
  anuncioId: string;
  usuarioId?: string;
  habilitado: boolean;
}): Promise<ResultadoOperacao> {
  const autorizacao = await autorizar(params.usuarioId);
  if (!autorizacao.ok) {
    return { ok: false, status: autorizacao.status, mensagem: autorizacao.mensagem };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("anuncios")
    .update({
      instagram_enabled: params.habilitado,
      instagram_status: params.habilitado ? "READY" : "NOT_REQUESTED",
    })
    .eq("id", params.anuncioId)
    .in("instagram_status", ["NOT_REQUESTED", "READY", "FAILED"])
    .select()
    .single();

  if (error || !data) {
    return {
      ok: false,
      status: 409,
      mensagem: "Não foi possível alterar a marcação deste anúncio.",
    };
  }

  return {
    ok: true,
    status: 200,
    mensagem: params.habilitado
      ? "Anúncio marcado para publicação no Instagram."
      : "Marcação removida — este anúncio não será publicado no Instagram.",
  };
}
