/**
 * Insere os 57 terrenos do Reserva da Pedra na tabela `imoveis` do Supabase.
 *
 * Fonte dos dados: scripts/data/reserva-da-pedra.json, gerado a partir da planilha
 * "Lotes 1.xlsx" (pacote Paganelli_Docs_Fotos_SEO.zip — Dados/lotes_processados.json +
 * Anuncios/*.txt). Nenhum valor foi inventado além do que já constava nesse material.
 *
 * As fotos NÃO são inseridas por este script — o campo `fotos` fica vazio e deve ser
 * preenchido manualmente no painel (Storage) após o upload.
 *
 * Uso:
 *   cd plataforma
 *   npx tsx --env-file=.env.local scripts/insert-imoveis-reserva-da-pedra.ts
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Corretor responsável pelo cadastro (padrão: Leomara Paganelli, u1).
const CORRETOR_ID = process.env.CORRETOR_ID ?? "u1";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface LoteReservaDaPedra {
  lote_id: string;
  lote_num: number;
  filebase: string;
  titulo: string;
  slug: string;
  valor: number;
  metragem: number;
  descricao_completa: string;
  seo_titulo: string;
  seo_descricao: string;
  destaques: string[];
  fundo_raw: string;
  esquina_raw: string;
}

const lotes: LoteReservaDaPedra[] = JSON.parse(
  readFileSync(join(__dirname, "data", "reserva-da-pedra.json"), "utf-8")
);

// Coordenadas aproximadas do loteamento (Pedra Branca, Palhoça/SC) — mesmo
// padrão usado como default em store.tsx para imóveis dessa região.
const LATITUDE = -27.6386;
const LONGITUDE = -48.6079;

function paraImovelDb(lote: LoteReservaDaPedra) {
  const codigo = `RP-${String(lote.lote_num).padStart(3, "0")}`;
  return {
    id: `im_rp_${String(lote.lote_num).padStart(3, "0")}`,
    codigo,
    titulo: lote.titulo,
    slug: lote.slug,
    tipo: "terreno",
    finalidade: "venda",
    status: "disponivel",

    logradouro: "Reserva da Pedra",
    numero: "",
    bairro: "Pedra Branca",
    cidade: "Palhoça",
    estado: "SC",
    cep: "",
    latitude: LATITUDE,
    longitude: LONGITUDE,

    valor_venda: lote.valor,
    area_total: lote.metragem,
    dormitorios: 0,
    suites: 0,
    banheiros: 0,
    vagas: 0,

    caracteristicas: lote.destaques,
    diferenciais: [],
    descricao_curta: lote.titulo,
    descricao_completa: lote.descricao_completa,

    fotos: [] as string[],
    plantas: [] as string[],
    documentos: [] as unknown[],

    proprietario_id: null,
    corretor_id: CORRETOR_ID,
    exclusivo: false,

    seo_titulo: lote.seo_titulo,
    seo_descricao: lote.seo_descricao,
  };
}

async function inserirImoveis() {
  console.log(`📝 Inserindo ${lotes.length} terrenos do Reserva da Pedra no Supabase...`);

  let sucesso = 0;
  let falhas = 0;

  for (const lote of lotes) {
    const imovel = paraImovelDb(lote);
    const { error } = await supabase.from("imoveis").upsert([imovel], { onConflict: "id" }).select();

    if (error) {
      falhas++;
      console.error(`❌ ${imovel.codigo} (${lote.lote_id}):`, error.message);
    } else {
      sucesso++;
      console.log(`✅ ${imovel.codigo} — ${imovel.titulo}`);
    }
  }

  console.log(`\n📊 Concluído: ${sucesso} inseridos/atualizados, ${falhas} falharam.`);
}

inserirImoveis().catch(console.error);
