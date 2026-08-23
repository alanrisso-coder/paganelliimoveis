"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessao } from "@/lib/auth";
import { rotuloPerfil, type Permissao } from "@/lib/permissoes";
import { classes } from "@/lib/format";
import { ModalPerfil } from "./ModalPerfil";

interface ItemMenu {
  href: string;
  texto: string;
  permissao: Permissao;
  icone: string;
}

/** Traçado de cada ícone (viewBox 24). Mantidos inline para não puxar dependência. */
const menu: ItemMenu[] = [
  { href: "/painel", texto: "Dashboard", permissao: "ver_dashboard", icone: "M3 13h8V3H3zM13 21h8V11h-8zM13 8h8V3h-8zM3 21h8v-5H3z" },
  { href: "/painel/crm", texto: "CRM de Clientes", permissao: "ver_crm", icone: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8" },
  { href: "/painel/imoveis", texto: "Imóveis", permissao: "ver_imoveis", icone: "M3 10.5L12 3l9 7.5M5 9.5V21h14V9.5M10 21v-6h4v6" },
  { href: "/painel/anuncios", texto: "Anúncios", permissao: "ver_anuncios", icone: "M3 11l18-6v14L3 13zM3 11v2M7 12.3V19h3v-5.8" },
  { href: "/painel/visitas", texto: "Visitas", permissao: "ver_visitas", icone: "M3 6h18v15H3zM3 10h18M8 3v4M16 3v4" },
  { href: "/painel/contratos", texto: "Exclusividade", permissao: "ver_contratos", icone: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M8 13h8M8 17h5" },
  { href: "/painel/leads", texto: "Leads", permissao: "ver_leads", icone: "M22 12h-6l-2 3h-4l-2-3H2M5.4 5.8L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.4-6.2A2 2 0 0016.8 4H7.2a2 2 0 00-1.8 1.8z" },
  { href: "/painel/relatorios", texto: "Relatórios", permissao: "ver_relatorios", icone: "M21 21H3V3M7 15l4-5 3 3 5-7" },
  { href: "/painel/configuracoes", texto: "Configurações", permissao: "ver_configuracoes", icone: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.7 1.7 0 008.9 19a1.7 1.7 0 00-1.9.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 8.9a1.7 1.7 0 00-.4-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" },
];

/**
 * Área administrativa. Some inteira para quem não tem `ver_usuarios` —
 * corretor e assistente não enxergam sequer o título da seção.
 */
const menuAdministracao: ItemMenu[] = [
  { href: "/painel/usuarios", texto: "Usuários", permissao: "ver_usuarios", icone: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8" },
];

export function Navegacao({ aoNavegar }: { aoNavegar?: () => void }) {
  const caminho = usePathname();
  const { usuario, pode, sair } = useSessao();
  const [perfilAberto, setPerfilAberto] = useState(false);

  if (!usuario) return null;

  const permitidos = menu.filter((item) => pode(item.permissao));
  const permitidosAdmin = menuAdministracao.filter((item) => pode(item.permissao));

  /** Um item do menu. Extraído para as duas seções renderizarem igual. */
  const itemDoMenu = (item: ItemMenu) => {
    // "/painel" só fica ativo na rota exata; os demais aceitam subrotas.
    const ativo = item.href === "/painel" ? caminho === "/painel" : caminho.startsWith(item.href);
    return (
      <li key={item.href}>
        <Link
          href={item.href}
          onClick={aoNavegar}
          aria-current={ativo ? "page" : undefined}
          className={classes(
            "mb-0.5 flex items-center gap-3 rounded-sm px-3 py-2.5 text-[0.8125rem] transition-colors",
            ativo
              ? "bg-verde-700 font-bold text-areia-50"
              : "text-areia-100/70 hover:bg-verde-800 hover:text-areia-50",
          )}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="shrink-0">
            <path
              d={item.icone}
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {item.texto}
        </Link>
      </li>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-8 pt-6">
        <Link href="/painel" onClick={aoNavegar} aria-label="Painel Paganelli">
          <Image
            src="/logo-paganelli-escuro.png"
            alt="Paganelli Imóveis"
            width={620}
            height={295}
            className="h-auto w-[150px]"
          />
        </Link>
      </div>

      <p className="px-5 pb-3 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-verde-500">
        Operação
      </p>

      <nav aria-label="Navegação do painel" className="scroll-fino flex-1 overflow-y-auto px-2.5">
        <ul>{permitidos.map(itemDoMenu)}</ul>

        {permitidosAdmin.length > 0 && (
          <>
            <p className="px-2.5 pb-3 pt-6 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-verde-500">
              Administração
            </p>
            <ul>{permitidosAdmin.map(itemDoMenu)}</ul>
          </>
        )}
      </nav>

      <div className="border-t border-areia-100/12 p-4">
        <div className="flex items-center gap-3">
          {usuario.avatarUrl ? (
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-dourado-500">
              <Image src={usuario.avatarUrl} alt={usuario.nome} fill sizes="36px" className="object-cover" />
            </span>
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dourado-500 text-xs font-extrabold text-verde-950">
              {usuario.avatarIniciais}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-extrabold text-areia-50">{usuario.nome}</p>
            <p className="truncate font-mono text-[0.625rem] uppercase tracking-wide text-dourado-300">
              {rotuloPerfil[usuario.perfil]}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPerfilAberto(true)}
            aria-label="Editar perfil"
            className="shrink-0 rounded-sm p-1.5 text-areia-100/60 transition-colors hover:bg-areia-100/10 hover:text-areia-50"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1A1.7 1.7 0 008.9 19a1.7 1.7 0 00-1.9.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1A1.7 1.7 0 004.6 8.9a1.7 1.7 0 00-.4-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="mt-3 flex gap-2">
          <Link
            href="/"
            className="flex-1 rounded-sm border border-areia-100/18 px-2 py-2 text-center text-[0.6875rem] font-bold text-areia-100/75 transition-colors hover:bg-areia-100/8"
          >
            Ver site
          </Link>
          <button
            type="button"
            onClick={() => void sair()}
            className="flex-1 rounded-sm border border-areia-100/18 px-2 py-2 text-[0.6875rem] font-bold text-areia-100/75 transition-colors hover:bg-areia-100/8"
          >
            Sair
          </button>
        </div>

        <p className="mt-3 flex items-center gap-1.5 text-[0.625rem] text-areia-100/40">
          <span className="h-1.5 w-1.5 rounded-full bg-verde-500" aria-hidden="true" />
          Sistema online · Palhoça, SC
        </p>
      </div>

      <ModalPerfil aberto={perfilAberto} aoFechar={() => setPerfilAberto(false)} />
    </div>
  );
}
