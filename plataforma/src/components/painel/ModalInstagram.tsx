"use client";

import Image from "next/image";
import { useState } from "react";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { Botao, CampoTexto, Modal, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import {
  MAX_CARACTERES_LEGENDA,
  fotosDoAnuncio,
  montarLegendaPadrao,
  urlPublicaAnuncio,
  validarParaInstagram,
} from "@/lib/instagram-conteudo";
import { formatarDataHora, precoFormatado, enderecoResumido } from "@/lib/format";
import type { Anuncio, Imovel } from "@/lib/types";

/** Limite do carrossel da Meta — a prévia mostra o que realmente vai ao ar. */
const MAX_SLIDES = 10;

/**
 * Confirmação de publicação no Instagram.
 *
 * O fluxo é sempre: revisar prévia → revisar legenda → confirmar. Nada é
 * enviado ao abrir o modal, e a legenda gerada por IA cai no campo editável
 * como sugestão — nunca vai direto para a Meta.
 */
export function ModalInstagram({
  anuncio,
  aoFechar,
}: {
  anuncio: Anuncio | null;
  aoFechar: () => void;
}) {
  const dados = useDados();
  const imovel = anuncio ? dados.imovelPorId(anuncio.imovelId) : undefined;

  if (!anuncio || !imovel) return null;

  // A `key` faz o conteúdo remontar a cada anúncio aberto, o que reinicia a
  // legenda e a etapa de confirmação sem precisar sincronizá-las num efeito.
  return (
    <ConteudoInstagram
      key={anuncio.id}
      anuncio={anuncio}
      imovel={imovel}
      aoFechar={aoFechar}
    />
  );
}

function ConteudoInstagram({
  anuncio,
  imovel,
  aoFechar,
}: {
  anuncio: Anuncio;
  imovel: Imovel;
  aoFechar: () => void;
}) {
  const dados = useDados();
  const { usuario } = useSessao();
  const { avisar } = useAviso();

  const [legenda, setLegenda] = useState(
    () => anuncio.instagram.legenda?.trim() || montarLegendaPadrao(anuncio, imovel),
  );
  const [gerando, setGerando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  const { valido, pendencias } = validarParaInstagram(anuncio, imovel);
  const fotos = fotosDoAnuncio(anuncio, imovel).slice(0, MAX_SLIDES);
  const jaPublicado = anuncio.instagram.status === "PUBLISHED";
  const emPublicacao = anuncio.instagram.status === "PUBLISHING";

  async function gerarLegenda() {
    setGerando(true);
    try {
      const resposta = await fetch("/api/instagram/legenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anuncioId: anuncio.id }),
      });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        avisar(corpo.error ?? "Não foi possível gerar a legenda.");
        return;
      }
      setLegenda(corpo.legenda);
      avisar(corpo.aviso ?? "Legenda gerada. Revise antes de publicar.");
    } catch {
      avisar("Falha de conexão ao gerar a legenda.");
    } finally {
      setGerando(false);
    }
  }

  async function publicar() {
    setPublicando(true);
    try {
      const resposta = await fetch("/api/instagram/publicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anuncioId: anuncio.id,
          usuarioId: usuario?.id,
          legenda,
          republicar: jaPublicado,
        }),
      });
      const corpo = await resposta.json();

      if (!resposta.ok) {
        avisar(corpo.error ?? "Não foi possível publicar no Instagram.");
        return;
      }

      dados.aplicarInstagramAnuncio(anuncio.id, {
        habilitado: true,
        status: "PUBLISHED",
        legenda,
        publicadoEm: corpo.publicadoEm,
        postId: corpo.postId,
        postUrl: corpo.postUrl,
        erro: undefined,
      });
      avisar(corpo.mensagem ?? "Anúncio publicado no Instagram.");
      aoFechar();
    } catch {
      avisar("Falha de conexão ao publicar no Instagram.");
    } finally {
      setPublicando(false);
      setConfirmando(false);
    }
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      titulo={jaPublicado ? "Republicar no Instagram" : "Publicar no Instagram"}
      descricao="Revise a prévia e a legenda. A publicação só acontece após a sua confirmação."
      largura="xl"
    >
      {jaPublicado && anuncio.instagram.publicadoEm && (
        <div className="mb-5 rounded-sm border border-dourado-500/40 bg-dourado-100/50 p-4">
          <p className="text-sm font-bold text-verde-900">
            Publicado no Instagram em {formatarDataHora(anuncio.instagram.publicadoEm)}
          </p>
          <p className="mt-1 text-xs text-grafite-600">
            Republicar cria uma <strong>nova</strong> publicação no perfil — a anterior continua no ar.
          </p>
          {anuncio.instagram.postUrl && (
            <a
              href={anuncio.instagram.postUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs font-bold text-verde-800 underline underline-offset-4"
            >
              Ver publicação ↗
            </a>
          )}
        </div>
      )}

      {!valido && (
        <div className="mb-5 rounded-sm border border-erro/30 bg-[#f7e6e4] p-4">
          <p className="text-sm font-bold text-erro">
            Este anúncio ainda não pode ser publicado no Instagram:
          </p>
          <ul className="mt-2 space-y-1">
            {pendencias.map((p) => (
              <li key={p} className="text-xs text-grafite-700">
                • {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ------------------------------------------------------ Prévia */}
        <div>
          <p className="mb-2 text-xs font-bold text-grafite-700">Prévia da publicação</p>

          <div className="overflow-hidden rounded-sm border border-linha bg-white">
            <div className="flex items-center gap-2 border-b border-linha px-3 py-2">
              <div className="h-6 w-6 rounded-full bg-verde-800" aria-hidden="true" />
              <span className="text-xs font-bold text-grafite-900">paganelliimoveis</span>
            </div>

            <div className="relative aspect-[4/5] w-full bg-areia-200">
              {fotos[0] && (
                <Image src={fotos[0]} alt="" fill sizes="400px" className="object-cover" />
              )}
              {fotos.length > 1 && (
                <span className="absolute right-2 top-2 rounded-full bg-verde-950/70 px-2 py-0.5 text-[0.625rem] font-bold text-areia-50">
                  1/{fotos.length}
                </span>
              )}
            </div>

            {fotos.length > 1 && (
              <div className="flex gap-1 overflow-x-auto border-t border-linha p-2">
                {fotos.map((foto, i) => (
                  <div
                    key={`${foto}-${i}`}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm bg-areia-200"
                  >
                    <Image src={foto} alt="" fill sizes="48px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <dl className="mt-4 space-y-1.5 text-xs">
            <div className="flex gap-2">
              <dt className="font-bold text-grafite-700">Título:</dt>
              <dd className="text-grafite-600">{anuncio.titulo || imovel.titulo}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-bold text-grafite-700">Preço:</dt>
              <dd className="text-grafite-600">{precoFormatado(imovel)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-bold text-grafite-700">Localização:</dt>
              <dd className="text-grafite-600">{enderecoResumido(imovel)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="shrink-0 font-bold text-grafite-700">Link:</dt>
              <dd className="break-all text-grafite-600">{urlPublicaAnuncio(imovel)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-bold text-grafite-700">Fotos:</dt>
              <dd className="text-grafite-600">
                {fotos.length === 1 ? "1 imagem" : `carrossel com ${fotos.length} imagens`}
              </dd>
            </div>
          </dl>
        </div>

        {/* ----------------------------------------------------- Legenda */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-grafite-700">Legenda</p>
            <Botao variante="contorno" tamanho="sm" onClick={gerarLegenda} disabled={gerando}>
              {gerando ? "Gerando…" : "✨ Gerar legenda com IA"}
            </Botao>
          </div>

          <CampoTexto
            rotulo=""
            value={legenda}
            onChange={(e) => setLegenda(e.target.value)}
            rows={16}
            maxLength={MAX_CARACTERES_LEGENDA}
            aria-label="Legenda da publicação no Instagram"
          />

          <p className="mt-1 text-right font-mono text-[0.625rem] text-grafite-400">
            {legenda.length}/{MAX_CARACTERES_LEGENDA}
          </p>
          <p className="mt-1 text-xs text-grafite-500">
            A legenda gerada por IA é uma sugestão — revise antes de confirmar.
          </p>
        </div>
      </div>

      {/* -------------------------------------------------------- Ações */}
      <div className="mt-6 border-t border-linha pt-5">
        {confirmando ? (
          <div className="rounded-sm border border-verde-800/25 bg-areia-100 p-4">
            <p className="text-sm font-bold text-verde-900">
              {jaPublicado
                ? "Você deseja republicar este anúncio no Instagram?"
                : "Você deseja publicar este anúncio no Instagram?"}
            </p>
            <p className="mt-1 text-xs text-grafite-600">
              A publicação vai para o perfil @paganelliimoveis e ficará visível publicamente.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Botao onClick={publicar} disabled={publicando}>
                {publicando ? "Publicando…" : "Sim, publicar agora"}
              </Botao>
              <Botao
                variante="contorno"
                onClick={() => setConfirmando(false)}
                disabled={publicando}
              >
                Cancelar
              </Botao>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {emPublicacao && <Selo tom="alerta">Publicando…</Selo>}
              {anuncio.instagram.erro && (
                <p className="text-xs text-erro">{anuncio.instagram.erro}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Botao variante="contorno" onClick={aoFechar}>
                Fechar
              </Botao>
              <Botao
                variante={jaPublicado ? "dourado" : "primario"}
                onClick={() => setConfirmando(true)}
                disabled={!valido || emPublicacao || !legenda.trim()}
              >
                {jaPublicado ? "Republicar no Instagram" : "Publicar no Instagram"}
              </Botao>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
