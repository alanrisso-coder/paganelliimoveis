import type { Metadata } from "next";
import { DetalheImovel } from "@/components/site/DetalheImovel";
import { imoveis } from "@/lib/seed/imoveis";

/**
 * Casca de servidor: resolve `params` (Promise no Next 16) e entrega o slug ao
 * componente cliente, que lê o imóvel do store compartilhado com o painel.
 */
export async function generateMetadata(props: PageProps<"/imoveis/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const imovel = imoveis.find((i) => i.slug === slug);
  if (!imovel) {
    return { title: "Imóvel não encontrado" };
  }
  return {
    title: imovel.seo.titulo,
    description: imovel.seo.descricao,
    openGraph: {
      title: imovel.seo.titulo,
      description: imovel.seo.descricao,
      images: imovel.fotos[0] ? [imovel.fotos[0]] : undefined,
    },
  };
}

export default async function PaginaImovel(props: PageProps<"/imoveis/[slug]">) {
  const { slug } = await props.params;
  return <DetalheImovel slug={slug} />;
}
