import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabase-admin";
import { autenticar } from "./sessao-servidor";
import { lerCorpoJson } from "./http";
import { podeFazer, type Permissao } from "./permissoes";
import { ACAO, ipDaRequisicao, registrarLog } from "./auditoria";

/**
 * Fábrica das rotas de sincronização (CRUD sobre uma tabela).
 *
 * As seis rotas em /api/sync eram cópias literais umas das outras, todas
 * usando a service role key — que ignora RLS — sem verificar quem chamava.
 * Qualquer pessoa que descobrisse a URL lia a base inteira de clientes e
 * contratos, ou apagava o que quisesse.
 *
 * Concentrar o padrão aqui não é só evitar repetição: com seis cópias, uma
 * regra de acesso corrigida num arquivo e esquecida nos outros é questão de
 * tempo. Cada rota passa a declarar apenas *quem pode o quê*.
 *
 * Cada operação tem dois níveis, e eles são independentes de propósito:
 *
 * - a permissão exigida de quem tem sessão (`ler`, `criar`, `editar`,
 *   `excluir`), que dá acesso completo à operação;
 * - uma abertura opcional para quem *não* tem sessão (`leituraPublica`,
 *   `criacaoPublica`, `edicaoPublica`), sempre limitada a um recorte
 *   declarado de colunas ou campos.
 *
 * Tratar os dois como se fossem a mesma escala foi um erro na primeira versão
 * deste arquivo: ou o visitante era barrado numa porta que o site precisa, ou
 * o administrador logado herdava o recorte estreito do visitante.
 */

export interface ConfigCrud {
  tabela: string;
  /** Usado nas mensagens de erro ("Não foi possível carregar os clientes."). */
  rotulo: string;

  /** Permissão para ler a tabela completa, com sessão. */
  ler: Permissao;
  /**
   * Presente = a listagem responde sem sessão. `colunas` recorta o que sai
   * nesse caso; ausente devolve tudo (só faça isso se a tabela não tiver nada
   * interno).
   */
  leituraPublica?: { colunas?: string };

  criar: Permissao;
  /**
   * Presente = visitante pode inserir. `campos` é a lista fechada do que ele
   * consegue definir — sem ela, o corpo da requisição viraria acesso de
   * escrita a qualquer coluna da tabela.
   */
  criacaoPublica?: { campos: readonly string[] };

  editar: Permissao;
  /** Idem para UPDATE. Existe para a contagem de visualizações do site. */
  edicaoPublica?: { campos: readonly string[] };

  excluir: Permissao;

  /** Habilita `?slug=` na leitura individual (imóveis). */
  porSlug?: boolean;
  /** Coluna de ordenação da listagem. */
  ordenarPor?: string;
}

type Acesso =
  | { ok: true; autenticado: boolean }
  | { ok: false; resposta: NextResponse };

/**
 * Resolve o acesso a uma operação.
 *
 * Quem tem sessão é julgado pela permissão. Quem não tem só passa se a
 * operação tiver abertura pública declarada — e segue marcado como anônimo,
 * para o chamador aplicar o recorte.
 */
async function resolverAcesso(
  permissao: Permissao,
  temAberturaPublica: boolean,
  request: Request
): Promise<Acesso> {
  const auth = await autenticar();

  if (auth.ok) {
    if (!podeFazer(auth.usuario.perfil, permissao)) {
      await registrarLog({
        usuarioId: auth.usuario.id,
        acao: ACAO.acessoNegado,
        detalhe: `Tentou executar "${permissao}" sem permissão (perfil: ${auth.usuario.perfil}).`,
        resultado: "negado",
        ip: ipDaRequisicao(request),
      });

      return {
        ok: false,
        resposta: NextResponse.json(
          { error: "Você não tem permissão para executar esta ação." },
          { status: 403 }
        ),
      };
    }

    return { ok: true, autenticado: true };
  }

  if (temAberturaPublica) return { ok: true, autenticado: false };

  // Sessão inválida/ausente: repassa o 401 (ou o 403 de conta desativada).
  return { ok: false, resposta: auth.resposta };
}

/** Mantém só os campos declarados. */
function recortar(
  origem: Record<string, unknown>,
  campos: readonly string[]
): Record<string, unknown> {
  const recorte: Record<string, unknown> = {};
  for (const campo of campos) {
    if (origem[campo] !== undefined) recorte[campo] = origem[campo];
  }
  return recorte;
}

function erroInterno() {
  return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
}

export function criarRotaCrud(config: ConfigCrud) {
  const { tabela, rotulo, porSlug = false, ordenarPor = "criado_em" } = config;

  async function GET(request: Request) {
    try {
      const acesso = await resolverAcesso(config.ler, Boolean(config.leituraPublica), request);
      if (!acesso.ok) return acesso.resposta;

      // Visitante recebe o recorte público; quem tem sessão recebe tudo.
      const colunas = acesso.autenticado ? "*" : (config.leituraPublica?.colunas ?? "*");

      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");
      const slug = porSlug ? searchParams.get("slug") : null;

      const supabase = getSupabaseAdmin();

      if (id || slug) {
        const consulta = supabase.from(tabela).select(colunas);
        const { data, error } = id
          ? await consulta.eq("id", id).single()
          : await consulta.eq("slug", slug!).single();

        if (error) {
          return NextResponse.json({ error: "Registro não encontrado." }, { status: 404 });
        }

        return NextResponse.json({ data }, { status: 200 });
      }

      const { data, error } = await supabase
        .from(tabela)
        .select(colunas)
        .order(ordenarPor, { ascending: false });

      if (error) {
        console.error(`Erro ao listar ${tabela}:`, error.message);
        return NextResponse.json(
          { error: `Não foi possível carregar ${rotulo}.` },
          { status: 500 }
        );
      }

      return NextResponse.json({ data }, { status: 200 });
    } catch (error) {
      console.error(`Erro no API route de ${tabela}:`, error);
      return erroInterno();
    }
  }

  async function POST(request: Request) {
    try {
      const acesso = await resolverAcesso(config.criar, Boolean(config.criacaoPublica), request);
      if (!acesso.ok) return acesso.resposta;

      const leitura = await lerCorpoJson<Record<string, unknown>>(request);
      if (!leitura.ok) return leitura.resposta;

      const registro = acesso.autenticado
        ? leitura.corpo
        : recortar(leitura.corpo, config.criacaoPublica!.campos);

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase.from(tabela).insert([registro]).select().single();

      if (error) {
        console.error(`Erro ao criar em ${tabela}:`, error.message);
        // A mensagem do Postgres pode revelar estrutura de tabela e constraints.
        return NextResponse.json(
          { error: `Não foi possível salvar ${rotulo}.` },
          { status: 400 }
        );
      }

      return NextResponse.json({ data }, { status: 200 });
    } catch (error) {
      console.error(`Erro no API route de ${tabela}:`, error);
      return erroInterno();
    }
  }

  async function PATCH(request: Request) {
    try {
      const acesso = await resolverAcesso(config.editar, Boolean(config.edicaoPublica), request);
      if (!acesso.ok) return acesso.resposta;

      const leitura = await lerCorpoJson<{ id?: string; updates?: Record<string, unknown> }>(
        request
      );
      if (!leitura.ok) return leitura.resposta;

      const { id, updates } = leitura.corpo;
      if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
      if (!updates || typeof updates !== "object") {
        return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
      }

      const alteracoes = acesso.autenticado
        ? updates
        : recortar(updates, config.edicaoPublica!.campos);

      if (Object.keys(alteracoes).length === 0) {
        return NextResponse.json({ error: "Nada para atualizar." }, { status: 400 });
      }

      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from(tabela)
        .update(alteracoes)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error(`Erro ao atualizar ${tabela}:`, error.message);
        return NextResponse.json(
          { error: `Não foi possível salvar ${rotulo}.` },
          { status: 400 }
        );
      }

      return NextResponse.json({ data }, { status: 200 });
    } catch (error) {
      console.error(`Erro no API route de ${tabela}:`, error);
      return erroInterno();
    }
  }

  async function DELETE(request: Request) {
    try {
      // Exclusão nunca tem abertura pública.
      const acesso = await resolverAcesso(config.excluir, false, request);
      if (!acesso.ok) return acesso.resposta;

      const id = new URL(request.url).searchParams.get("id");
      if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from(tabela).delete().eq("id", id);

      if (error) {
        console.error(`Erro ao excluir de ${tabela}:`, error.message);
        return NextResponse.json(
          { error: `Não foi possível excluir ${rotulo}.` },
          { status: 400 }
        );
      }

      return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
      console.error(`Erro no API route de ${tabela}:`, error);
      return erroInterno();
    }
  }

  return { GET, POST, PATCH, DELETE };
}
