import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkAlan() {
  console.log("🔍 Verificando cliente 'Alan'...\n");

  const { data, error } = await supabase
    .from("clientes")
    .select("*")
    .ilike("nome", "%alan%");

  if (error) {
    console.error("❌ Erro:", error.message);
  } else {
    if (data && data.length > 0) {
      console.log(`✅ Cliente encontrado! Total: ${data.length}`);
      data.forEach((c) => {
        console.log(`  - ${c.nome} (${c.email}) - ${c.tipo}`);
      });
    } else {
      console.log("❌ Cliente 'Alan' NÃO foi encontrado no Supabase");
      console.log(
        "\n💡 Isso significa que o cliente foi criado apenas no localStorage"
      );
      console.log("   Tente criar novamente após o deploy");
    }
  }

  // Mostrar todos os clientes
  console.log("\n📊 Todos os clientes no Supabase:");
  const { data: all } = await supabase
    .from("clientes")
    .select("id, nome, email, tipo");

  if (all) {
    console.log(`Total: ${all.length}`);
    all.forEach((c) => {
      console.log(`  - ${c.nome} (${c.email})`);
    });
  }
}

checkAlan();
