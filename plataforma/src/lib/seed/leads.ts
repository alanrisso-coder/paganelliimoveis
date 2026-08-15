import type { Lead, LogAcao, Notificacao, Tarefa } from "../types";

/**
 * Leads e dados relacionados vazios - dados removidos
 */
export const leads: Lead[] = [];

export const tarefas: Tarefa[] = [];

export const notificacoes: Notificacao[] = [];

export const logs: LogAcao[] = [];

export const leadPorId = (id: string) => leads.find((l) => l.id === id);
