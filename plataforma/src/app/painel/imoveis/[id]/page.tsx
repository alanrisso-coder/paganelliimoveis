import { FichaImovel } from "@/components/painel/FichaImovel";

export default async function PaginaImovelPainel(props: PageProps<"/painel/imoveis/[id]">) {
  const { id } = await props.params;
  return <FichaImovel imovelId={id} />;
}
