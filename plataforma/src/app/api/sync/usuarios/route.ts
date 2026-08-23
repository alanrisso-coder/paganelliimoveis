import { NextResponse } from "next/server";
import { COLUNAS_USUARIO, getSupabaseAdmin } from "@/lib/supabase-admin";
import { autenticar } from "@/lib/sessao-servidor";
import { podeFazer } from "@/lib/permissoes";
import { lerCorpoJson } from "@/lib/http";

/**
 * Sincronização da equipe para o painel.
 *
 * Antes esta rota era pública: um PATCH sem nenhuma credencial alterava
 * qualquer usuário — inclusive o próprio perfil de acesso, bastando conhecer
 * a URL. Agora exige sessão e limita o que cada um pode tocar.
 *
 * A administração de contas (criar, excluir, mudar perfil, ativar/desativar)
 * mora em /api/admin/usuarios, com as regras de proteção completas. O que
 * sobra aqui é o essencial do dia a dia: ler a equipe e o usuário editar o
 * próprio cadastro.
 */

export async function GET() {
  try {
    const auth = await autenticar();
    if (!auth.ok) return auth.resposta;

    const supabase = getSupabaseAdmin();
    // `senha_hash` fica fora: esta lista alimenta o painel inteiro.
    const { data, error } = await supabase
      .from("usuarios")
      .select(COLUNAS_USUARIO)
      .order("criado_em", { ascending: true });

    if (error) {
      console.error("Erro ao listar usuários:", error.message);
      return NextResponse.json({ error: "Não foi possível carregar a equipe." }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de usuários:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

/**
 * Atualiza dados de cadastro. O usuário mexe no próprio registro (ex.: foto de
 * perfil); alterar o de outra pessoa exige `gerenciar_usuarios`.
 */
export async function PATCH(request: Request) {
  try {
    const auth = await autenticar();
    if (!auth.ok) return auth.resposta;

    const leitura = await lerCorpoJson<{ id?: string; updates?: Record<string, unknown> }>(request);
    if (!leitura.ok) return leitura.resposta;

    const { id, updates } = leitura.corpo;
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const ehOProprio = id === auth.usuario.id;
    if (!ehOProprio && !podeFazer(auth.usuario.perfil, "gerenciar_usuarios")) {
      return NextResponse.json(
        { error: "Você não tem permissão para alterar outro usuário." },
        { status: 403 }
      );
    }

    // Lista fechada de campos. `perfil` e `ativo` ficam de fora mesmo para
    // administrador: essas mudanças passam por /api/admin/usuarios, onde as
    // regras de proteção (último admin, autopromoção) são aplicadas. Senha
    // nunca é gravada por aqui.
    const permitidos = ["nome", "telefone", "creci", "avatar_url", "avatar_iniciais"];
    const atualizacoes: Record<string, unknown> = {};
    for (const campo of permitidos) {
      if (updates?.[campo] !== undefined) atualizacoes[campo] = updates[campo];
    }

    if (Object.keys(atualizacoes).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("usuarios")
      .update(atualizacoes)
      .eq("id", id)
      .select(COLUNAS_USUARIO)
      .single();

    if (error) {
      console.error("Erro ao atualizar usuário:", error.message);
      return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de usuários:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
