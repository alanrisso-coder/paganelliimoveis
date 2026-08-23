import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COLUNAS_USUARIO, getSupabaseAdmin } from "./supabase-admin";
import {
  expiraEmMinutos,
  gerarToken,
  hashToken,
  MINUTOS_VALIDADE_SESSAO,
} from "./tokens";
import { podeFazer, type Permissao } from "./permissoes";
import { ACAO, ipDaRequisicao, registrarLog } from "./auditoria";
import type { PerfilAcesso } from "./types";

/**
 * Sessão de servidor.
 *
 * Antes deste módulo o painel guardava o usuário logado no localStorage e as
 * rotas de API não verificavam nada — qualquer pessoa que descobrisse um
 * endpoint podia chamá-lo com a service role key do servidor por trás. Agora o
 * navegador recebe um cookie httpOnly com um token opaco, o banco guarda só o
 * hash desse token, e toda rota protegida resolve o usuário a partir daí.
 *
 * O estado que o cliente mantém em memória passa a ser espelho da sessão, não
 * a fonte dela: adulterar o localStorage não concede permissão nenhuma.
 */

export const COOKIE_SESSAO = "paganelli_sessao";

export interface UsuarioAutenticado {
  id: string;
  nome: string;
  email: string;
  perfil: PerfilAcesso;
  ativo: boolean;
  precisaTrocarSenha: boolean;
}

export type ResultadoAutenticacao =
  | { ok: true; usuario: UsuarioAutenticado; sessaoId: string }
  | { ok: false; resposta: NextResponse };

/* ------------------------------------------------------- Criar / encerrar */

/** Abre uma sessão e grava o cookie httpOnly. Devolve o id da sessão criada. */
export async function criarSessao(
  usuarioId: string,
  request: Request
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { token, hash } = gerarToken();
  const expiraEm = expiraEmMinutos(MINUTOS_VALIDADE_SESSAO);

  const { data, error } = await supabase
    .from("sessoes")
    .insert({
      usuario_id: usuarioId,
      token_hash: hash,
      expira_em: expiraEm,
      user_agent: request.headers.get("user-agent"),
      ip: ipDaRequisicao(request),
    })
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao criar sessão:", error.message);
    return null;
  }

  const armazenamento = await cookies();
  armazenamento.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    // Sem isso o cookie viaja em texto puro em qualquer requisição http://.
    secure: process.env.NODE_ENV === "production",
    // "lax" deixa o cookie acompanhar a navegação normal do próprio site e
    // barra o envio em requisições de outros domínios — proteção de CSRF.
    sameSite: "lax",
    path: "/",
    maxAge: MINUTOS_VALIDADE_SESSAO * 60,
  });

  return data.id;
}

/** Revoga a sessão atual e apaga o cookie. */
export async function encerrarSessao(): Promise<void> {
  const armazenamento = await cookies();
  const token = armazenamento.get(COOKIE_SESSAO)?.value;

  if (token) {
    const supabase = getSupabaseAdmin();
    await supabase
      .from("sessoes")
      .update({ revogada_em: new Date().toISOString() })
      .eq("token_hash", hashToken(token));
  }

  armazenamento.delete(COOKIE_SESSAO);
}

/**
 * Derruba todas as sessões de um usuário. Chamado quando a conta é desativada
 * ou excluída, e quando a senha muda — nesses casos quem já estava logado em
 * outro dispositivo não pode continuar navegando.
 */
export async function revogarSessoesDoUsuario(usuarioId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("sessoes")
    .update({ revogada_em: new Date().toISOString() })
    .eq("usuario_id", usuarioId)
    .is("revogada_em", null);

  if (error) console.error("Erro ao revogar sessões:", error.message);
}

/* ----------------------------------------------------------- Autenticação */

function naoAutenticado(mensagem = "Sessão expirada. Faça login novamente.") {
  return NextResponse.json({ error: mensagem }, { status: 401 });
}

/**
 * Resolve o usuário da requisição a partir do cookie de sessão.
 *
 * Revalida a conta no banco a cada chamada (em vez de confiar no que foi
 * gravado no login): é isso que faz um usuário desativado perder o acesso na
 * hora, sem esperar a sessão expirar.
 */
export async function autenticar(): Promise<ResultadoAutenticacao> {
  const armazenamento = await cookies();
  const token = armazenamento.get(COOKIE_SESSAO)?.value;

  if (!token) return { ok: false, resposta: naoAutenticado("Faça login para continuar.") };

  const supabase = getSupabaseAdmin();
  const { data: sessao, error } = await supabase
    .from("sessoes")
    .select("id, usuario_id, expira_em, revogada_em")
    .eq("token_hash", hashToken(token))
    .maybeSingle();

  if (error) {
    console.error("Erro ao ler sessão:", error.message);
    return { ok: false, resposta: NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 }) };
  }

  if (!sessao || sessao.revogada_em || new Date(sessao.expira_em) < new Date()) {
    return { ok: false, resposta: naoAutenticado() };
  }

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, nome, email, perfil, ativo, precisa_trocar_senha")
    .eq("id", sessao.usuario_id)
    .maybeSingle();

  if (!usuario) return { ok: false, resposta: naoAutenticado() };

  if (!usuario.ativo) {
    return {
      ok: false,
      resposta: NextResponse.json(
        { error: "Este acesso está desativado. Fale com o administrador." },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    sessaoId: sessao.id,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil as PerfilAcesso,
      ativo: usuario.ativo,
      precisaTrocarSenha: Boolean(usuario.precisa_trocar_senha),
    },
  };
}

/**
 * Autentica e confere a permissão na matriz de RBAC. Tentativa de acesso sem
 * permissão vira registro de auditoria — é o sinal de alguém sondando as
 * rotas administrativas.
 */
export async function exigirPermissao(
  permissao: Permissao,
  request: Request
): Promise<ResultadoAutenticacao> {
  const auth = await autenticar();
  if (!auth.ok) return auth;

  if (!podeFazer(auth.usuario.perfil, permissao)) {
    await registrarLog({
      usuarioId: auth.usuario.id,
      acao: ACAO.acessoNegado,
      detalhe: `Tentou executar "${permissao}" sem permissão (perfil: ${auth.usuario.perfil}).`,
      resultado: "negado",
      ip: ipDaRequisicao(request),
    });

    return {
      ok: false,
      resposta: NextResponse.json(
        { error: "Você não tem permissão para executar esta ação." },
        { status: 403 }
      ),
    };
  }

  return auth;
}

/* ---------------------------------------------------------------- Helpers */

/** Carrega o registro completo do usuário logado, sem `senha_hash`. */
export async function carregarUsuarioCompleto(id: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("usuarios")
    .select(COLUNAS_USUARIO)
    .eq("id", id)
    .maybeSingle();

  return data;
}

/**
 * Quantos administradores ativos existem além de `exceto`. Sustenta a regra de
 * não deixar o sistema sem nenhum administrador.
 */
export async function contarAdministradoresAtivos(exceto: string): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("perfil", "administrador")
    .eq("ativo", true)
    .neq("id", exceto);

  return count ?? 0;
}
