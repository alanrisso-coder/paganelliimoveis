"use client";

import Image from "next/image";
import Link from "next/link";
import { useDados } from "@/lib/store";
import { BuscaImoveis } from "@/components/site/BuscaImoveis";
import { CardImovel } from "@/components/site/CardImovel";
import { FormularioLead } from "@/components/site/FormularioLead";
import { BotaoWhatsapp } from "@/components/site/BotaoWhatsapp";
import { CarregandoCards, EstadoVazio } from "@/components/ui";
import { formatarNumero } from "@/lib/format";
import { CONTATO } from "@/lib/contato";

const HERO =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=75";

const diferenciais = [
  {
    numero: "01",
    titulo: "Curadoria, não catálogo",
    texto:
      "Cada imóvel passa por visita técnica, checagem documental e avaliação de mercado antes de entrar na nossa vitrine. Você vê menos opções — e todas fazem sentido.",
  },
  {
    numero: "02",
    titulo: "Um corretor do início ao fim",
    texto:
      "Nada de trocar de interlocutor a cada etapa. Quem atende a sua primeira ligação é quem acompanha a visita, negocia e senta com você na assinatura.",
  },
  {
    numero: "03",
    titulo: "Transparência sobre o valor",
    texto:
      "Apresentamos o histórico de preço do imóvel, os custos recorrentes e a comparação com transações reais da região. Sem número inflado para depois negociar.",
  },
  {
    numero: "04",
    titulo: "Jurídico e documentação integrados",
    texto:
      "Análise documental e aprovação de financiamento sem custo, no banco da sua preferência. Você recebe um único cronograma, com prazos claros e responsáveis nomeados.",
  },
];

const depoimentos = [
  {
    texto:
      "Visitamos onze casas com outras imobiliárias e nenhuma tinha entendido o que a gente procurava. A Paganelli mostrou três e a segunda era a nossa.",
    autor: "Renata e Marcos Ferraz",
    contexto: "Compra de casa em condomínio, Palhoça",
  },
  {
    texto:
      "O que me convenceu foi a franqueza sobre o preço. Me mostraram por que o valor que eu pedia não se sustentava e vendemos em cinco semanas pelo número certo.",
    autor: "Roberto Moraes",
    contexto: "Venda com exclusividade na Pedra Branca",
  },
  {
    texto:
      "Sou investidor e trabalho com prazo curto. Recebo as oportunidades antes de irem ao ar e a documentação sempre chega revisada. É raro.",
    autor: "Paulo Teles",
    contexto: "Terceira operação com a Paganelli",
  },
];

export default function PaginaInicial() {
  const { imoveisPublicos, anunciosPublicos, anuncioDoImovel, carregado } = useDados();

  const destaques = anunciosPublicos
    .filter((a) => a.destaqueHome)
    .map((a) => imoveisPublicos.find((i) => i.id === a.imovelId))
    .filter((i): i is NonNullable<typeof i> => Boolean(i))
    .slice(0, 6);

  const vitrine = destaques.length > 0 ? destaques : imoveisPublicos.slice(0, 6);

  return (
    <>
      {/* ------------------------------------------------------------ Hero */}
      <section className="relative isolate flex min-h-[38rem] items-end overflow-hidden lg:min-h-[44rem]">
        <Image
          src={HERO}
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-verde-950/88 via-verde-950/62 to-verde-950/20"
          aria-hidden="true"
        />

        <div className="container-paganelli w-full pb-12 pt-28 lg:pb-16 lg:pt-36">
          <p className="eyebrow animar-entrada text-dourado-300">
            Paganelli Imóveis · Palhoça e Grande Florianópolis
          </p>
          <h1 className="animar-entrada mt-5 max-w-3xl font-display text-4xl leading-[1.08] text-areia-50 sm:text-5xl lg:text-[4.25rem]">
            Encontre o imóvel ideal para o seu próximo capítulo
          </h1>
          <p className="animar-entrada mt-6 max-w-xl text-base leading-relaxed text-areia-100/85">
            Uma curadoria precisa de casas, apartamentos e terrenos em Palhoça e região — com
            atendimento direto da corretora responsável em cada decisão importante da sua vida.
          </p>

          <div className="mt-10 max-w-4xl lg:mt-12">
            <BuscaImoveis escuro />
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- Números */}
      <section className="border-b border-linha bg-areia-50">
        <div className="container-paganelli grid grid-cols-2 gap-8 py-10 lg:grid-cols-3">
          {[
          ].map((item) => (
            <div key={item.rotulo}>
              <p className="font-display text-2xl text-verde-800 lg:text-3xl">{item.valor}</p>
              <p className="mt-1 text-xs leading-relaxed text-grafite-500">{item.rotulo}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------- Imóveis em destaque */}
      <section className="container-paganelli py-20 lg:py-28">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="eyebrow text-dourado-600">Seleção Paganelli</p>
            <h2 className="mt-3 font-display text-3xl text-verde-900 lg:text-[2.5rem]">
              Imóveis em destaque
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-grafite-500">
              Uma amostra do que temos disponível agora. Todos com documentação verificada e visita
              acompanhada por um corretor da casa.
            </p>
          </div>
          <Link
            href="/imoveis/venda"
            className="text-sm font-extrabold text-verde-800 underline underline-offset-[6px] hover:text-dourado-600"
          >
            Ver todos os imóveis
          </Link>
        </div>

        {!carregado ? (
          <CarregandoCards quantidade={6} />
        ) : vitrine.length === 0 ? (
          <EstadoVazio
            icone="casa"
            titulo="Nenhum imóvel publicado no momento"
            descricao="Nossa equipe está preparando novos anúncios. Deixe seu contato e avisamos assim que houver novidade."
            acao={
              <Link
                href="/contato"
                className="rounded-sm bg-verde-800 px-5 py-3 text-sm font-extrabold text-areia-50"
              >
                Quero ser avisado
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vitrine.map((imovel, indice) => (
              <CardImovel
                key={imovel.id}
                imovel={imovel}
                anuncio={anuncioDoImovel(imovel.id)}
                prioridade={indice < 3}
              />
            ))}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------ Depoimentos */}
      <section className="bg-areia-50 py-20 lg:py-28">
        <div className="container-paganelli">
          <div className="mb-12 max-w-xl">
            <p className="eyebrow text-dourado-600">Quem já passou por aqui</p>
            <h2 className="mt-3 font-display text-3xl text-verde-900 lg:text-[2.5rem]">
              Histórias que começaram com uma boa escolha
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {depoimentos.map((d) => (
              <figure key={d.autor} className="flex flex-col rounded-sm border border-linha bg-white p-7">
                <svg width="26" height="20" viewBox="0 0 26 20" className="mb-5 text-dourado-300" aria-hidden="true">
                  <path
                    d="M11 20V10.7C11 4.8 14.5 1 20.4 0l.9 2.6c-3.3.9-5 3-5.1 6.2H20V20h-9zm-11 0V10.7C0 4.8 3.5 1 9.4 0l.9 2.6C7 3.5 5.3 5.6 5.2 8.8H9V20H0z"
                    fill="currentColor"
                  />
                </svg>
                <blockquote className="flex-1 text-sm leading-relaxed text-grafite-700">
                  {d.texto}
                </blockquote>
                <figcaption className="mt-6 border-t border-linha pt-4">
                  <p className="text-sm font-extrabold text-verde-900">{d.autor}</p>
                  <p className="mt-0.5 text-xs text-grafite-400">{d.contexto}</p>
                </figcaption>
              </figure>
            ))}
          </div>

          <p className="mt-8 text-xs text-grafite-400">
            Depoimentos demonstrativos, elaborados para esta versão da plataforma.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- Contato */}
      <section className="container-paganelli py-20 lg:py-28">
        <div className="grid gap-12 rounded-sm border border-linha bg-white p-8 lg:grid-cols-2 lg:p-14">
          <div>
            <p className="eyebrow text-dourado-600">Fale com a Paganelli</p>
            <h2 className="mt-3 font-display text-3xl leading-tight text-verde-900 lg:text-[2.5rem]">
              Conte o que você procura
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-grafite-500">
              Responda em um minuto e um dos nossos corretores retorna em até duas horas úteis, com
              uma seleção pensada para o seu caso — não com um catálogo inteiro.
            </p>
            <div className="mt-8 space-y-4 border-t border-linha pt-8 text-sm text-grafite-700">
              <p>
                <span className="block text-xs font-bold uppercase tracking-wide text-grafite-400">
                  Escritório
                </span>
                {CONTATO.endereco}
              </p>
              <p>
                <span className="block text-xs font-bold uppercase tracking-wide text-grafite-400">
                  Atendimento
                </span>
                {CONTATO.telefone} · WhatsApp {CONTATO.whatsappExibicao}
              </p>
            </div>
          </div>

          <FormularioLead canal="formulario_contato" rotuloEnvio="Enviar e receber uma seleção" />
        </div>
      </section>
    </>
  );
}
