import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { exigirPermissao } from "@/lib/sessao-servidor";
import { ACAO, ipDaRequisicao, registrarLog } from "@/lib/auditoria";
import { lerCorpoJson } from "@/lib/http";

/**
 * Catálogo de categorias de gasto.
 *
 * Ler é para qualquer pessoa que abre o módulo — sem a lista, o formulário de
 * lançamento não funciona. Escrever exige `gerenciar_categorias_gasto`
 * (administrador): a categoria é o eixo dos relatórios, e quem renomeia ou
 * desativa mexe no histórico inteiro, não só no próprio lançamento.
 *
 * Não existe DELETE. Categoria em uso tem `ON DELETE RESTRICT` no banco, e
 * apagar uma sem uso só criaria a dúvida de por que o relatório do ano passado
 * mudou. Tirar de circulação é `ativa = false`.
 */

const LIMITE_NOME = 60;

export async function GET(request: Request) {
  try {
    const auth = await exigirPermissao("ver_gastos", request);
    if (!auth.ok) return auth.resposta;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("gastos_categorias")
      .select("id, nome, ativa, criado_em, atualizado_em")
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao listar categorias de gasto:", error.message);
      return NextResponse.json(
        { error: "Não foi possível carregar as categorias." },
        { status: 500 }
      );
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de categorias de gasto:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await exigirPermissao("gerenciar_categorias_gasto", request);
    if (!auth.ok) return auth.resposta;

    const leitura = await lerCorpoJson<{ nome?: unknown }>(request);
    if (!leitura.ok) return leitura.resposta;

    const nome = String(leitura.corpo.nome ?? "").trim();
    if (!nome) return NextResponse.json({ error: "Informe o nome da categoria." }, { status: 400 });
    if (nome.length > LIMITE_NOME) {
      return NextResponse.json(
        { error: `O nome deve ter no máximo ${LIMITE_NOME} caracteres.` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // O índice único é sobre LOWER(nome); conferir antes rende uma mensagem
    // que explica o problema, em vez do 23505 cru do Postgres.
    const { data: jaExiste } = await supabase
      .from("gastos_categorias")
      .select("id, ativa")
      .ilike("nome", nome)
      .maybeSingle();

    if (jaExiste) {
      return NextResponse.json(
        {
          error: jaExiste.ativa
            ? "Já existe uma categoria com esse nome."
            : "Já existe uma categoria desativada com esse nome. Reative-a na lista.",
        },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("gastos_categorias")
      .insert({ nome })
      .select("id, nome, ativa, criado_em, atualizado_em")
      .single();

    if (error) {
      console.error("Erro ao criar categoria de gasto:", error.message);
      return NextResponse.json({ error: "Não foi possível criar a categoria." }, { status: 400 });
    }

    await registrarLog({
      usuarioId: auth.usuario.id,
      acao: ACAO.categoriaGastoCriada,
      entidade: "gasto_categoria",
      entidadeId: data.id,
      detalhe: `Criou a categoria "${nome}".`,
      ip: ipDaRequisicao(request),
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Erro no API route de categorias de gasto:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await exigirPermissao("gerenciar_categorias_gasto", request);
    if (!auth.ok) return auth.resposta;

    const leitura = await lerCorpoJson<{ id?: unknown; nome?: unknown; ativa?: unknown }>(request);
    if (!leitura.ok) return leitura.resposta;

    const id = String(leitura.corpo.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const alteracoes: Record<string, unknown> = {};

    if (leitura.corpo.nome !== undefined) {
      const nome = String(leitura.corpo.nome).trim();
      if (!nome) {
        return NextResponse.json({ error: "Informe o nome da categoria." }, { status: 400 });
      }
      if (nome.length > LIMITE_NOME) {
        return NextResponse.json(
          { error: `O nome deve ter no máximo ${LIMITE_NOME} caracteres.` },
          { status: 400 }
        );
      }
      alteracoes.nome = nome;
    }

    if (leitura.corpo.ativa !== undefined) {
      alteracoes.ativa = leitura.corpo.ativa === true;
    }

    if (Object.keys(alteracoes).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    if (typeof alteracoes.nome === "string") {
      const { data: conflito } = await supabase
        .from("gastos_categorias")
        .select("id")
        .ilike("nome", alteracoes.nome)
        .neq("id", id)
        .maybeSingle();

      if (conflito) {
        return NextResponse.json({ error: "Já existe uma categoria com esse nome." }, { status: 409 });
      }
    }

    const { data, error } = await supabase
      .from("gastos_categorias")
      .update(alteracoes)
      .eq("id", id)
      .select("id, nome, ativa, criado_em, atualizado_em")
      .single();

    if (error) {
      console.error("Erro ao atualizar categoria de gasto:", error.message);
      return NextResponse.json({ error: "Não foi possível salvar a categoria." }, { status: 400 });
    }

    await registrarLog({
      usuarioId: auth.usuario.id,
      acao: ACAO.categoriaGastoEditada,
      entidade: "gasto_categoria",
      entidadeId: id,
      detalhe:
        alteracoes.ativa !== undefined && alteracoes.nome === undefined
          ? `${alteracoes.ativa ? "Reativou" : "Desativou"} a categoria "${data.nome}".`
          : `Editou a categoria "${data.nome}".`,
      ip: ipDaRequisicao(request),
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de categorias de gasto:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
