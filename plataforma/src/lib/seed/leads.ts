import type { Lead } from "../types";

/**
 * Leads vazios - dados removidos
 */
export const leads: Lead[] = [];

export const leadPorId = (id: string) => leads.find((l) => l.id === id);
