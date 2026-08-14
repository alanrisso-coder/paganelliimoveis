import { Cabecalho } from "@/components/site/Cabecalho";
import { Rodape } from "@/components/site/Rodape";
import { BotaoWhatsappFlutuante } from "@/components/site/BotaoWhatsapp";
import { AvisoProvider } from "@/components/ui/Toast";

export default function LayoutSite({ children }: { children: React.ReactNode }) {
  return (
    <AvisoProvider>
      <div className="flex min-h-screen flex-col bg-areia-100">
        <Cabecalho />
        <main id="conteudo" className="flex-1">
          {children}
        </main>
        <Rodape />
        <BotaoWhatsappFlutuante />
      </div>
    </AvisoProvider>
  );
}
