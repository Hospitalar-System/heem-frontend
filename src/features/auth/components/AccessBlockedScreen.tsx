import { ShieldAlert } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { AccessBlockedReason } from '../hooks/useLogin'

const texts: Record<AccessBlockedReason, { title: string; message: string }> = {
  USUARIO_NAO_CADASTRADO: {
    title: 'Acesso ainda não liberado',
    message: 'Seu acesso ainda não foi liberado. Fale com o administrador.',
  },
  USUARIO_DESATIVADO: {
    title: 'Usuário desativado',
    message: 'Seu usuário foi desativado. Fale com o administrador.',
  },
  OUTRO: {
    title: 'Acesso não permitido',
    message: 'Não foi possível liberar seu acesso. Fale com o administrador.',
  },
}

/**
 * Tela exibida quando o /me responde 403 logo após o login. A sessão já foi revogada e
 * descartada pelo useLogin, então não há token a manter: só resta voltar ao login.
 */
export function AccessBlockedScreen({ reason, onBack }: { reason: AccessBlockedReason; onBack: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const { title, message } = texts[reason]

  useEffect(() => headingRef.current?.focus(), [])

  return (
    <div role="alert" className="w-full space-y-4 rounded-lg border border-border bg-surface p-6">
      <ShieldAlert aria-hidden="true" className="size-6 text-danger" />
      <div className="space-y-1.5">
        <h3 ref={headingRef} tabIndex={-1} className="text-base font-semibold text-text-primary outline-none">{title}</h3>
        <p className="text-sm leading-6 text-text-secondary">{message}</p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="h-[45px] w-full rounded-[8px] border border-border px-4 text-sm font-medium text-text-primary outline-none transition hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary"
      >
        Voltar ao login
      </button>
    </div>
  )
}
