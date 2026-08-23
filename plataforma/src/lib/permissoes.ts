import type { PerfilAcesso } from "./types";

/**
 * Matriz de permissões por perfil (RBAC).
 *
 * Este arquivo é a fonte única: o painel importa para esconder o que o perfil
 * não pode fazer, e as rotas de API importam para *autorizar de fato*. Esconder
 * botão não é segurança — quem descobre o endpoint chama direto. Toda rota
 * administrativa passa por `exigirPermissao` em src/lib/sessao-servidor.ts,
 * que consulta esta mesma matriz.
 */
export type Permissao =
  | "ver_dashboard"
  | "ver_crm"
  | "editar_cliente"
  | "deletar_cliente"
  | "ver_imoveis"
  | "editar_imovel"
  | "deletar_imovel"
  | "ver_anuncios"
  | "publicar_anuncio"
  | "publicar_instagram"
  | "deletar_anuncio"
  | "ver_visitas"
  | "agendar_visita"
  | "ver_contratos"
  | "editar_contrato"
  | "ver_leads"
  | "atribuir_lead"
  | "ver_relatorios"
  | "ver_configuracoes"
  /** Abre a área administrativa em modo leitura (lista de usuários). */
  | "ver_usuarios"
  /** Criar, editar, ativar/desativar, excluir usuários e alterar perfis. */
  | "gerenciar_usuarios"
  /** Ler a trilha de auditoria. */
  | "ver_logs";

const matriz: Record<PerfilAcesso, Permissao[]> = {
  administrador: [
    "ver_dashboard",
    "ver_crm",
    "editar_cliente",
    "deletar_cliente",
    "ver_imoveis",
    "editar_imovel",
    "deletar_imovel",
    "ver_anuncios",
    "publicar_anuncio",
    // Publicar no perfil público da empresa é mais sensível do que publicar na
    // vitrine do site: fica restrito ao administrador.
    "publicar_instagram",
    "deletar_anuncio",
    "ver_visitas",
    "agendar_visita",
    "ver_contratos",
    "editar_contrato",
    "ver_leads",
    "atribuir_lead",
    "ver_relatorios",
    "ver_configuracoes",
    "ver_usuarios",
    "gerenciar_usuarios",
    "ver_logs",
  ],
  // Gerência operacional: manda no dia a dia (imóveis, leads, anúncios,
  // contratos) e enxerga a equipe, mas não administra contas nem perfis.
  gestor: [
    "ver_dashboard",
    "ver_crm",
    "editar_cliente",
    "deletar_cliente",
    "ver_imoveis",
    "editar_imovel",
    "deletar_imovel",
    "ver_anuncios",
    "publicar_anuncio",
    "deletar_anuncio",
    "ver_visitas",
    "agendar_visita",
    "ver_contratos",
    "editar_contrato",
    "ver_leads",
    "atribuir_lead",
    "ver_relatorios",
    "ver_configuracoes",
    "ver_usuarios",
  ],
  corretor: [
    "ver_dashboard",
    "ver_crm",
    "editar_cliente",
    "ver_imoveis",
    "editar_imovel",
    "ver_anuncios",
    "publicar_anuncio",
    "ver_visitas",
    "agendar_visita",
    "ver_contratos",
    "ver_leads",
    "ver_relatorios",
  ],
  assistente: [
    "ver_dashboard",
    "ver_crm",
    "editar_cliente",
    "ver_imoveis",
    "ver_anuncios",
    "ver_visitas",
    "agendar_visita",
    "ver_contratos",
    "ver_leads",
  ],
  // Acesso mínimo: consulta o catálogo interno, sem tocar em nada.
  usuario: ["ver_dashboard", "ver_imoveis", "ver_anuncios"],
};

export function podeFazer(perfil: PerfilAcesso, permissao: Permissao): boolean {
  return (matriz[perfil] ?? []).includes(permissao);
}

export const PERFIS: PerfilAcesso[] = [
  "administrador",
  "gestor",
  "corretor",
  "assistente",
  "usuario",
];

export function ehPerfilValido(valor: unknown): valor is PerfilAcesso {
  return typeof valor === "string" && (PERFIS as string[]).includes(valor);
}

/* ------------------------------------------------- Regras de proteção */

/**
 * Regras que a matriz de permissões sozinha não expressa, porque dependem de
 * *quem* é o alvo — não só de quem é o autor. Ter "gerenciar_usuarios" não
 * pode significar poder de se autopromover ou de deixar o sistema sem nenhum
 * administrador.
 *
 * Cada função devolve `null` quando a operação é permitida, ou o motivo da
 * recusa. As rotas em /api/admin/usuarios chamam todas antes de gravar.
 */

interface AlvoOperacao {
  id: string;
  perfil: PerfilAcesso;
}

interface AutorOperacao {
  id: string;
  perfil: PerfilAcesso;
}

/** Ninguém altera o próprio perfil de acesso — nem o administrador. */
export function bloqueioAlterarProprioPerfil(
  autor: AutorOperacao,
  alvo: AlvoOperacao,
  novoPerfil: PerfilAcesso
): string | null {
  if (autor.id !== alvo.id) return null;
  if (novoPerfil === alvo.perfil) return null;
  return "Você não pode alterar o seu próprio perfil de acesso.";
}

/** Só administrador cria ou promove outro administrador. */
export function bloqueioPromoverAdministrador(
  autor: AutorOperacao,
  novoPerfil: PerfilAcesso
): string | null {
  if (novoPerfil !== "administrador") return null;
  if (autor.perfil === "administrador") return null;
  return "Apenas um administrador pode conceder o perfil de administrador.";
}

/** Só administrador mexe na conta de outro administrador. */
export function bloqueioEditarAdministrador(
  autor: AutorOperacao,
  alvo: AlvoOperacao
): string | null {
  if (alvo.perfil !== "administrador") return null;
  if (autor.perfil === "administrador") return null;
  return "Apenas um administrador pode alterar a conta de outro administrador.";
}

/** A própria conta não pode ser excluída — evita perder o acesso por engano. */
export function bloqueioExcluirPropriaConta(
  autor: AutorOperacao,
  alvo: AlvoOperacao
): string | null {
  if (autor.id !== alvo.id) return null;
  return "Você não pode excluir a sua própria conta.";
}

/** A própria conta não pode ser desativada pelo mesmo motivo. */
export function bloqueioDesativarPropriaConta(
  autor: AutorOperacao,
  alvo: AlvoOperacao,
  novoAtivo: boolean
): string | null {
  if (novoAtivo) return null;
  if (autor.id !== alvo.id) return null;
  return "Você não pode desativar a sua própria conta.";
}

/**
 * O sistema não pode ficar sem administrador ativo. Vale para exclusão,
 * desativação e rebaixamento de perfil — por isso recebe quantos outros
 * administradores ativos existem além do alvo.
 */
export function bloqueioUltimoAdministrador(
  alvo: AlvoOperacao,
  outrosAdministradoresAtivos: number,
  operacao: "excluir" | "desativar" | "rebaixar"
): string | null {
  if (alvo.perfil !== "administrador") return null;
  if (outrosAdministradoresAtivos > 0) return null;

  const acao = {
    excluir: "excluir",
    desativar: "desativar",
    rebaixar: "alterar o perfil d",
  }[operacao];

  return `Não é possível ${acao}o último administrador ativo do sistema.`;
}

/* ------------------------------------------------------------- Rótulos */

export const rotuloPerfil: Record<PerfilAcesso, string> = {
  administrador: "Administrador",
  gestor: "Gestor",
  corretor: "Corretor",
  assistente: "Assistente",
  usuario: "Usuário",
};

export const descricaoPerfil: Record<PerfilAcesso, string> = {
  administrador:
    "Acesso total: administra usuários e perfis, além de imóveis, clientes, contratos, anúncios e configurações.",
  gestor:
    "Gerencia a operação — imóveis, clientes, leads, anúncios e contratos — e consulta a equipe, sem administrar contas.",
  corretor: "Gerencia seus clientes, imóveis vinculados, visitas e propostas.",
  assistente: "Cadastra clientes, organiza documentos e agenda visitas.",
  usuario: "Acesso básico de consulta ao painel, sem permissão de edição.",
};
