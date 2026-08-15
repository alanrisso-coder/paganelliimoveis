import type { Imovel } from "../types";

const foto = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=75`;

/**
 * Catálogo vazio - dados removidos
 */
export const imoveis: Imovel[] = [];

export const imovelPorId = (id: string) => imoveis.find((i) => i.id === id);
