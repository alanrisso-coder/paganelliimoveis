import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, anonKey);

async function testRead() {
  console.log("🔍 Testando leitura com ANON_KEY...\n");

  const { data: imoveis, error: e1 } = await supabase
    .from("imoveis")
    .select("id, titulo");

  if (e1) {
    console.error("❌ Erro ao ler imóveis:", e1.message);
  } else {
    console.log(`✅ Imóveis lidos: ${imoveis?.length || 0}`);
  }

  const { data: clientes, error: e2 } = await supabase
    .from("clientes")
    .select("id, nome");

  if (e2) {
    console.error("❌ Erro ao ler clientes:", e2.message);
  } else {
    console.log(`✅ Clientes lidos: ${clientes?.length || 0}`);
  }

  const { data: anuncios, error: e3 } = await supabase
    .from("anuncios")
    .select("id, titulo")
    .eq("status", "publicado")
    .eq("visibilidade", "publico");

  if (e3) {
    console.error("❌ Erro ao ler anúncios:", e3.message);
  } else {
    console.log(`✅ Anúncios públicos lidos: ${anuncios?.length || 0}`);
  }
}

testRead();
