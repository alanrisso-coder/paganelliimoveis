import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkImoveis() {
  const { data, error } = await supabase
    .from("imoveis")
    .select("id, titulo, slug, bairro, cidade, area_total")
    .limit(10);

  if (error) {
    console.error("❌ Erro:", error.message);
  } else {
    console.log(`✅ Total de imóveis: ${data?.length || 0}`);
    data?.forEach((i) => {
      console.log(`  - ${i.titulo} (${i.bairro}, ${i.area_total}m²)`);
    });
  }
}

checkImoveis();
