import { NextResponse } from "next/server";
import { autenticar, encerrarSessao } from "@/lib/sessao-servidor";
import { ACAO, ipDaRequisicao, registrarLog } from "@/lib/auditoria";

/** Encerra a sessão atual: revoga o registro no banco e apaga o cookie. */
export async function POST(request: Request) {
  try {
    // Resolvido antes de encerrar, só para saber quem sair registrar no log.
    const auth = await autenticar();

    await encerrarSessao();

    if (auth.ok) {
      await registrarLog({
        usuarioId: auth.usuario.id,
        acao: ACAO.logout,
        entidadeId: auth.usuario.id,
        ip: ipDaRequisicao(request),
      });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Erro no logout:", error);
    // Sair nunca deve falhar para o usuário: o cookie já foi apagado acima.
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
