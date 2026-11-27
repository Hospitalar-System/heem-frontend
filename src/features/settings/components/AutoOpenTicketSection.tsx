import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/Checkbox'
import { clientConfigErrorMessage, useSaveAutoOpenTicket, type ClientConfig } from '../api/client-config'

/**
 * Story 29.6: o cliente decide se a preventiva concluída Não apto abre o chamado sozinha (desligado por padrão). O autor
 * é quem concluiu a OT e os administradores recebem aviso por e-mail.
 */
export function AutoOpenTicketSection({ config }: { config: ClientConfig }) {
  const save = useSaveAutoOpenTicket()
  const checked = Boolean(config.abrirChamadoAutomatico)
  return <section aria-labelledby="auto-open-title" className="rounded-lg border border-border bg-surface p-4 md:p-5">
    <h2 id="auto-open-title" className="text-sm font-semibold text-text-primary">Chamado da preventiva Não apto</h2>
    <p className="mt-1 text-xs leading-5 text-text-secondary">Quando a preventiva sai Não apto, o sistema sempre sugere abrir o chamado já preenchido. Com a opção abaixo ligada, o chamado abre sozinho, com quem concluiu a OT como autor, e os administradores recebem aviso por e-mail. Nunca abre um segundo chamado para a mesma OT.</p>
    <div className="mt-4">
      <Checkbox
        checked={checked}
        disabled={save.isPending}
        onCheckedChange={(next) => save.mutate(next, { onSuccess: () => toast.success(next ? 'Abertura automática ligada.' : 'Abertura automática desligada.') })}
        label={<span className="text-xs text-text-primary">Abrir o chamado automaticamente</span>}
        description="Desligado por padrão."
      />
    </div>
    {save.isError ? <p role="alert" className="mt-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{clientConfigErrorMessage(save.error)}</p> : null}
  </section>
}
