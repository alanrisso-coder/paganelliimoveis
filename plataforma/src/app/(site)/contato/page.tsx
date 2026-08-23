"use client";

import { FormularioLead } from "@/components/site/FormularioLead";
import { BotaoWhatsapp } from "@/components/site/BotaoWhatsapp";
import { CONTATO } from "@/lib/contato";

const canais = [
  {
    titulo: "WhatsApp",
    valor: CONTATO.whatsappExibicao,
    detalhe: "O canal mais rápido para tirar dúvidas e agendar visitas",
    href: `https://wa.me/${CONTATO.whatsapp}`,
  },
];

export default function PaginaContato() {
  return (
    <>
      <header className="border-b border-linha bg-verde-900 py-16 text-areia-100 lg:py-20">
        <div className="container-paganelli">
          <p className="eyebrow text-dourado-400">Contato</p>
          <h1 className="mt-4 max-w-2xl font-display text-4xl leading-tight text-areia-50 lg:text-5xl">
            Estamos por perto
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-areia-100/75">
            Escolha o canal que preferir. Toda mensagem que chega aqui é registrada e recebe
            resposta de uma pessoa — não de um robô.
          </p>
        </div>
      </header>

      <div className="container-paganelli grid gap-14 py-16 lg:grid-cols-[1fr_1.1fr] lg:py-24">
        <div>
          <h2 className="font-display text-2xl text-verde-900">Canais de atendimento</h2>

          <ul className="mt-6 space-y-3">
            {canais.map((canal) => (
              <li key={canal.titulo}>
                <a
                  href={canal.href}
                  target={canal.href.startsWith("http") ? "_blank" : undefined}
                  rel={canal.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="block rounded-sm border border-linha bg-white p-5 transition-colors hover:border-dourado-400"
                >
                  <p className="eyebrow text-dourado-600">{canal.titulo}</p>
                  <p className="mt-1.5 text-base font-extrabold text-verde-900">{canal.valor}</p>
                  <p className="mt-0.5 text-xs text-grafite-400">{canal.detalhe}</p>
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-sm border border-linha bg-white p-6">
            <h3 className="font-display text-xl text-verde-900">Escritório</h3>
            <p className="mt-3 text-sm leading-relaxed text-grafite-700">{CONTATO.endereco}</p>
            <p className="mt-2 text-sm text-grafite-500">
              Atendemos {CONTATO.regiaoAtuacao}.
            </p>
            <p className="mt-3 font-mono text-[0.6875rem] uppercase tracking-wide text-grafite-400">
              {CONTATO.razaoSocial} · {CONTATO.creci}
            </p>

            <div className="mt-5 overflow-hidden rounded-sm border border-linha">
              <iframe
                title="Mapa do escritório da Paganelli Imóveis em Palhoça/SC"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${CONTATO.longitude - 0.006},${CONTATO.latitude - 0.004},${CONTATO.longitude + 0.006},${CONTATO.latitude + 0.004}&layer=mapnik&marker=${CONTATO.latitude},${CONTATO.longitude}`}
                className="h-56 w-full border-0"
                loading="lazy"
              />
            </div>
          </div>

          <BotaoWhatsapp
            className="mt-4 w-full"
            mensagem="Olá! Gostaria de falar com a equipe da Paganelli Imóveis."
          />
        </div>

        <div className="rounded-sm border border-linha bg-white p-8 lg:p-10">
          <h2 className="font-display text-2xl text-verde-900">Envie uma mensagem</h2>
          <p className="mt-2 text-sm leading-relaxed text-grafite-500">
            Quanto mais específico você for sobre região, tipo de imóvel e faixa de valor, mais útil
            será a nossa primeira resposta.
          </p>
          <div className="mt-7">
            <FormularioLead canal="formulario_contato" rotuloEnvio="Enviar mensagem" />
          </div>
        </div>
      </div>
    </>
  );
}
