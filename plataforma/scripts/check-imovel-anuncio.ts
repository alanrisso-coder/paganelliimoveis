import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkImovelAnuncio() {
  console.log("🔍 Verificando imóvel e anúncio...\n");

  // 1. Procurar o imóvel
  const { data: imovel, error: imError } = await supabase
    .from("imoveis")
    .select("*")
    .eq("id", "im_g5gznup")
    .single();

  if (imError) {
    console.error("❌ Erro ao buscar imóvel:", imError.message);
  } else if (imovel) {
    console.log("✅ IMÓVEL ENCONTRADO:");
    console.log(`   ID: ${imovel.id}`);
    console.log(`   Título: ${imovel.titulo}`);
    console.log(`   Bairro: ${imovel.bairro}`);
    console.log(`   Criado em: ${imovel.criado_em}`);
  } else {
    console.log("❌ IMÓVEL NÃO ENCONTRADO no Supabase");
    console.log("   O imóvel pode ter sido criado apenas no localStorage");
  }

  // 2. Procurar anúncio associado
  console.log("\n📢 PROCURANDO ANÚNCIO...");
  const { data: anuncio, error: anError } = await supabase
    .from("anuncios")
    .select("*")
    .eq("imovel_id", "im_g5gznup");

  if (anError) {
    console.error("❌ Erro ao buscar anúncio:", anError.message);
  } else if (anuncio && anuncio.length > 0) {
    console.log(`✅ ANÚNCIO ENCONTRADO! Total: ${anuncio.length}`);
    anuncio.forEach((a) => {
      console.log(`   - ${a.titulo}`);
      console.log(`     Status: ${a.status}`);
      console.log(`     Visibilidade: ${a.visibilidade}`);
    });
  } else {
    console.log("❌ NENHUM ANÚNCIO ENCONTRADO para este imóvel");
  }

  // 3. Listar todos os imóveis recentes
  console.log("\n📊 ÚLTIMOS 5 IMÓVEIS CADASTRADOS:");
  const { data: ultimos } = await supabase
    .from("imoveis")
    .select("id, titulo, criado_em")
    .order("criado_em", { ascending: false })
    .limit(5);

  if (ultimos) {
    ultimos.forEach((i) => {
      console.log(`  - ${i.titulo} (${i.id})`);
    });
  }

  // 4. Listar todos os anúncios recentes
  console.log("\n📊 ÚLTIMOS 5 ANÚNCIOS CADASTRADOS:");
  const { data: anuncios } = await supabase
    .from("anuncios")
    .select("id, titulo, imovel_id, criado_em")
    .order("criado_em", { ascending: false })
    .limit(5);

  if (anuncios) {
    anuncios.forEach((a) => {
      console.log(`  - ${a.titulo} (imóvel: ${a.imovel_id})`);
    });
  }
}

checkImovelAnuncio();
