import { NextResponse } from "next/server";
import { COLUNAS_USUARIO, getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  contarAdministradoresAtivos,
  exigirPermissao,
  revogarSessoesDoUsuario,
} from "@/lib/sessao-servidor";
import {
  bloqueioAlterarProprioPerfil,
  bloqueioDesativarPropriaConta,
  bloqueioEditarAdministrador,
  bloqueioExcluirPropriaConta,
  bloqueioPromoverAdministrador,
  bloqueioUltimoAdministrador,
  ehPerfilValido,
} from "@/lib/permissoes";
import { ACAO, ipDaRequisicao, registrarLog } from "@/lib/auditoria";
import type { PerfilAcesso } from "@/lib/types";

/**
 * Edição e exclusão de um usuário.
 *
 * As regras de proteção do administrador (não se autopromover, não excluir a
 * própria conta, não deixar o sistema sem administrador) vivem em
 * `lib/permissoes.ts` e são aplicadas aqui, antes de qualquer escrita. Elas
 * dependem de *quem é o alvo*, coisa que a matriz de permissões sozinha não
 * expressa.
 */

interface Contexto {
  params: Promise<{ id: string }>;
}

/** Roda todos os bloqueios aplicáveis e devolve o primeiro motivo de recusa. */
async function verificarBloqueios(
  autor: { id: string; perfil: PerfilAcesso },
  alvo: { id: string; perfil: PerfilAcesso; ativo: boolean },
  mudancas: { perfil?: PerfilAcesso; ativo?: boolean }
): Promise<string | null> {
  const impedimentoAdmin = bloqueioEditarAdministrador(autor, alvo);
  if (impedimentoAdmin) return impedimentoAdmin;

  if (mudancas.perfil && mudancas.perfil !== alvo.perfil) {
    const novoPerfil = mudancas.perfil;

    const proprio = bloqueioAlterarProprioPerfil(autor, alvo, novoPerfil);
    if (proprio) return proprio;

    const promocao = bloqueioPromoverAdministrador(autor, novoPerfil);
    if (promocao) return promocao;

    // Rebaixar um administrador só é possível se sobrar outro ativo.
    if (alvo.perfil === "administrador") {
      const outros = await contarAdministradoresAtivos(alvo.id);
      const ultimo = bloqueioUltimoAdministrador(alvo, outros, "rebaixar");
      if (ultimo) return ultimo;
    }
  }

  if (mudancas.ativo !== undefined && mudancas.ativo !== alvo.ativo) {
    const proprio = bloqueioDesativarPropriaConta(autor, alvo, mudancas.ativo);
    if (proprio) return proprio;

    if (!mudancas.ativo && alvo.perfil === "administrador") {
      const outros = await contarAdministradoresAtivos(alvo.id);
      const ultimo = bloqueioUltimoAdministrador(alvo, outros, "desativar");
      if (ultimo) return ultimo;
    }
  }

  return null;
}

export async function PATCH(request: Request, { params }: Contexto) {
  const ip = ipDaRequisicao(request);

  try {
    const auth = await exigirPermissao("gerenciar_usuarios", request);
    if (!auth.ok) return auth.resposta;

    const { id } = await params;
    const corpo = await request.json();

    const supabase = getSupabaseAdmin();
    const { data: alvo } = await supabase
      .from("usuarios")
      .select("id, nome, email, perfil, ativo")
      .eq("id", id)
      .maybeSingle();

    if (!alvo) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    if (corpo.perfil !== undefined && !ehPerfilValido(corpo.perfil)) {
      return NextResponse.json({ error: "Perfil de acesso inválido." }, { status: 400 });
    }

    const mudancas = {
      perfil: corpo.perfil as PerfilAcesso | undefined,
      ativo: corpo.ativo as boolean | undefined,
    };

    const impedimento = await verificarBloqueios(
      auth.usuario,
      { id: alvo.id, perfil: alvo.perfil as PerfilAcesso, ativo: alvo.ativo },
      mudancas
    );

    if (impedimento) {
      await registrarLog({
        usuarioId: auth.usuario.id,
        acao: ACAO.acessoNegado,
        entidadeId: alvo.id,
        usuarioAfetadoId: alvo.id,
        detalhe: impedimento,
        resultado: "negado",
        ip,
      });
      return NextResponse.json({ error: impedimento }, { status: 403 });
    }

    // Lista fechada de campos graváveis: `senha_hash`, `precisa_trocar_senha`,
    // `criado_por` e afins nunca são aceitos do corpo da requisição, mesmo que
    // alguém os envie. Senha só muda pelas rotas dedicadas.
    const atualizacoes: Record<string, unknown> = {};
    if (corpo.nome !== undefined) atualizacoes.nome = String(corpo.nome).trim();
    if (corpo.telefone !== undefined) atualizacoes.telefone = String(corpo.telefone).trim() || null;
    if (corpo.creci !== undefined) atualizacoes.creci = String(corpo.creci).trim() || null;
    if (corpo.perfil !== undefined) atualizacoes.perfil = corpo.perfil;
    if (corpo.ativo !== undefined) atualizacoes.ativo = Boolean(corpo.ativo);

    if (Object.keys(atualizacoes).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    const { data: atualizado, error } = await supabase
      .from("usuarios")
      .update(atualizacoes)
      .eq("id", id)
      .select(COLUNAS_USUARIO)
      .single();

    if (error) {
      console.error("Erro ao atualizar usuário:", error.message);
      return NextResponse.json({ error: "Não foi possível salvar as alterações." }, { status: 500 });
    }

    // Desativar precisa cortar o acesso agora, não quando a sessão expirar.
    const foiDesativado = mudancas.ativo === false && alvo.ativo === true;
    // Trocar de perfil também: a sessão aberta carrega o perfil antigo.
    const trocouPerfil = Boolean(mudancas.perfil && mudancas.perfil !== alvo.perfil);
    if (foiDesativado || trocouPerfil) await revogarSessoesDoUsuario(alvo.id);

    if (trocouPerfil) {
      await registrarLog({
        usuarioId: auth.usuario.id,
        acao: ACAO.perfilAlterado,
        entidadeId: alvo.id,
        usuarioAfetadoId: alvo.id,
        detalhe: `${alvo.nome}: ${alvo.perfil} → ${mudancas.perfil}.`,
        ip,
      });
    }

    if (mudancas.ativo !== undefined && mudancas.ativo !== alvo.ativo) {
      await registrarLog({
        usuarioId: auth.usuario.id,
        acao: mudancas.ativo ? ACAO.usuarioAtivado : ACAO.usuarioDesativado,
        entidadeId: alvo.id,
        usuarioAfetadoId: alvo.id,
        detalhe: `${alvo.nome} (${alvo.email}).`,
        ip,
      });
    }

    const editouDados =
      corpo.nome !== undefined || corpo.telefone !== undefined || corpo.creci !== undefined;
    if (editouDados) {
      await registrarLog({
        usuarioId: auth.usuario.id,
        acao: ACAO.usuarioEditado,
        entidadeId: alvo.id,
        usuarioAfetadoId: alvo.id,
        detalhe: `Dados cadastrais de ${alvo.nome} atualizados.`,
        ip,
      });
    }

    return NextResponse.json({ data: atualizado }, { status: 200 });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Contexto) {
  const ip = ipDaRequisicao(request);

  try {
    const auth = await exigirPermissao("gerenciar_usuarios", request);
    if (!auth.ok) return auth.resposta;

    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: alvo } = await supabase
      .from("usuarios")
      .select("id, nome, email, perfil, ativo")
      .eq("id", id)
      .maybeSingle();

    if (!alvo) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

    const perfilAlvo = alvo.perfil as PerfilAcesso;
    const dadosAlvo = { id: alvo.id, perfil: perfilAlvo };

    const impedimento =
      bloqueioExcluirPropriaConta(auth.usuario, dadosAlvo) ??
      bloqueioEditarAdministrador(auth.usuario, dadosAlvo) ??
      bloqueioUltimoAdministrador(
        dadosAlvo,
        perfilAlvo === "administrador" ? await contarAdministradoresAtivos(alvo.id) : 1,
        "excluir"
      );

    if (impedimento) {
      await registrarLog({
        usuarioId: auth.usuario.id,
        acao: ACAO.acessoNegado,
        entidadeId: alvo.id,
        usuarioAfetadoId: alvo.id,
        detalhe: impedimento,
        resultado: "negado",
        ip,
      });
      return NextResponse.json({ error: impedimento }, { status: 403 });
    }

    await revogarSessoesDoUsuario(alvo.id);

    const { error } = await supabase.from("usuarios").delete().eq("id", id);

    if (error) {
      console.error("Erro ao excluir usuário:", error.message);
      return NextResponse.json(
        {
          error:
            "Não foi possível excluir. Se o usuário tem registros vinculados, desative a conta em vez de excluí-la.",
        },
        { status: 409 }
      );
    }

    // Nome e e-mail vão no texto do log de propósito: a referência ao usuário
    // é anulada pela FK ao excluir, e sem isto a trilha perderia quem foi.
    await registrarLog({
      usuarioId: auth.usuario.id,
      acao: ACAO.usuarioExcluido,
      entidadeId: alvo.id,
      detalhe: `Excluiu ${alvo.nome} (${alvo.email}), perfil ${alvo.perfil}.`,
      ip,
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
