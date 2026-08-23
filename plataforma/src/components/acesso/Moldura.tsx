import Image from "next/image";
import Link from "next/link";

/**
 * Moldura das telas públicas de acesso (recuperar e redefinir senha).
 *
 * Repete a composição da tela de login para que o usuário que chega por um
 * link de e-mail reconheça de imediato onde está — um formulário de senha em
 * página estranha é exatamente o que se espera de phishing.
 *
 * O painel lateral some abaixo de `lg`, deixando o formulário sozinho e em
 * largura total no celular, que é onde a maioria abre o link.
 */
export function MolduraAcesso({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col justify-center bg-areia-100 px-6 py-14 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-md">
          <Link href="/" className="inline-block">
            <Image
              src="/logo-paganelli.png"
              alt="Paganelli Imóveis"
              width={620}
              height={295}
              priority
              className="h-auto w-[176px]"
            />
          </Link>

          <h1 className="mt-10 font-display text-3xl text-verde-900">{titulo}</h1>
          <p className="mt-2 text-sm leading-relaxed text-grafite-500">{descricao}</p>

          {children}
        </div>
      </div>

      <aside className="relative isolate hidden overflow-hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=75"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div
          className="absolute inset-0 -z-10 bg-gradient-to-r from-verde-950/60 to-verde-950/20"
          aria-hidden="true"
        />
      </aside>
    </div>
  );
}
