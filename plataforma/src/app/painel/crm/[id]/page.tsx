import { FichaCliente } from "@/components/painel/FichaCliente";

export default async function PaginaCliente(props: PageProps<"/painel/crm/[id]">) {
  const { id } = await props.params;
  return <FichaCliente clienteId={id} />;
}
