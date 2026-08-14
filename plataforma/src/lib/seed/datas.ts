/**
 * Âncoras de data para os dados demonstrativos.
 *
 * As datas são calculadas a partir da meia-noite de hoje para que a demo
 * permaneça sempre "viva" — visitas hoje, contratos vencendo em 7 dias — sem
 * precisar reescrever o seed. Usar meia-noite (e não `new Date()` cru) mantém
 * servidor e cliente produzindo a mesma string e evita erro de hidratação.
 */
const base = new Date();
base.setHours(0, 0, 0, 0);

export const HOJE = base;

function comOffset(dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

/** "YYYY-MM-DD" deslocado em `dias` a partir de hoje. */
export function dia(dias: number): string {
  const d = comOffset(dias);
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const data = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mes}-${data}`;
}

/** Timestamp ISO deslocado em `dias`, fixado em `hora` (ex.: "14:30"). */
export function momento(dias: number, hora = "09:00"): string {
  const [h, m] = hora.split(":").map(Number);
  const d = comOffset(dias);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}
