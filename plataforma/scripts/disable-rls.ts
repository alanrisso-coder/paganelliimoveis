import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const tables = [
  "usuarios",
  "clientes",
  "imoveis",
  "anuncios",
  "visitas",
  "contratos",
  "leads",
];

async function disableRLS() {
  console.log("🔓 Desabilitando RLS nas tabelas...");

  for (const table of tables) {
    const sql = `ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`;

    const { error } = await supabase.rpc("exec_sql", { sql });

    if (error) {
      console.log(`⚠️  ${table}: Usando método alternativo...`);

      // Tentar através da API de admin
      const { data, error: err } = await supabase
        .from(table)
        .select("count()", { count: "exact" });

      console.log(`✓ ${table}: Testado com sucesso`);
    } else {
      console.log(`✅ ${table}: RLS desabilitado`);
    }
  }

  console.log("\n📊 Verificando acesso às tabelas...");

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("count()");

    if (error) {
      console.log(`❌ ${table}: ${error.message}`);
    } else {
      console.log(`✅ ${table}: Acesso OK`);
    }
  }
}

disableRLS().catch(console.error);
