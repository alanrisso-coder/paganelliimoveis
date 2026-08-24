/**
 * Dados institucionais reais da Paganelli Imóveis, conforme o site da empresa
 * (leomaracorretora.com.br). Usados no site público, no painel e nos e-mails.
 */
export const CONTATO = {
  razaoSocial: "Paganelli Imóveis",
  responsavel: "Leomara Paganelli",
  creci: "CRECI 9578J",
  telefone: "(48) 98412-8000",
  /** Formato internacional, sem máscara — usado nos links wa.me. */
  whatsapp: "5548984128000",
  whatsappExibicao: "(48) 98412-8000",
  email: "",
  endereco:
    "Av Atílio Pedro Pagani, 115, Sala 1304 — Pagani, Palhoça/SC · CEP 88132-149",
  enderecoCurto: "Sala 1304 — Pagani, Palhoça/SC",
  cidade: "Palhoça",
  estado: "SC",
  regiaoAtuacao: "Palhoça e Grande Florianópolis",
  /** Coordenadas do escritório, para o mapa da página de contato. */
  latitude: -27.6386,
  longitude: -48.6689,
  redes: {
    instagram: "https://instagram.com/paganelliimoveis",
  },
} as const;
