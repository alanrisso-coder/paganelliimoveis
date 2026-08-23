import { criarRotaCrud } from "@/lib/rota-crud";

/**
 * Agenda de visitas.
 *
 * A criação segue pública porque o visitante marca a visita pelo site. O que
 * ele informa é o horário e a modalidade; confirmação, feedback, status e
 * observações do corretor são preenchidos dentro do painel e ficam fora da
 * lista permitida — senão daria para marcar a própria visita como confirmada
 * ou escrever no campo de anotações do corretor.
 */
const rota = criarRotaCrud({
  tabela: "visitas",
  rotulo: "as visitas",
  ler: "ver_visitas",
  criar: "agendar_visita",
  editar: "agendar_visita",
  excluir: "agendar_visita",
  criacaoPublica: {
    campos: [
      "id",
      "codigo",
      "imovel_id",
      "cliente_id",
      "corretor_id",
      "data",
      "hora_inicio",
      "hora_fim",
      "modalidade",
      "ponto_encontro",
    ],
  },
});

export const GET = rota.GET;
export const POST = rota.POST;
export const PATCH = rota.PATCH;
export const DELETE = rota.DELETE;
