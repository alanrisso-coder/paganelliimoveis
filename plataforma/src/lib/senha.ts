import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * Hashing de senha com scrypt (KDF padrão do `node:crypto`).
 *
 * scrypt é deliberadamente lento e consome memória, o que torna inviável
 * testar bilhões de candidatas mesmo com o banco em mãos. O sal aleatório por
 * usuário garante que duas pessoas com a mesma senha não gerem o mesmo hash.
 * Nada aqui é algoritmo próprio — é a primitiva da plataforma, com parâmetros
 * padrão.
 *
 * As regras de qualidade da senha (tamanho, maiúscula, símbolo) ficam em
 * `senha-regras.ts`, que também roda no navegador.
 */

const TAMANHO_SAL = 16;
const TAMANHO_CHAVE = 64;

/** Gera um hash "sal:chave" para armazenar no lugar da senha em texto puro. */
export function hashSenha(senha: string): string {
  const sal = randomBytes(TAMANHO_SAL).toString("hex");
  const chave = scryptSync(senha, sal, TAMANHO_CHAVE).toString("hex");
  return `${sal}:${chave}`;
}

/**
 * Confere uma senha contra um hash gerado por `hashSenha`.
 *
 * A comparação é feita com `timingSafeEqual` para não vazar, pelo tempo de
 * resposta, o quanto da chave estava correto. Hash malformado devolve `false`
 * em vez de estourar — uma linha corrompida no banco não pode virar erro 500
 * numa rota de login.
 */
export function verificarSenha(senha: string, hash: string): boolean {
  try {
    const [sal, chaveArmazenada] = String(hash).split(":");
    if (!sal || !chaveArmazenada) return false;

    const chaveArmazenadaBuffer = Buffer.from(chaveArmazenada, "hex");
    if (chaveArmazenadaBuffer.length === 0) return false;

    const chaveCalculada = scryptSync(senha, sal, chaveArmazenadaBuffer.length);

    return timingSafeEqual(chaveCalculada, chaveArmazenadaBuffer);
  } catch {
    return false;
  }
}
