import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { usuarios } from "@/lib/seed/usuarios";
import { rotuloPerfil } from "@/lib/permissoes";

export const metadata: Metadata = {
  title: "A imobiliária",
  description:
    "Conheça a Paganelli Imóveis: atendimento personalizado em Palhoça e na Grande Florianópolis, com análise documental e aprovação de financiamento sem custo.",
};

const etapasAtendimento = [
  {
    numero: "01",
    titulo: "Entender o que você procura",
    texto:
      "A conversa inicial define região, tipologia, prazo e faixa de valor reais. É o que evita visitar imóvel que nunca teria chance.",
  },
  {
    numero: "02",
    titulo: "Selecionar poucas opções certas",
    texto:
      "A seleção é curta e justificada. Cada imóvel apresentado passou por visita e checagem de documentação antes de chegar até você.",
  },
  {
    numero: "03",
    titulo: "Analisar a documentação sem custo",
    texto:
      "Matrícula, certidões e situação do vendedor são analisadas antes da proposta — sem cobrança adicional ao cliente.",
  },
  {
    numero: "04",
    titulo: "Aprovar o financiamento no seu banco",
    texto:
      "Conduzimos a aprovação na Caixa, Banco do Brasil, Santander, Bradesco, Itaú ou Banrisul, conforme a sua preferência. Também sem custo.",
  },
  {
    numero: "05",
    titulo: "Acompanhar até o registro",
    texto:
      "Contrato, ITBI, cartório e entrega das chaves com um cronograma único e um único responsável do começo ao fim.",
  },
];

const valores = [
  {
    titulo: "Franqueza antes de agrado",
    texto:
      "Se o preço não se sustenta, dizemos. Se o imóvel não atende ao que você descreveu, não marcamos a visita. Perder uma venda é mais barato que perder a confiança.",
  },
  {
    titulo: "Um dono para cada negócio",
    texto:
      "Todo cliente tem um corretor responsável, com nome e telefone. Nada de fila de atendimento ou resposta genérica de central.",
  },
  {
    titulo: "Discrição como padrão",
    texto:
      "Endereços exatos, valores negociados e dados de proprietários não circulam. Publicamos o necessário para atrair o comprador certo — nada além.",
  },
];

export default function PaginaSobre() {
  const equipe = usuarios.filter((u) => u.ativo);

  return (
    <>
      <section className="relative isolate flex min-h-[26rem] items-end overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=2000&q=75"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-verde-950/92 to-verde-950/45" aria-hidden="true" />
        <div className="container-paganelli pb-14 pt-28">
          <p className="eyebrow text-dourado-300">A imobiliária</p>
          <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight text-areia-50 lg:text-6xl">
            Ajudando pessoas a escolher onde a vida acontece, em Palhoça e região
          </h1>
        </div>
      </section>

      <section className="container-paganelli grid gap-14 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <p className="eyebrow text-dourado-600">Quem somos</p>
          <h2 className="mt-3 font-display text-3xl leading-tight text-verde-900 lg:text-[2.5rem]">
            Uma imobiliária pequena por escolha
          </h2>
        </div>
        <div className="space-y-5 text-sm leading-[1.85] text-grafite-700">
          <p>
            A Paganelli Imóveis é uma imobiliária deliberadamente enxuta, com sede no Duetto
            Office, no Pagani, em Palhoça. Equipe pequena, carteira selecionada e nenhuma meta de
            volume — o que muda a forma como o atendimento acontece.
          </p>
          <p>
            Essa escolha tem uma consequência prática. Cada corretor da casa conhece pessoalmente
            todos os imóveis que oferecemos — visitou, conversou com o proprietário, leu a matrícula.
            Quando você pergunta se a casa pega sol da tarde ou se o condomínio tem histórico de
            rateio extra, a resposta vem de quem esteve lá.
          </p>
          <p>
            Trabalhamos com compra, venda e locação em Palhoça, São José, Florianópolis e nos
            municípios vizinhos — de apartamentos de dois dormitórios a casas de alto padrão em
            condomínio. Boa parte do que vendemos nunca chega a ser anunciado: sai antes, para
            alguém da nossa carteira.
          </p>
        </div>
      </section>

      <section className="bg-areia-50 py-20 lg:py-24">
        <div className="container-paganelli">
          <p className="eyebrow text-dourado-600">Como conduzimos</p>
          <h2 className="mt-3 font-display text-3xl text-verde-900 lg:text-[2.5rem]">
            As cinco etapas de cada negócio
          </h2>

          <ol className="mt-12 space-y-0">
            {etapasAtendimento.map((item) => (
              <li
                key={item.numero}
                className="grid gap-4 border-l-2 border-linha py-7 pl-8 sm:grid-cols-[6rem_1fr] sm:gap-8"
              >
                <p className="font-display text-2xl text-dourado-600">{item.numero}</p>
                <div>
                  <h3 className="font-display text-xl text-verde-900">{item.titulo}</h3>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-grafite-500">
                    {item.texto}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-verde-900 py-20 text-areia-100 lg:py-28">
        <div className="container-paganelli">
          <p className="eyebrow text-dourado-400">No que acreditamos</p>
          <h2 className="mt-3 font-display text-3xl text-areia-50 lg:text-[2.5rem]">
            Três compromissos que não negociamos
          </h2>

          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {valores.map((v, i) => (
              <div key={v.titulo} className="border-t-2 border-dourado-400 pt-6">
                <p className="eyebrow text-dourado-400">0{i + 1}</p>
                <h3 className="mt-3 font-display text-xl text-areia-50">{v.titulo}</h3>
                <p className="mt-3 text-sm leading-relaxed text-areia-100/75">{v.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-paganelli py-20 text-center lg:py-28">
        <h2 className="mx-auto max-w-2xl font-display text-3xl leading-tight text-verde-900 lg:text-[2.5rem]">
          Vamos conversar sobre o seu próximo imóvel?
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/imoveis/venda"
            className="rounded-sm bg-verde-800 px-6 py-3.5 text-sm font-extrabold text-areia-50 transition-colors hover:bg-verde-700"
          >
            Ver imóveis disponíveis
          </Link>
          <Link
            href="/contato"
            className="rounded-sm border border-verde-800/25 px-6 py-3.5 text-sm font-extrabold text-verde-800 transition-colors hover:bg-verde-800/6"
          >
            Falar com a equipe
          </Link>
        </div>
      </section>
    </>
  );
}
