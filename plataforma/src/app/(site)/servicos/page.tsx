import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Serviços",
  description:
    "Compra e venda, locação, exclusividade, avaliação e assessoria jurídica e documental para imóveis de alto padrão.",
};

const servicos = [
  {
    numero: "01",
    titulo: "Compra e venda",
    resumo: "Assessoria completa do primeiro encontro à assinatura da escritura.",
    itens: [
      "Entrevista de perfil e definição de critérios reais de busca",
      "Seleção curada — mostramos poucas opções, todas coerentes",
      "Visitas acompanhadas pelo corretor responsável, nunca por terceiros",
      "Análise comparativa de mercado antes de qualquer proposta",
      "Condução da negociação e redação da proposta",
      "Acompanhamento de financiamento, ITBI, cartório e escritura",
    ],
  },
  {
    numero: "02",
    titulo: "Locação",
    resumo: "Imóveis selecionados e uma gestão que simplifica cada etapa.",
    itens: [
      "Curadoria de imóveis com vistoria prévia da equipe",
      "Análise cadastral e definição de garantia adequada ao caso",
      "Contrato redigido pelo jurídico da casa, sem modelo genérico",
      "Vistoria de entrada e de saída com laudo fotográfico",
      "Gestão de repasses, reajustes e renovações",
      "Canal único para manutenção e intercorrências",
    ],
  },
  {
    numero: "03",
    titulo: "Exclusividade",
    resumo: "Estratégia, visibilidade e representação para o seu patrimônio.",
    itens: [
      "Avaliação com base em transações reais da região, não em pedidos de anúncio",
      "Book fotográfico profissional, vídeo e tour virtual por nossa conta",
      "Plano de divulgação segmentada, incluindo carteira própria",
      "Relatório mensal com visualizações, contatos e feedback de cada visita",
      "Filtro de interessados — você recebe apenas propostas qualificadas",
      "Um único interlocutor do anúncio à assinatura",
    ],
  },
  {
    numero: "04",
    titulo: "Avaliação de imóveis",
    resumo: "Um número defensável, com metodologia aberta.",
    itens: [
      "Visita técnica com registro do estado de conservação",
      "Comparação com transações efetivamente fechadas na região",
      "Ajuste por metragem, andar, posição solar, vagas e reforma",
      "Laudo escrito com a memória de cálculo",
      "Cenários de precificação: venda rápida, equilibrada e ambiciosa",
    ],
  },
  {
    numero: "05",
    titulo: "Assessoria jurídica e documental",
    resumo: "A parte que trava a maioria dos negócios, resolvida dentro de casa.",
    itens: [
      "Leitura de matrícula e identificação de ônus, penhoras e usufrutos",
      "Levantamento de certidões do imóvel e dos vendedores",
      "Análise de espólio, inventário e representação por procuração",
      "Cronograma único com prazos e responsáveis nomeados",
      "Acompanhamento no cartório até o registro final",
    ],
  },
  {
    numero: "06",
    titulo: "Consultoria para investidores",
    resumo: "Para quem compra por retorno, não por moradia.",
    itens: [
      "Estudo de rentabilidade de locação por região e tipologia",
      "Comparativo entre valorização histórica e projeção de obra pública",
      "Acesso antecipado a oportunidades antes da publicação",
      "Suporte na estruturação de carteira com múltiplos imóveis",
    ],
  },
];

export default function PaginaServicos() {
  return (
    <>
      <header className="border-b border-linha bg-verde-900 py-16 text-areia-100 lg:py-24">
        <div className="container-paganelli">
          <p className="eyebrow text-dourado-400">Serviços</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-areia-50 lg:text-5xl">
            Uma jornada bem conduzida, do primeiro contato ao registro
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-areia-100/75">
            Cada etapa abaixo é executada por alguém da nossa equipe — não terceirizamos visita,
            negociação nem análise documental.
          </p>
        </div>
      </header>

      <div className="container-paganelli py-16 lg:py-24">
        <div className="grid gap-x-10 gap-y-14 lg:grid-cols-2">
          {servicos.map((servico) => (
            <section key={servico.numero} aria-labelledby={`servico-${servico.numero}`}>
              <p className="eyebrow text-dourado-600">{servico.numero}</p>
              <h2
                id={`servico-${servico.numero}`}
                className="mt-2.5 font-display text-2xl text-verde-900"
              >
                {servico.titulo}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-grafite-500">{servico.resumo}</p>

              <ul className="mt-5 space-y-2.5 border-t border-linha pt-5">
                {servico.itens.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-grafite-700">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 16 16"
                      fill="none"
                      className="mt-1 shrink-0 text-dourado-600"
                      aria-hidden="true"
                    >
                      <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>

      <section className="bg-areia-50 py-20 lg:py-24">
        <div className="container-paganelli grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="font-display text-3xl leading-tight text-verde-900 lg:text-[2.5rem]">
              Não sabe por onde começar?
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-grafite-500">
              Conte em duas linhas o que você quer fazer — comprar, vender, alugar ou apenas
              entender quanto vale o seu imóvel. A partir daí, indicamos o caminho.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              href="/contato"
              className="rounded-sm bg-verde-800 px-6 py-3.5 text-sm font-extrabold text-areia-50 transition-colors hover:bg-verde-700"
            >
              Falar com um especialista
            </Link>
            <Link
              href="/anuncie"
              className="rounded-sm border border-verde-800/25 px-6 py-3.5 text-sm font-extrabold text-verde-800 transition-colors hover:bg-verde-800/6"
            >
              Avaliar meu imóvel
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
