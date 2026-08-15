import type { Visita } from "../types";

/**
 * Visitas vazias - dados removidos
 */
export const visitas: Visita[] = [];

export const visitaPorId = (id: string) => visitas.find((v) => v.id === id);
