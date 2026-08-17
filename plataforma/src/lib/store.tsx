"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Anuncio,
  Cliente,
  Contrato,
  EtapaFunil,
  Imovel,
  Interacao,
  Lead,
  LogAcao,
  Notificacao,
  StatusAnuncio,
  StatusVisita,
  Tarefa,
  Usuario,
  Visita,
} from "./types";
import { adicionarMeses, diasAte, gerarSlug } from "./format";
import { usuarios as usuariosSeed } from "./seed/usuarios";
import { imoveis as imoveisSeed } from "./seed/imoveis";
import { clientes as clientesSeed } from "./seed/clientes";
import { anuncios as anunciosSeed } from "./seed/anuncios";
import { visitas as visitasSeed } from "./seed/visitas";
import { contratos as contratosSeed } from "./seed/contratos";
import { leads as leadsSeed, logs as logsSeed, notificacoes as notificacoesSeed, tarefas as tarefasSeed } from "./seed/leads";
import { criarImovel as criarImovelSupabase, criarCliente as criarClienteSupabase, criarAnuncio as criarAnuncioSupabase } from "./supabase-client";
import { converterImovelParaDbImovel } from "./supabase-sync-store";

/**
 * Fonte de dados da aplicação.
 *
 * Hoje mantém tudo em memória a partir do seed, com persistência em
 * localStorage para que a demonstração sobreviva a recarregamentos. A
 * superfície pública deste contexto foi desenhada para ser trocada por chamadas
 * a uma API (Prisma/Supabase) sem alterar nenhum componente: cada ação
 * corresponde a uma mutação de servidor.
 */

const CHAVE_ARMAZENAMENTO = "paganelli:dados:v1";

interface EstadoDados {
  usuarios: Usuario[];
  imoveis: Imovel[];
  clientes: Cliente[];
  anuncios: Anuncio[];
  visitas: Visita[];
  contratos: Contrato[];
  leads: Lead[];
  tarefas: Tarefa[];
  notificacoes: Notificacao[];
  logs: LogAcao[];
  /** Favoritos do visitante do site público (não confundir com os do CRM). */
  favoritosVisitante: string[];
}

const estadoInicial: EstadoDados = {
  usuarios: usuariosSeed,
  imoveis: imoveisSeed,
  clientes: clientesSeed,
  anuncios: anunciosSeed,
  visitas: visitasSeed,
  contratos: contratosSeed,
  leads: leadsSeed,
  tarefas: tarefasSeed,
  notificacoes: notificacoesSeed,
  logs: logsSeed,
  favoritosVisitante: [],
};

export interface DadosNovoLead {
  nome: string;
  email: string;
  telefone: string;
  mensagem: string;
  canal: Lead["canal"];
  imovelId?: string;
  anuncioId?: string;
}

export interface DadosNovoContrato {
  imovelId: string;
  proprietarioId: string;
  corretorId: string;
  dataInicio: string;
  prazoMeses: number;
  valorAnuncio: number;
  comissaoPercentual: number;
  clausulasEspeciais?: string;
  observacoes?: string;
}

export interface DadosNovaVisita {
  clienteId: string;
  imovelId: string;
  corretorId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  modalidade: Visita["modalidade"];
  pontoEncontro: string;
}

interface ContextoDados extends EstadoDados {
  carregado: boolean;

  /* Consultas derivadas */
  anunciosPublicos: Anuncio[];
  imoveisPublicos: Imovel[];
  imovelPorId: (id: string) => Imovel | undefined;
  imovelPorSlug: (slug: string) => Imovel | undefined;
  anuncioDoImovel: (imovelId: string) => Anuncio | undefined;
  clientePorId: (id: string) => Cliente | undefined;
  usuarioPorId: (id: string) => Usuario | undefined;
  contratoDoImovel: (imovelId: string) => Contrato | undefined;
  visitasDoCliente: (clienteId: string) => Visita[];
  visitasDoImovel: (imovelId: string) => Visita[];
  leadsDoImovel: (imovelId: string) => Lead[];

  /* Mutações — anúncios */
  alterarStatusAnuncio: (anuncioId: string, status: StatusAnuncio, autorId: string) => void;
  atualizarAnuncio: (anuncioId: string, dados: Partial<Anuncio>, autorId: string) => void;
  deletarAnuncio: (anuncioId: string, autorId: string) => void;

  /* Mutações — imóveis */
  atualizarImovel: (imovelId: string, dados: Partial<Imovel>, autorId: string) => void;
  criarImovel: (dados: Partial<Imovel> & { titulo: string }, autorId: string) => Imovel;
  deletarImovel: (imovelId: string, autorId: string) => void;

  /* Mutações — CRM */
  criarLead: (dados: DadosNovoLead) => Lead;
  atribuirLead: (leadId: string, corretorId: string) => void;
  converterLeadEmCliente: (leadId: string, corretorId: string) => Cliente | undefined;
  descartarLead: (leadId: string) => void;
  moverEtapaCliente: (clienteId: string, etapa: EtapaFunil) => void;
  criarCliente: (dados: Partial<Cliente> & { nome: string }, autorId: string) => Cliente;
  deletarCliente: (clienteId: string, autorId: string) => void;
  registrarInteracao: (clienteId: string, interacao: Omit<Interacao, "id">) => void;

  /* Mutações — visitas */
  criarVisita: (dados: DadosNovaVisita, origem?: "painel" | "site") => Visita;
  alterarStatusVisita: (visitaId: string, status: StatusVisita) => void;
  registrarFeedbackVisita: (visitaId: string, feedback: string, observacoes: string, proximaAcao: string) => void;
  enviarLembreteVisita: (visitaId: string) => void;

  /* Mutações — contratos */
  criarContrato: (dados: DadosNovoContrato, autorId: string) => Contrato;
  atualizarContrato: (contratoId: string, dados: Partial<Contrato>, autorId: string) => void;
  renovarContrato: (contratoId: string, prazoMeses: number, observacao: string, autorId: string) => void;

  /* Mutações — tarefas e notificações */
  alternarTarefa: (tarefaId: string) => void;
  criarTarefa: (dados: Omit<Tarefa, "id" | "concluida">) => void;
  marcarNotificacaoLida: (notificacaoId: string) => void;
  marcarTodasNotificacoesLidas: () => void;

  /* Site público */
  alternarFavoritoVisitante: (imovelId: string) => void;
  registrarVisualizacaoAnuncio: (anuncioId: string) => void;

  reiniciarDemonstracao: () => void;
}

const Contexto = createContext<ContextoDados | null>(null);

function id(prefixo: string): string {
  return `${prefixo}_${Math.random().toString(36).slice(2, 9)}`;
}

function agora(): string {
  return new Date().toISOString();
}

export function DadosProvider({ children }: { children: React.ReactNode }) {
  const [estado, setEstado] = useState<EstadoDados>(estadoInicial);
  const [carregado, setCarregado] = useState(false);

  // Só lemos o localStorage depois da hidratação: o primeiro render precisa
  // bater com o HTML gerado no servidor, que sempre parte do seed. Roda uma
  // única vez, então o render em cascata é intencional e limitado.
  useEffect(() => {
    try {
      const bruto = window.localStorage.getItem(CHAVE_ARMAZENAMENTO);
      if (bruto) {
        const salvo = JSON.parse(bruto) as Partial<EstadoDados>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratação
        setEstado((atual) => ({ ...atual, ...salvo }));
      }
    } catch {
      // Armazenamento indisponível ou corrompido: seguimos com o seed.
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      window.localStorage.setItem(CHAVE_ARMAZENAMENTO, JSON.stringify(estado));
    } catch {
      // Cota excedida ou modo privativo: a demo continua funcionando em memória.
    }
  }, [estado, carregado]);

  /* ------------------------------------------------------------ Auxiliares */

  const registrarLog = useCallback(
    (usuarioId: string, acao: string, entidade: string, detalhe: string) => {
      setEstado((e) => ({
        ...e,
        logs: [{ id: id("lg"), data: agora(), usuarioId, acao, entidade, detalhe }, ...e.logs],
      }));
    },
    [],
  );

  const notificar = useCallback((dados: Omit<Notificacao, "id" | "data" | "lida">) => {
    setEstado((e) => ({
      ...e,
      notificacoes: [{ ...dados, id: id("n"), data: agora(), lida: false }, ...e.notificacoes],
    }));
  }, []);

  /* ------------------------------------------------------------- Consultas */

  const anunciosPublicos = useMemo(
    () =>
      estado.anuncios.filter(
        (a) =>
          a.status === "publicado" &&
          a.visibilidade === "publico" &&
          (!a.expirarEm || diasAte(a.expirarEm) >= 0),
      ),
    [estado.anuncios],
  );

  const imoveisPublicos = useMemo(() => {
    const ids = new Set(anunciosPublicos.map((a) => a.imovelId));
    return estado.imoveis.filter((i) => ids.has(i.id));
  }, [anunciosPublicos, estado.imoveis]);

  const imovelPorId = useCallback(
    (idBusca: string) => estado.imoveis.find((i) => i.id === idBusca),
    [estado.imoveis],
  );

  const imovelPorSlug = useCallback(
    (slug: string) => estado.imoveis.find((i) => i.slug === slug),
    [estado.imoveis],
  );

  /** Anúncio público do imóvel; se não houver, o mais recente de qualquer status. */
  const anuncioDoImovel = useCallback(
    (imovelId: string) =>
      anunciosPublicos.find((a) => a.imovelId === imovelId) ??
      estado.anuncios.find((a) => a.imovelId === imovelId),
    [anunciosPublicos, estado.anuncios],
  );

  const clientePorId = useCallback(
    (idBusca: string) => estado.clientes.find((c) => c.id === idBusca),
    [estado.clientes],
  );

  const usuarioPorId = useCallback(
    (idBusca: string) => estado.usuarios.find((u) => u.id === idBusca),
    [estado.usuarios],
  );

  const contratoDoImovel = useCallback(
    (imovelId: string) =>
      estado.contratos.find(
        (c) => c.imovelId === imovelId && ["ativo", "vencendo", "aguardando_assinatura"].includes(c.status),
      ),
    [estado.contratos],
  );

  const visitasDoCliente = useCallback(
    (clienteId: string) =>
      estado.visitas
        .filter((v) => v.clienteId === clienteId)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [estado.visitas],
  );

  const visitasDoImovel = useCallback(
    (imovelId: string) =>
      estado.visitas
        .filter((v) => v.imovelId === imovelId)
        .sort((a, b) => b.data.localeCompare(a.data)),
    [estado.visitas],
  );

  const leadsDoImovel = useCallback(
    (imovelId: string) => estado.leads.filter((l) => l.imovelId === imovelId),
    [estado.leads],
  );

  /* -------------------------------------------------------------- Anúncios */

  const alterarStatusAnuncio = useCallback(
    (anuncioId: string, status: StatusAnuncio, autorId: string) => {
      let codigo = "";
      setEstado((e) => ({
        ...e,
        anuncios: e.anuncios.map((a) => {
          if (a.id !== anuncioId) return a;
          codigo = a.codigo;
          return {
            ...a,
            status,
            atualizadoEm: agora().slice(0, 10),
            publicarEm: status === "publicado" ? agora().slice(0, 10) : a.publicarEm,
          };
        }),
      }));
      registrarLog(
        autorId,
        status === "publicado" ? "Publicou anúncio" : "Alterou status do anúncio",
        codigo,
        `Novo status: ${status}.`,
      );
    },
    [registrarLog],
  );

  const atualizarAnuncio = useCallback(
    (anuncioId: string, dados: Partial<Anuncio>, autorId: string) => {
      let codigo = "";
      setEstado((e) => ({
        ...e,
        anuncios: e.anuncios.map((a) => {
          if (a.id !== anuncioId) return a;
          codigo = a.codigo;
          return { ...a, ...dados, atualizadoEm: agora().slice(0, 10) };
        }),
      }));
      registrarLog(autorId, "Atualizou anúncio", codigo, "Dados do anúncio alterados.");
    },
    [registrarLog],
  );

  /* --------------------------------------------------------------- Imóveis */

  const atualizarImovel = useCallback(
    (imovelId: string, dados: Partial<Imovel>, autorId: string) => {
      let codigo = "";
      setEstado((e) => ({
        ...e,
        imoveis: e.imoveis.map((i) => {
          if (i.id !== imovelId) return i;
          codigo = i.codigo;
          return {
            ...i,
            ...dados,
            historico: [
              ...i.historico,
              {
                id: id("h"),
                data: agora().slice(0, 10),
                autorId,
                descricao: "Cadastro atualizado pelo painel.",
              },
            ],
          };
        }),
      }));
      registrarLog(autorId, "Atualizou imóvel", codigo, "Cadastro alterado.");
    },
    [registrarLog],
  );

  const criarImovel = useCallback(
    (dados: Partial<Imovel> & { titulo: string }, autorId: string): Imovel => {
      const novoId = id("im");
      const sequencial = estado.imoveis.length + 43;
      const novo: Imovel = {
        id: novoId,
        codigo: `PG-${String(sequencial).padStart(3, "0")}`,
        titulo: dados.titulo,
        slug: gerarSlug(dados.titulo),
        tipo: dados.tipo ?? "casa",
        finalidade: dados.finalidade ?? "venda",
        status: dados.status ?? "disponivel",
        endereco: dados.endereco ?? {
          logradouro: "",
          numero: "",
          bairro: "",
          cidade: "São Paulo",
          estado: "SP",
          cep: "",
          latitude: -23.5505,
          longitude: -46.6333,
        },
        valores: dados.valores ?? {},
        metragens:
          dados.metragens ?? {
            areaTotal: 0,
            dormitorios: 0,
            suites: 0,
            banheiros: 0,
            vagas: 0,
          },
        caracteristicas: dados.caracteristicas ?? [],
        diferenciais: dados.diferenciais ?? [],
        descricaoCurta: dados.descricaoCurta ?? "",
        descricaoCompleta: dados.descricaoCompleta ?? "",
        fotos: dados.fotos ?? [],
        plantas: [],
        documentos: [],
        proprietarioId: dados.proprietarioId ?? "",
        corretorId: dados.corretorId ?? autorId,
        exclusivo: dados.exclusivo ?? false,
        seo: dados.seo ?? { titulo: dados.titulo, descricao: dados.descricaoCurta ?? "" },
        historico: [
          { id: id("h"), data: agora().slice(0, 10), autorId, descricao: "Imóvel cadastrado." },
        ],
        criadoEm: agora().slice(0, 10),
      };
      setEstado((e) => ({ ...e, imoveis: [novo, ...e.imoveis] }));
      registrarLog(autorId, "Cadastrou imóvel", novo.codigo, novo.titulo);

      // Sincronizar com Supabase
      (async () => {
        try {
          const dbImovel = converterImovelParaDbImovel(novo);
          // Se não houver proprietário, usar o primeiro cliente ou criar padrão
          if (!dbImovel.proprietario_id && estado.clientes.length > 0) {
            dbImovel.proprietario_id = estado.clientes[0].id;
          }
          await criarImovelSupabase(dbImovel);

          // Criar anúncio público automaticamente
          try {
            await criarAnuncioSupabase({
              id: id("an"),
              codigo: `AN-${novo.codigo}`,
              imovel_id: novo.id,
              titulo: novo.titulo,
              subtitulo: novo.descricaoCurta,
              descricao_comercial: novo.descricaoCompleta,
              status: "publicado",
              visibilidade: "publico",
              publicar_em: null,
              expirar_em: null,
              destaque_home: false,
              capa_indice: 0,
              ordem_galeria: [],
              selos: [],
              metricas: { visualizacoes: 0, interesse: 0, contatos: 0 },
              corretor_id: novo.corretorId,
            });
          } catch (erro) {
            console.error("Erro ao criar anúncio automático:", erro);
          }
        } catch (erro) {
          console.error("Erro ao sincronizar imóvel com Supabase:", erro);
        }
      })();

      return novo;
    },
    [estado.imoveis.length, registrarLog],
  );

  /* ------------------------------------------------------------------- CRM */

  /**
   * Todo formulário público passa por aqui: cria o lead, notifica a equipe e
   * incrementa a métrica de contatos do anúncio de origem.
   */
  const criarLead = useCallback(
    (dados: DadosNovoLead): Lead => {
      const novo: Lead = {
        id: id("l"),
        nome: dados.nome,
        email: dados.email,
        telefone: dados.telefone,
        mensagem: dados.mensagem,
        canal: dados.canal,
        imovelId: dados.imovelId,
        anuncioId: dados.anuncioId,
        status: "novo",
        criadoEm: agora(),
      };
      setEstado((e) => ({
        ...e,
        leads: [novo, ...e.leads],
        anuncios: dados.anuncioId
          ? e.anuncios.map((a) =>
              a.id === dados.anuncioId
                ? { ...a, metricas: { ...a.metricas, contatos: a.metricas.contatos + 1 } }
                : a,
            )
          : e.anuncios,
      }));
      notificar({
        tipo: "lead",
        titulo: "Novo lead recebido pelo site",
        descricao: `${dados.nome} — ${dados.mensagem.slice(0, 80)}`,
        href: "/painel/leads",
      });
      return novo;
    },
    [notificar],
  );

  const atribuirLead = useCallback((leadId: string, corretorId: string) => {
    setEstado((e) => ({
      ...e,
      leads: e.leads.map((l) =>
        l.id === leadId ? { ...l, corretorId, status: "atribuido" } : l,
      ),
    }));
  }, []);

  /** Promove o lead a cliente do CRM, preservando a mensagem original na timeline. */
  const converterLeadEmCliente = useCallback(
    (leadId: string, corretorId: string): Cliente | undefined => {
      const lead = estado.leads.find((l) => l.id === leadId);
      if (!lead) return undefined;

      const novo: Cliente = {
        id: id("c"),
        nome: lead.nome,
        documento: "",
        telefone: lead.telefone,
        whatsapp: lead.telefone,
        email: lead.email,
        tipo: lead.canal === "anuncie" ? "proprietario" : "comprador",
        origem: "site",
        corretorId: lead.corretorId ?? corretorId,
        interesses: lead.canal === "anuncie" ? ["venda"] : ["compra"],
        preferencias: { tipos: [], regioes: [], caracteristicas: [] },
        etapa: "contato",
        timeline: [
          {
            id: id("i"),
            tipo: "mensagem",
            titulo: "Contato recebido pelo site",
            detalhe: lead.mensagem,
            data: lead.criadoEm,
            autorId: lead.corretorId ?? corretorId,
          },
        ],
        documentos: [],
        favoritos: lead.imovelId ? [lead.imovelId] : [],
        recomendados: lead.imovelId ? [lead.imovelId] : [],
        criadoEm: agora().slice(0, 10),
        atualizadoEm: agora().slice(0, 10),
      };

      setEstado((e) => ({
        ...e,
        clientes: [novo, ...e.clientes],
        leads: e.leads.map((l) =>
          l.id === leadId ? { ...l, status: "convertido", clienteId: novo.id, corretorId: novo.corretorId } : l,
        ),
      }));
      return novo;
    },
    [estado.leads],
  );

  const descartarLead = useCallback((leadId: string) => {
    setEstado((e) => ({
      ...e,
      leads: e.leads.map((l) => (l.id === leadId ? { ...l, status: "descartado" } : l)),
    }));
  }, []);

  const moverEtapaCliente = useCallback((clienteId: string, etapa: EtapaFunil) => {
    setEstado((e) => ({
      ...e,
      clientes: e.clientes.map((c) =>
        c.id === clienteId ? { ...c, etapa, atualizadoEm: agora().slice(0, 10) } : c,
      ),
    }));
  }, []);

  const criarCliente = useCallback(
    (dados: Partial<Cliente> & { nome: string }, autorId: string): Cliente => {
      const novo: Cliente = {
        id: id("c"),
        nome: dados.nome,
        documento: dados.documento ?? "",
        telefone: dados.telefone ?? "",
        whatsapp: dados.whatsapp ?? dados.telefone ?? "",
        email: dados.email ?? "",
        endereco: dados.endereco,
        tipo: dados.tipo ?? "comprador",
        origem: dados.origem ?? "presencial",
        corretorId: dados.corretorId ?? autorId,
        orcamentoMin: dados.orcamentoMin,
        orcamentoMax: dados.orcamentoMax,
        interesses: dados.interesses ?? ["compra"],
        preferencias: dados.preferencias ?? { tipos: [], regioes: [], caracteristicas: [] },
        etapa: dados.etapa ?? "novo",
        timeline: [
          {
            id: id("i"),
            tipo: "observacao",
            titulo: "Cliente cadastrado no CRM",
            data: agora(),
            autorId,
          },
        ],
        documentos: [],
        favoritos: [],
        recomendados: [],
        observacoes: dados.observacoes,
        criadoEm: agora().slice(0, 10),
        atualizadoEm: agora().slice(0, 10),
      };
      setEstado((e) => ({ ...e, clientes: [novo, ...e.clientes] }));
      registrarLog(autorId, "Cadastrou cliente", novo.nome, "Novo contato no CRM.");

      // Sincronizar com Supabase
      (async () => {
        try {
          await criarClienteSupabase({
            id: novo.id,
            nome: novo.nome,
            documento: novo.documento || null,
            telefone: novo.telefone || null,
            whatsapp: novo.whatsapp || null,
            email: novo.email || null,
            endereco: novo.endereco || null,
            tipo: novo.tipo,
            origem: novo.origem,
            corretor_id: novo.corretorId,
            orcamento_min: novo.orcamentoMin ?? null,
            orcamento_max: novo.orcamentoMax ?? null,
            interesses: novo.interesses,
            preferencias: novo.preferencias,
            etapa: novo.etapa,
            timeline: novo.timeline,
            favoritos: novo.favoritos,
            recomendados: novo.recomendados,
            observacoes: novo.observacoes || null,
          });
        } catch (erro) {
          console.error("Erro ao sincronizar cliente com Supabase:", erro);
        }
      })();

      return novo;
    },
    [registrarLog],
  );

  const registrarInteracao = useCallback(
    (clienteId: string, interacao: Omit<Interacao, "id">) => {
      setEstado((e) => ({
        ...e,
        clientes: e.clientes.map((c) =>
          c.id === clienteId
            ? {
                ...c,
                timeline: [...c.timeline, { ...interacao, id: id("i") }],
                atualizadoEm: agora().slice(0, 10),
              }
            : c,
        ),
      }));
    },
    [],
  );

  /* ---------------------------------------------------------------- Visitas */

  const criarVisita = useCallback(
    (dados: DadosNovaVisita, origem: "painel" | "site" = "painel"): Visita => {
      const nova: Visita = {
        id: id("v"),
        codigo: `VS-${String(Math.floor(Math.random() * 900) + 100)}`,
        ...dados,
        // Visita pedida pelo site nasce pendente de confirmação da equipe.
        status: origem === "site" ? "agendada" : "confirmada",
        confirmadaPeloCliente: origem === "site",
        lembreteEnviado: false,
        criadoEm: agora().slice(0, 10),
      };
      setEstado((e) => ({ ...e, visitas: [nova, ...e.visitas] }));
      if (origem === "site") {
        notificar({
          tipo: "visita",
          titulo: "Solicitação de visita pelo site",
          descricao: `Nova visita pendente de confirmação para ${dados.data}.`,
          href: "/painel/visitas",
        });
      }
      return nova;
    },
    [notificar],
  );

  const alterarStatusVisita = useCallback((visitaId: string, status: StatusVisita) => {
    setEstado((e) => ({
      ...e,
      visitas: e.visitas.map((v) =>
        v.id === visitaId
          ? { ...v, status, confirmadaPeloCliente: status === "confirmada" ? true : v.confirmadaPeloCliente }
          : v,
      ),
    }));
  }, []);

  const registrarFeedbackVisita = useCallback(
    (visitaId: string, feedback: string, observacoes: string, proximaAcao: string) => {
      setEstado((e) => ({
        ...e,
        visitas: e.visitas.map((v) =>
          v.id === visitaId
            ? {
                ...v,
                status: "realizada",
                feedbackCliente: feedback,
                observacoesCorretor: observacoes,
                proximaAcao,
              }
            : v,
        ),
      }));
    },
    [],
  );

  const enviarLembreteVisita = useCallback((visitaId: string) => {
    setEstado((e) => ({
      ...e,
      visitas: e.visitas.map((v) => (v.id === visitaId ? { ...v, lembreteEnviado: true } : v)),
    }));
  }, []);

  /* -------------------------------------------------------------- Contratos */

  /**
   * Cria o contrato já como "aguardando_assinatura" e marca o imóvel como
   * exclusivo até a data de término — os dois registros precisam concordar,
   * senão a ficha do imóvel mostra exclusividade sem contrato vigente.
   */
  const criarContrato = useCallback(
    (dadosContrato: DadosNovoContrato, autorId: string): Contrato => {
      const dataTermino = adicionarMeses(dadosContrato.dataInicio, dadosContrato.prazoMeses);
      const numero = `PG-${new Date().getFullYear()}/${String(estado.contratos.length + 60).padStart(3, "0")}`;

      const novo: Contrato = {
        id: id("ct"),
        numero,
        proprietarioId: dadosContrato.proprietarioId,
        imovelId: dadosContrato.imovelId,
        corretorId: dadosContrato.corretorId,
        dataInicio: dadosContrato.dataInicio,
        dataTermino,
        prazoMeses: dadosContrato.prazoMeses,
        valorAnuncio: dadosContrato.valorAnuncio,
        comissaoPercentual: dadosContrato.comissaoPercentual,
        status: "aguardando_assinatura",
        documentos: [],
        clausulasEspeciais: dadosContrato.clausulasEspeciais,
        observacoes: dadosContrato.observacoes,
        renovacoes: [],
        criadoEm: agora().slice(0, 10),
      };

      setEstado((e) => ({
        ...e,
        contratos: [novo, ...e.contratos],
        imoveis: e.imoveis.map((i) =>
          i.id === dadosContrato.imovelId
            ? { ...i, exclusivo: true, exclusividadeAte: dataTermino }
            : i,
        ),
      }));

      registrarLog(autorId, "Criou contrato", numero, "Contrato de exclusividade cadastrado.");
      return novo;
    },
    [estado.contratos.length, registrarLog],
  );

  const atualizarContrato = useCallback(
    (contratoId: string, dados: Partial<Contrato>, autorId: string) => {
      let numero = "";
      setEstado((e) => ({
        ...e,
        contratos: e.contratos.map((c) => {
          if (c.id !== contratoId) return c;
          numero = c.numero;
          return { ...c, ...dados };
        }),
      }));
      registrarLog(autorId, "Atualizou contrato", numero, "Dados do contrato alterados.");
    },
    [registrarLog],
  );

  /** Duplica o contrato vigente com novo período, mantendo o histórico. */
  const renovarContrato = useCallback(
    (contratoId: string, prazoMeses: number, observacao: string, autorId: string) => {
      let numero = "";
      setEstado((e) => ({
        ...e,
        contratos: e.contratos.map((c) => {
          if (c.id !== contratoId) return c;
          numero = c.numero;
          const novoInicio = c.dataTermino;
          return {
            ...c,
            status: "ativo",
            dataInicio: novoInicio,
            dataTermino: adicionarMeses(novoInicio, prazoMeses),
            prazoMeses,
            renovacoes: [
              ...c.renovacoes,
              { id: id("r"), data: agora().slice(0, 10), prazoMeses, observacao },
            ],
          };
        }),
      }));
      registrarLog(autorId, "Renovou contrato", numero, `Novo prazo de ${prazoMeses} meses.`);
    },
    [registrarLog],
  );

  /* ------------------------------------------------- Tarefas e notificações */

  const alternarTarefa = useCallback((tarefaId: string) => {
    setEstado((e) => ({
      ...e,
      tarefas: e.tarefas.map((t) => (t.id === tarefaId ? { ...t, concluida: !t.concluida } : t)),
    }));
  }, []);

  const criarTarefa = useCallback((dados: Omit<Tarefa, "id" | "concluida">) => {
    setEstado((e) => ({
      ...e,
      tarefas: [{ ...dados, id: id("t"), concluida: false }, ...e.tarefas],
    }));
  }, []);

  const marcarNotificacaoLida = useCallback((notificacaoId: string) => {
    setEstado((e) => ({
      ...e,
      notificacoes: e.notificacoes.map((n) => (n.id === notificacaoId ? { ...n, lida: true } : n)),
    }));
  }, []);

  const marcarTodasNotificacoesLidas = useCallback(() => {
    setEstado((e) => ({
      ...e,
      notificacoes: e.notificacoes.map((n) => ({ ...n, lida: true })),
    }));
  }, []);

  /* --------------------------------------------------------- Site público */

  const alternarFavoritoVisitante = useCallback((imovelId: string) => {
    setEstado((e) => ({
      ...e,
      favoritosVisitante: e.favoritosVisitante.includes(imovelId)
        ? e.favoritosVisitante.filter((f) => f !== imovelId)
        : [...e.favoritosVisitante, imovelId],
    }));
  }, []);

  const registrarVisualizacaoAnuncio = useCallback((anuncioId: string) => {
    setEstado((e) => ({
      ...e,
      anuncios: e.anuncios.map((a) =>
        a.id === anuncioId
          ? { ...a, metricas: { ...a.metricas, visualizacoes: a.metricas.visualizacoes + 1 } }
          : a,
      ),
    }));
  }, []);

  const reiniciarDemonstracao = useCallback(() => {
    window.localStorage.removeItem(CHAVE_ARMAZENAMENTO);
    setEstado(estadoInicial);
  }, []);

  /* --------------------------------------------------------- Delete (Admin) */

  const deletarImovel = useCallback((imovelId: string, autorId: string) => {
    let imovelTitulo = "";
    setEstado((e) => {
      const imovel = e.imoveis.find((i) => i.id === imovelId);
      if (imovel) imovelTitulo = imovel.titulo;
      return {
        ...e,
        imoveis: e.imoveis.filter((i) => i.id !== imovelId),
        anuncios: e.anuncios.filter((a) => a.imovelId !== imovelId),
        visitas: e.visitas.filter((v) => v.imovelId !== imovelId),
        contratos: e.contratos.filter((c) => c.imovelId !== imovelId),
      };
    });
    registrarLog(autorId, "Deletou imóvel", imovelTitulo, "Imóvel removido do sistema.");
  }, [registrarLog]);

  const deletarCliente = useCallback((clienteId: string, autorId: string) => {
    let clienteNome = "";
    setEstado((e) => {
      const cliente = e.clientes.find((c) => c.id === clienteId);
      if (cliente) clienteNome = cliente.nome;
      return {
        ...e,
        clientes: e.clientes.filter((c) => c.id !== clienteId),
        leads: e.leads.filter((l) => l.clienteId !== clienteId),
      };
    });
    registrarLog(autorId, "Deletou cliente", clienteNome, "Cliente removido do sistema.");
  }, [registrarLog]);

  const deletarAnuncio = useCallback((anuncioId: string, autorId: string) => {
    let anuncioCodigo = "";
    setEstado((e) => {
      const anuncio = e.anuncios.find((a) => a.id === anuncioId);
      if (anuncio) anuncioCodigo = anuncio.codigo;
      return {
        ...e,
        anuncios: e.anuncios.filter((a) => a.id !== anuncioId),
      };
    });
    registrarLog(autorId, "Deletou anúncio", anuncioCodigo, "Anúncio removido do sistema.");
  }, [registrarLog]);

  const valor: ContextoDados = {
    ...estado,
    carregado,
    anunciosPublicos,
    imoveisPublicos,
    imovelPorId,
    imovelPorSlug,
    anuncioDoImovel,
    clientePorId,
    usuarioPorId,
    contratoDoImovel,
    visitasDoCliente,
    visitasDoImovel,
    leadsDoImovel,
    alterarStatusAnuncio,
    atualizarAnuncio,
    atualizarImovel,
    criarImovel,
    deletarImovel,
    criarLead,
    atribuirLead,
    converterLeadEmCliente,
    descartarLead,
    moverEtapaCliente,
    criarCliente,
    deletarCliente,
    registrarInteracao,
    criarVisita,
    alterarStatusVisita,
    registrarFeedbackVisita,
    enviarLembreteVisita,
    criarContrato,
    atualizarContrato,
    renovarContrato,
    deletarAnuncio,
    alternarTarefa,
    criarTarefa,
    marcarNotificacaoLida,
    marcarTodasNotificacoesLidas,
    alternarFavoritoVisitante,
    registrarVisualizacaoAnuncio,
    reiniciarDemonstracao,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useDados(): ContextoDados {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useDados precisa estar dentro de <DadosProvider>.");
  }
  return contexto;
}
