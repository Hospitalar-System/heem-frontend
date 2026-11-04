import type { ReactNode } from 'react'

export const inputClass = 'h-[45px] w-full rounded-[8px] border border-border bg-bg px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-danger disabled:opacity-60'
export const buttonClass = 'flex h-[45px] w-full items-center justify-center gap-2 rounded-[8px] bg-primary px-4 text-sm font-medium text-bg-brand outline-none transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-login disabled:cursor-wait disabled:opacity-70'

// Rótulo e mensagem de erro ficam fora do <label> para o nome acessível do campo continuar só "E-mail"/"Senha".
export function FormField({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-text-secondary">{label}</label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  )
}
