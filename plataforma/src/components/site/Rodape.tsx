import Image from "next/image";
import Link from "next/link";
import { CONTATO } from "@/lib/contato";

const colunas = [
  {
    titulo: "Imóveis",
    links: [
      { href: "/imoveis/venda", texto: "Imóveis à venda" },
      { href: "/favoritos", texto: "Meus favoritos" },
      { href: "/anuncie", texto: "Anuncie seu imóvel" },
    ],
  },
  {
    titulo: "Institucional",
    links: [
      { href: "/sobre", texto: "A imobiliária" },
      { href: "/servicos", texto: "Serviços" },
      { href: "/contato", texto: "Contato" },
      { href: "/painel", texto: "Acesso da equipe" },
    ],
  },
];

export function Rodape() {
  return (
    <footer className="bg-verde-900 text-areia-100">
      <div className="container-paganelli grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-4 lg:py-20">
        <div className="lg:col-span-2">
          <Image
            src="/logo-paganelli-escuro.png"
            alt="Paganelli Imóveis"
            width={620}
            height={295}
            className="h-auto w-[240px]"
          />
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-areia-100/75">
            Relações duradouras começam com uma boa escolha. Assessoria completa em compra, venda e
            locação em Palhoça e na Grande Florianópolis, com análise documental e aprovação de
            financiamento sem custo para o cliente.
          </p>
          <p className="eyebrow mt-6 text-dourado-400">
            {CONTATO.razaoSocial} · {CONTATO.creci}
          </p>
        </div>

        {colunas.map((coluna) => (
          <nav key={coluna.titulo} aria-label={coluna.titulo}>
            <h2 className="eyebrow mb-5 text-dourado-400">{coluna.titulo}</h2>
            <ul className="space-y-3">
              {coluna.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-areia-100/80 transition-colors hover:text-dourado-300"
                  >
                    {link.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-areia-100/12">
        <div className="container-paganelli grid gap-8 py-10 md:grid-cols-2">
          <div className="space-y-1.5 text-sm text-areia-100/75">
            <p className="font-bold text-areia-100">Atendimento</p>
            <p>{CONTATO.endereco}</p>
            <p>
              <a href={`tel:+${CONTATO.whatsapp}`} className="hover:text-dourado-300">
                {CONTATO.telefone}
              </a>{" "}
              · WhatsApp {CONTATO.whatsappExibicao}
            </p>
            <p>
              <a href={`mailto:${CONTATO.email}`} className="hover:text-dourado-300">
                {CONTATO.email}
              </a>
            </p>
            <p className="text-areia-100/55">Atendemos {CONTATO.regiaoAtuacao}.</p>
          </div>

          <div className="md:text-right">
            <p className="font-bold text-areia-100">Acompanhe</p>
            <div className="mt-3 flex gap-3 md:justify-end">
              {[
                { nome: "Instagram", href: CONTATO.redes.instagram },
                { nome: "Facebook", href: CONTATO.redes.facebook },
              ].map((rede) => (
                <a
                  key={rede.nome}
                  href={rede.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm border border-areia-100/20 px-3 py-1.5 text-xs text-areia-100/70 transition-colors hover:border-dourado-400 hover:text-dourado-300"
                >
                  {rede.nome}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-areia-100/12">
        <div className="container-paganelli flex flex-col gap-3 py-6 text-xs text-areia-100/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Paganelli Imóveis. Todos os direitos reservados.</p>
          <div className="flex gap-5">
            <Link href="/privacidade" className="hover:text-dourado-300">
              Política de privacidade
            </Link>
            <Link href="/privacidade#cookies" className="hover:text-dourado-300">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
