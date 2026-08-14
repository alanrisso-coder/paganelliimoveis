import type { PerfilAcesso } from "./types";

/**
 * Matriz de permissões por perfil.
 *
 * A checagem aqui é de interface — esconde e desabilita o que o perfil não pode
 * fazer. Ao ligar o backend, a mesma matriz deve ser aplicada nas policies do
 * banco (RLS no Supabase) ou no middleware da API: interface não é fronteira
 * de segurança.
 */
export type Permissao =
  | "ver_dashboard"
  | "ver_crm"
  | "editar_cliente"
  | "ver_imoveis"
  | "editar_imovel"
  | "ver_anuncios"
  | "publicar_anuncio"
  | "ver_visitas"
  | "agendar_visita"
  | "ver_contratos"
  | "editar_contrato"
  | "ver_leads"
  | "atribuir_lead"
  | "ver_relatorios"
  | "ver_configuracoes"
  | "gerenciar_usuarios";

const matriz: Record<PerfilAcesso, Permissao[]> = {
  administrador: [
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
    "editar_contrato",
    "ver_leads",
    "atribuir_lead",
    "ver_relatorios",
    "ver_configuracoes",
    "gerenciar_usuarios",
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
};

export function podeFazer(perfil: PerfilAcesso, permissao: Permissao): boolean {
  return matriz[perfil].includes(permissao);
}

export const rotuloPerfil: Record<PerfilAcesso, string> = {
  administrador: "Administrador",
  corretor: "Corretor",
  assistente: "Assistente",
};

export const descricaoPerfil: Record<PerfilAcesso, string> = {
  administrador: "Acesso total a usuários, imóveis, clientes, contratos, anúncios e configurações.",
  corretor: "Gerencia seus clientes, imóveis vinculados, visitas e propostas.",
  assistente: "Cadastra clientes, organiza documentos e agenda visitas.",
};
