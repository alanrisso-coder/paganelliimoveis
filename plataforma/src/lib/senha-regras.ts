/**
 * Regras de senha compartilhadas entre navegador e servidor.
 *
 * Fica separado de `senha.ts` de propósito: aquele arquivo usa `node:crypto` e
 * só roda no servidor. Este é isomórfico, para que o indicador de força na tela
 * e a validação que realmente barra a gravação apliquem exatamente os mesmos
 * critérios — a checagem do cliente é conveniência, a do servidor é a que vale.
 */

export const TAMANHO_MINIMO_SENHA = 8;

export interface RequisitoSenha {
  chave: string;
  texto: string;
  atende: (senha: string) => boolean;
}

export const requisitosSenha: RequisitoSenha[] = [
  {
    chave: "tamanho",
    texto: `Pelo menos ${TAMANHO_MINIMO_SENHA} caracteres`,
    atende: (s) => s.length >= TAMANHO_MINIMO_SENHA,
  },
  { chave: "maiuscula", texto: "Uma letra maiúscula", atende: (s) => /[A-ZÀ-Þ]/.test(s) },
  { chave: "minuscula", texto: "Uma letra minúscula", atende: (s) => /[a-zà-þ]/.test(s) },
  { chave: "numero", texto: "Um número", atende: (s) => /\d/.test(s) },
  {
    chave: "especial",
    texto: "Um caractere especial",
    atende: (s) => /[^A-Za-zÀ-þ0-9]/.test(s),
  },
];

export type ForcaSenha = "fraca" | "media" | "boa" | "forte";

export interface AvaliacaoSenha {
  /** Requisitos atendidos, na ordem de `requisitosSenha`. */
  atendidos: string[];
  faltando: string[];
  forca: ForcaSenha;
  /** 0 a 100, para a barra de força. */
  pontuacao: number;
  valida: boolean;
}

export function avaliarSenha(senha: string): AvaliacaoSenha {
  const atendidos = requisitosSenha.filter((r) => r.atende(senha)).map((r) => r.chave);
  const faltando = requisitosSenha.filter((r) => !r.atende(senha)).map((r) => r.chave);

  // Comprimento pesa além do mínimo: uma senha longa é mais difícil de quebrar
  // do que uma curta cheia de símbolos.
  const bonusComprimento = senha.length >= 16 ? 2 : senha.length >= 12 ? 1 : 0;
  const pontos = atendidos.length + bonusComprimento;
  const pontuacao = Math.min(100, Math.round((pontos / 7) * 100));

  const valida = faltando.length === 0;

  let forca: ForcaSenha = "fraca";
  if (valida && pontos >= 7) forca = "forte";
  else if (valida && pontos >= 6) forca = "boa";
  else if (atendidos.length >= 3) forca = "media";

  return { atendidos, faltando, forca, pontuacao, valida };
}

/**
 * Mensagem única para o usuário quando a senha é recusada. Devolve `null`
 * quando a senha passa — é a checagem que as rotas de API usam antes de gravar.
 */
export function erroDeSenha(senha: string): string | null {
  const { faltando } = avaliarSenha(senha);
  if (faltando.length === 0) return null;

  const textos = requisitosSenha
    .filter((r) => faltando.includes(r.chave))
    .map((r) => r.texto.toLowerCase());

  return `A senha precisa conter: ${textos.join(", ")}.`;
}

export const rotuloForca: Record<ForcaSenha, string> = {
  fraca: "Fraca",
  media: "Média",
  boa: "Boa",
  forte: "Forte",
};
