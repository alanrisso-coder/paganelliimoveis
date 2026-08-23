"use client";

import { useState } from "react";
import Image from "next/image";
import { useSessao } from "@/lib/auth";
import { atualizarUsuario } from "@/lib/supabase-client";
import { rotuloPerfil } from "@/lib/permissoes";
import { Modal, Botao, Campo } from "@/components/ui";
import { useAviso } from "@/components/ui/Toast";
import { IndicadorForcaSenha } from "@/components/acesso/ForcaSenha";
import { avaliarSenha } from "@/lib/senha-regras";

export function ModalPerfil({ aberto, aoFechar }: { aberto: boolean; aoFechar: () => void }) {
  const { usuario, atualizarUsuarioSessao } = useSessao();
  const { avisar } = useAviso();

  const [arquivoAvatar, setArquivoAvatar] = useState<File | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [enviandoAvatar, setEnviandoAvatar] = useState(false);

  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [enviandoSenha, setEnviandoSenha] = useState(false);

  if (!usuario) return null;

  function handleSelecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setArquivoAvatar(arquivo);
    setPreviewAvatar(URL.createObjectURL(arquivo));
  }

  async function handleSalvarAvatar() {
    if (!arquivoAvatar || !usuario) return;
    setEnviandoAvatar(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", arquivoAvatar);
      formData.append("pasta", "avatares");
      formData.append("imovelId", usuario.id);

      const res = await fetch("/api/storage/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const erro = await res.json();
        throw new Error(erro.erro || "Erro ao enviar foto");
      }
      const { url } = await res.json();

      const atualizado = await atualizarUsuario(usuario.id, { avatar_url: url });
      if (!atualizado) throw new Error("Não foi possível salvar a foto de perfil.");

      atualizarUsuarioSessao({ avatarUrl: url });
      avisar("Foto de perfil atualizada!");
      setArquivoAvatar(null);
      setPreviewAvatar(null);
    } catch (err) {
      avisar(`Erro ao enviar foto: ${err instanceof Error ? err.message : "Desconhecido"}`, "erro");
    } finally {
      setEnviandoAvatar(false);
    }
  }

  async function handleAlterarSenha(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario) return;

    if (!avaliarSenha(novaSenha).valida) {
      avisar("A nova senha não atende aos requisitos de segurança.", "erro");
      return;
    }
    if (novaSenha !== confirmarSenha) {
      avisar("A confirmação não coincide com a nova senha.", "erro");
      return;
    }

    setEnviandoSenha(true);
    try {
      // Quem é o usuário vem da sessão no servidor: mandar o e-mail daqui
      // permitiria pedir a troca de senha de outra conta.
      const res = await fetch("/api/auth/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senhaAtual, novaSenha, confirmacao: confirmarSenha }),
      });
      const corpo = await res.json();
      if (!res.ok) throw new Error(corpo.error || "Não foi possível trocar a senha.");

      avisar("Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (err) {
      avisar(`Erro: ${err instanceof Error ? err.message : "Desconhecido"}`, "erro");
    } finally {
      setEnviandoSenha(false);
    }
  }

  const fotoExibida = previewAvatar ?? usuario.avatarUrl;

  return (
    <Modal aberto={aberto} aoFechar={aoFechar} titulo="Meu perfil" descricao={rotuloPerfil[usuario.perfil]}>
      <div className="space-y-8">
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-grafite-500">
            Foto de perfil
          </h3>
          <div className="flex items-center gap-4">
            <div className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-sm border border-linha bg-areia-200">
              {fotoExibida ? (
                <Image src={fotoExibida} alt="Foto de perfil" fill sizes="72px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-lg font-extrabold text-verde-800">
                  {usuario.avatarIniciais}
                </span>
              )}
            </div>
            <div className="flex-1">
              <label className="block">
                <span className="sr-only">Selecionar foto de perfil</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleSelecionarArquivo}
                  disabled={enviandoAvatar}
                  className="block w-full text-xs text-grafite-600 file:mr-3 file:rounded-sm file:border-0 file:bg-verde-800 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-areia-50 hover:file:bg-verde-700"
                />
              </label>
              <p className="mt-1.5 text-xs text-grafite-500">
                Recomendado: foto 3x4, formato retrato. Máx 10MB (JPG, PNG, WebP).
              </p>
              {arquivoAvatar && (
                <Botao
                  type="button"
                  tamanho="sm"
                  className="mt-2.5"
                  onClick={handleSalvarAvatar}
                  disabled={enviandoAvatar}
                >
                  {enviandoAvatar ? "Salvando…" : "Salvar foto"}
                </Botao>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-linha pt-6">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-grafite-500">
            Alterar senha
          </h3>
          <form onSubmit={handleAlterarSenha} className="space-y-3">
            <Campo
              rotulo="Senha atual"
              type="password"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
            />
            <Campo
              rotulo="Nova senha"
              type="password"
              autoComplete="new-password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />

            <IndicadorForcaSenha senha={novaSenha} />

            <Campo
              rotulo="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
            />

            <p className="text-xs leading-relaxed text-grafite-400">
              Ao alterar a senha, as sessões abertas em outros dispositivos são encerradas.
            </p>

            <Botao
              type="submit"
              tamanho="sm"
              disabled={enviandoSenha || !avaliarSenha(novaSenha).valida}
              className="w-full"
            >
              {enviandoSenha ? "Salvando…" : "Alterar senha"}
            </Botao>
          </form>
        </section>
      </div>
    </Modal>
  );
}
