"use client";

import { avaliarSenha, requisitosSenha, rotuloForca, type ForcaSenha } from "@/lib/senha-regras";

/**
 * Indicador de força da senha + checklist dos requisitos.
 *
 * A lista fica sempre visível enquanto a pessoa digita, em vez de só acusar o
 * erro depois de enviar: assim ela vê o que falta antes de tentar.
 *
 * O que vale é a validação equivalente no servidor (`erroDeSenha`); esta é a
 * mesma regra, aplicada aqui só para dar retorno imediato.
 */

const cores: Record<ForcaSenha, { barra: string; texto: string }> = {
  fraca: { barra: "bg-erro", texto: "text-erro" },
  media: { barra: "bg-alerta", texto: "text-alerta" },
  boa: { barra: "bg-verde-800", texto: "text-verde-800" },
  forte: { barra: "bg-sucesso", texto: "text-sucesso" },
};

export function IndicadorForcaSenha({ senha }: { senha: string }) {
  if (!senha) return null;

  const { forca, pontuacao, atendidos } = avaliarSenha(senha);
  const cor = cores[forca];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-linha"
          role="progressbar"
          aria-valuenow={pontuacao}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Força da senha"
        >
          <div
            className={`h-full rounded-full transition-all duration-300 ${cor.barra}`}
            style={{ width: `${Math.max(pontuacao, 8)}%` }}
          />
        </div>
        <span className={`text-xs font-bold ${cor.texto}`}>{rotuloForca[forca]}</span>
      </div>

      <ul className="space-y-1">
        {requisitosSenha.map((requisito) => {
          const ok = atendidos.includes(requisito.chave);
          return (
            <li
              key={requisito.chave}
              className={`flex items-center gap-1.5 text-xs ${
                ok ? "text-sucesso" : "text-grafite-400"
              }`}
            >
              <span aria-hidden="true">{ok ? "✓" : "○"}</span>
              {requisito.texto}
              <span className="sr-only">{ok ? " (atendido)" : " (pendente)"}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
