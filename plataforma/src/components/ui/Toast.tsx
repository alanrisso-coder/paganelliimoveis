"use client";

import { createContext, useCallback, useContext, useState } from "react";

type TipoAviso = "sucesso" | "erro" | "info";

interface Aviso {
  id: number;
  texto: string;
  tipo: TipoAviso;
}

interface ContextoAviso {
  avisar: (texto: string, tipo?: TipoAviso) => void;
}

const Contexto = createContext<ContextoAviso | null>(null);

const estilos: Record<TipoAviso, string> = {
  sucesso: "border-l-verde-500",
  erro: "border-l-erro",
  info: "border-l-dourado-500",
};

export function AvisoProvider({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  const avisar = useCallback((texto: string, tipo: TipoAviso = "sucesso") => {
    const id = Date.now() + Math.random();
    setAvisos((a) => [...a, { id, texto, tipo }]);
    setTimeout(() => setAvisos((a) => a.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <Contexto.Provider value={{ avisar }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(22rem,calc(100vw-2.5rem))] flex-col gap-2"
      >
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            className={`animar-entrada pointer-events-auto rounded-sm border-l-4 bg-verde-900 px-4 py-3 text-sm text-areia-50 shadow-cartao ${estilos[aviso.tipo]}`}
          >
            {aviso.texto}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useAviso(): ContextoAviso {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useAviso precisa estar dentro de <AvisoProvider>.");
  return contexto;
}
