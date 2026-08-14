import type { Metadata } from "next";
import { CONTATO } from "@/lib/contato";

export const metadata: Metadata = {
  title: "Política de privacidade",
  description:
    "Como a Paganelli Imóveis coleta, usa, armazena e protege os dados pessoais de clientes e visitantes do site.",
};

const secoes = [
  {
    id: "dados",
    titulo: "1. Quais dados coletamos",
    paragrafos: [
      "Coletamos os dados que você mesmo informa nos formulários do site: nome, e-mail, telefone/WhatsApp e o conteúdo da mensagem. Quando você solicita uma visita, coletamos também a data, o horário e a modalidade desejados.",
      "Se você avança para uma negociação, passamos a tratar dados adicionais necessários à transação — CPF ou CNPJ, endereço, comprovantes de renda e documentos do imóvel —, sempre mediante solicitação expressa e com finalidade determinada.",
      "Registramos ainda quais imóveis você marcou como favoritos. Essa informação fica salva no seu próprio navegador e não é enviada aos nossos servidores enquanto você não se identificar.",
    ],
  },
  {
    id: "finalidade",
    titulo: "2. Para que usamos",
    paragrafos: [
      "Para responder ao seu contato, apresentar imóveis compatíveis com o que você descreveu, organizar visitas e conduzir a negociação e a documentação do negócio.",
      "Usamos os dados agregados de navegação para entender quais imóveis despertam mais interesse e ajustar a nossa curadoria. Essa análise é estatística e não identifica pessoas individualmente.",
      "Não usamos os seus dados para publicidade de terceiros e não enviamos comunicação comercial sem que você tenha solicitado.",
    ],
  },
  {
    id: "compartilhamento",
    titulo: "3. Com quem compartilhamos",
    paragrafos: [
      "Com o proprietário do imóvel, quando você agenda uma visita ou apresenta uma proposta — e apenas o necessário para viabilizar o encontro ou a análise.",
      "Com instituições financeiras, cartórios e prestadores de serviço jurídico, exclusivamente quando você contrata essas etapas conosco.",
      "Não vendemos, alugamos nem cedemos bases de dados a terceiros para fins de marketing.",
    ],
  },
  {
    id: "cookies",
    titulo: "4. Cookies e armazenamento local",
    paragrafos: [
      "Este site utiliza armazenamento local do navegador para guardar a sua lista de favoritos e manter a sessão da equipe no painel administrativo. São dados funcionais, necessários ao funcionamento das telas.",
      "Não utilizamos cookies de rastreamento publicitário nem pixels de redes sociais nesta versão da plataforma.",
      "Você pode limpar esses dados a qualquer momento pelas configurações do seu navegador. A limpeza remove os favoritos salvos.",
    ],
  },
  {
    id: "direitos",
    titulo: "5. Seus direitos",
    paragrafos: [
      "Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você pode solicitar a confirmação do tratamento, o acesso aos seus dados, a correção de informações incompletas ou desatualizadas, a portabilidade, a anonimização e a eliminação dos dados tratados com o seu consentimento.",
      `Para exercer qualquer um desses direitos, escreva para ${CONTATO.email}. Respondemos em até 15 dias corridos.`,
      "Também é seu direito revogar o consentimento a qualquer momento. Nesse caso, encerramos o tratamento, ressalvadas as hipóteses de guarda obrigatória por prazo legal.",
    ],
  },
  {
    id: "seguranca",
    titulo: "6. Segurança e retenção",
    paragrafos: [
      "Adotamos controle de acesso por perfil, registro de auditoria das ações relevantes e transmissão criptografada. Apenas colaboradores com necessidade funcional acessam dados de clientes.",
      "Mantemos os dados de atendimento por 5 anos após o último contato. Documentos de transações concluídas são guardados pelo prazo exigido pela legislação civil e tributária.",
    ],
  },
];

export default function PaginaPrivacidade() {
  return (
    <>
      <header className="border-b border-linha bg-verde-900 py-14 text-areia-100 lg:py-20">
        <div className="container-paganelli">
          <p className="eyebrow text-dourado-400">Documento legal</p>
          <h1 className="mt-3 font-display text-4xl text-areia-50 lg:text-5xl">
            Política de privacidade
          </h1>
          <p className="mt-4 text-sm text-areia-100/65">
            Versão demonstrativa desta plataforma. Antes de entrar em produção, submeta o texto à
            revisão do jurídico responsável.
          </p>
        </div>
      </header>

      <article className="container-paganelli max-w-3xl py-14 lg:py-20">
        {secoes.map((secao) => (
          <section key={secao.id} id={secao.id} className="mb-12 scroll-mt-28">
            <h2 className="font-display text-2xl text-verde-900">{secao.titulo}</h2>
            {secao.paragrafos.map((p, i) => (
              <p key={i} className="mt-4 text-sm leading-[1.85] text-grafite-700">
                {p}
              </p>
            ))}
          </section>
        ))}

        <section className="rounded-sm border border-linha bg-white p-6">
          <h2 className="font-display text-xl text-verde-900">Encarregado de dados</h2>
          <p className="mt-3 text-sm leading-relaxed text-grafite-700">
            Dúvidas sobre esta política ou sobre o tratamento dos seus dados podem ser enviadas para{" "}
            <a href={`mailto:${CONTATO.email}`} className="underline underline-offset-2">
              {CONTATO.email}
            </a>{" "}
            ou para {CONTATO.endereco}.
          </p>
        </section>
      </article>
    </>
  );
}
