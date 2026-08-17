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
  corretor_id: string;
  criado_em: string;
  atualizado_em: string;
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

async function apiGet<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url);
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

export async function criarAnuncio(
  anuncio: Omit<DbAnuncio, "criado_em" | "atualizado_em">
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
