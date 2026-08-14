"use client";

import Image from "next/image";
import { FormularioLead } from "@/components/site/FormularioLead";
import { BotaoWhatsapp } from "@/components/site/BotaoWhatsapp";

const etapas = [
  {
    numero: "01",
    titulo: "Conversa inicial",
    texto: "Entendemos o imóvel, o seu prazo e a sua expectativa de valor. Sem compromisso.",
    prazo: "Mesmo dia",
  },
  {
    numero: "02",
    titulo: "Visita e avaliação",
    texto:
      "Um corretor visita o imóvel, registra o estado de conservação e monta o laudo comparativo com transações reais da região.",
    prazo: "Até 48 horas",
  },
  {
    numero: "03",
    titulo: "Apresentação do plano",
    texto:
      "Você recebe a avaliação escrita, três cenários de preço e a proposta de divulgação — incluindo o que fazemos por nossa conta.",
    prazo: "3 a 5 dias",
  },
  {
    numero: "04",
    titulo: "Produção e publicação",
    texto:
      "Book fotográfico, vídeo, tour virtual e texto comercial. O anúncio vai ao ar já com a documentação verificada.",
    prazo: "1 semana",
  },
  {
    numero: "05",
    titulo: "Acompanhamento mensal",
    texto:
      "Relatório com visualizações, contatos e o feedback textual de cada visita. Ajustamos a estratégia com você, com dados.",
    prazo: "Contínuo",
  },
];

export default function PaginaAnuncie() {
  return (
    <>
      <section className="relative isolate flex min-h-[24rem] items-end overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1600585152915-d208bec867a1?auto=format&fit=crop&w=2000&q=75"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-verde-950/93 to-verde-950/40" aria-hidden="true" />
        <div className="container-paganelli pb-12 pt-28">
          <p className="eyebrow text-dourado-300">Para proprietários</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-areia-50 lg:text-5xl">
            Anuncie seu imóvel com quem responde por ele
          </h1>
        </div>
      </section>

      <div className="container-paganelli grid gap-14 py-16 lg:grid-cols-[1.15fr_1fr] lg:py-24">
        <div>
          <p className="eyebrow text-dourado-600">Como funciona</p>
          <h2 className="mt-3 font-display text-3xl text-verde-900 lg:text-[2.5rem]">
            Cinco etapas, prazos definidos
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-grafite-500">
            Você sabe o que acontece em cada momento e quem é o responsável. Sem cobrança por
            atualização, sem anúncio parado sem explicação.
          </p>

          <ol className="mt-10 space-y-0">
            {etapas.map((etapa) => (
              <li key={etapa.numero} className="border-l-2 border-linha py-6 pl-7">
                <div className="flex flex-wrap items-baseline gap-3">
                  <p className="eyebrow text-dourado-600">{etapa.numero}</p>
                  <h3 className="font-display text-xl text-verde-900">{etapa.titulo}</h3>
                  <span className="rounded-sm bg-areia-200 px-2 py-1 font-mono text-[0.625rem] uppercase tracking-wide text-grafite-500">
                    {etapa.prazo}
                  </span>
                </div>
                <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-grafite-500">
                  {etapa.texto}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-10 rounded-sm border border-linha bg-white p-7">
            <h3 className="font-display text-xl text-verde-900">Por nossa conta, sempre</h3>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {[
                "Avaliação escrita do imóvel",
                "Book fotográfico profissional",
                "Vídeo e tour virtual",
                "Análise da matrícula e certidões",
                "Divulgação em portais parceiros",
                "Relatório mensal de desempenho",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-grafite-700">
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="mt-1 shrink-0 text-dourado-600" aria-hidden="true">
                    <path d="M3 8.5l3.2 3.2L13 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 border-t border-linha pt-4 text-xs leading-relaxed text-grafite-400">
              A comissão só é devida na concretização do negócio. Não cobramos taxa de cadastro,
              de anúncio nem de produção de material.
            </p>
          </div>
        </div>

        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-sm border border-linha bg-white p-7">
            <h2 className="font-display text-2xl text-verde-900">Solicite uma avaliação</h2>
            <p className="mt-2 text-sm leading-relaxed text-grafite-500">
              Preencha e um especialista retorna em até 2 horas úteis para agendar a visita técnica.
            </p>
            <div className="mt-6">
              <FormularioLead
                canal="anuncie"
                compacto
                rotuloEnvio="Quero uma avaliação gratuita"
                mensagemInicial="Gostaria de uma avaliação do meu imóvel. Tipo, bairro e metragem: "
              />
            </div>
          </div>

          <div className="mt-4 rounded-sm border border-linha bg-areia-50 p-6">
            <p className="text-sm font-extrabold text-verde-900">Prefere falar agora?</p>
            <p className="mt-1.5 text-xs leading-relaxed text-grafite-500">
              Nosso time de captação atende por WhatsApp em horário comercial.
            </p>
            <BotaoWhatsapp
              className="mt-4 w-full"
              mensagem="Olá! Gostaria de anunciar meu imóvel com a Paganelli e receber uma avaliação."
            />
          </div>
        </aside>
      </div>
    </>
  );
}
