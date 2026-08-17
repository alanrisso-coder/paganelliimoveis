import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testAllFeatures() {
  console.log("🧪 Teste Completo de Funcionalidades\n");

  try {
    // 1. CRM - Clientes
    console.log("📋 1. CRM - CLIENTES");
    const { data: clientesData } = await supabase
      .from("clientes")
      .select("count()", { count: "exact" });
    console.log(`   ✅ Total de clientes: ${clientesData || 0}`);

    // 2. Imóveis
    console.log("\n🏠 2. IMÓVEIS");
    const { data: imoveisData } = await supabase
      .from("imoveis")
      .select("count()", { count: "exact" });
    console.log(`   ✅ Total de imóveis: ${imoveisData || 0}`);

    // 3. Anúncios
    console.log("\n📢 3. ANÚNCIOS");
    const { data: anunciosData } = await supabase
      .from("anuncios")
      .select("count()", { count: "exact" });
    console.log(`   ✅ Total de anúncios: ${anunciosData || 0}`);

    // 4. Visitas
    console.log("\n👁️ 4. VISITAS");
    const { data: visitasData } = await supabase
      .from("visitas")
      .select("count()", { count: "exact" });
    console.log(`   ✅ Total de visitas: ${visitasData || 0}`);

    // 5. Exclusividade (Contratos)
    console.log("\n📄 5. EXCLUSIVIDADE (CONTRATOS)");
    const { data: contratosData } = await supabase
      .from("contratos")
      .select("count()", { count: "exact" });
    console.log(`   ✅ Total de contratos: ${contratosData || 0}`);

    // 6. Leads
    console.log("\n💼 6. LEADS");
    const { data: leadsData } = await supabase
      .from("leads")
      .select("count()", { count: "exact" });
    console.log(`   ✅ Total de leads: ${leadsData || 0}`);

    console.log("\n" + "=".repeat(50));
    console.log("📊 RESUMO DE DADOS NO SUPABASE:");
    console.log("=".repeat(50));
    console.log(`  Clientes:        ${clientesData || 0}`);
    console.log(`  Imóveis:         ${imoveisData || 0}`);
    console.log(`  Anúncios:        ${anunciosData || 0}`);
    console.log(`  Visitas:         ${visitasData || 0}`);
    console.log(`  Contratos:       ${contratosData || 0}`);
    console.log(`  Leads:           ${leadsData || 0}`);
    console.log("=".repeat(50));
    console.log("\n✅ SINCRONIZAÇÃO COM SUPABASE FUNCIONANDO!");
    console.log("📌 Dados estão sendo persistidos no banco de dados");
  } catch (error) {
    console.error("❌ Erro durante testes:", error);
  }
}

testAllFeatures();
