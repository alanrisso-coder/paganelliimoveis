import type { Cliente } from "../types";

/**
 * Clientes vazios - dados removidos
 */
export const clientes: Cliente[] = [];

export const clientePorId = (id: string) => clientes.find((c) => c.id === id);
