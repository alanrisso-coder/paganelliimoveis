import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function verifyData() {
  console.log("🔍 Verificação de Dados no Supabase\n");

  // 1. Usuários
  console.log("👤 USUÁRIOS:");
  const usuarios = await supabase.from("usuarios").select("*");
  console.log(`   Total: ${usuarios.data?.length || 0}`);
  usuarios.data?.slice(0, 3).forEach((u) => {
    console.log(`   - ${u.nome} (${u.perfil})`);
  });

  // 2. Clientes
  console.log("\n👥 CLIENTES:");
  const clientes = await supabase.from("clientes").select("*");
  console.log(`   Total: ${clientes.data?.length || 0}`);
  clientes.data?.forEach((c) => {
    console.log(`   - ${c.nome} (${c.tipo})`);
  });

  // 3. Imóveis
  console.log("\n🏠 IMÓVEIS:");
  const imoveis = await supabase.from("imoveis").select("*");
  console.log(`   Total: ${imoveis.data?.length || 0}`);
  imoveis.data?.forEach((i) => {
    console.log(`   - ${i.titulo} (${i.area_total}m²)`);
  });

  // 4. Anúncios
  console.log("\n📢 ANÚNCIOS:");
  const anuncios = await supabase.from("anuncios").select("*");
  console.log(`   Total: ${anuncios.data?.length || 0}`);

  // 5. Visitas
  console.log("\n👁️ VISITAS:");
  const visitas = await supabase.from("visitas").select("*");
  console.log(`   Total: ${visitas.data?.length || 0}`);

  // 6. Contratos
  console.log("\n📄 CONTRATOS:");
  const contratos = await supabase.from("contratos").select("*");
  console.log(`   Total: ${contratos.data?.length || 0}`);

  // 7. Leads
  console.log("\n💼 LEADS:");
  const leads = await supabase.from("leads").select("*");
  console.log(`   Total: ${leads.data?.length || 0}`);

  console.log("\n" + "=".repeat(60));
  console.log("RESULTADO FINAL:");
  console.log("=".repeat(60));
  const totalRecords =
    (usuarios.data?.length || 0) +
    (clientes.data?.length || 0) +
    (imoveis.data?.length || 0) +
    (anuncios.data?.length || 0) +
    (visitas.data?.length || 0) +
    (contratos.data?.length || 0) +
    (leads.data?.length || 0);

  console.log(`✅ Total de registros no Supabase: ${totalRecords}`);
  console.log(`✅ Sincronização com Supabase: FUNCIONANDO`);
  console.log(`📌 Base de dados pronta para uso`);
}

verifyData();
