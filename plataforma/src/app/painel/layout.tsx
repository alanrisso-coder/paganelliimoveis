"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSessao } from "@/lib/auth";
import { Navegacao } from "@/components/painel/Navegacao";
import { BarraTopo } from "@/components/painel/Cabecalho";
import { AvisoProvider } from "@/components/ui/Toast";

/**
 * Guarda de acesso do painel.
 *
 * Redireciona para /entrar quando não há sessão. Em produção esta checagem
 * precisa acontecer também no servidor (proxy ou layout de servidor lendo o
 * cookie de sessão) — o guard de cliente sozinho é apenas conveniência de UX.
 */
export default function LayoutPainel({ children }: { children: React.ReactNode }) {
  const { usuario, carregado } = useSessao();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    if (carregado && !usuario) router.replace("/entrar");
  }, [carregado, usuario, router]);

  if (!carregado || !usuario) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-areia-100">
        <p className="text-sm text-grafite-400">Verificando acesso…</p>
      </div>
    );
  }

  return (
    <AvisoProvider>
      <div className="min-h-screen bg-areia-100 lg:grid lg:grid-cols-[16rem_1fr]">
        <aside className="sticky top-0 hidden h-screen bg-verde-950 lg:block">
          <Navegacao />
        </aside>

        {menuAberto && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0 bg-verde-950/60"
              onClick={() => setMenuAberto(false)}
              aria-hidden="true"
            />
            <div className="animar-entrada absolute left-0 top-0 h-full w-72 bg-verde-950">
              <Navegacao aoNavegar={() => setMenuAberto(false)} />
            </div>
          </div>
        )}

        <div className="flex min-w-0 flex-col">
          <BarraTopo aoAbrirMenu={() => setMenuAberto(true)} />
          <main id="conteudo" className="flex-1 px-5 py-7 lg:px-8 lg:py-9">
            {children}
          </main>
        </div>
      </div>
    </AvisoProvider>
  );
}
