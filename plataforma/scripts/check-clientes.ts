import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function checkClientes() {
  const { data, error } = await supabase
    .from("clientes")
    .select("id, nome, email, tipo")
    .limit(10);

  if (error) {
    console.error("❌ Erro:", error.message);
  } else {
    console.log(`✅ Total de clientes: ${data?.length || 0}`);
    data?.forEach((c) => {
      console.log(`  - ${c.nome} (${c.email}) - ${c.tipo}`);
    });
  }
}

checkClientes();
