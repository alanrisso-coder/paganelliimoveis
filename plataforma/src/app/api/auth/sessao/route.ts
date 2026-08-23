import { NextResponse } from "next/server";
import { autenticar, carregarUsuarioCompleto } from "@/lib/sessao-servidor";

/**
 * Quem sou eu. O painel chama isto ao montar para descobrir se há sessão
 * válida, em vez de confiar no que estiver no localStorage.
 *
 * Responde 200 com `data: null` quando não há sessão — para o cliente isso é
 * "deslogado", um estado normal, não um erro a ser exibido.
 */
export async function GET() {
  try {
    const auth = await autenticar();
    if (!auth.ok) return NextResponse.json({ data: null }, { status: 200 });

    const usuario = await carregarUsuarioCompleto(auth.usuario.id);

    return NextResponse.json({ data: usuario }, { status: 200 });
  } catch (error) {
    console.error("Erro ao ler sessão:", error);
    return NextResponse.json({ data: null }, { status: 200 });
  }
}
