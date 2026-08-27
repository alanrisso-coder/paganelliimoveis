import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { exigirPermissao, type UsuarioAutenticado } from "@/lib/sessao-servidor";
import { podeFazer } from "@/lib/permissoes";
import { ACAO, ipDaRequisicao, registrarLog } from "@/lib/auditoria";
import { lerCorpoJson } from "@/lib/http";
import {
  COLUNAS_GASTO,
  ehStatusReembolsoValido,
  normalizarReembolso,
  validarGasto,
  type DadosGasto,
} from "@/lib/financeiro";
import { lerValorMoeda } from "@/lib/format";
import type { StatusReembolso } from "@/lib/types";

/**
 * Lançamentos de gasto — listar, criar, editar e excluir.
 *
 * Esta rota não usa `criarRotaCrud` porque o módulo financeiro tem três regras
 * que aquela fábrica não expressa:
 *
 * 1. **Escopo por dono.** Quem não tem `ver_todos_gastos` enxerga e altera
 *    apenas os próprios lançamentos. O recorte é aplicado na *consulta*, não
 *    na resposta: filtrar depois de ler já teria trazido o valor gasto pelos
 *    colegas para dentro do processo.
 * 2. **Exclusão é soft delete.** Auditoria de dinheiro não pode depender de
 *    uma linha que sumiu — `excluido_em` tira das listas e dos totais e
 *    preserva o registro.
 * 3. **Reembolso é uma permissão à parte.** Lançar o próprio gasto e declarar
 *    que ele já foi reembolsado são atos diferentes; o segundo é do gestor.
 */

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

/** Sem `ver_todos_gastos`, o usuário só alcança o que é dele. */
function enxergaTudo(usuario: UsuarioAutenticado): boolean {
  return podeFazer(usuario.perfil, "ver_todos_gastos");
}

/**
 * Condição `or()` que restringe a consulta ao dono, ou `null` para quem
 * enxerga tudo.
 *
 * Vale para o responsável *e* para o autor: um assistente que lança um gasto
 * em nome de outra pessoa precisa continuar vendo o que lançou.
 */
function filtroDoDono(usuario: UsuarioAutenticado): string | null {
  if (enxergaTudo(usuario)) return null;
  return `responsavel_id.eq.${usuario.id},criado_por.eq.${usuario.id}`;
}

/** Escapa os curingas do LIKE — sem isso um "%" na descrição casaria com tudo. */
function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

function erroInterno() {
  return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
}

/* --------------------------------------------------------------- Leitura */

export async function GET(request: Request) {
  try {
    const auth = await exigirPermissao("ver_gastos", request);
    if (!auth.ok) return auth.resposta;

    const parametros = new URL(request.url).searchParams;
    const de = parametros.get("de");
    const ate = parametros.get("ate");
    const categoria = parametros.get("categoria");
    const responsavel = parametros.get("responsavel");
    const reembolso = parametros.get("reembolso");

    const supabase = getSupabaseAdmin();
    let consulta = supabase.from("gastos").select(COLUNAS_GASTO).is("excluido_em", null);

    if (de && FORMATO_DATA.test(de)) consulta = consulta.gte("data_gasto", de);
    if (ate && FORMATO_DATA.test(ate)) consulta = consulta.lte("data_gasto", ate);
    if (categoria) consulta = consulta.eq("categoria_id", categoria);

    // O filtro por responsável é do gestor. Para os demais ele é ignorado —
    // aceitá-lo seria oferecer, por querystring, a lista que a interface
    // esconde.
    if (responsavel && enxergaTudo(auth.usuario)) {
      consulta = consulta.eq("responsavel_id", responsavel);
    }

    if (reembolso === "necessario") {
      consulta = consulta.eq("reembolso_necessario", true);
    } else if (ehStatusReembolsoValido(reembolso)) {
      consulta = consulta.eq("reembolso_status", reembolso);
    }

    const dono = filtroDoDono(auth.usuario);
    if (dono) consulta = consulta.or(dono);

    const { data, error } = await consulta
      .order("data_gasto", { ascending: false })
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao listar gastos:", error.message);
      return NextResponse.json({ error: "Não foi possível carregar os gastos." }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de gastos:", error);
    return erroInterno();
  }
}

/* ------------------------------------------------------------- Escrita */

/** Extrai e normaliza o corpo. Devolve a mensagem de erro em vez de lançar. */
function lerDadosGasto(corpo: Record<string, unknown>): DadosGasto | string {
  const valor = lerValorMoeda(corpo.valor as string | number | null);

  const dados: DadosGasto = {
    descricao: String(corpo.descricao ?? "").trim(),
    categoriaId: corpo.categoriaId ? String(corpo.categoriaId) : null,
    dataGasto: String(corpo.dataGasto ?? "").slice(0, 10),
    valor: valor ?? 0,
    responsavelId: corpo.responsavelId ? String(corpo.responsavelId) : null,
    observacao: corpo.observacao ? String(corpo.observacao).trim() : null,
    comprovanteUrl: corpo.comprovanteUrl ? String(corpo.comprovanteUrl) : null,
    comprovanteCaminho: corpo.comprovanteCaminho ? String(corpo.comprovanteCaminho) : null,
    reembolsoNecessario: corpo.reembolsoNecessario === true,
    reembolsoStatus: ehStatusReembolsoValido(corpo.reembolsoStatus)
      ? corpo.reembolsoStatus
      : "nao_se_aplica",
    reembolsoData: corpo.reembolsoData ? String(corpo.reembolsoData).slice(0, 10) : null,
    reembolsoObservacao: corpo.reembolsoObservacao ? String(corpo.reembolsoObservacao).trim() : null,
  };

  const normalizado = normalizarReembolso(dados);
  return validarGasto(normalizado) ?? normalizado;
}

/** Linha pronta para o banco, a partir dos dados já validados. */
function paraRegistro(dados: DadosGasto) {
  return {
    descricao: dados.descricao.trim(),
    categoria_id: dados.categoriaId || null,
    data_gasto: dados.dataGasto,
    valor: dados.valor,
    responsavel_id: dados.responsavelId || null,
    observacao: dados.observacao || null,
    comprovante_url: dados.comprovanteUrl || null,
    comprovante_caminho: dados.comprovanteCaminho || null,
    reembolso_necessario: dados.reembolsoNecessario,
    reembolso_status: dados.reembolsoStatus,
    reembolso_data: dados.reembolsoData || null,
    reembolso_observacao: dados.reembolsoObservacao || null,
  };
}

export async function POST(request: Request) {
  try {
    const auth = await exigirPermissao("editar_gasto", request);
    if (!auth.ok) return auth.resposta;

    const leitura = await lerCorpoJson<Record<string, unknown>>(request);
    if (!leitura.ok) return leitura.resposta;

    const dados = lerDadosGasto(leitura.corpo);
    if (typeof dados === "string") return NextResponse.json({ error: dados }, { status: 400 });

    // Lançar em nome de outra pessoa é do gestor; para os demais o responsável
    // é sempre quem está logado, independentemente do que veio no corpo.
    const responsavelId = enxergaTudo(auth.usuario)
      ? dados.responsavelId || auth.usuario.id
      : auth.usuario.id;

    // Declarar um gasto já reembolsado equivale a marcar o reembolso.
    if (
      dados.reembolsoStatus === "reembolsado" &&
      !podeFazer(auth.usuario.perfil, "marcar_reembolso")
    ) {
      return NextResponse.json(
        { error: "Você não tem permissão para registrar o reembolso. Lance como pendente." },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Duplicidade acidental: o clique duplo no botão, ou o mesmo comprovante
    // lançado duas vezes na mesma sessão. Não bloqueia — dois deslocamentos de
    // R$ 40 no mesmo dia existem —, apenas pede confirmação uma vez.
    if (leitura.corpo.confirmarDuplicado !== true) {
      const { data: semelhante } = await supabase
        .from("gastos")
        .select("id")
        .is("excluido_em", null)
        .ilike("descricao", escaparLike(dados.descricao.trim()))
        .eq("data_gasto", dados.dataGasto)
        .eq("valor", dados.valor)
        .eq("responsavel_id", responsavelId)
        .limit(1)
        .maybeSingle();

      if (semelhante) {
        return NextResponse.json(
          {
            error:
              "Já existe um gasto com a mesma descrição, data e valor para este responsável. Confirme para lançar mesmo assim.",
            duplicado: true,
          },
          { status: 409 }
        );
      }
    }

    const registro = {
      ...paraRegistro(dados),
      responsavel_id: responsavelId,
      criado_por: auth.usuario.id,
      atualizado_por: auth.usuario.id,
      ...(dados.reembolsoStatus === "reembolsado"
        ? { reembolso_por: auth.usuario.id, reembolso_em: new Date().toISOString() }
        : {}),
    };

    const { data, error } = await supabase
      .from("gastos")
      .insert(registro)
      .select(COLUNAS_GASTO)
      .single();

    if (error) {
      console.error("Erro ao criar gasto:", error.message);
      return NextResponse.json({ error: "Não foi possível salvar o gasto." }, { status: 400 });
    }

    await registrarLog({
      usuarioId: auth.usuario.id,
      acao: ACAO.gastoCriado,
      entidade: "gasto",
      entidadeId: (data as unknown as { id: string }).id,
      usuarioAfetadoId: responsavelId,
      detalhe: `Lançou "${dados.descricao.trim()}" de R$ ${dados.valor.toFixed(2)} em ${dados.dataGasto}.`,
      ip: ipDaRequisicao(request),
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Erro no API route de gastos:", error);
    return erroInterno();
  }
}

/** O que a rota precisa saber do registro antes de sobrescrevê-lo. */
interface GastoAtual {
  id: string;
  descricao: string;
  valor: string | number;
  responsavel_id: string | null;
  reembolso_status: string;
  reembolso_data: string | null;
  reembolso_observacao: string | null;
}

export async function PATCH(request: Request) {
  try {
    const auth = await exigirPermissao("editar_gasto", request);
    if (!auth.ok) return auth.resposta;

    const leitura = await lerCorpoJson<Record<string, unknown>>(request);
    if (!leitura.ok) return leitura.resposta;

    const id = String(leitura.corpo.id ?? "").trim();
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const dados = lerDadosGasto(leitura.corpo);
    if (typeof dados === "string") return NextResponse.json({ error: dados }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // Carregar antes de gravar: é o que permite saber se o pedido muda um
    // campo de reembolso (permissão à parte) e se o lançamento é mesmo do
    // autor — sem depender do que veio no corpo.
    let consultaAtual = supabase
      .from("gastos")
      .select(
        "id, descricao, valor, responsavel_id, reembolso_status, reembolso_data, reembolso_observacao"
      )
      .eq("id", id)
      .is("excluido_em", null);

    const dono = filtroDoDono(auth.usuario);
    if (dono) consultaAtual = consultaAtual.or(dono);

    const { data: atualBruto } = await consultaAtual.maybeSingle();
    const atual = atualBruto as unknown as GastoAtual | null;

    if (!atual) {
      return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
    }

    const statusAtual = atual.reembolso_status as StatusReembolso;
    const dataAtual = atual.reembolso_data ? atual.reembolso_data.slice(0, 10) : null;

    const mudaReembolso =
      dados.reembolsoStatus !== statusAtual ||
      (dados.reembolsoData || null) !== dataAtual ||
      (dados.reembolsoObservacao || null) !== (atual.reembolso_observacao ?? null);

    // Só quem fecha reembolso mexe no status, na data e na observação dele.
    // Marcar o próprio gasto como reembolsado seria dar baixa na própria conta.
    if (
      mudaReembolso &&
      (statusAtual === "reembolsado" || dados.reembolsoStatus === "reembolsado") &&
      !podeFazer(auth.usuario.perfil, "marcar_reembolso")
    ) {
      return NextResponse.json(
        { error: "Você não tem permissão para alterar o reembolso deste gasto." },
        { status: 403 }
      );
    }

    const responsavelId = enxergaTudo(auth.usuario)
      ? dados.responsavelId || atual.responsavel_id || auth.usuario.id
      : atual.responsavel_id || auth.usuario.id;

    const alteracoes: Record<string, unknown> = {
      ...paraRegistro(dados),
      responsavel_id: responsavelId,
      atualizado_por: auth.usuario.id,
    };

    if (dados.reembolsoStatus === "reembolsado") {
      if (statusAtual !== "reembolsado") {
        alteracoes.reembolso_por = auth.usuario.id;
        alteracoes.reembolso_em = new Date().toISOString();
      }
      // Já estava reembolsado: preserva quem deu a baixa originalmente.
    } else {
      // Voltar para pendente/não se aplica limpa quem deu a baixa: manter o
      // nome antigo faria a ficha afirmar um reembolso que não existe mais.
      alteracoes.reembolso_por = null;
      alteracoes.reembolso_em = null;
    }

    const { data, error } = await supabase
      .from("gastos")
      .update(alteracoes)
      .eq("id", id)
      .select(COLUNAS_GASTO)
      .single();

    if (error) {
      console.error("Erro ao atualizar gasto:", error.message);
      return NextResponse.json({ error: "Não foi possível salvar o gasto." }, { status: 400 });
    }

    await registrarLog({
      usuarioId: auth.usuario.id,
      acao: ACAO.gastoEditado,
      entidade: "gasto",
      entidadeId: id,
      usuarioAfetadoId: responsavelId,
      detalhe: `Editou "${dados.descricao.trim()}" (R$ ${dados.valor.toFixed(2)}).`,
      ip: ipDaRequisicao(request),
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de gastos:", error);
    return erroInterno();
  }
}

/**
 * Exclusão lógica. A linha continua no banco com `excluido_em` preenchido:
 * some das listas, dos totais e dos relatórios, e a trilha de auditoria
 * continua apontando para um registro que existe.
 */
export async function DELETE(request: Request) {
  try {
    const auth = await exigirPermissao("excluir_gasto", request);
    if (!auth.ok) return auth.resposta;

    const id = new URL(request.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    let consultaAtual = supabase
      .from("gastos")
      .select("id, descricao, valor")
      .eq("id", id)
      .is("excluido_em", null);

    const dono = filtroDoDono(auth.usuario);
    if (dono) consultaAtual = consultaAtual.or(dono);

    const { data: atualBruto } = await consultaAtual.maybeSingle();
    const atual = atualBruto as unknown as { descricao: string; valor: string | number } | null;

    if (!atual) {
      return NextResponse.json({ error: "Lançamento não encontrado." }, { status: 404 });
    }

    const { error } = await supabase
      .from("gastos")
      .update({
        excluido_em: new Date().toISOString(),
        excluido_por: auth.usuario.id,
        atualizado_por: auth.usuario.id,
      })
      .eq("id", id);

    if (error) {
      console.error("Erro ao excluir gasto:", error.message);
      return NextResponse.json({ error: "Não foi possível excluir o gasto." }, { status: 400 });
    }

    await registrarLog({
      usuarioId: auth.usuario.id,
      acao: ACAO.gastoExcluido,
      entidade: "gasto",
      entidadeId: id,
      detalhe: `Excluiu "${atual.descricao}" (R$ ${Number(atual.valor).toFixed(2)}).`,
      ip: ipDaRequisicao(request),
    });

    return NextResponse.json({ data: null }, { status: 200 });
  } catch (error) {
    console.error("Erro no API route de gastos:", error);
    return erroInterno();
  }
}
