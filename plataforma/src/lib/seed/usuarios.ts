import type { Usuario } from "../types";

/**
 * Equipe demonstrativa. Em produção estes registros vêm da tabela `usuarios`,
 * espelhando os IDs do provedor de autenticação (Supabase Auth).
 */
export const usuarios: Usuario[] = [
  {
    id: "u1",
    nome: "Leomara Paganelli",
    email: "leomaracorretora@hotmail.com",
    telefone: "48984128000",
    perfil: "administrador",
    creci: "CRECI 9578J",
    avatarIniciais: "LP",
    ativo: true,
    criadoEm: "2018-03-02",
  },
  {
    id: "u2",
    nome: "Fernanda Nogueira",
    email: "fernanda.nogueira@paganelliimoveis.com.br",
    telefone: "48988110002",
    perfil: "corretor",
    creci: "CRECI-SC 32.418",
    avatarIniciais: "FN",
    ativo: true,
    criadoEm: "2022-01-17",
  },
  {
    id: "u3",
    nome: "Rodrigo Salles",
    email: "rodrigo.salles@paganelliimoveis.com.br",
    telefone: "48988110003",
    perfil: "corretor",
    creci: "CRECI-SC 34.902",
    avatarIniciais: "RS",
    ativo: true,
    criadoEm: "2022-09-05",
  },
  {
    id: "u4",
    nome: "Beatriz Lemos",
    email: "beatriz.lemos@paganelliimoveis.com.br",
    telefone: "48988110004",
    perfil: "corretor",
    creci: "CRECI-SC 37.155",
    avatarIniciais: "BL",
    ativo: true,
    criadoEm: "2023-06-12",
  },
  {
    id: "u5",
    nome: "Camila Prado",
    email: "camila.prado@paganelliimoveis.com.br",
    telefone: "48988110005",
    perfil: "assistente",
    avatarIniciais: "CP",
    ativo: true,
    criadoEm: "2023-02-20",
  },
];

export const usuarioPorId = (id: string) => usuarios.find((u) => u.id === id);

export const corretores = usuarios.filter(
  (u) => u.perfil === "corretor" || u.perfil === "administrador",
);
