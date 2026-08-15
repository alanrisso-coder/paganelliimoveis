"use client";

import { useState } from "react";
import Image from "next/image";
import { Botao } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";

// Armazenar mapa de URLs → Caminhos em localStorage
const CACHE_KEY_PREFIX = "paganelli:storage:";

function getCaminhoDeUrl(url: string) {
  const key = `${CACHE_KEY_PREFIX}${url}`;
  return localStorage.getItem(key);
}

function setCaminhoDeUrl(url: string, caminho: string) {
  const key = `${CACHE_KEY_PREFIX}${url}`;
  localStorage.setItem(key, caminho);
}

export function UploadMidias({
  imovelId,
  tipo,
  onUpload,
}: {
  imovelId: string;
  tipo: "fotos" | "plantas" | "documentos" | "videos";
  onUpload: (url: string) => void;
}) {
  const { avisar } = useAviso();
  const [enviando, setEnviando] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;

    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", arquivo);
      formData.append("pasta", tipo);
      formData.append("imovelId", imovelId);

      const res = await fetch("/api/storage/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const erro = await res.json();
        throw new Error(erro.erro || "Erro ao enviar arquivo");
      }

      const { url, caminho } = await res.json();
      setCaminhoDeUrl(url, caminho);
      onUpload(url);
      avisar(`${arquivo.name} enviado com sucesso!`);
      e.target.value = "";
    } catch (err) {
      avisar(
        `Erro ao enviar: ${err instanceof Error ? err.message : "Desconhecido"}`,
        "erro"
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="rounded-sm border border-linha bg-areia-50 p-4">
      <label className="block">
        <span className="text-xs font-bold uppercase tracking-wide text-grafite-500 block mb-2">
          Upload de {tipo === "fotos" ? "fotos" : tipo === "plantas" ? "plantas" : tipo === "videos" ? "vídeos" : "documentos"}
        </span>
        <input
          type="file"
          onChange={handleUpload}
          disabled={enviando}
          accept={
            tipo === "fotos"
              ? "image/jpeg,image/png,image/webp"
              : tipo === "plantas"
                ? "application/pdf,image/jpeg,image/png"
                : tipo === "videos"
                  ? "video/mp4,video/webm"
                  : "application/pdf,.doc,.docx"
          }
          className="block w-full text-sm cursor-pointer"
        />
      </label>
      <p className="mt-1 text-xs text-grafite-500">
        {tipo === "fotos" && "Máx 10MB (JPG, PNG, WebP)"}
        {tipo === "plantas" && "Máx 20MB (PDF, JPG, PNG)"}
        {tipo === "videos" && "Máx 100MB (MP4, WebM)"}
        {tipo === "documentos" && "Máx 20MB (PDF, DOC, DOCX)"}
      </p>
      <Botao
        disabled={enviando}
        tamanho="sm"
        className="mt-3 w-full"
      >
        {enviando ? "Enviando…" : "Enviar"}
      </Botao>
    </div>
  );
}

export function GaleriaFotos({
  fotos,
  onDelete,
}: {
  fotos: string[];
  onDelete: (url: string) => void;
}) {
  const { avisar } = useAviso();
  const [deletando, setDeletando] = useState<string | null>(null);

  async function handleDelete(url: string) {
    setDeletando(url);
    try {
      const caminho = getCaminhoDeUrl(url);
      if (caminho) {
        const res = await fetch("/api/storage/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ caminho }),
        });

        if (!res.ok) {
          const erro = await res.json();
          throw new Error(erro.erro || "Erro ao deletar arquivo");
        }

        localStorage.removeItem(`${CACHE_KEY_PREFIX}${url}`);
      }
      onDelete(url);
      avisar("Foto removida com sucesso!");
    } catch (err) {
      avisar(
        `Erro ao remover: ${err instanceof Error ? err.message : "Desconhecido"}`,
        "erro"
      );
    } finally {
      setDeletando(null);
    }
  }

  if (fotos.length === 0) {
    return null;
  }

  return (
    <div className="scroll-fino mb-6 flex gap-2 overflow-x-auto pb-1">
      {fotos.map((foto, i) => (
        <div key={foto + i} className="relative h-32 w-48 shrink-0 overflow-hidden rounded-sm bg-areia-200">
          <Image
            src={foto}
            alt={`Foto ${i + 1}`}
            fill
            sizes="192px"
            className="object-cover"
          />
          {i === 0 && (
            <span className="absolute left-2 top-2 rounded-sm bg-verde-900/90 px-2 py-1 font-mono text-[0.5625rem] uppercase tracking-wide text-areia-50">
              capa
            </span>
          )}
          {deletando !== foto && (
            <button
              onClick={() => handleDelete(foto)}
              className="absolute right-2 top-2 rounded-sm bg-erro/90 px-2 py-1 text-[0.5625rem] uppercase font-bold text-white hover:bg-erro transition-colors"
            >
              Remover
            </button>
          )}
          {deletando === foto && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <span className="text-xs text-white">Removendo…</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
