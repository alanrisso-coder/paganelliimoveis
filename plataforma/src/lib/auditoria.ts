import { getSupabaseAdmin } from "./supabase-admin";

/**
 * Trilha de auditoria das operações sensíveis (tabela `logs_auditoria`).
 *
 * Regra de ouro: nunca registrar senha, hash de senha ou token — nem em
 * `detalhe`, nem em mensagem de erro repassada. O que se registra é *o que*
 * aconteceu com *qual* conta, não o segredo envolvido.
 */

export const ACAO = {
  loginSucesso: "login",
  loginFalha: "login_falhou",
  logout: "logout",
  usuarioCriado: "usuario_criado",
  usuarioEditado: "usuario_editado",
  perfilAlterado: "perfil_alterado",
  usuarioAtivado: "usuario_ativado",
  usuarioDesativado: "usuario_desativado",
  usuarioExcluido: "usuario_excluido",
  senhaRecuperacaoSolicitada: "recuperacao_solicitada",
  senhaRedefinida: "senha_redefinida",
  senhaAlterada: "senha_alterada",
  linkSenhaGerado: "link_senha_gerado",
  acessoNegado: "acesso_negado",
  gastoCriado: "gasto_criado",
  gastoEditado: "gasto_editado",
  gastoExcluido: "gasto_excluido",
  gastoReembolsado: "gasto_reembolsado",
  categoriaGastoCriada: "categoria_gasto_criada",
  categoriaGastoEditada: "categoria_gasto_editada",
} as const;

export type Acao = (typeof ACAO)[keyof typeof ACAO];

interface EntradaLog {
  /** Autor da ação. `null` em ações anônimas (ex.: login que falhou). */
  usuarioId?: string | null;
  acao: Acao;
  entidade?: string;
  entidadeId?: string | null;
  /** Conta afetada, quando diferente do autor. */
  usuarioAfetadoId?: string | null;
  detalhe?: string;
  resultado?: "sucesso" | "negado" | "erro";
  ip?: string | null;
}

/**
 * Grava uma entrada. Falha de log nunca derruba a operação de negócio: se a
 * auditoria cair, o pior cenário aceitável é perder o registro — não recusar
 * um login legítimo. O erro vai para o console do servidor.
 */
export async function registrarLog(entrada: EntradaLog): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("logs_auditoria").insert({
      usuario_id: entrada.usuarioId ?? null,
      acao: entrada.acao,
      entidade: entrada.entidade ?? "usuario",
      entidade_id: entrada.entidadeId ?? null,
      usuario_afetado_id: entrada.usuarioAfetadoId ?? null,
      detalhe: entrada.detalhe ?? null,
      resultado: entrada.resultado ?? "sucesso",
      ip: entrada.ip ?? null,
    });

    if (error) console.error("Falha ao registrar log de auditoria:", error.message);
  } catch (erro) {
    console.error("Falha ao registrar log de auditoria:", erro);
  }
}

/** IP de origem atrás do proxy da Vercel. Só para auditoria — nunca para autorizar. */
export function ipDaRequisicao(request: Request): string | null {
  const encaminhado = request.headers.get("x-forwarded-for");
  if (encaminhado) return encaminhado.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}
