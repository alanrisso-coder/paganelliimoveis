import { criarRotaCrud } from "@/lib/rota-crud";

/**
 * Carteira de clientes — o dado mais sensível do sistema (nome, CPF, telefone,
 * e-mail, endereço, orçamento e histórico de negociação).
 *
 * Até aqui esta rota respondia a qualquer requisição da internet: um GET sem
 * credencial devolvia a base inteira, e um DELETE apagava qualquer ficha.
 *
 * A criação continua aberta porque o agendamento de visita do site converte o
 * visitante em cliente antes de marcar a visita. Só que agora o corpo passa
 * por uma lista fechada de campos: um visitante informa os próprios dados de
 * contato, e nada além disso. Orçamento, observações internas e o restante da
 * ficha ficam fora do alcance de quem não tem sessão.
 */
const rota = criarRotaCrud({
  tabela: "clientes",
  rotulo: "os clientes",
  ler: "ver_crm",
  criar: "editar_cliente",
  editar: "editar_cliente",
  excluir: "deletar_cliente",
  criacaoPublica: {
    campos: [
      "id",
      "nome",
      "documento",
      "telefone",
      "whatsapp",
      "email",
      "tipo",
      "origem",
      // Vem do imóvel que o visitante estava vendo, não é escolha dele — mas é
      // coluna obrigatória, então precisa entrar no insert.
      "corretor_id",
      "interesses",
      "preferencias",
      "etapa",
      "timeline",
    ],
  },
});

export const GET = rota.GET;
export const POST = rota.POST;
export const PATCH = rota.PATCH;
export const DELETE = rota.DELETE;
