import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Variáveis de ambiente Supabase não configuradas");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

// Funções de acesso ao banco
export async function obterImoveis() {
  const { data, error } = await supabase
    .from("imoveis")
    .select("*");

  if (error) {
    console.error("Erro ao obter imóveis:", error);
    return [];
  }

  return (data || []) as DbImovel[];
}

export async function obterImovelPorId(id: string) {
  const { data, error } = await supabase
    .from("imoveis")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao obter imóvel:", error);
    return null;
  }

  return data as DbImovel;
}

export async function obterImovelPorSlug(slug: string) {
  const { data, error } = await supabase
    .from("imoveis")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error) {
    console.error("Erro ao obter imóvel:", error);
    return null;
  }

  return data as DbImovel;
}

export async function criarImovel(imovel: Omit<DbImovel, "criado_em" | "atualizado_em">) {
  const { data, error } = await supabase
    .from("imoveis")
    .insert([imovel])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar imóvel:", error);
    return null;
  }

  return data as DbImovel;
}

export async function atualizarImovel(id: string, updates: Partial<DbImovel>) {
  const { data, error } = await supabase
    .from("imoveis")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar imóvel:", error);
    return null;
  }

  return data as DbImovel;
}

export async function obterAnuncios() {
  const { data, error } = await supabase
    .from("anuncios")
    .select("*");

  if (error) {
    console.error("Erro ao obter anúncios:", error);
    return [];
  }

  return (data || []) as DbAnuncio[];
}

export async function obterAnunciosPublicos() {
  const { data, error } = await supabase
    .from("anuncios")
    .select("*")
    .eq("visibilidade", "publico")
    .eq("status", "publicado");

  if (error) {
    console.error("Erro ao obter anúncios públicos:", error);
    return [];
  }

  return (data || []) as DbAnuncio[];
}

export async function criarAnuncio(anuncio: Omit<DbAnuncio, "criado_em" | "atualizado_em">) {
  const { data, error } = await supabase
    .from("anuncios")
    .insert([anuncio])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar anúncio:", error);
    return null;
  }

  return data as DbAnuncio;
}

export async function atualizarAnuncio(id: string, updates: Partial<DbAnuncio>) {
  const { data, error } = await supabase
    .from("anuncios")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar anúncio:", error);
    return null;
  }

  return data as DbAnuncio;
}

export async function obterClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("*");

  if (error) {
    console.error("Erro ao obter clientes:", error);
    return [];
  }

  return (data || []) as DbCliente[];
}

export async function obterClientePorId(id: string) {
  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Erro ao obter cliente:", error);
    return null;
  }

  return data as DbCliente;
}

export async function criarCliente(cliente: Omit<DbCliente, "criado_em" | "atualizado_em">) {
  const { data, error } = await supabase
    .from("clientes")
    .insert([cliente])
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar cliente:", error);
    return null;
  }

  return data as DbCliente;
}

export async function atualizarCliente(id: string, updates: Partial<DbCliente>) {
  const { data, error } = await supabase
    .from("clientes")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Erro ao atualizar cliente:", error);
    return null;
  }

  return data as DbCliente;
}

// Funções de Delete

export async function deletarImovel(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("imoveis")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao deletar imóvel:", error);
    return false;
  }

  return true;
}

export async function deletarCliente(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("clientes")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao deletar cliente:", error);
    return false;
  }

  return true;
}

export async function deletarAnuncio(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("anuncios")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Erro ao deletar anúncio:", error);
    return false;
  }

  return true;
}
