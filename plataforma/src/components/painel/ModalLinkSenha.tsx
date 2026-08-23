"use client";

import { useState } from "react";
import { Botao, Modal } from "@/components/ui";

/**
 * Exibe o link de convite / redefinição para o administrador repassar.
 *
 * Enquanto não há provedor de e-mail configurado, a entrega é manual. O link
 * vale como a senha enquanto não é usado, daí o aviso: ele deve ir por um
 * canal em que o destinatário seja reconhecível (WhatsApp do contato salvo,
 * pessoalmente), nunca publicado em grupo.
 *
 * O link não é guardado em lugar nenhum — fechando este modal, só resta gerar
 * outro. É consequência de o banco ter apenas o hash do token.
 */
export function ModalLinkSenha({
  aberto,
  aoFechar,
  link,
  nomeUsuario,
  validadeMinutos = 60,
  tipo,
}: {
  aberto: boolean;
  aoFechar: () => void;
  link: string;
  nomeUsuario: string;
  validadeMinutos?: number;
  tipo: "convite" | "redefinicao";
}) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão de área de transferência: o link continua selecionável
      // no campo abaixo, então não há o que fazer além de não travar.
    }
  }

  return (
    <Modal
      aberto={aberto}
      aoFechar={aoFechar}
      titulo={tipo === "convite" ? "Convite criado" : "Link de redefinição"}
      descricao={`Entregue este link a ${nomeUsuario} para que defina a própria senha.`}
      largura="lg"
    >
      <div className="space-y-4">
        <div>
          <label
            htmlFor="link-senha"
            className="mb-1.5 block text-xs font-bold text-grafite-700"
          >
            Link de acesso
          </label>
          <textarea
            id="link-senha"
            readOnly
            rows={3}
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full resize-none rounded-sm border border-linha bg-areia-50 px-3 py-2.5 font-mono text-xs text-grafite-900"
          />
        </div>

        <div className="rounded-sm border border-alerta/30 bg-[#f7edd9] p-4">
          <p className="text-sm font-bold text-alerta">Trate este link como uma senha.</p>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-grafite-700">
            <li>• Vale por {validadeMinutos} minutos e só pode ser usado uma vez.</li>
            <li>• Envie por um canal onde você reconheça o destinatário.</li>
            <li>• Não publique em grupos nem em canais compartilhados.</li>
            <li>• Depois de fechar esta janela o link não pode ser recuperado.</li>
          </ul>
        </div>

        <div className="flex justify-end gap-2 border-t border-linha pt-4">
          <Botao type="button" variante="fantasma" onClick={aoFechar}>
            Fechar
          </Botao>
          <Botao type="button" onClick={copiar}>
            {copiado ? "Copiado ✓" : "Copiar link"}
          </Botao>
        </div>
      </div>
    </Modal>
  );
}
