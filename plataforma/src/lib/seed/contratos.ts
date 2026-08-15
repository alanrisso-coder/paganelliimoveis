import type { Contrato } from "../types";

/**
 * Contratos vazios - dados removidos
 */
export const contratos: Contrato[] = [];

export const contratoPorId = (id: string) => contratos.find((c) => c.id === id);

export const contratosPorCliente = (clienteId: string) =>
  contratos.filter((c) => c.clienteId === clienteId);
