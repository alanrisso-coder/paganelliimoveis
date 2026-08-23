import { NextResponse } from "next/server";

/**
 * Leitura segura do corpo JSON de uma requisição.
 *
 * `request.json()` estoura quando o corpo está vazio, não é JSON válido ou vem
 * sem o Content-Type correto. Caindo no catch genérico da rota, isso virava
 * um 500 — ou seja, erro de quem chamou reportado como falha do servidor.
 * Além de enganar o monitoramento, é trivial de disparar de fora.
 *
 * Devolve `{ ok: false, resposta }` com 400 nesses casos, para a rota repassar.
 */
export type CorpoLido<T> =
  | { ok: true; corpo: T }
  | { ok: false; resposta: NextResponse };

export async function lerCorpoJson<T = Record<string, unknown>>(
  request: Request
): Promise<CorpoLido<T>> {
  try {
    const corpo = await request.json();

    // `null` e tipos primitivos passam pelo parse mas quebram a
    // desestruturação que toda rota faz em seguida.
    if (corpo === null || typeof corpo !== "object" || Array.isArray(corpo)) {
      return {
        ok: false,
        resposta: NextResponse.json(
          { error: "Requisição inválida." },
          { status: 400 }
        ),
      };
    }

    return { ok: true, corpo: corpo as T };
  } catch {
    return {
      ok: false,
      resposta: NextResponse.json(
        { error: "Requisição inválida." },
        { status: 400 }
      ),
    };
  }
}
