/**
 * Rótulos legíveis das ações auditadas.
 *
 * Separado de `auditoria.ts` porque aquele módulo importa o cliente Supabase
 * com service role key e só pode rodar no servidor. Este é seguro para a
 * interface consumir.
 */
export const rotuloAcao: Record<string, string> = {
  login: "Entrou no painel",
  login_falhou: "Falha de login",
  logout: "Saiu do painel",
  usuario_criado: "Usuário criado",
  usuario_editado: "Usuário editado",
  perfil_alterado: "Perfil alterado",
  usuario_ativado: "Usuário ativado",
  usuario_desativado: "Usuário desativado",
  usuario_excluido: "Usuário excluído",
  recuperacao_solicitada: "Recuperação solicitada",
  senha_redefinida: "Senha redefinida",
  senha_alterada: "Senha alterada",
  link_senha_gerado: "Link de senha gerado",
  acesso_negado: "Acesso negado",
};

export function descreverAcao(acao: string): string {
  return rotuloAcao[acao] ?? acao;
}

export const tomResultado: Record<string, "verde" | "erro" | "alerta"> = {
  sucesso: "verde",
  negado: "erro",
  erro: "alerta",
};
