import { createHash, randomBytes } from "crypto";

/**
 * Geração e conferência de tokens opacos (sessão, convite, recuperação).
 *
 * O token em texto puro existe só no cookie do navegador ou no link enviado ao
 * usuário; o banco guarda apenas o SHA-256. Assim, um vazamento das tabelas
 * `sessoes`/`usuario_tokens` não permite assumir sessão nem redefinir senha de
 * ninguém. SHA-256 puro basta aqui (diferente de senha, que exige KDF lento):
 * o token tem 256 bits de entropia real, não há o que adivinhar por força
 * bruta nem dicionário a aplicar.
 */

const BYTES_TOKEN = 32;

export interface TokenGerado {
  /** Vai para o cookie ou para o link. Nunca é gravado. */
  token: string;
  /** Vai para o banco. */
  hash: string;
}

export function gerarToken(): TokenGerado {
  const token = randomBytes(BYTES_TOKEN).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Momento de expiração daqui a N minutos, em ISO — formato aceito pelo Postgres. */
export function expiraEmMinutos(minutos: number): string {
  return new Date(Date.now() + minutos * 60_000).toISOString();
}

/** Validade do link de convite / recuperação de senha. */
export const MINUTOS_VALIDADE_TOKEN_SENHA = 60;

/** Validade da sessão de login. */
export const MINUTOS_VALIDADE_SESSAO = 60 * 24 * 7;
