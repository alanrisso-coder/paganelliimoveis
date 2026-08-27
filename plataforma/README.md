# Paganelli Imóveis — Plataforma

Site institucional público + painel administrativo (CRM e gestão imobiliária) em uma única
aplicação Next.js. Os anúncios publicados no painel aparecem automaticamente na vitrine do site.

## Como rodar

```bash
npm install
npm run dev
```

A aplicação sobe em <http://localhost:3000>.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Checagem de tipos |

## Como acessar o painel / CRM

Abra <http://localhost:3000/entrar> (ou clique em **Acesso da equipe** no rodapé do site).

Na coluna direita da tela de acesso há um atalho para entrar direto com cada perfil. Pelo
formulário, use qualquer e-mail da equipe com a senha `paganelli2026`:

| Perfil | E-mail | O que enxerga |
| --- | --- | --- |
| Administrador | `alan.risso@paganelliimoveis.com.br` | Tudo, incluindo Relatórios e Configurações |
| Corretor | `fernanda.nogueira@paganelliimoveis.com.br` | Sem Configurações e sem edição de contratos |
| Assistente | `camila.prado@paganelliimoveis.com.br` | Operacional: cadastra clientes, organiza documentos, agenda visitas |

> A autenticação desta versão é **demonstrativa**: roda no navegador, com senha fixa. Antes de
> produção, substitua por Supabase Auth (ou equivalente) com sessão em cookie `httpOnly`,
> verificação no servidor e RLS por perfil. Ver `src/lib/auth.tsx`.

## Publicação no Instagram

Anúncios podem ser publicados no perfil `@paganelliimoveis` pelo gerenciador de anúncios.
**Cadastrar um anúncio não o publica no Instagram**: todo anúncio nasce em `NOT_REQUESTED` e só
vai ao ar quando um administrador marca *Publicar no Instagram*, revisa a prévia e confirma.

Só o perfil **administrador** tem a permissão `publicar_instagram`, e ela é revalidada no
servidor a cada publicação — a checagem de interface não é a fronteira de segurança.

### Variáveis de ambiente

| Variável | Para que serve |
| --- | --- |
| `INSTAGRAM_ACCESS_TOKEN` | Token de longa duração da Meta com acesso à conta |
| `INSTAGRAM_BUSINESS_ACCOUNT_ID` | ID da conta Instagram Business |
| `INSTAGRAM_API_VERSION` | Versão da Graph API (opcional, padrão `v21.0`) |
| `NEXT_PUBLIC_SITE_URL` | Domínio público, para montar o link do anúncio na legenda — `https://www.paganelliimoveis.com.br` |
| `ANTHROPIC_API_KEY` | Geração da legenda por IA (opcional — sem ela, a legenda padrão é usada) |

### Configuração na Meta

1. A conta Instagram precisa ser **Business** ou **Creator** e estar vinculada a uma Página do Facebook.
2. No App da Meta (pode ser o mesmo já usado no WhatsApp), adicionar o produto **Instagram Graph API**.
3. Conceder as permissões `instagram_basic`, `instagram_content_publish`, `pages_show_list` e `pages_read_engagement`.
4. Gerar um token de longa duração e colocá-lo em `INSTAGRAM_ACCESS_TOKEN`.

O Instagram limita **50 publicações por conta a cada 24 horas**.

### Migration

Antes do primeiro uso, aplicar `migrations/006_instagram_publicacao.sql` no Supabase.

## Dados da empresa

As informações institucionais são **reais**, extraídas do site da empresa
(`leomaracorretora.com.br`) e centralizadas em `src/lib/contato.ts`:

| Campo | Valor |
| --- | --- |
| Nome | Paganelli Imóveis |
| Responsável técnica | Leomara Paganelli |
| CRECI | 9578J |
| Telefone | (48) 98412-8000 |
| WhatsApp | (48) 99201-8882 |
| E-mail | leomaracorretora@hotmail.com |
| Endereço | Av. Atílio Pedro Pagani, 115 · Duetto Office, Sala 1304 — Pagani, Palhoça/SC · 88132-149 |
| Atuação | Palhoça e Grande Florianópolis |

O site da empresa **não informa horário de atendimento**, então esse campo não existe na
plataforma — nada foi inventado no lugar. Pelo mesmo motivo, a página institucional não afirma
tempo de mercado nem número de negócios fechados: o texto se apoia no que a empresa de fato
declara (análise documental e aprovação de financiamento sem custo, atendimento personalizado,
ética e transparência).

O catálogo demonstrativo foi ambientado na área real de atuação — Pedra Branca, Pagani, Passa
Vinte, Ponte do Imaruim, Jardim Eldorado, Centro, Enseada de Brito, Guarda do Cubatão,
Forquilhinhas e Santo Amaro da Imperatriz — com faixas de preço compatíveis com a carteira da
corretora. Imóveis, clientes, visitas, contratos e a equipe (exceto a responsável técnica) são
fictícios.

## Identidade visual

Aplicada conforme o *Brand Book Paganelli Imóveis*. Os tokens estão em
`src/app/globals.css`, dentro do bloco `@theme`.

| Cor | HEX | Uso |
| --- | --- | --- |
| Verde Esmeralda Profundo | `#0A2C22` | Cor primária, fundos de destaque e títulos (`verde-900`) |
| Ouro Nobre | `#C5A059` | Acentuação e detalhes de luxo (`dourado-500`) |
| Branco Neve / Off-White | `#FCFBF8` | Fundo principal (`areia-50`) |
| Grafite Mineral | `#3E4A43` | Corpo de texto e legendas (`grafite-700`) |

As demais tonalidades (`verde-50…950`, `dourado-100…700`, `areia-100…300`,
`grafite-400…900`) são derivadas dessas quatro por clareamento e escurecimento — nada fora da
paleta oficial.

**Tipografia**

- **Cormorant Garamond** — institucional: títulos, destaques conceituais (`font-display`)
- **Plus Jakarta Sans** — complementar: corpo de texto, tabelas e interface (`font-sans`)

As variáveis das fontes ficam no elemento `<html>`, não no `<body>`: os tokens `--font-sans` e
`--font-display` são resolvidos no `:root` e, se as variáveis estivessem só no `<body>`,
resolveriam para vazio e tudo cairia na fonte do sistema.

**Logo**

- `public/logo-paganelli.png` — versão oficial colorida, para fundos off-white/claros
- `public/logo-paganelli-escuro.png` — script em branco com "IMÓVEIS" e traço em Ouro Nobre, para
  fundos em Verde Esmeralda (rodapé, sidebar do painel)

Ambas com fundo transparente, geradas a partir do arquivo oficial. Não há filtro CSS sobre a logo:
o brand book proíbe alterar as cores da marca, então cada fundo usa o arquivo correspondente. A
largura mínima em telas é de **140px**, respeitada em todas as aplicações.

## Rotas

**Site público**

- `/` — home com busca, destaques, diferenciais, depoimentos e formulário
- `/imoveis/venda` · `/imoveis/aluguel` — listagem com filtros avançados, ordenação e carregamento progressivo
- `/imoveis/[slug]` — detalhe do imóvel (galeria, mapa, agendamento, imóveis semelhantes)
- `/sobre` · `/servicos` · `/anuncie` · `/contato` · `/favoritos` · `/privacidade`

**Painel** (`/painel`)

- `/painel` — dashboard com filtros por período, corretor e tipo de negócio
- `/painel/crm` e `/painel/crm/[id]` — funil em Kanban ou lista, e ficha completa do cliente
- `/painel/imoveis` e `/painel/imoveis/[id]` — catálogo e ficha do imóvel
- `/painel/anuncios` — publicar/despublicar, visibilidade, selos, pré-visualização desktop e mobile
- `/painel/visitas` — calendário e lista, com confirmação, lembrete e registro de retorno
- `/painel/contratos` — exclusividade, alertas de vencimento (30/15/7 dias) e renovação
- `/painel/leads` — leads do site, atribuição manual ou automática, conversão em cliente
- `/painel/relatorios` — VGV, comissão potencial, desempenho por corretor, exportação CSV
- `/painel/financeiro` — gastos mensais, controle de reembolso, relatórios e exportação CSV
- `/painel/configuracoes` — usuários, matriz de permissões, integrações e registro de ações

## Controle financeiro

**Financeiro → Gastos Mensais** (`/painel/financeiro`) registra as despesas da imobiliária com
categoria, responsável, comprovante e ciclo de reembolso.

O que cada perfil enxerga é decidido no servidor, não na tela:

| Perfil | Alcance |
| --- | --- |
| Administrador | Tudo, mais excluir lançamento e administrar categorias |
| Gestor | Gastos de toda a equipe, lança em nome de outros e dá baixa em reembolso |
| Corretor · Assistente · Usuário | Só os próprios lançamentos; reembolso entra como pendente |

Quem não tem `ver_todos_gastos` recebe da API apenas os gastos em que é responsável ou autor — o
recorte está na consulta, não na resposta, então chamar `/api/financeiro/gastos` direto não
devolve nada além disso. Marcar como reembolsado carimba data e autor no servidor.

Exclusão é **soft delete** (`excluido_em`): o lançamento some das listas, dos totais e dos
relatórios, e a linha continua no banco para a auditoria. Criar, editar, excluir e reembolsar
geram entrada em `logs_auditoria`.

### Migration

Antes do primeiro uso, aplicar `migrations/008_controle_financeiro.sql` no Supabase. Ele cria
`gastos` e `gastos_categorias` (com as 13 categorias iniciais) e não altera nenhuma tabela
existente.

## Como as duas pontas se conectam

Regra central: **só aparece na vitrine o anúncio com `status: "publicado"` e
`visibilidade: "publico"`** (e dentro da data de expiração, se houver). A derivação está em
`anunciosPublicos`, em `src/lib/store.tsx`.

- Publicar/despublicar no painel reflete na hora em `/imoveis/venda`, `/imoveis/aluguel` e na home.
- Todo formulário público cria um lead no CRM e dispara notificação interna.
- Pedido de visita pelo site cria lead + cliente + visita **pendente de confirmação** da equipe.
- Visualizações e contatos por anúncio são contabilizados e aparecem em Relatórios.

## Arquitetura

```
src/
  app/
    (site)/          páginas públicas
    painel/          área administrativa (guard de sessão no layout)
    entrar/          tela de acesso
  components/
    site/            cabeçalho, cards, galeria, busca, formulários
    painel/          navegação, busca global, notificações, gráficos, fichas
    ui/              botões, campos, modal, selos, estados vazio e de carregamento
  lib/
    types.ts         modelo de domínio (espelha o schema previsto no PostgreSQL)
    store.tsx        fonte de dados + todas as mutações
    auth.tsx         sessão e perfis
    permissoes.ts    matriz de permissões por perfil
    format.ts        formatação pt-BR (R$, datas, telefone, CPF/CNPJ) e rótulos
    seed/            dados demonstrativos
```

## Estado dos dados

Não há backend nesta versão. O `DadosProvider` (`src/lib/store.tsx`) carrega o seed e persiste as
alterações no `localStorage` do navegador — por isso a demonstração sobrevive a recarregamentos,
mas é local a cada navegador. **Configurações → Reiniciar dados de demonstração** devolve tudo ao
estado original.

A superfície do contexto foi desenhada para virar chamadas de API sem mexer nos componentes: cada
ação (`criarLead`, `alterarStatusAnuncio`, `criarVisita`, `renovarContrato`…) corresponde a uma
mutação de servidor. Para ligar o backend:

1. Criar o schema Prisma/Supabase a partir de `src/lib/types.ts`.
2. Trocar o corpo das ações do store por `fetch` nas rotas da API (ou Server Actions).
3. Substituir `src/lib/auth.tsx` por autenticação real e aplicar a matriz de `permissoes.ts`
   também no servidor — a checagem de interface não é fronteira de segurança.
4. Conectar o armazenamento de arquivos para fotos, plantas e documentos.

## O que ainda não está implementado

- Upload real de fotos, plantas, vídeos e documentos (os botões avisam disso na interface)
- Envio real de e-mail e de lembrete de visita por WhatsApp — continuam simulados. A notificação de
  WhatsApp na conversão de lead em cliente é real (WhatsApp Business Cloud API da Meta) — ver
  `src/lib/whatsapp.ts` e `src/lib/whatsapp-conversao.ts`
- Publicação em portais imobiliários e assinatura digital

## Dados demonstrativos

Imóveis, clientes, visitas, contratos, anúncios, leads e a equipe são fictícios, criados para esta
versão. As datas são calculadas a partir de "hoje" no momento em que a aplicação carrega, para que
a demonstração sempre tenha visitas no dia e contratos próximos do vencimento. As fotos vêm do
Unsplash como placeholder.
