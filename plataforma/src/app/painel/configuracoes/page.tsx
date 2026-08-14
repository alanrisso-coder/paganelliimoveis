"use client";

import { useState } from "react";
import { useDados } from "@/lib/store";
import { useSessao } from "@/lib/auth";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Botao, Painel, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import { descricaoPerfil, rotuloPerfil } from "@/lib/permissoes";
import { formatarData, formatarDataHora, formatarTelefone } from "@/lib/format";
import { CONTATO } from "@/lib/contato";
import type { Permissao } from "@/lib/permissoes";
import { podeFazer } from "@/lib/permissoes";
import type { PerfilAcesso } from "@/lib/types";

const permissoesExibidas: { chave: Permissao; texto: string }[] = [
  { chave: "ver_dashboard", texto: "Ver dashboard" },
  { chave: "ver_crm", texto: "Ver CRM" },
  { chave: "editar_cliente", texto: "Editar clientes" },
  { chave: "editar_imovel", texto: "Editar imóveis" },
  { chave: "publicar_anuncio", texto: "Publicar anúncios" },
  { chave: "agendar_visita", texto: "Agendar visitas" },
  { chave: "editar_contrato", texto: "Editar contratos" },
  { chave: "atribuir_lead", texto: "Atribuir leads" },
  { chave: "ver_relatorios", texto: "Ver relatórios" },
  { chave: "gerenciar_usuarios", texto: "Gerenciar usuários" },
];

const perfis: PerfilAcesso[] = ["administrador", "corretor", "assistente"];

const integracoes = [
  {
    nome: "WhatsApp Business API",
    descricao: "Envio automático de lembretes de visita e retomada de leads frios.",
    estado: "Preparado",
  },
  {
    nome: "E-mail transacional",
    descricao: "Confirmações de agendamento, book do imóvel e relatório mensal ao proprietário.",
    estado: "Preparado",
  },
  {
    nome: "Portais imobiliários",
    descricao: "Publicação simultânea dos anúncios em portais parceiros via XML.",
    estado: "Preparado",
  },
  {
    nome: "Assinatura digital",
    descricao: "Envio e coleta de assinatura dos contratos de exclusividade.",
    estado: "Preparado",
  },
  {
    nome: "Armazenamento de arquivos",
    descricao: "Upload de fotos, plantas, vídeos e documentos com URL assinada.",
    estado: "Pendente",
  },
  {
    nome: "Banco de dados PostgreSQL",
    descricao: "Persistência real com Prisma ou Supabase, substituindo o store em memória.",
    estado: "Pendente",
  },
];

export default function PaginaConfiguracoes() {
  const dados = useDados();
  const { usuario } = useSessao();
  const { avisar } = useAviso();
  const [confirmandoReinicio, setConfirmandoReinicio] = useState(false);

  return (
    <>
      <CabecalhoPagina
        titulo="Configurações"
        descricao="Usuários, permissões, integrações e dados da imobiliária."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Painel titulo="Usuários da equipe">
          <ul className="space-y-3">
            {dados.usuarios.map((u) => (
              <li key={u.id} className="flex items-start gap-3 border-b border-linha pb-3 last:border-0 last:pb-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-verde-800 text-xs font-extrabold text-areia-50">
                  {u.avatarIniciais}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-verde-900">{u.nome}</p>
                    <Selo tom={u.perfil === "administrador" ? "dourado" : "neutro"}>
                      {rotuloPerfil[u.perfil]}
                    </Selo>
                    {u.id === usuario?.id && <Selo tom="verde">você</Selo>}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[0.6875rem] text-grafite-400">{u.email}</p>
                  <p className="text-xs text-grafite-500">
                    {formatarTelefone(u.telefone)}
                    {u.creci && ` · ${u.creci}`}
                  </p>
                  <p className="mt-0.5 text-[0.625rem] text-grafite-400">
                    Na equipe desde {formatarData(u.criadoEm)}
                  </p>
                </div>
                <Selo tom={u.ativo ? "verde" : "erro"}>{u.ativo ? "ativo" : "inativo"}</Selo>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-linha pt-4 text-xs leading-relaxed text-grafite-400">
            A criação e a desativação de usuários passam a ser possíveis quando o provedor de
            autenticação for conectado — hoje a equipe vem do seed.
          </p>
        </Painel>

        <Painel titulo="Matriz de permissões">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Permissões por perfil de acesso</caption>
              <thead>
                <tr>
                  <th scope="col" className="pb-2 text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                    Permissão
                  </th>
                  {perfis.map((p) => (
                    <th
                      key={p}
                      scope="col"
                      className="pb-2 text-center text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400"
                    >
                      {rotuloPerfil[p].slice(0, 5)}.
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissoesExibidas.map((perm) => (
                  <tr key={perm.chave} className="border-t border-linha">
                    <td className="py-2 text-xs text-grafite-700">{perm.texto}</td>
                    {perfis.map((p) => (
                      <td key={p} className="py-2 text-center">
                        {podeFazer(p, perm.chave) ? (
                          <span className="text-sucesso" aria-label="permitido">
                            ✓
                          </span>
                        ) : (
                          <span className="text-grafite-400/50" aria-label="não permitido">
                            —
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5 space-y-2 border-t border-linha pt-4">
            {perfis.map((p) => (
              <p key={p} className="text-xs leading-relaxed text-grafite-500">
                <strong className="font-bold text-verde-900">{rotuloPerfil[p]}:</strong>{" "}
                {descricaoPerfil[p]}
              </p>
            ))}
            <p className="text-xs leading-relaxed text-grafite-500">
              <strong className="font-bold text-verde-900">Visitante:</strong> acessa apenas o site
              público, pesquisa imóveis e envia contatos.
            </p>
          </div>
        </Painel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Painel titulo="Dados da imobiliária">
          <dl className="space-y-3 text-sm">
            {[
              { r: "Nome", v: CONTATO.razaoSocial },
              { r: "Responsável técnica", v: CONTATO.responsavel },
              { r: "CRECI", v: CONTATO.creci },
              { r: "Endereço", v: CONTATO.endereco },
              { r: "Telefone / WhatsApp", v: CONTATO.telefone },
              { r: "E-mail", v: CONTATO.email },
              { r: "Região de atuação", v: CONTATO.regiaoAtuacao },
            ].map((x) => (
              <div key={x.r} className="border-b border-linha pb-2.5 last:border-0 last:pb-0">
                <dt className="text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">{x.r}</dt>
                <dd className="mt-0.5 text-grafite-900">{x.v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-grafite-400">
            Dados institucionais reais da empresa. A equipe listada acima é demonstrativa.
          </p>
        </Painel>

        <Painel titulo="Integrações">
          <ul className="space-y-3">
            {integracoes.map((i) => (
              <li key={i.nome} className="border-b border-linha pb-3 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold text-verde-900">{i.nome}</p>
                  <Selo tom={i.estado === "Preparado" ? "neutro" : "alerta"}>{i.estado}</Selo>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-grafite-500">{i.descricao}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-grafite-400">
            &quot;Preparado&quot; significa que o modelo de dados e os pontos de chamada já existem no
            código; falta apenas conectar as credenciais do provedor.
          </p>
        </Painel>
      </div>

      <Painel titulo={`Registro de ações (${dados.logs.length})`} className="mt-5">
        <div className="scroll-fino max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Trilha de auditoria das ações do painel</caption>
            <thead className="sticky top-0 bg-white">
              <tr>
                {["Data", "Usuário", "Ação", "Entidade", "Detalhe"].map((h) => (
                  <th key={h} scope="col" className="pb-2 text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dados.logs.map((log) => {
                const autor = dados.usuarioPorId(log.usuarioId);
                return (
                  <tr key={log.id} className="border-t border-linha">
                    <td className="py-2.5 pr-3 font-mono text-[0.6875rem] text-grafite-400">
                      {formatarDataHora(log.data)}
                    </td>
                    <td className="py-2.5 pr-3 text-xs text-grafite-700">{autor?.nome ?? "Sistema"}</td>
                    <td className="py-2.5 pr-3 text-xs font-bold text-verde-900">{log.acao}</td>
                    <td className="py-2.5 pr-3 font-mono text-[0.6875rem] text-verde-800">{log.entidade}</td>
                    <td className="py-2.5 text-xs text-grafite-500">{log.detalhe}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Painel>

      <Painel titulo="Ambiente de demonstração" className="mt-5">
        <p className="text-sm leading-relaxed text-grafite-700">
          Todas as alterações feitas neste painel — publicar anúncios, mover clientes no funil,
          agendar visitas — ficam salvas no armazenamento local deste navegador. Nada é enviado a um
          servidor.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-grafite-500">
          Reiniciar devolve a base ao estado original do seed, descartando tudo o que foi criado ou
          alterado nesta sessão.
        </p>

        {confirmandoReinicio ? (
          <div className="mt-4 rounded-sm border border-erro/30 bg-[#f7e6e4] p-4">
            <p className="text-sm font-bold text-erro">
              Tem certeza? Esta ação descarta todas as alterações locais.
            </p>
            <div className="mt-3 flex gap-2">
              <Botao
                variante="perigo"
                tamanho="sm"
                onClick={() => {
                  dados.reiniciarDemonstracao();
                  setConfirmandoReinicio(false);
                  avisar("Dados restaurados ao estado inicial da demonstração.");
                }}
              >
                Sim, reiniciar
              </Botao>
              <Botao variante="fantasma" tamanho="sm" onClick={() => setConfirmandoReinicio(false)}>
                Cancelar
              </Botao>
            </div>
          </div>
        ) : (
          <Botao variante="contorno" tamanho="sm" className="mt-4" onClick={() => setConfirmandoReinicio(true)}>
            Reiniciar dados de demonstração
          </Botao>
        )}
      </Painel>
    </>
  );
}
