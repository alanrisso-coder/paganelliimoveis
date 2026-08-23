/**
 * Cliente de acesso ao Supabase.
 *
 * Todas as operações de leitura, escrita, atualização e exclusão passam
 * pelos API routes em /api/sync/*, que usam SUPABASE_SERVICE_ROLE_KEY no
 * servidor. Isso é necessário porque as tabelas têm RLS (Row Level
 * Security) ativado e a chave pública (ANON_KEY) não tem permissão de
 * leitura nem escrita — apenas o servidor, com a service role key, pode
 * acessar os dados.
 */

// Tipos para o banco de dados
export interface DbImovel {
  id: string;
  codigo: string;
  titulo: string;
  slug: string;
  tipo: string;
  finalidade: string;
  status: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  latitude: number | null;
  longitude: number | null;
  valor_venda: number | null;
  valor_aluguel: number | null;
  valor_condominio: number | null;
  valor_iptu: number | null;
  area_total: number;
  area_construida: number | null;
  dormitorios: number;
  suites: number;
  banheiros: number;
  vagas: number;
  andar: number | null;
  caracteristicas: string[];
  diferenciais: string[];
  descricao_curta: string | null;
  descricao_completa: string | null;
  fotos: string[];
  video_url: string | null;
  tour_virtual_url: string | null;
  plantas: string[];
  documentos: any[];
  proprietario_id: string | null;
  corretor_id: string;
  exclusivo: boolean;
  exclusividade_ate: string | null;
  seo_titulo: string | null;
  seo_descricao: string | null;
  aceita_permuta: boolean | null;
  idade_anos: number | null;
  perfil: string | null;
  posicao_solar: string | null;
  situacao: string | null;
  escriturado: boolean | null;
  averbado: boolean | null;
  terreno: string | null;
  aceita_financiamento: boolean | null;
  criado_em: string;
  atualizado_em: string;
}

export interface DbAnuncio {
  id: string;
  codigo: string;
  imovel_id: string;
  titulo: string;
  subtitulo: string | null;
  descricao_comercial: string | null;
  status: string;
  visibilidade: string;
  publicar_em: string | null;
  expirar_em: string | null;
  destaque_home: boolean;
  capa_indice: number;
  ordem_galeria: number[];
  selos: any[];
  metricas: any;
  instagram_enabled: boolean;
  instagram_status: string;
  instagram_caption: string | null;
  instagram_published_at: string | null;
  instagram_post_id: string | null;
  instagram_post_url: string | null;
  instagram_error: string | null;
  corretor_id: string;
  criado_em: string;
  atualizado_em: string;
}

export interface DbUsuario {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  perfil: string;
  creci: string | null;
  avatar_iniciais: string;
  avatar_url?: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  ultimo_acesso_em?: string | null;
  precisa_trocar_senha?: boolean | null;
}

export interface DbCliente {
  id: string;
  nome: string;
  documento: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  tipo: string;
  origem: string;
  corretor_id: string;
  orcamento_min: number | null;
  orcamento_max: number | null;
  interesses: string[];
  preferencias: any;
  etapa: string;
  timeline: any[];
  favoritos: string[];
  recomendados: string[];
  observacoes: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface DbVisita {
  id: string;
  codigo: string | null;
  imovel_id: string;
  cliente_id: string;
  corretor_id: string;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  modalidade: string | null;
  ponto_encontro: string | null;
  status: string;
  confirmada_pelo_cliente: boolean;
  lembrete_enviado: boolean;
  feedback_cliente: string | null;
  observacoes_corretor: string | null;
  proxima_acao: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface DbContrato {
  id: string;
  numero: string;
  proprietario_id: string;
  imovel_id: string;
  corretor_id: string;
  data_inicio: string;
  data_termino: string;
  prazo_meses: number;
  valor_anuncio: number | null;
  comissao_percentual: number | null;
  status: string;
  documentos: any[];
  clausulas_especiais: string | null;
  observacoes: string | null;
  renovacoes: any[];
  criado_em: string;
}

export interface DbLead {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  mensagem: string | null;
  canal: string | null;
  imovel_id: string | null;
  anuncio_id: string | null;
  status: string;
  corretor_id: string | null;
  cliente_id: string | null;
  criado_em: string;
  atualizado_em: string;
}

export interface DbWhatsappMensagem {
  id: string;
  lead_id: string | null;
  cliente_id: string | null;
  telefone: string;
  tipo_mensagem: string;
  status: "pendente" | "enviado" | "erro";
  whatsapp_message_id: string | null;
  erro: string | null;
  enviado_em: string | null;
  criado_em: string;
}

async function apiGet<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);

    // 401/403 não é falha: o store roda também no site público, onde algumas
    // rotas (a lista da equipe, por exemplo) exigem sessão. Sem acesso, o
    // chamador simplesmente fica sem esses dados — registrar como erro só
    // encheria o console de visitante com ruído esperado.
    if (response.status === 401 || response.status === 403) return null;

    if (!response.ok) {
      const error = await response.json();
      console.error(`Erro ao buscar ${url}:`, error);
      return null;
    }
    const { data } = await response.json();
    return data as T;
  } catch (error) {
    console.error(`Erro ao buscar ${url}:`, error);
    return null;
  }
}

async function apiPost<T>(url: string, body: unknown): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const error = await response.json();
      console.error(`Erro ao enviar para ${url}:`, error);
      return null;
    }
    const { data } = await response.json();
    return data as T;
  } catch (error) {
    console.error(`Erro ao enviar para ${url}:`, error);
    return null;
  }
}

async function apiPatch<T>(
  url: string,
  id: string,
  updates: unknown
): Promise<T | null> {
  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates }),
    });
    if (!response.ok) {
      const error = await response.json();
      console.error(`Erro ao atualizar em ${url}:`, error);
      return null;
    }
    const { data } = await response.json();
    return data as T;
  } catch (error) {
    console.error(`Erro ao atualizar em ${url}:`, error);
    return null;
  }
}

async function apiDelete(url: string, id: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const error = await response.json();
      console.error(`Erro ao deletar em ${url}:`, error);
      return false;
    }
    return true;
  } catch (error) {
    console.error(`Erro ao deletar em ${url}:`, error);
    return false;
  }
}

// -------------------------------------------------------------- Usuários

export async function obterUsuarios(): Promise<DbUsuario[]> {
  const data = await apiGet<DbUsuario[]>("/api/sync/usuarios");
  return data ?? [];
}

/** Atualiza campos de perfil (ex.: avatar_url). Senha não passa por aqui — ver /api/auth/alterar-senha. */
export async function atualizarUsuario(
  id: string,
  updates: Partial<Omit<DbUsuario, "id" | "criado_em" | "atualizado_em">>
): Promise<DbUsuario | null> {
  return apiPatch<DbUsuario>("/api/sync/usuarios", id, updates);
}

// --------------------------------------------------------------- Imóveis

export async function obterImoveis(): Promise<DbImovel[]> {
  const data = await apiGet<DbImovel[]>("/api/sync/imoveis");
  return data ?? [];
}

export async function obterImovelPorId(id: string): Promise<DbImovel | null> {
  return apiGet<DbImovel>(`/api/sync/imoveis?id=${encodeURIComponent(id)}`);
}

export async function obterImovelPorSlug(slug: string): Promise<DbImovel | null> {
  return apiGet<DbImovel>(`/api/sync/imoveis?slug=${encodeURIComponent(slug)}`);
}

export async function criarImovel(
  imovel: Omit<DbImovel, "criado_em" | "atualizado_em">
): Promise<DbImovel | null> {
  return apiPost<DbImovel>("/api/sync/imoveis", imovel);
}

export async function atualizarImovel(
  id: string,
  updates: Partial<DbImovel>
): Promise<DbImovel | null> {
  return apiPatch<DbImovel>("/api/sync/imoveis", id, updates);
}

export async function deletarImovel(id: string): Promise<boolean> {
  return apiDelete("/api/sync/imoveis", id);
}

// -------------------------------------------------------------- Anúncios

export async function obterAnuncios(): Promise<DbAnuncio[]> {
  const data = await apiGet<DbAnuncio[]>("/api/sync/anuncios");
  return data ?? [];
}

export async function obterAnunciosPublicos(): Promise<DbAnuncio[]> {
  const data = await apiGet<DbAnuncio[]>("/api/sync/anuncios?publicos=true");
  return data ?? [];
}

/**
 * Colunas de publicação no Instagram. Ficam fora dos payloads de escrita do
 * app: têm default no banco ("não publicar") e são escritas apenas pelas
 * rotas `/api/instagram/*`.
 */
export type CamposInstagramAnuncio =
  | "instagram_enabled"
  | "instagram_status"
  | "instagram_caption"
  | "instagram_published_at"
  | "instagram_post_id"
  | "instagram_post_url"
  | "instagram_error";

export async function criarAnuncio(
  anuncio: Omit<DbAnuncio, "criado_em" | "atualizado_em" | CamposInstagramAnuncio>
): Promise<DbAnuncio | null> {
  return apiPost<DbAnuncio>("/api/sync/anuncios", anuncio);
}

export async function atualizarAnuncio(
  id: string,
  updates: Partial<DbAnuncio>
): Promise<DbAnuncio | null> {
  return apiPatch<DbAnuncio>("/api/sync/anuncios", id, updates);
}

export async function deletarAnuncio(id: string): Promise<boolean> {
  return apiDelete("/api/sync/anuncios", id);
}

// -------------------------------------------------------------- Clientes

export async function obterClientes(): Promise<DbCliente[]> {
  const data = await apiGet<DbCliente[]>("/api/sync/clientes");
  return data ?? [];
}

export async function obterClientePorId(id: string): Promise<DbCliente | null> {
  return apiGet<DbCliente>(`/api/sync/clientes?id=${encodeURIComponent(id)}`);
}

export async function criarCliente(
  cliente: Omit<DbCliente, "criado_em" | "atualizado_em">
): Promise<DbCliente | null> {
  return apiPost<DbCliente>("/api/sync/clientes", cliente);
}

export async function atualizarCliente(
  id: string,
  updates: Partial<DbCliente>
): Promise<DbCliente | null> {
  return apiPatch<DbCliente>("/api/sync/clientes", id, updates);
}

export async function deletarCliente(id: string): Promise<boolean> {
  return apiDelete("/api/sync/clientes", id);
}

// --------------------------------------------------------------- Visitas

export async function obterVisitas(): Promise<DbVisita[]> {
  const data = await apiGet<DbVisita[]>("/api/sync/visitas");
  return data ?? [];
}

export async function criarVisita(
  visita: Omit<DbVisita, "criado_em" | "atualizado_em">
): Promise<DbVisita | null> {
  return apiPost<DbVisita>("/api/sync/visitas", visita);
}

export async function atualizarVisita(
  id: string,
  updates: Partial<DbVisita>
): Promise<DbVisita | null> {
  return apiPatch<DbVisita>("/api/sync/visitas", id, updates);
}

export async function deletarVisita(id: string): Promise<boolean> {
  return apiDelete("/api/sync/visitas", id);
}

// -------------------------------------------------------------- Contratos

export async function obterContratos(): Promise<DbContrato[]> {
  const data = await apiGet<DbContrato[]>("/api/sync/contratos");
  return data ?? [];
}

export async function criarContrato(
  contrato: Omit<DbContrato, "criado_em">
): Promise<DbContrato | null> {
  return apiPost<DbContrato>("/api/sync/contratos", contrato);
}

export async function atualizarContrato(
  id: string,
  updates: Partial<DbContrato>
): Promise<DbContrato | null> {
  return apiPatch<DbContrato>("/api/sync/contratos", id, updates);
}

export async function deletarContrato(id: string): Promise<boolean> {
  return apiDelete("/api/sync/contratos", id);
}

// ------------------------------------------------------------------ Leads

export async function obterLeads(): Promise<DbLead[]> {
  const data = await apiGet<DbLead[]>("/api/sync/leads");
  return data ?? [];
}

export async function criarLead(
  lead: Omit<DbLead, "criado_em" | "atualizado_em">
): Promise<DbLead | null> {
  return apiPost<DbLead>("/api/sync/leads", lead);
}

export async function atualizarLead(
  id: string,
  updates: Partial<DbLead>
): Promise<DbLead | null> {
  return apiPatch<DbLead>("/api/sync/leads", id, updates);
}

export async function deletarLead(id: string): Promise<boolean> {
  return apiDelete("/api/sync/leads", id);
}

// ------------------------------------------------------- WhatsApp (leitura)

/** Histórico de mensagens de WhatsApp de um cliente (mais recente primeiro). */
export async function obterMensagensWhatsappPorCliente(
  clienteId: string
): Promise<DbWhatsappMensagem[]> {
  const data = await apiGet<DbWhatsappMensagem[]>(
    `/api/sync/whatsapp-mensagens?clienteId=${encodeURIComponent(clienteId)}`
  );
  return data ?? [];
}
