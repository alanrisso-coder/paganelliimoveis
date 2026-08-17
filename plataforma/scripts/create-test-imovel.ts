import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createTestImovel() {
  console.log("📝 Criando imóvel de teste...");

  const { data, error } = await supabase
    .from("imoveis")
    .insert([
      {
        id: "i_test001",
        codigo: "PT-TEST-001",
        titulo: "Casa Teste Supabase",
        slug: "casa-teste-supabase",
        tipo: "casa",
        finalidade: "venda",
        status: "disponivel",
        logradouro: "Rua Teste",
        numero: "123",
        bairro: "Beira Mar",
        cidade: "Palhoça",
        estado: "SC",
        cep: "88000-000",
        latitude: -27.6183,
        longitude: -48.6297,
        valor_venda: 500000,
        valor_aluguel: null,
        valor_condominio: null,
        valor_iptu: null,
        area_total: 150,
        area_construida: 120,
        dormitorios: 3,
        suites: 1,
        banheiros: 2,
        vagas: 2,
        andar: null,
        caracteristicas: ["piscina", "garagem", "varanda"],
        diferenciais: ["vista para o mar"],
        descricao_curta: "Casa de teste para sincronização",
        descricao_completa: "Este é um imóvel de teste criado para verificar a sincronização com Supabase",
        fotos: [],
        video_url: null,
        tour_virtual_url: null,
        plantas: [],
        documentos: [],
        proprietario_id: "c_test001",
        corretor_id: "u1",
        exclusivo: false,
        exclusividade_ate: null,
        seo_titulo: "Casa Teste",
        seo_descricao: "Casa de teste",
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("❌ Erro:", error);
  } else {
    console.log("✅ Imóvel de teste criado:", data?.titulo);

    // Verificar que ele existe
    const { data: all } = await supabase
      .from("imoveis")
      .select("id, titulo, proprietario_id");

    console.log(`\n📊 Total de imóveis no Supabase: ${all?.length || 0}`);
    all?.forEach((i) =>
      console.log(`  - ${i.titulo} (prop: ${i.proprietario_id})`)
    );
  }
}

createTestImovel();
