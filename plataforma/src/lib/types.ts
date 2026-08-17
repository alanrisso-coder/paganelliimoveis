/**
 * Modelo de domínio da plataforma Paganelli Imóveis.
 *
 * Os tipos abaixo espelham o schema previsto para PostgreSQL (Prisma/Supabase).
 * Enquanto o backend não é implementado, `lib/store.tsx` mantém os mesmos
 * formatos em memória, de modo que trocar a fonte de dados não exige mudar a UI.
 */

/* ---------------------------------------------------------------- Usuários */

export type PerfilAcesso = "administrador" | "corretor" | "assistente";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  perfil: PerfilAcesso;
  creci?: string;
  avatarIniciais: string;
  ativo: boolean;
  criadoEm: string;
}

/* ---------------------------------------------------------------- Clientes */

export type TipoCliente = "comprador" | "locatario" | "proprietario" | "investidor";

export type OrigemLead =
  | "site"
  | "indicacao"
  | "portal"
  | "whatsapp"
  | "instagram"
  | "placa"
  | "presencial";

export type InteresseCliente = "compra" | "venda" | "aluguel" | "investimento";

export type EtapaFunil =
  | "novo"
  | "contato"
  | "qualificado"
  | "visita"
  | "proposta"
  | "negociacao"
  | "fechado"
  | "perdido";

export type TipoInteracao =
  | "ligacao"
  | "mensagem"
  | "email"
  | "visita"
  | "documento"
  | "observacao"
  | "proposta";

export interface Interacao {
  id: string;
  tipo: TipoInteracao;
  titulo: string;
  detalhe?: string;
  data: string;
  autorId: string;
}

export interface DocumentoAnexo {
  id: string;
  nome: string;
  tipo: string;
  tamanhoKb: number;
  enviadoEm: string;
}

export interface PreferenciasImovel {
  tipos: TipoImovel[];
  regioes: string[];
  dormitoriosMin?: number;
  vagasMin?: number;
  areaMinima?: number;
  caracteristicas: string[];
}

export interface Tarefa {
  id: string;
  titulo: string;
  vencimento: string;
  concluida: boolean;
  responsavelId: string;
  clienteId?: string;
  imovelId?: string;
}

export interface Cliente {
  id: string;
  nome: string;
  documento: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco?: string;
  tipo: TipoCliente;
  origem: OrigemLead;
  corretorId: string;
  orcamentoMin?: number;
  orcamentoMax?: number;
  interesses: InteresseCliente[];
  preferencias: PreferenciasImovel;
  etapa: EtapaFunil;
  timeline: Interacao[];
  documentos: DocumentoAnexo[];
  favoritos: string[];
  recomendados: string[];
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
}

/* ----------------------------------------------------------------- Imóveis */

export type TipoImovel =
  | "casa"
  | "apartamento"
  | "terreno"
  | "comercial"
  | "fazenda"
  | "cobertura";

export type FinalidadeImovel = "venda" | "aluguel" | "ambos";

export type StatusImovel =
  | "disponivel"
  | "reservado"
  | "vendido"
  | "alugado"
  | "inativo";

export type PerfilImovel = "residencial" | "comercial" | "misto";

export type SituacaoImovel =
  | "pronto_morar"
  | "em_construcao"
  | "na_planta"
  | "reformado";

export type TopografiaTerreno = "plano" | "aclive" | "declive" | "irregular";

export type PosicaoSolar =
  | "manha"
  | "tarde"
  | "manha_tarde"
  | "norte"
  | "sul"
  | "nascente"
  | "poente";

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  latitude: number;
  longitude: number;
}

export interface ValoresImovel {
  venda?: number;
  aluguel?: number;
  condominio?: number;
  iptu?: number;
  outrasTaxas?: number;
}

export interface MetragensImovel {
  areaTotal: number;
  areaConstruida?: number;
  dormitorios: number;
  suites: number;
  banheiros: number;
  vagas: number;
  andar?: number;
}

export interface RegistroHistorico {
  id: string;
  data: string;
  autorId: string;
  descricao: string;
}

export interface Imovel {
  id: string;
  codigo: string;
  titulo: string;
  slug: string;
  tipo: TipoImovel;
  finalidade: FinalidadeImovel;
  status: StatusImovel;
  endereco: Endereco;
  valores: ValoresImovel;
  metragens: MetragensImovel;
  caracteristicas: string[];
  diferenciais: string[];
  descricaoCurta: string;
  descricaoCompleta: string;
  fotos: string[];
  videoUrl?: string;
  tourVirtualUrl?: string;
  plantas: string[];
  documentos: DocumentoAnexo[];
  proprietarioId?: string;
  corretorId: string;
  exclusivo: boolean;
  exclusividadeAte?: string;
  seo: { titulo: string; descricao: string };
  historico: RegistroHistorico[];
  criadoEm: string;
  /** Ficha do imóvel — atributos complementares mostrados no anúncio público. */
  aceitaPermuta?: boolean;
  idadeAnos?: number;
  perfil?: PerfilImovel;
  posicaoSolar?: PosicaoSolar;
  situacao?: SituacaoImovel;
  escriturado?: boolean;
  averbado?: boolean;
  terreno?: TopografiaTerreno;
  aceitaFinanciamento?: boolean;
}

/* ---------------------------------------------------------------- Anúncios */

export type StatusAnuncio =
  | "rascunho"
  | "revisao"
  | "publicado"
  | "pausado"
  | "expirado"
  | "arquivado";

export type VisibilidadeAnuncio = "publico" | "link" | "privado";

export type SeloAnuncio =
  | "exclusivo"
  | "lancamento"
  | "oportunidade"
  | "vendido"
  | "alugado";

export interface MetricasAnuncio {
  visualizacoes: number;
  contatos: number;
  conversoes: number;
}

export interface Anuncio {
  id: string;
  codigo: string;
  imovelId: string;
  titulo: string;
  subtitulo: string;
  descricaoComercial: string;
  destaques: string[];
  capaIndice: number;
  ordemGaleria: number[];
  selos: SeloAnuncio[];
  status: StatusAnuncio;
  visibilidade: VisibilidadeAnuncio;
  publicarEm?: string;
  expirarEm?: string;
  destaqueHome: boolean;
  metricas: MetricasAnuncio;
  corretorId: string;
  criadoEm: string;
  atualizadoEm: string;
}

/* ----------------------------------------------------------------- Visitas */

export type StatusVisita =
  | "agendada"
  | "confirmada"
  | "realizada"
  | "cancelada"
  | "nao_compareceu";

export type ModalidadeVisita = "presencial" | "virtual";

export interface Visita {
  id: string;
  codigo: string;
  clienteId: string;
  imovelId: string;
  corretorId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  modalidade: ModalidadeVisita;
  pontoEncontro: string;
  status: StatusVisita;
  confirmadaPeloCliente: boolean;
  lembreteEnviado: boolean;
  feedbackCliente?: string;
  observacoesCorretor?: string;
  proximaAcao?: string;
  criadoEm: string;
}

/* --------------------------------------------------------------- Contratos */

export type StatusContrato =
  | "rascunho"
  | "aguardando_assinatura"
  | "ativo"
  | "vencendo"
  | "vencido"
  | "encerrado"
  | "cancelado";

export interface Renovacao {
  id: string;
  data: string;
  prazoMeses: number;
  observacao: string;
}

export interface Contrato {
  id: string;
  numero: string;
  proprietarioId: string;
  imovelId: string;
  corretorId: string;
  dataInicio: string;
  dataTermino: string;
  prazoMeses: number;
  valorAnuncio: number;
  comissaoPercentual: number;
  status: StatusContrato;
  documentos: DocumentoAnexo[];
  clausulasEspeciais?: string;
  observacoes?: string;
  renovacoes: Renovacao[];
  criadoEm: string;
}

/* ------------------------------------------------------------------- Leads */

export type StatusLead = "novo" | "atribuido" | "em_atendimento" | "convertido" | "descartado";

export type CanalLead = "formulario_imovel" | "formulario_contato" | "anuncie" | "whatsapp" | "agendamento";

export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  mensagem: string;
  canal: CanalLead;
  imovelId?: string;
  anuncioId?: string;
  status: StatusLead;
  corretorId?: string;
  clienteId?: string;
  criadoEm: string;
}

/* ----------------------------------------------------------- Notificações */

export type TipoNotificacao = "lead" | "visita" | "contrato" | "anuncio";

export interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  descricao: string;
  data: string;
  lida: boolean;
  href?: string;
}

/* ------------------------------------------------------- Registro de ações */

export interface LogAcao {
  id: string;
  data: string;
  usuarioId: string;
  acao: string;
  entidade: string;
  detalhe: string;
}

/* --------------------------------------------------------- Filtros públicos */

export interface FiltrosBusca {
  termo?: string;
  regiao?: string;
  tipo?: TipoImovel | "todos";
  finalidade?: "venda" | "aluguel" | "todos";
  precoMin?: number;
  precoMax?: number;
  dormitorios?: number;
  vagas?: number;
  caracteristicas?: string[];
  ordenacao?: OrdenacaoBusca;
}

export type OrdenacaoBusca =
  | "relevancia"
  | "menor_preco"
  | "maior_preco"
  | "maior_area"
  | "recentes";
