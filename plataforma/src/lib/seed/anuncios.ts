import type { Anuncio } from "../types";

/**
 * Anúncios vazios - dados removidos
 */
export const anuncios: Anuncio[] = [];

export const anuncioPorId = (id: string) => anuncios.find((a) => a.id === id);

export const anunciosDoImovel = (imovelId: string) =>
  anuncios.filter((a) => a.imovelId === imovelId);

export const anunciosPublicos = anuncios.filter((a) => a.publica);
