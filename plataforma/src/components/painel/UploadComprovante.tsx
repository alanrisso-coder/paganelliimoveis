"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { Botao } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";

/**
 * Anexo do comprovante do gasto.
 *
 * Reaproveita `/api/storage/upload` — a mesma rota das mídias do imóvel, que
 * já exige sessão, recomprime imagem e devolve URL assinada. O campo
 * `imovelId` daquela rota é apenas o segundo segmento do caminho no bucket;
 * aqui ele recebe "gastos", de modo que os comprovantes ficam agrupados em
 * `comprovantes/gastos/…` em vez de espalhados entre as fotos dos imóveis.
 *
 * O comprovante é opcional de propósito: exigir anexo faria o lançamento
 * rápido — o caso comum — depender de ter a foto em mãos na hora.
 */

const TIPOS_ACEITOS = "image/jpeg,image/png,image/webp,application/pdf";
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

export function UploadComprovante({
  url,
  aoEnviar,
  aoRemover,
}: {
  url: string;
  aoEnviar: (url: string, caminho: string) => void;
  aoRemover: () => void;
}) {
  const { avisar } = useAviso();
  const id = useId();
  const [enviando, setEnviando] = useState(false);

  const ehImagem = Boolean(url) && !url.split("?")[0].toLowerCase().endsWith(".pdf");

  async function enviar(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    if (arquivo.size > TAMANHO_MAXIMO) {
      avisar("O comprovante deve ter no máximo 10 MB.", "erro");
      evento.target.value = "";
      return;
    }

    setEnviando(true);
    try {
      const formulario = new FormData();
      formulario.append("arquivo", arquivo);
      formulario.append("pasta", "comprovantes");
      formulario.append("imovelId", "gastos");

      const resposta = await fetch("/api/storage/upload", {
        method: "POST",
        body: formulario,
      });

      if (!resposta.ok) {
        const corpo = await resposta.json().catch(() => ({}));
        throw new Error(corpo.erro ?? corpo.error ?? "Erro ao enviar o comprovante.");
      }

      const { url: enviada, caminho } = await resposta.json();
      aoEnviar(enviada, caminho);
      avisar("Comprovante anexado.");
    } catch (erro) {
      avisar(erro instanceof Error ? erro.message : "Erro ao enviar o comprovante.", "erro");
    } finally {
      setEnviando(false);
      evento.target.value = "";
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-xs font-bold text-grafite-700">Comprovante</p>

      {url ? (
        <div className="flex flex-wrap items-center gap-3 rounded-sm border border-linha bg-white p-3">
          {ehImagem ? (
            <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-sm bg-areia-200">
              <Image src={url} alt="Comprovante anexado" fill sizes="56px" className="object-cover" />
            </span>
          ) : (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-areia-200 font-mono text-[0.625rem] font-bold text-grafite-500">
              PDF
            </span>
          )}

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 text-sm font-bold text-verde-800 underline underline-offset-2"
          >
            Abrir comprovante
          </a>

          <Botao type="button" variante="fantasma" tamanho="sm" onClick={aoRemover}>
            Remover
          </Botao>
        </div>
      ) : (
        <div className="rounded-sm border border-dashed border-linha bg-areia-50 p-4">
          <label htmlFor={id} className="block cursor-pointer text-sm text-grafite-500">
            {enviando ? "Enviando…" : "Selecione uma imagem ou PDF do comprovante (opcional)."}
          </label>
          <input
            id={id}
            type="file"
            accept={TIPOS_ACEITOS}
            disabled={enviando}
            onChange={enviar}
            className="mt-2 block w-full text-xs text-grafite-500 file:mr-3 file:rounded-sm file:border file:border-verde-800/25 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-verde-800"
          />
        </div>
      )}
    </div>
  );
}
