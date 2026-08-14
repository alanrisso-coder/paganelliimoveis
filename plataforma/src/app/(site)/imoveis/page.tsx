import { redirect } from "next/navigation";

/** `/imoveis` não tem conteúdo próprio: a vitrine padrão é a de venda. */
export default function PaginaImoveis() {
  redirect("/imoveis/venda");
}
