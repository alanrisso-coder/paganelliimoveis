import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const usuarios = [
  {
    id: "u1",
    nome: "Leomara Paganelli",
    email: "leomaracorretora@hotmail.com",
    telefone: "48984128000",
    perfil: "administrador",
    creci: "CRECI 9578J",
    avatar_iniciais: "LP",
    ativo: true,
    criado_em: new Date("2018-03-02"),
    atualizado_em: new Date("2018-03-02"),
  },
  {
    id: "u2",
    nome: "Fernanda Nogueira",
    email: "fernanda.nogueira@paganelliimoveis.com.br",
    telefone: "48988110002",
    perfil: "corretor",
    creci: "CRECI-SC 32.418",
    avatar_iniciais: "FN",
    ativo: true,
    criado_em: new Date("2022-01-17"),
    atualizado_em: new Date("2022-01-17"),
  },
  {
    id: "u3",
    nome: "Rodrigo Salles",
    email: "rodrigo.salles@paganelliimoveis.com.br",
    telefone: "48988110003",
    perfil: "corretor",
    creci: "CRECI-SC 34.902",
    avatar_iniciais: "RS",
    ativo: true,
    criado_em: new Date("2022-09-05"),
    atualizado_em: new Date("2022-09-05"),
  },
  {
    id: "u4",
    nome: "Beatriz Lemos",
    email: "beatriz.lemos@paganelliimoveis.com.br",
    telefone: "48988110004",
    perfil: "corretor",
    creci: "CRECI-SC 37.155",
    avatar_iniciais: "BL",
    ativo: true,
    criado_em: new Date("2023-06-12"),
    atualizado_em: new Date("2023-06-12"),
  },
  {
    id: "u5",
    nome: "Camila Prado",
    email: "camila.prado@paganelliimoveis.com.br",
    telefone: "48988110005",
    perfil: "assistente",
    avatar_iniciais: "CP",
    ativo: true,
    criado_em: new Date("2023-02-20"),
    atualizado_em: new Date("2023-02-20"),
  },
];

async function seedUsuarios() {
  console.log("📝 Inserindo usuários padrão no Supabase...");

  for (const usuario of usuarios) {
    const { error } = await supabase
      .from("usuarios")
      .insert([usuario])
      .select();

    if (error) {
      console.error(`❌ Erro ao inserir ${usuario.nome}:`, error);
    } else {
      console.log(`✅ ${usuario.nome} inserido com sucesso!`);
    }
  }

  // Verificar
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome")
    .limit(10);

  if (error) {
    console.error("❌ Erro ao verificar:", error);
  } else {
    console.log(`\n📊 Total de usuários: ${data?.length || 0}`);
    data?.forEach((u) => console.log(`  - ${u.nome}`));
  }
}

seedUsuarios().catch(console.error);
