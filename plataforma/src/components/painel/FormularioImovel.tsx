"use client";

import { useState } from "react";
import { useDados } from "@/lib/store";
import { Botao, Campo, CampoSelecao, CampoTexto, CampoTextoFormatado } from "@/components/ui";
import {
  rotuloPerfilImovel,
  rotuloPosicaoSolar,
  rotuloSituacaoImovel,
  rotuloTerreno,
  rotuloTipoImovel,
} from "@/lib/format";
import type {
  FinalidadeImovel,
  Imovel,
  PerfilImovel,
  PosicaoSolar,
  SituacaoImovel,
  TipoImovel,
  TopografiaTerreno,
} from "@/lib/types";

export interface CamposFormularioImovel {
  titulo: string;
  tipo: TipoImovel;
  finalidade: FinalidadeImovel;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  logradouro: string;
  numero: string;
  valorVenda: string;
  valorAluguel: string;
  condominio: string;
  iptu: string;
  areaTotal: string;
  areaConstruida: string;
  dormitorios: string;
  suites: string;
  banheiros: string;
  vagas: string;
  proprietarioId: string;
  corretorId: string;
  exclusivo: boolean;
  descricaoCurta: string;
  descricaoCompleta: string;
  aceitaPermuta: boolean;
  idadeAnos: string;
  perfil: PerfilImovel;
  posicaoSolar: PosicaoSolar;
  situacao: SituacaoImovel;
  escriturado: boolean;
  averbado: boolean;
  terreno: TopografiaTerreno;
  aceitaFinanciamento: boolean;
}

/** Estado inicial do formulário de um imóvel novo. */
export function formVazioImovel(autorId: string): CamposFormularioImovel {
  return {
    titulo: "",
    tipo: "casa",
    finalidade: "venda",
    bairro: "",
    cidade: "Palhoça",
    estado: "SC",
    cep: "",
    logradouro: "",
    numero: "",
    valorVenda: "",
    valorAluguel: "",
    condominio: "",
    iptu: "",
    areaTotal: "",
    areaConstruida: "",
    dormitorios: "",
    suites: "",
    banheiros: "",
    vagas: "",
    proprietarioId: "",
    corretorId: autorId,
    exclusivo: false,
    descricaoCurta: "",
    descricaoCompleta: "",
    aceitaPermuta: false,
    idadeAnos: "0",
    perfil: "residencial",
    posicaoSolar: "manha_tarde",
    situacao: "pronto_morar",
    escriturado: true,
    averbado: true,
    terreno: "plano",
    aceitaFinanciamento: true,
  };
}

/** Estado inicial do formulário a partir de um imóvel já cadastrado, para edição. */
export function formDoImovel(imovel: Imovel): CamposFormularioImovel {
  const { valores: v, metragens: m } = imovel;
  return {
    titulo: imovel.titulo,
    tipo: imovel.tipo,
    finalidade: imovel.finalidade,
    bairro: imovel.endereco.bairro,
    cidade: imovel.endereco.cidade,
    estado: imovel.endereco.estado || "SC",
    cep: imovel.endereco.cep,
    logradouro: imovel.endereco.logradouro,
    numero: imovel.endereco.numero,
    valorVenda: v.venda !== undefined ? String(v.venda) : "",
    valorAluguel: v.aluguel !== undefined ? String(v.aluguel) : "",
    condominio: v.condominio !== undefined ? String(v.condominio) : "",
    iptu: v.iptu !== undefined ? String(v.iptu) : "",
    areaTotal: String(m.areaTotal),
    areaConstruida: m.areaConstruida !== undefined ? String(m.areaConstruida) : "",
    dormitorios: String(m.dormitorios),
    suites: String(m.suites),
    banheiros: String(m.banheiros),
    vagas: String(m.vagas),
    proprietarioId: imovel.proprietarioId ?? "",
    corretorId: imovel.corretorId,
    exclusivo: imovel.exclusivo,
    descricaoCurta: imovel.descricaoCurta,
    descricaoCompleta: imovel.descricaoCompleta,
    aceitaPermuta: imovel.aceitaPermuta ?? false,
    idadeAnos: imovel.idadeAnos !== undefined ? String(imovel.idadeAnos) : "0",
    perfil: imovel.perfil ?? "residencial",
    posicaoSolar: imovel.posicaoSolar ?? "manha_tarde",
    situacao: imovel.situacao ?? "pronto_morar",
    escriturado: imovel.escriturado ?? true,
    averbado: imovel.averbado ?? true,
    terreno: imovel.terreno ?? "plano",
    aceitaFinanciamento: imovel.aceitaFinanciamento ?? true,
  };
}

/** Centro aproximado de Palhoça/SC — usado só quando a geocodificação do endereço falha. */
const COORDENADAS_PADRAO = { latitude: -27.6386, longitude: -48.6079 };

/** Converte o estado do formulário no payload aceito por criarImovel/atualizarImovel. */
export function payloadDoFormulario(
  form: CamposFormularioImovel,
  coordenadas?: { latitude: number; longitude: number },
): Partial<Imovel> & { titulo: string } {
  const num = (v: string) => (v ? Number(v) : undefined);
  const { latitude, longitude } = coordenadas ?? COORDENADAS_PADRAO;
  return {
    titulo: form.titulo,
    tipo: form.tipo,
    finalidade: form.finalidade,
    endereco: {
      logradouro: form.logradouro,
      numero: form.numero,
      bairro: form.bairro,
      cidade: form.cidade,
      estado: form.estado,
      cep: form.cep,
      latitude,
      longitude,
    },
    valores: {
      venda: num(form.valorVenda),
      aluguel: num(form.valorAluguel),
      condominio: num(form.condominio),
      iptu: num(form.iptu),
    },
    metragens: {
      areaTotal: Number(form.areaTotal || 0),
      areaConstruida: num(form.areaConstruida),
      dormitorios: Number(form.dormitorios || 0),
      suites: Number(form.suites || 0),
      banheiros: Number(form.banheiros || 0),
      vagas: Number(form.vagas || 0),
    },
    proprietarioId: form.proprietarioId,
    corretorId: form.corretorId,
    exclusivo: form.exclusivo,
    descricaoCurta: form.descricaoCurta,
    descricaoCompleta: form.descricaoCompleta,
    aceitaPermuta: form.aceitaPermuta,
    idadeAnos: Number(form.idadeAnos || 0),
    perfil: form.perfil,
    posicaoSolar: form.posicaoSolar,
    situacao: form.situacao,
    escriturado: form.escriturado,
    averbado: form.averbado,
    terreno: form.terreno,
    aceitaFinanciamento: form.aceitaFinanciamento,
  };
}

/**
 * Campos de identificação, endereço, valores, metragens e ficha técnica de
 * um imóvel. Usado tanto para cadastro (ModalNovoImovel) quanto para edição
 * (ModalEditarImovel) — o pai decide se o payload final vira criarImovel()
 * ou atualizarImovel().
 */
async function buscarCoordenadas(endereco: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const resposta = await fetch(`/api/geocode?endereco=${encodeURIComponent(endereco)}`);
    if (!resposta.ok) return null;
    const { data } = await resposta.json();
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Localiza o endereço via Nominatim (OpenStreetMap) para posicionar o
 * imóvel corretamente no mapa do anúncio. Tenta o endereço completo
 * primeiro e vai afrouxando (rua+número → bairro → cidade) porque
 * condomínios e loteamentos novos raramente têm o logradouro exato
 * mapeado — cair no bairro certo já é bem melhor do que a coordenada
 * padrão. Se nada resolver, quem chama usa essa coordenada padrão.
 */
async function geocodarEndereco(
  form: CamposFormularioImovel,
): Promise<{ latitude: number; longitude: number } | null> {
  if (!form.bairro.trim() || !form.cidade.trim()) return null;

  const tentativas = [
    [form.logradouro, form.numero, form.bairro, form.cidade, form.estado],
    [form.bairro, form.cidade, form.estado],
    [form.cidade, form.estado],
  ].map((partes) => partes.filter((parte) => parte.trim()).concat("Brasil").join(", "));

  for (const endereco of tentativas) {
    const coordenadas = await buscarCoordenadas(endereco);
    if (coordenadas) return coordenadas;
  }
  return null;
}

export function FormularioImovel({
  valorInicial,
  textoSubmit,
  aoSalvar,
  aoCancelar,
}: {
  valorInicial: CamposFormularioImovel;
  textoSubmit: string;
  aoSalvar: (dados: Partial<Imovel> & { titulo: string }) => void;
  aoCancelar: () => void;
}) {
  const dados = useDados();
  const [form, setForm] = useState<CamposFormularioImovel>(valorInicial);
  const [localizando, setLocalizando] = useState(false);

  const proprietarios = dados.clientes.filter((c) => c.tipo === "proprietario");
  const corretores = dados.usuarios.filter((u) => u.perfil !== "assistente");

  async function submeter(e: React.FormEvent) {
    e.preventDefault();
    setLocalizando(true);
    const coordenadas = await geocodarEndereco(form);
    setLocalizando(false);
    aoSalvar(payloadDoFormulario(form, coordenadas ?? undefined));
  }

  return (
    <form onSubmit={submeter} className="space-y-5">
      <fieldset>
        <legend className="mb-3 text-xs font-extrabold uppercase tracking-wide text-dourado-600">
          Identificação
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Campo
            rotulo="Título do imóvel"
            required
            className="sm:col-span-3"
            placeholder="Casa Reserva do Lago"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />
          <CampoSelecao
            rotulo="Tipo"
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value as TipoImovel })}
            opcoes={(Object.keys(rotuloTipoImovel) as TipoImovel[]).map((t) => ({
              valor: t,
              texto: rotuloTipoImovel[t],
            }))}
          />
          <CampoSelecao
            rotulo="Finalidade"
            value={form.finalidade}
            onChange={(e) => setForm({ ...form, finalidade: e.target.value as FinalidadeImovel })}
            opcoes={[
              { valor: "venda", texto: "Venda" },
              { valor: "aluguel", texto: "Locação" },
              { valor: "ambos", texto: "Venda e locação" },
            ]}
          />
          <CampoSelecao
            rotulo="Corretor responsável"
            value={form.corretorId}
            onChange={(e) => setForm({ ...form, corretorId: e.target.value })}
            opcoes={corretores.map((c) => ({ valor: c.id, texto: c.nome }))}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-extrabold uppercase tracking-wide text-dourado-600">
          Endereço
        </legend>
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo
            rotulo="Logradouro"
            className="sm:col-span-2"
            value={form.logradouro}
            onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
          />
          <Campo rotulo="Número" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
          <Campo rotulo="CEP" value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
          <Campo
            rotulo="Bairro"
            required
            className="sm:col-span-2"
            value={form.bairro}
            onChange={(e) => setForm({ ...form, bairro: e.target.value })}
          />
          <Campo
            rotulo="Cidade"
            required
            value={form.cidade}
            onChange={(e) => setForm({ ...form, cidade: e.target.value })}
          />
          <Campo
            rotulo="Estado (UF)"
            required
            maxLength={2}
            placeholder="SC"
            value={form.estado}
            onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase() })}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-extrabold uppercase tracking-wide text-dourado-600">
          Valores
        </legend>
        <div className="grid gap-4 sm:grid-cols-4">
          <Campo
            rotulo="Venda (R$)"
            type="number"
            min={0}
            value={form.valorVenda}
            onChange={(e) => setForm({ ...form, valorVenda: e.target.value })}
          />
          <Campo
            rotulo="Aluguel (R$/mês)"
            type="number"
            min={0}
            value={form.valorAluguel}
            onChange={(e) => setForm({ ...form, valorAluguel: e.target.value })}
          />
          <Campo
            rotulo="Condomínio (R$)"
            type="number"
            min={0}
            value={form.condominio}
            onChange={(e) => setForm({ ...form, condominio: e.target.value })}
          />
          <Campo
            rotulo="IPTU anual (R$)"
            type="number"
            min={0}
            value={form.iptu}
            onChange={(e) => setForm({ ...form, iptu: e.target.value })}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-extrabold uppercase tracking-wide text-dourado-600">
          Metragens
        </legend>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Campo rotulo="Área total (m²)" type="number" min={0} required value={form.areaTotal} onChange={(e) => setForm({ ...form, areaTotal: e.target.value })} />
          <Campo rotulo="Construída (m²)" type="number" min={0} value={form.areaConstruida} onChange={(e) => setForm({ ...form, areaConstruida: e.target.value })} />
          <Campo rotulo="Dormitórios" type="number" min={0} value={form.dormitorios} onChange={(e) => setForm({ ...form, dormitorios: e.target.value })} />
          <Campo rotulo="Suítes" type="number" min={0} value={form.suites} onChange={(e) => setForm({ ...form, suites: e.target.value })} />
          <Campo rotulo="Banheiros" type="number" min={0} value={form.banheiros} onChange={(e) => setForm({ ...form, banheiros: e.target.value })} />
          <Campo rotulo="Vagas" type="number" min={0} value={form.vagas} onChange={(e) => setForm({ ...form, vagas: e.target.value })} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-extrabold uppercase tracking-wide text-dourado-600">
          Proprietário e descrição
        </legend>
        <div className="space-y-4">
          <CampoSelecao
            rotulo="Proprietário vinculado"
            value={form.proprietarioId}
            onChange={(e) => setForm({ ...form, proprietarioId: e.target.value })}
            opcoes={[
              { valor: "", texto: "Selecione um proprietário" },
              ...proprietarios.map((p) => ({ valor: p.id, texto: p.nome })),
            ]}
          />
          <CampoTexto
            rotulo="Descrição curta"
            rows={2}
            value={form.descricaoCurta}
            onChange={(e) => setForm({ ...form, descricaoCurta: e.target.value })}
          />
          <CampoTextoFormatado
            rotulo="Descrição completa"
            rows={8}
            value={form.descricaoCompleta}
            onChange={(valor) => setForm({ ...form, descricaoCompleta: valor })}
          />
          <label className="flex items-center gap-2.5 text-sm text-grafite-700">
            <input
              type="checkbox"
              checked={form.exclusivo}
              onChange={(e) => setForm({ ...form, exclusivo: e.target.checked })}
              className="h-4 w-4 accent-verde-700"
            />
            Captado com exclusividade
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-xs font-extrabold uppercase tracking-wide text-dourado-600">
          Ficha do imóvel
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <CampoSelecao
            rotulo="Perfil"
            value={form.perfil}
            onChange={(e) => setForm({ ...form, perfil: e.target.value as PerfilImovel })}
            opcoes={(Object.keys(rotuloPerfilImovel) as PerfilImovel[]).map((p) => ({
              valor: p,
              texto: rotuloPerfilImovel[p],
            }))}
          />
          <CampoSelecao
            rotulo="Situação"
            value={form.situacao}
            onChange={(e) => setForm({ ...form, situacao: e.target.value as SituacaoImovel })}
            opcoes={(Object.keys(rotuloSituacaoImovel) as SituacaoImovel[]).map((s) => ({
              valor: s,
              texto: rotuloSituacaoImovel[s],
            }))}
          />
          <Campo
            rotulo="Idade do imóvel (anos)"
            type="number"
            min={0}
            value={form.idadeAnos}
            onChange={(e) => setForm({ ...form, idadeAnos: e.target.value })}
          />
          <CampoSelecao
            rotulo="Posição solar"
            value={form.posicaoSolar}
            onChange={(e) => setForm({ ...form, posicaoSolar: e.target.value as PosicaoSolar })}
            opcoes={(Object.keys(rotuloPosicaoSolar) as PosicaoSolar[]).map((p) => ({
              valor: p,
              texto: rotuloPosicaoSolar[p],
            }))}
          />
          <CampoSelecao
            rotulo="Terreno"
            value={form.terreno}
            onChange={(e) => setForm({ ...form, terreno: e.target.value as TopografiaTerreno })}
            opcoes={(Object.keys(rotuloTerreno) as TopografiaTerreno[]).map((t) => ({
              valor: t,
              texto: rotuloTerreno[t],
            }))}
          />
        </div>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {[
            { rotulo: "Aceita permuta?", chave: "aceitaPermuta" as const },
            { rotulo: "Escriturado", chave: "escriturado" as const },
            { rotulo: "Averbado", chave: "averbado" as const },
            { rotulo: "Aceita financiamento", chave: "aceitaFinanciamento" as const },
          ].map((c) => (
            <label key={c.chave} className="flex items-center gap-2.5 text-sm text-grafite-700">
              <input
                type="checkbox"
                checked={form[c.chave]}
                onChange={(e) => setForm({ ...form, [c.chave]: e.target.checked })}
                className="h-4 w-4 accent-verde-700"
              />
              {c.rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex justify-end gap-2 border-t border-linha pt-4">
        <Botao type="button" variante="fantasma" onClick={aoCancelar} disabled={localizando}>
          Cancelar
        </Botao>
        <Botao type="submit" disabled={localizando}>
          {localizando ? "Localizando endereço…" : textoSubmit}
        </Botao>
      </div>
    </form>
  );
}
