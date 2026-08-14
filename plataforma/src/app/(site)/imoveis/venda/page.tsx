import { Suspense } from "react";
import type { Metadata } from "next";
import { ListagemImoveis } from "@/components/site/ListagemImoveis";
import { CarregandoCards } from "@/components/ui";

export const metadata: Metadata = {
  title: "Imóveis à venda",
  description:
    "Casas, apartamentos, coberturas e terrenos à venda em Palhoça e na Grande Florianópolis, com curadoria e documentação verificada pela Paganelli Imóveis.",
};

export default function PaginaVenda() {
  return (
    <Suspense
      fallback={
        <div className="container-paganelli py-20">
          <CarregandoCards />
        </div>
      }
    >
      <ListagemImoveis
        finalidade="venda"
        titulo="Imóveis à venda"
        descricao="Casas, apartamentos, coberturas, terrenos e propriedades rurais em Palhoça e região, selecionados pela nossa equipe. Todos com documentação verificada e visita acompanhada."
      />
    </Suspense>
  );
}
