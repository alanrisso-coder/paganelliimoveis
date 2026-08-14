"use client";

import { useMemo, useState } from "react";
import { useDados } from "@/lib/store";
import { CabecalhoPagina } from "@/components/painel/Cabecalho";
import { Indicador } from "@/components/painel/Indicador";
import { BarrasHorizontais, MiniSerie } from "@/components/painel/Graficos";
import { Painel, Selo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import { Botao } from "@/components/ui";
import {
  criarDataLocal,
  formatarMoedaCurta,
  formatarNumero,
  formatarPercentual,
  rotuloTipoImovel,
} from "@/lib/format";
import type { TipoImovel } from "@/lib/types";

const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export default function PaginaRelatorios() {
  const dados = useDados();
  const { avisar } = useAviso();
  const [corretorFiltro, setCorretorFiltro] = useState("todos");

  const corretores = dados.usuarios.filter((u) => u.perfil !== "assistente");

  const imoveis = useMemo(
    () =>
      corretorFiltro === "todos"
        ? dados.imoveis
        : dados.imoveis.filter((i) => i.corretorId === corretorFiltro),
    [dados.imoveis, corretorFiltro],
  );

  const anuncios = useMemo(() => {
    const ids = new Set(imoveis.map((i) => i.id));
    return dados.anuncios.filter((a) => ids.has(a.imovelId));
  }, [dados.anuncios, imoveis]);

  /* --------------------------------------------------------- Valor de carteira */

  const vgv = imoveis
    .filter((i) => i.status === "disponivel" && i.valores.venda)
    .reduce((s, i) => s + (i.valores.venda ?? 0), 0);

  const receitaLocacao = imoveis
    .filter((i) => i.status === "alugado" && i.valores.aluguel)
    .reduce((s, i) => s + (i.valores.aluguel ?? 0), 0);

  const comissaoPotencial = imoveis
    .filter((i) => i.status === "disponivel" && i.valores.venda)
    .reduce((s, i) => {
      const contrato = dados.contratoDoImovel(i.id);
      return s + ((i.valores.venda ?? 0) * (contrato?.comissaoPercentual ?? 6)) / 100;
    }, 0);

  const ticketMedio =
    imoveis.filter((i) => i.valores.venda).length > 0
      ? imoveis.reduce((s, i) => s + (i.valores.venda ?? 0), 0) /
        imoveis.filter((i) => i.valores.venda).length
      : 0;

  /* ------------------------------------------------------------ Distribuições */

  const porTipo = (Object.keys(rotuloTipoImovel) as TipoImovel[])
    .map((t) => ({ rotulo: rotuloTipoImovel[t], valor: imoveis.filter((i) => i.tipo === t).length }))
    .filter((x) => x.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const porRegiao = Object.entries(
    imoveis.reduce<Record<string, number>>((acc, i) => {
      acc[i.endereco.bairro] = (acc[i.endereco.bairro] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([rotulo, valor]) => ({ rotulo, valor }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  const desempenhoCorretores = corretores
    .map((c) => {
      const seus = dados.imoveis.filter((i) => i.corretorId === c.id);
      const visitas = dados.visitas.filter((v) => v.corretorId === c.id);
      const fechados = dados.clientes.filter((cl) => cl.corretorId === c.id && cl.etapa === "fechado");
      return {
        nome: c.nome,
        imoveis: seus.length,
        visitas: visitas.length,
        realizadas: visitas.filter((v) => v.status === "realizada").length,
        clientes: dados.clientes.filter((cl) => cl.corretorId === c.id && cl.tipo !== "proprietario").length,
        fechados: fechados.length,
        vgv: seus.reduce((s, i) => s + (i.valores.venda ?? 0), 0),
      };
    })
    .sort((a, b) => b.vgv - a.vgv);

  /* --------------------------------------------------- Séries dos últimos meses */

  const serieLeads = useMemo(() => {
    const agora = new Date();
    return Array.from({ length: 6 }, (_, k) => {
      const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - k), 1);
      const total = dados.leads.filter((l) => {
        const data = new Date(l.criadoEm);
        return data.getFullYear() === d.getFullYear() && data.getMonth() === d.getMonth();
      }).length;
      return { mes: meses[d.getMonth()], valor: total };
    });
  }, [dados.leads]);

  const serieVisitas = useMemo(() => {
    const agora = new Date();
    return Array.from({ length: 6 }, (_, k) => {
      const d = new Date(agora.getFullYear(), agora.getMonth() - (5 - k), 1);
      const total = dados.visitas.filter((v) => {
        const data = criarDataLocal(v.data);
        return data.getFullYear() === d.getFullYear() && data.getMonth() === d.getMonth();
      }).length;
      return { mes: meses[d.getMonth()], valor: total };
    });
  }, [dados.visitas]);

  /* -------------------------------------------------------- Anúncios campeões */

  const topAnuncios = [...anuncios]
    .filter((a) => a.metricas.visualizacoes > 0)
    .sort((a, b) => b.metricas.visualizacoes - a.metricas.visualizacoes)
    .slice(0, 6);

  const totalViews = anuncios.reduce((s, a) => s + a.metricas.visualizacoes, 0);
  const totalContatos = anuncios.reduce((s, a) => s + a.metricas.contatos, 0);
  const taxaContato = totalViews > 0 ? (totalContatos / totalViews) * 100 : 0;

  function exportar() {
    // Exportação real depende do backend; aqui geramos o CSV no próprio cliente.
    const linhas = [
      ["Código", "Imóvel", "Tipo", "Status", "Valor venda", "Valor aluguel", "Corretor"],
      ...imoveis.map((i) => [
        i.codigo,
        i.titulo,
        rotuloTipoImovel[i.tipo],
        i.status,
        String(i.valores.venda ?? ""),
        String(i.valores.aluguel ?? ""),
        dados.usuarioPorId(i.corretorId)?.nome ?? "",
      ]),
    ];
    const csv = linhas.map((l) => l.map((c) => `"${c.replaceAll('"', '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "paganelli-imoveis.csv";
    link.click();
    URL.revokeObjectURL(url);
    avisar("Relatório de imóveis exportado em CSV.");
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Relatórios"
        descricao="Desempenho da carteira, da equipe e dos anúncios."
        acoes={
          <>
            <label htmlFor="rel-corretor" className="sr-only">
              Filtrar por corretor
            </label>
            <select
              id="rel-corretor"
              value={corretorFiltro}
              onChange={(e) => setCorretorFiltro(e.target.value)}
              className="rounded-sm border border-linha bg-white px-3 py-2 text-xs font-bold text-grafite-700"
            >
              <option value="todos">Todos os corretores</option>
              {corretores.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
            <Botao variante="contorno" tamanho="sm" onClick={exportar}>
              Exportar CSV
            </Botao>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="VGV disponível" valor={formatarMoedaCurta(vgv)} nota="Imóveis à venda em carteira" />
        <Indicador
          rotulo="Comissão potencial"
          valor={formatarMoedaCurta(comissaoPotencial)}
          nota="Se toda a carteira for vendida"
          tom="positivo"
        />
        <Indicador rotulo="Ticket médio de venda" valor={formatarMoedaCurta(ticketMedio)} />
        <Indicador
          rotulo="Receita mensal de locação"
          valor={formatarMoedaCurta(receitaLocacao)}
          nota="Contratos ativos"
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Painel titulo="Leads recebidos por mês">
          <MiniSerie pontos={serieLeads} rotulo="Leads por mês" />
        </Painel>
        <Painel titulo="Visitas por mês">
          <MiniSerie pontos={serieVisitas} rotulo="Visitas por mês" />
        </Painel>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Painel titulo="Carteira por tipo de imóvel">
          <BarrasHorizontais dados={porTipo} />
        </Painel>
        <Painel titulo="Carteira por região">
          <BarrasHorizontais dados={porRegiao} />
        </Painel>
      </div>

      <Painel titulo="Desempenho por corretor" className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Desempenho comparativo dos corretores</caption>
            <thead>
              <tr>
                {["Corretor", "Imóveis", "Clientes", "Visitas", "Realizadas", "Fechados", "VGV"].map((h) => (
                  <th key={h} scope="col" className="pb-2 text-[0.625rem] font-bold uppercase tracking-wide text-grafite-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {desempenhoCorretores.map((d) => (
                <tr key={d.nome} className="border-t border-linha">
                  <td className="py-3 font-bold text-verde-900">{d.nome}</td>
                  <td className="py-3 text-grafite-700">{d.imoveis}</td>
                  <td className="py-3 text-grafite-700">{d.clientes}</td>
                  <td className="py-3 text-grafite-700">{d.visitas}</td>
                  <td className="py-3 text-grafite-700">{d.realizadas}</td>
                  <td className="py-3">
                    <Selo tom={d.fechados > 0 ? "verde" : "neutro"}>{d.fechados}</Selo>
                  </td>
                  <td className="py-3 font-bold text-verde-800">{formatarMoedaCurta(d.vgv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>

      <Painel
        titulo="Anúncios com melhor desempenho"
        className="mt-5"
        acao={
          <span className="font-mono text-[0.625rem] text-grafite-400">
            Taxa média de contato: {formatarPercentual(Number(taxaContato.toFixed(2)))}
          </span>
        }
      >
        {topAnuncios.length === 0 ? (
          <p className="py-6 text-center text-sm text-grafite-400">
            Nenhum anúncio com visualizações registradas ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {topAnuncios.map((a) => {
              const imovel = dados.imovelPorId(a.imovelId);
              const taxa =
                a.metricas.visualizacoes > 0
                  ? (a.metricas.contatos / a.metricas.visualizacoes) * 100
                  : 0;
              return (
                <li key={a.id} className="border-b border-linha pb-3 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-bold text-verde-900">
                      {a.codigo} · {imovel?.titulo}
                    </p>
                    <p className="font-mono text-xs text-grafite-500">
                      {formatarNumero(a.metricas.visualizacoes)} views · {a.metricas.contatos} contatos ·{" "}
                      <strong className="font-bold text-verde-800">
                        {formatarPercentual(Number(taxa.toFixed(2)))}
                      </strong>
                    </p>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-areia-200">
                    <div
                      className="h-full rounded-full bg-dourado-500"
                      style={{
                        width: `${(a.metricas.visualizacoes / (topAnuncios[0]?.metricas.visualizacoes || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Painel>
    </>
  );
}
