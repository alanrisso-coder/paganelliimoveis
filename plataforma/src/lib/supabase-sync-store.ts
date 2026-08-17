/**
 * Sincronização entre store em memória e Supabase PostgreSQL
 * Carrega dados do banco na inicialização e permite sincronizar mudanças
 */

import type { Imovel, Cliente, Anuncio } from "./types";
import {
  obterImoveis,
  obterClientes,
  obterAnunciosPublicos,
  atualizarImovel,
  atualizarCliente,
  type DbImovel,
  type DbCliente,
  type DbAnuncio,
} from "./supabase-client";

/**
 * Converter dados do Supabase (DbImovel) para formato interno (Imovel)
 */
export function converterDbImovelParaImovel(db: DbImovel): Imovel {
  return {
    id: db.id,
    codigo: db.codigo,
    titulo: db.titulo,
    slug: db.slug,
    tipo: db.tipo as any,
    finalidade: db.finalidade as any,
    status: db.status as any,
    endereco: {
      logradouro: db.logradouro || "",
      numero: db.numero || "",
      complemento: undefined,
      bairro: db.bairro,
      cidade: db.cidade,
      estado: db.estado || "",
      cep: db.cep || "",
      latitude: db.latitude || 0,
      longitude: db.longitude || 0,
    },
    valores: {
      venda: db.valor_venda ?? undefined,
      aluguel: db.valor_aluguel ?? undefined,
      condominio: db.valor_condominio ?? undefined,
      iptu: db.valor_iptu ?? undefined,
    },
    metragens: {
      areaTotal: db.area_total,
      areaConstruida: db.area_construida ?? undefined,
      dormitorios: db.dormitorios,
      suites: db.suites,
      banheiros: db.banheiros,
      vagas: db.vagas,
      andar: db.andar ?? undefined,
    },
    caracteristicas: db.caracteristicas || [],
    diferenciais: db.diferenciais || [],
    descricaoCurta: db.descricao_curta || "",
    descricaoCompleta: db.descricao_completa || "",
    fotos: db.fotos || [],
    videoUrl: db.video_url ?? undefined,
    tourVirtualUrl: db.tour_virtual_url ?? undefined,
    plantas: db.plantas || [],
    documentos: db.documentos || [],
    proprietarioId: db.proprietario_id ?? undefined,
    corretorId: db.corretor_id,
    exclusivo: db.exclusivo,
    exclusividadeAte: db.exclusividade_ate ?? undefined,
    seo: {
      titulo: db.seo_titulo || "",
      descricao: db.seo_descricao || "",
    },
    historico: [],
    criadoEm: db.criado_em,
  };
}

/**
 * Converter dados do Supabase (DbCliente) para formato interno (Cliente)
 */
export function converterDbClienteParaCliente(db: DbCliente): Cliente {
  return {
    id: db.id,
    nome: db.nome,
    documento: db.documento || "",
    telefone: db.telefone || "",
    whatsapp: db.whatsapp || "",
    email: db.email || "",
    endereco: db.endereco ?? undefined,
    tipo: db.tipo as any,
    origem: db.origem as any,
    corretorId: db.corretor_id,
    orcamentoMin: db.orcamento_min ?? undefined,
    orcamentoMax: db.orcamento_max ?? undefined,
    interesses: (db.interesses || []) as any[],
    preferencias: db.preferencias || { tipos: [], regioes: [], caracteristicas: [] },
    etapa: db.etapa as any,
    timeline: db.timeline || [],
    documentos: [],
    favoritos: db.favoritos || [],
    recomendados: db.recomendados || [],
    observacoes: db.observacoes ?? undefined,
    criadoEm: db.criado_em,
    atualizadoEm: db.atualizado_em,
  };
}

/**
 * Converter dados do Supabase (DbAnuncio) para formato interno (Anuncio)
 */
export function converterDbAnuncioParaAnuncio(db: DbAnuncio): Anuncio {
  return {
    id: db.id,
    codigo: db.codigo,
    imovelId: db.imovel_id,
    titulo: db.titulo,
    subtitulo: db.subtitulo || "",
    descricaoComercial: db.descricao_comercial || "",
    destaques: [],
    capaIndice: db.capa_indice,
    ordemGaleria: db.ordem_galeria || [],
    selos: db.selos || [],
    status: db.status as any,
    visibilidade: db.visibilidade as any,
    publicarEm: db.publicar_em || undefined,
    expirarEm: db.expirar_em || undefined,
    destaqueHome: db.destaque_home,
    metricas: db.metricas || { visualizacoes: 0, interesse: 0, contatos: 0 },
    corretorId: db.corretor_id,
    criadoEm: db.criado_em,
    atualizadoEm: db.atualizado_em,
  };
}

/**
 * Converter Cliente para Supabase (DbCliente)
 */
export function converterClienteParaDbCliente(
  cliente: Cliente
): Omit<DbCliente, "criado_em" | "atualizado_em"> {
  return {
    id: cliente.id,
    nome: cliente.nome,
    documento: cliente.documento || null,
    telefone: cliente.telefone || null,
    whatsapp: cliente.whatsapp || null,
    email: cliente.email || null,
    endereco: cliente.endereco || null,
    tipo: cliente.tipo,
    origem: cliente.origem,
    corretor_id: cliente.corretorId,
    orcamento_min: cliente.orcamentoMin ?? null,
    orcamento_max: cliente.orcamentoMax ?? null,
    interesses: cliente.interesses,
    preferencias: cliente.preferencias,
    etapa: cliente.etapa,
    timeline: cliente.timeline,
    favoritos: cliente.favoritos,
    recomendados: cliente.recomendados,
    observacoes: cliente.observacoes || null,
  };
}

/**
 * Converter formato interno (Imovel) para Supabase (DbImovel)
 */
export function converterImovelParaDbImovel(
  imovel: Imovel
): Omit<DbImovel, "criado_em" | "atualizado_em"> {
  const result: any = {
    id: imovel.id,
    codigo: imovel.codigo,
    titulo: imovel.titulo,
    slug: imovel.slug,
    tipo: imovel.tipo,
    finalidade: imovel.finalidade,
    status: imovel.status,
    logradouro: imovel.endereco.logradouro,
    numero: imovel.endereco.numero,
    bairro: imovel.endereco.bairro,
    cidade: imovel.endereco.cidade,
    estado: imovel.endereco.estado,
    cep: imovel.endereco.cep,
    latitude: imovel.endereco.latitude,
    longitude: imovel.endereco.longitude,
    valor_venda: imovel.valores.venda ?? null,
    valor_aluguel: imovel.valores.aluguel ?? null,
    valor_condominio: imovel.valores.condominio ?? null,
    valor_iptu: imovel.valores.iptu ?? null,
    area_total: imovel.metragens.areaTotal,
    area_construida: imovel.metragens.areaConstruida ?? null,
    dormitorios: imovel.metragens.dormitorios,
    suites: imovel.metragens.suites,
    banheiros: imovel.metragens.banheiros,
    vagas: imovel.metragens.vagas,
    andar: imovel.metragens.andar ?? null,
    caracteristicas: imovel.caracteristicas,
    diferenciais: imovel.diferenciais,
    descricao_curta: imovel.descricaoCurta ?? null,
    descricao_completa: imovel.descricaoCompleta ?? null,
    fotos: imovel.fotos,
    video_url: imovel.videoUrl ?? null,
    tour_virtual_url: imovel.tourVirtualUrl ?? null,
    plantas: imovel.plantas,
    documentos: imovel.documentos,
    proprietario_id: imovel.proprietarioId || null,
    corretor_id: imovel.corretorId,
    exclusivo: imovel.exclusivo,
    exclusividade_ate: imovel.exclusividadeAte ?? null,
    seo_titulo: imovel.seo.titulo ?? null,
    seo_descricao: imovel.seo.descricao ?? null,
  };
  return result;
}

/**
 * Carregar todos os dados do Supabase
 */
export async function carregarTodosDadosSupabase() {
  try {
    const [imoveisDb, clientesDb, anunciosDb] = await Promise.all([
      obterImoveis(),
      obterClientes(),
      obterAnunciosPublicos(),
    ]);

    return {
      imoveis: imoveisDb.map(converterDbImovelParaImovel),
      clientes: clientesDb.map(converterDbClienteParaCliente),
      anuncios: anunciosDb.map(converterDbAnuncioParaAnuncio),
    };
  } catch (erro) {
    console.error("Erro ao carregar dados do Supabase:", erro);
    return null;
  }
}

/**
 * Sincronizar um imóvel de volta para Supabase
 */
export async function sincronizarImovel(imovel: Imovel): Promise<boolean> {
  try {
    await atualizarImovel(imovel.id, converterImovelParaDbImovel(imovel));
    return true;
  } catch (erro) {
    console.error("Erro ao sincronizar imóvel:", erro);
    return false;
  }
}

/**
 * Sincronizar um cliente de volta para Supabase
 */
export async function sincronizarCliente(cliente: Cliente): Promise<boolean> {
  try {
    await atualizarCliente(cliente.id, {
      nome: cliente.nome,
      documento: cliente.documento || null,
      telefone: cliente.telefone || null,
      whatsapp: cliente.whatsapp || null,
      email: cliente.email || null,
      endereco: cliente.endereco || null,
      tipo: cliente.tipo,
      origem: cliente.origem,
      corretor_id: cliente.corretorId,
      orcamento_min: cliente.orcamentoMin ?? null,
      orcamento_max: cliente.orcamentoMax ?? null,
      interesses: cliente.interesses,
      preferencias: cliente.preferencias,
      etapa: cliente.etapa,
      timeline: cliente.timeline,
      favoritos: cliente.favoritos,
      recomendados: cliente.recomendados,
      observacoes: cliente.observacoes ?? null,
    });
    return true;
  } catch (erro) {
    console.error("Erro ao sincronizar cliente:", erro);
    return false;
  }
}
