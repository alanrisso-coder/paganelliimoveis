/**
 * Sincronização entre store em memória e Supabase PostgreSQL
 * Carrega dados do banco na inicialização e permite sincronizar mudanças
 */

import type { Imovel, Cliente, Anuncio, Usuario, Visita, Contrato, Lead } from "./types";
import {
  obterImoveis,
  obterClientes,
  obterAnunciosPublicos,
  obterUsuarios,
  obterVisitas,
  obterContratos,
  obterLeads,
  atualizarImovel,
  atualizarCliente,
  type DbImovel,
  type DbCliente,
  type DbAnuncio,
  type DbUsuario,
  type DbVisita,
  type DbContrato,
  type DbLead,
  type CamposInstagramAnuncio,
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
    aceitaPermuta: db.aceita_permuta ?? undefined,
    idadeAnos: db.idade_anos ?? undefined,
    perfil: (db.perfil as any) ?? undefined,
    posicaoSolar: (db.posicao_solar as any) ?? undefined,
    situacao: (db.situacao as any) ?? undefined,
    escriturado: db.escriturado ?? undefined,
    averbado: db.averbado ?? undefined,
    terreno: (db.terreno as any) ?? undefined,
    aceitaFinanciamento: db.aceita_financiamento ?? undefined,
  };
}

/**
 * Converter dados do Supabase (DbCliente) para formato interno (Cliente)
 */
/**
 * Converter dados do Supabase (DbUsuario) para formato interno (Usuario)
 */
export function converterDbUsuarioParaUsuario(db: DbUsuario): Usuario {
  return {
    id: db.id,
    nome: db.nome,
    email: db.email,
    telefone: db.telefone || "",
    perfil: db.perfil as any,
    creci: db.creci || undefined,
    avatarIniciais: db.avatar_iniciais,
    avatarUrl: db.avatar_url || undefined,
    ativo: db.ativo,
    criadoEm: db.criado_em,
    ultimoAcessoEm: db.ultimo_acesso_em || undefined,
    precisaTrocarSenha: Boolean(db.precisa_trocar_senha),
  };
}

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
    metricas: db.metricas || { visualizacoes: 0, conversoes: 0, contatos: 0 },
    instagram: {
      // Anúncio anterior à migration 006 vem sem as colunas: o default é
      // sempre "não publicar", nunca a marcação ligada.
      habilitado: db.instagram_enabled ?? false,
      status: (db.instagram_status as Anuncio["instagram"]["status"]) ?? "NOT_REQUESTED",
      legenda: db.instagram_caption ?? undefined,
      publicadoEm: db.instagram_published_at ?? undefined,
      postId: db.instagram_post_id ?? undefined,
      postUrl: db.instagram_post_url ?? undefined,
      erro: db.instagram_error ?? undefined,
    },
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
    aceita_permuta: imovel.aceitaPermuta ?? null,
    idade_anos: imovel.idadeAnos ?? null,
    perfil: imovel.perfil ?? null,
    posicao_solar: imovel.posicaoSolar ?? null,
    situacao: imovel.situacao ?? null,
    escriturado: imovel.escriturado ?? null,
    averbado: imovel.averbado ?? null,
    terreno: imovel.terreno ?? null,
    aceita_financiamento: imovel.aceitaFinanciamento ?? null,
  };
  return result;
}

/**
 * Converter formato interno (Anuncio) para Supabase (DbAnuncio)
 */
export function converterAnuncioParaDbAnuncio(
  anuncio: Anuncio
): Omit<DbAnuncio, "criado_em" | "atualizado_em" | CamposInstagramAnuncio> {
  return {
    id: anuncio.id,
    codigo: anuncio.codigo,
    imovel_id: anuncio.imovelId,
    titulo: anuncio.titulo,
    subtitulo: anuncio.subtitulo || null,
    descricao_comercial: anuncio.descricaoComercial || null,
    status: anuncio.status,
    visibilidade: anuncio.visibilidade,
    publicar_em: anuncio.publicarEm ?? null,
    expirar_em: anuncio.expirarEm ?? null,
    destaque_home: anuncio.destaqueHome,
    capa_indice: anuncio.capaIndice,
    ordem_galeria: anuncio.ordemGaleria,
    selos: anuncio.selos,
    metricas: anuncio.metricas,
    corretor_id: anuncio.corretorId,
  };
}

/**
 * Os campos `instagram_*` são deliberadamente omitidos acima.
 *
 * `atualizarAnuncio` grava a linha inteira a partir do estado local, que pode
 * estar desatualizado: se o conversor incluísse esses campos, editar a
 * visibilidade de um anúncio enquanto uma publicação está em andamento
 * sobrescreveria `instagram_status` com o valor antigo do cliente e desfaria
 * a trava de duplicação.
 *
 * Esses campos pertencem exclusivamente às rotas de servidor
 * (`/api/instagram/*`), que são a única coisa que os escreve.
 */

/**
 * Converter dados do Supabase (DbVisita) para formato interno (Visita)
 */
export function converterDbVisitaParaVisita(db: DbVisita): Visita {
  return {
    id: db.id,
    codigo: db.codigo || "",
    clienteId: db.cliente_id,
    imovelId: db.imovel_id,
    corretorId: db.corretor_id,
    data: db.data,
    horaInicio: db.hora_inicio || "",
    horaFim: db.hora_fim || "",
    modalidade: (db.modalidade as any) || "presencial",
    pontoEncontro: db.ponto_encontro || "",
    status: db.status as any,
    confirmadaPeloCliente: db.confirmada_pelo_cliente,
    lembreteEnviado: db.lembrete_enviado,
    feedbackCliente: db.feedback_cliente ?? undefined,
    observacoesCorretor: db.observacoes_corretor ?? undefined,
    proximaAcao: db.proxima_acao ?? undefined,
    criadoEm: db.criado_em,
  };
}

/**
 * Converter formato interno (Visita) para Supabase (DbVisita)
 */
export function converterVisitaParaDbVisita(
  visita: Visita
): Omit<DbVisita, "criado_em" | "atualizado_em"> {
  return {
    id: visita.id,
    codigo: visita.codigo || null,
    imovel_id: visita.imovelId,
    cliente_id: visita.clienteId,
    corretor_id: visita.corretorId,
    data: visita.data,
    hora_inicio: visita.horaInicio || null,
    hora_fim: visita.horaFim || null,
    modalidade: visita.modalidade,
    ponto_encontro: visita.pontoEncontro || null,
    status: visita.status,
    confirmada_pelo_cliente: visita.confirmadaPeloCliente,
    lembrete_enviado: visita.lembreteEnviado,
    feedback_cliente: visita.feedbackCliente ?? null,
    observacoes_corretor: visita.observacoesCorretor ?? null,
    proxima_acao: visita.proximaAcao ?? null,
  };
}

/**
 * Converter dados do Supabase (DbContrato) para formato interno (Contrato)
 */
export function converterDbContratoParaContrato(db: DbContrato): Contrato {
  return {
    id: db.id,
    numero: db.numero,
    proprietarioId: db.proprietario_id,
    imovelId: db.imovel_id,
    corretorId: db.corretor_id,
    dataInicio: db.data_inicio,
    dataTermino: db.data_termino,
    prazoMeses: db.prazo_meses,
    valorAnuncio: db.valor_anuncio ?? 0,
    comissaoPercentual: db.comissao_percentual ?? 0,
    status: db.status as any,
    documentos: db.documentos || [],
    clausulasEspeciais: db.clausulas_especiais ?? undefined,
    observacoes: db.observacoes ?? undefined,
    renovacoes: db.renovacoes || [],
    criadoEm: db.criado_em,
  };
}

/**
 * Converter formato interno (Contrato) para Supabase (DbContrato)
 */
export function converterContratoParaDbContrato(
  contrato: Contrato
): Omit<DbContrato, "criado_em"> {
  return {
    id: contrato.id,
    numero: contrato.numero,
    proprietario_id: contrato.proprietarioId,
    imovel_id: contrato.imovelId,
    corretor_id: contrato.corretorId,
    data_inicio: contrato.dataInicio,
    data_termino: contrato.dataTermino,
    prazo_meses: contrato.prazoMeses,
    valor_anuncio: contrato.valorAnuncio ?? null,
    comissao_percentual: contrato.comissaoPercentual ?? null,
    status: contrato.status,
    documentos: contrato.documentos,
    clausulas_especiais: contrato.clausulasEspeciais ?? null,
    observacoes: contrato.observacoes ?? null,
    renovacoes: contrato.renovacoes,
  };
}

/**
 * Converter dados do Supabase (DbLead) para formato interno (Lead)
 */
export function converterDbLeadParaLead(db: DbLead): Lead {
  return {
    id: db.id,
    nome: db.nome,
    email: db.email || "",
    telefone: db.telefone || "",
    mensagem: db.mensagem || "",
    canal: (db.canal as any) || "formulario_contato",
    imovelId: db.imovel_id ?? undefined,
    anuncioId: db.anuncio_id ?? undefined,
    status: db.status as any,
    corretorId: db.corretor_id ?? undefined,
    clienteId: db.cliente_id ?? undefined,
    criadoEm: db.criado_em,
  };
}

/**
 * Converter formato interno (Lead) para Supabase (DbLead)
 */
export function converterLeadParaDbLead(
  lead: Lead
): Omit<DbLead, "criado_em" | "atualizado_em"> {
  return {
    id: lead.id,
    nome: lead.nome,
    email: lead.email || null,
    telefone: lead.telefone || null,
    mensagem: lead.mensagem || null,
    canal: lead.canal,
    imovel_id: lead.imovelId ?? null,
    anuncio_id: lead.anuncioId ?? null,
    status: lead.status,
    corretor_id: lead.corretorId ?? null,
    cliente_id: lead.clienteId ?? null,
  };
}

/**
 * Carregar todos os dados do Supabase
 */
export async function carregarTodosDadosSupabase() {
  try {
    const [imoveisDb, clientesDb, anunciosDb, usuariosDb, visitasDb, contratosDb, leadsDb] =
      await Promise.all([
        obterImoveis(),
        obterClientes(),
        obterAnunciosPublicos(),
        obterUsuarios(),
        obterVisitas(),
        obterContratos(),
        obterLeads(),
      ]);

    return {
      imoveis: imoveisDb.map(converterDbImovelParaImovel),
      clientes: clientesDb.map(converterDbClienteParaCliente),
      anuncios: anunciosDb.map(converterDbAnuncioParaAnuncio),
      usuarios: usuariosDb.map(converterDbUsuarioParaUsuario),
      visitas: visitasDb.map(converterDbVisitaParaVisita),
      contratos: contratosDb.map(converterDbContratoParaContrato),
      leads: leadsDb.map(converterDbLeadParaLead),
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
