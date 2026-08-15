"use client";

import { classes } from "@/lib/format";
import { CONTATO } from "@/lib/contato";

function montarLink(mensagem: string) {
  return `https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent(mensagem)}`;
}

const IconeWhatsapp = ({ tamanho = 18 }: { tamanho?: number }) => (
  <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.96L2 22l5.25-1.38a9.9 9.9 0 004.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91S17.5 2 12.04 2zm0 18.15a8.2 8.2 0 01-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 01-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.83 2.41a8.18 8.18 0 012.41 5.83c0 4.54-3.7 8.23-8.24 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.19-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.15-.25-.02-.38.11-.5.11-.11.25-.29.37-.44.13-.15.17-.25.25-.41.09-.17.04-.31-.02-.44-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.74 2.65 4.21 3.72.59.25 1.05.4 1.4.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.08.15-1.18-.06-.11-.23-.17-.48-.29z" />
  </svg>
);

/** Botão flutuante presente em todas as páginas públicas. */
export function BotaoWhatsappFlutuante() {
  return (
    <a
      href={montarLink("Olá! Vim pelo site da Paganelli Imóveis e gostaria de mais informações.")}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 flex items-center justify-center rounded-full bg-[#25d366] p-4 text-white shadow-cartao transition-transform hover:scale-[1.03]"
      aria-label="Falar no WhatsApp"
    >
      <IconeWhatsapp tamanho={24} />
    </a>
  );
}

export function BotaoWhatsapp({
  mensagem,
  className,
  children = "Falar no WhatsApp",
}: {
  mensagem: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <a
      href={montarLink(mensagem)}
      target="_blank"
      rel="noopener noreferrer"
      className={classes(
        "inline-flex items-center justify-center gap-2 rounded-sm bg-[#25d366] px-5 py-3 text-sm font-extrabold text-white transition-colors hover:bg-[#1fbe5a]",
        className,
      )}
    >
      <IconeWhatsapp />
      {children}
    </a>
  );
}
