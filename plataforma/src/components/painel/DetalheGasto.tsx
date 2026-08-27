"use client";

import { Botao, Modal, Selo } from "@/components/ui";
import { formatarData, formatarDataHora, formatarMoeda } from "@/lib/format";
import { rotuloStatusReembolso, tomStatusReembolso } from "@/lib/financeiro";
import type { Gasto } from "@/lib/types";

/**
 * Ficha do lançamento.
 *
 * Além dos dados do gasto, mostra a trilha de auditoria — quem lançou, quem
 * alterou por último e quem deu baixa no reembolso. É o que responde "de onde
 * saiu esse valor" sem precisar abrir o registro de ações do sistema.
 */
export function DetalheGasto({
  gasto,
  aoFechar,
  nomeDe,
  nomeCategoria,
  acoes,
}: {
  gasto: Gasto | null;
  aoFechar: () => void;
  nomeDe: (id?: string) => string;
  nomeCategoria: (id?: string) => string;
  acoes?: React.ReactNode;
}) {
  if (!gasto) return null;

  return (
    <Modal aberto aoFechar={aoFechar} titulo={gasto.descricao} largura="lg">
      <div className="flex flex-wrap items-baseline gap-3 border-b border-linha pb-4">
        <p className="font-display text-4xl text-verde-900">{formatarMoeda(gasto.valor)}</p>
        <p className="text-sm text-grafite-500">em {formatarData(gasto.dataGasto)}</p>
        <Selo tom={tomStatusReembolso[gasto.reembolsoStatus]} className="ml-auto">
          {rotuloStatusReembolso[gasto.reembolsoStatus]}
        </Selo>
      </div>

      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Item rotulo="Categoria" valor={nomeCategoria(gasto.categoriaId)} />
        <Item rotulo="Responsável" valor={nomeDe(gasto.responsavelId)} />
        <Item rotulo="Reembolso necessário" valor={gasto.reembolsoNecessario ? "Sim" : "Não"} />
        <Item
          rotulo="Data do reembolso"
          valor={gasto.reembolsoData ? formatarData(gasto.reembolsoData) : "—"}
        />
      </dl>

      {gasto.observacao && (
        <div className="mt-4 rounded-sm border border-linha bg-areia-50 p-4">
          <p className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
            Observação
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-grafite-700">
            {gasto.observacao}
          </p>
        </div>
      )}

      {gasto.reembolsoObservacao && (
        <div className="mt-3 rounded-sm border border-linha bg-areia-50 p-4">
          <p className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
            Observação do reembolso
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-grafite-700">
            {gasto.reembolsoObservacao}
          </p>
        </div>
      )}

      {gasto.comprovanteUrl && (
        <a
          href={gasto.comprovanteUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-verde-800 underline underline-offset-2"
        >
          Abrir comprovante
        </a>
      )}

      <div className="mt-5 border-t border-linha pt-4">
        <p className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
          Auditoria
        </p>
        <ul className="mt-2 space-y-1 text-xs text-grafite-500">
          <li>
            Lançado por <strong className="text-grafite-700">{nomeDe(gasto.criadoPor)}</strong> em{" "}
            {formatarDataHora(gasto.criadoEm)}
          </li>
          <li>
            Última alteração por{" "}
            <strong className="text-grafite-700">{nomeDe(gasto.atualizadoPor)}</strong> em{" "}
            {formatarDataHora(gasto.atualizadoEm)}
          </li>
          {gasto.reembolsoPor && (
            <li>
              Reembolso registrado por{" "}
              <strong className="text-grafite-700">{nomeDe(gasto.reembolsoPor)}</strong>
              {gasto.reembolsoEm ? ` em ${formatarDataHora(gasto.reembolsoEm)}` : ""}
            </li>
          )}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-linha pt-4">
        {acoes}
        <Botao type="button" variante="fantasma" onClick={aoFechar}>
          Fechar
        </Botao>
      </div>
    </Modal>
  );
}

function Item({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
        {rotulo}
      </dt>
      <dd className="mt-1 text-sm text-grafite-700">{valor}</dd>
    </div>
  );
}
