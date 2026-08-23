import { NextResponse } from "next/server";
import { COLUNAS_USUARIO, getSupabaseAdmin } from "@/lib/supabase-admin";
import { verificarSenha } from "@/lib/senha";
import { criarSessao } from "@/lib/sessao-servidor";
import { ACAO, ipDaRequisicao, registrarLog } from "@/lib/auditoria";

/**
 * Login: e-mail + senha. Em caso de sucesso abre a sessão de servidor e grava
 * o cookie httpOnly — o painel não guarda mais credencial nenhuma.
 *
 * O segundo fator anterior (os 7 primeiros dígitos do telefone) foi removido:
 * o telefone fica visível na própria ficha do usuário dentro do painel, então
 * não era um fator independente — quem tivesse a senha já tinha o "código".
 * Um 2FA de verdade (código por e-mail ou TOTP) entra numa etapa própria.
 */
export async function POST(request: Request) {
  const ip = ipDaRequisicao(request);

  try {
    const { email, senha } = await request.json();

    if (!email || !senha) {
      return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
    }

    const emailNormalizado = String(email).trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalizado)) {
      return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("id, email, ativo, senha_hash")
      .ilike("email", emailNormalizado)
      .maybeSingle();

    if (error) {
      console.error("Erro ao buscar usuário:", error.message);
      return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
    }

    if (!usuario) {
      await registrarLog({
        acao: ACAO.loginFalha,
        detalhe: `E-mail não cadastrado: ${emailNormalizado}`,
        resultado: "negado",
        ip,
      });
      return NextResponse.json(
        { error: "Não encontramos um acesso com esse e-mail." },
        { status: 401 }
      );
    }

    if (!usuario.ativo) {
      await registrarLog({
        usuarioId: usuario.id,
        acao: ACAO.loginFalha,
        detalhe: "Conta desativada.",
        resultado: "negado",
        ip,
      });
      return NextResponse.json(
        { error: "Este acesso está desativado. Fale com o administrador." },
        { status: 403 }
      );
    }

    // Contas anteriores ao módulo de senha não têm `senha_hash`: até aqui o
    // login aceitava o próprio e-mail como senha. Manter essa porta aberta
    // impede que a equipe inteira fique trancada do lado de fora no deploy —
    // mas quem entra por ela cai direto na troca obrigatória de senha.
    const usandoCredencialLegada = !usuario.senha_hash;
    const senhaValida = usandoCredencialLegada
      ? String(senha).trim().toLowerCase() === usuario.email.trim().toLowerCase()
      : verificarSenha(String(senha), usuario.senha_hash);

    if (!senhaValida) {
      await registrarLog({
        usuarioId: usuario.id,
        acao: ACAO.loginFalha,
        detalhe: "Senha incorreta.",
        resultado: "negado",
        ip,
      });
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }

    if (usandoCredencialLegada) {
      await supabase
        .from("usuarios")
        .update({ precisa_trocar_senha: true })
        .eq("id", usuario.id);
    }

    const sessaoId = await criarSessao(usuario.id, request);
    if (!sessaoId) {
      return NextResponse.json(
        { error: "Não foi possível iniciar a sessão. Tente novamente." },
        { status: 500 }
      );
    }

    await supabase
      .from("usuarios")
      .update({ ultimo_acesso_em: new Date().toISOString() })
      .eq("id", usuario.id);

    const { data: completo } = await supabase
      .from("usuarios")
      .select(COLUNAS_USUARIO)
      .eq("id", usuario.id)
      .single();

    await registrarLog({
      usuarioId: usuario.id,
      acao: ACAO.loginSucesso,
      entidadeId: usuario.id,
      detalhe: usandoCredencialLegada ? "Login com credencial legada." : undefined,
      ip,
    });

    return NextResponse.json({ data: completo }, { status: 200 });
  } catch (error) {
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Não foi possível entrar agora. Tente novamente em instantes." },
      { status: 500 }
    );
  }
}
