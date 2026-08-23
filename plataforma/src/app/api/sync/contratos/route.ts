import { criarRotaCrud } from "@/lib/rota-crud";

/**
 * Contratos de exclusividade — dados de negociação e comissão.
 *
 * Nada aqui é público em nenhum método: o site não lê nem escreve contrato.
 * Antes esta rota aceitava qualquer requisição da internet, incluindo DELETE.
 */
const rota = criarRotaCrud({
  tabela: "contratos",
  rotulo: "os contratos",
  ler: "ver_contratos",
  criar: "editar_contrato",
  editar: "editar_contrato",
  excluir: "editar_contrato",
});

export const GET = rota.GET;
export const POST = rota.POST;
export const PATCH = rota.PATCH;
export const DELETE = rota.DELETE;
