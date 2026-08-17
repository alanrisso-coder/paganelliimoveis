import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestClient() {
  console.log("📝 Criando cliente de teste...");

  const { data, error } = await supabase
    .from("clientes")
    .insert([
      {
        id: "c_test001",
        nome: "Cliente Teste",
        email: "teste@example.com",
        telefone: "48999999999",
        whatsapp: "48999999999",
        tipo: "proprietario",
        origem: "presencial",
        corretor_id: "u1",
        orcamento_min: null,
        orcamento_max: 1000000,
        interesses: ["venda"],
        preferencias: { tipos: [], regioes: [], caracteristicas: [] },
        etapa: "novo",
        timeline: [],
        favoritos: [],
        recomendados: [],
        observacoes: "Cliente de teste para sincronização",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("❌ Erro:", error);
  } else {
    console.log("✅ Cliente de teste criado:", data?.nome);

    // Verificar que ele existe
    const { data: all } = await supabase
      .from("clientes")
      .select("id, nome");

    console.log(`\n📊 Total de clientes no Supabase: ${all?.length || 0}`);
    all?.forEach((c) => console.log(`  - ${c.nome} (${c.id})`));
  }
}

createTestClient();
