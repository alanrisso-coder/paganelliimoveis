import { criarRotaCrud } from "@/lib/rota-crud";

/**
 * Imóveis. A leitura é pública — é o catálogo que alimenta a vitrine do site.
 *
 * Mas "público" não significa "tudo": sem sessão, a resposta omite
 * `documentos`, que guarda matrícula, escritura e afins. O site nunca usou
 * esse campo; o painel continua recebendo a linha completa.
 *
 * Escrever exige sessão e a permissão correspondente. Antes, um PATCH anônimo
 * mudava preço, endereço ou status de qualquer imóvel.
 */

// Todas as colunas menos `documentos`. Escrita por extenso de propósito:
// coluna nova entra no catálogo público só quando alguém decidir incluí-la
// aqui, em vez de vazar por esquecimento.
const COLUNAS_PUBLICAS = [
  "id", "codigo", "titulo", "slug", "tipo", "finalidade", "status",
  "logradouro", "numero", "complemento", "bairro", "cidade", "estado", "cep",
  "latitude", "longitude",
  "valor_venda", "valor_aluguel", "valor_condominio", "valor_iptu", "valor_outras_taxas",
  "area_total", "area_construida", "dormitorios", "suites", "banheiros", "vagas", "andar",
  "caracteristicas", "diferenciais", "descricao_curta", "descricao_completa",
  "fotos", "video_url", "tour_virtual_url", "plantas",
  "proprietario_id", "corretor_id", "exclusivo", "exclusividade_ate",
  "seo_titulo", "seo_descricao", "criado_em", "atualizado_em",
  "aceita_permuta", "idade_anos", "perfil", "posicao_solar", "situacao",
  "escriturado", "averbado", "terreno", "aceita_financiamento",
].join(", ");

const rota = criarRotaCrud({
  tabela: "imoveis",
  rotulo: "os imóveis",
  ler: "ver_imoveis",
  leituraPublica: { colunas: COLUNAS_PUBLICAS },
  criar: "editar_imovel",
  editar: "editar_imovel",
  excluir: "deletar_imovel",
  porSlug: true,
});

export const GET = rota.GET;
export const POST = rota.POST;
export const PATCH = rota.PATCH;
export const DELETE = rota.DELETE;
