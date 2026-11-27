import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useCreateTicket, useSuggestedTicket } from '../api/tickets'
import type { CreateTicketInput, WorkOrderDetail } from '../types'
import { ticketSeverityOptions } from '../utils/pausa'

const DESCRIPTION_MAX = 1000
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

/**
 * Story 29.6: a preventiva concluída como Não apto sugere abrir o chamado já preenchido (equipamento, OT de origem, itens
 * não conformes e severidade pela criticidade). Com chamado já gerado, mostra o link para ele.
 */
export function SuggestedTicketCard({ order, canOpen }: { order: WorkOrderDetail; canOpen: boolean }) {
  const preventiveDone = order.tipo?.toUpperCase() === 'PREVENTIVA' && order.status?.toUpperCase() === 'CONCLUIDA'
  const suggestion = useSuggestedTicket(order.id, canOpen && preventiveDone && !order.chamadoGeradoId)
  const [open, setOpen] = useState(false)

  if (order.chamadoGeradoId) {
    return <section aria-label="Chamado gerado" className="rounded-lg border border-border bg-surface px-5 py-4 text-xs text-text-secondary">
      <p>Chamado aberto a partir desta OT: <Link to={`/tickets/${order.chamadoGeradoId}`} className="font-medium text-primary underline">abrir chamado</Link></p>
    </section>
  }
  if (!suggestion.data) return null
  const existing = suggestion.data.chamadoExistenteId
  return <section aria-label="Chamado sugerido" className="rounded-lg border border-warning/40 bg-warning/5 px-5 py-4">
    <h3 className="text-sm font-semibold text-text-primary">O equipamento saiu Não apto nesta preventiva</h3>
    {existing
      ? <p className="mt-1 text-xs text-text-secondary">Já há um chamado aberto para esta OT: <Link to={`/tickets/${existing}`} className="font-medium text-primary underline">abrir chamado</Link></p>
      : <>
        <p className="mt-1 text-xs text-text-secondary">Abra o chamado já preenchido com os itens não conformes, para a falha virar atendimento.</p>
        <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex h-9 items-center rounded-md bg-primary px-4 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Abrir chamado</button>
      </>}
    {open ? <SuggestedTicketModal draft={suggestion.data} onClose={() => setOpen(false)} /> : null}
  </section>
}

function SuggestedTicketModal({ draft, onClose }: { draft: NonNullable<ReturnType<typeof useSuggestedTicket>['data']>; onClose: () => void }) {
  const navigate = useNavigate()
  const create = useCreateTicket()
  const [descricao, setDescricao] = useState(draft.descricao)
  const [severidade, setSeveridade] = useState(String(draft.severidade))
  const [error, setError] = useState<string | null>(null)
  const submit = () => {
    const text = descricao.trim()
    if (!text) { setError('Informe a descrição do chamado.'); return }
    const input: CreateTicketInput = { id: newId(), equipamentoId: draft.equipamentoId, descricao: text, severidade: severidade as CreateTicketInput['severidade'], tipo: 'falha', otOrigemId: draft.otOrigemId }
    create.mutate(input, {
      onSuccess: (ticket) => { toast.success('Chamado aberto a partir da preventiva.'); onClose(); navigate(`/tickets/${ticket.id}`) },
      onError: (failure) => {
        const code = (failure as { response?: { data?: { code?: string } } }).response?.data?.code
        setError(code === 'OT_ORIGEM_INVALIDA' ? 'Esta OT não pode originar chamado (precisa ser preventiva concluída Não apto do mesmo equipamento).' : 'Não foi possível abrir o chamado. Tente novamente.')
      },
    })
  }
  return <Modal title="Abrir chamado da preventiva" description={`OT de origem: ${draft.otCodigo}`} onClose={onClose} busy={create.isPending}>
    <form onSubmit={(event) => { event.preventDefault(); submit() }} className="space-y-4" noValidate>
      <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Severidade (sugerida pela criticidade)
        <Select size="sm" aria-label="Severidade" value={severidade} onChange={setSeveridade} disabled={create.isPending} options={[...ticketSeverityOptions]} />
      </label>
      <div className="space-y-1.5">
        <label htmlFor="suggested-ticket-description" className="block text-xs font-medium text-text-secondary">Descrição (itens não conformes e observações)</label>
        <textarea id="suggested-ticket-description" value={descricao} maxLength={DESCRIPTION_MAX} rows={6} disabled={create.isPending} aria-invalid={Boolean(error) && !descricao.trim() || undefined} onChange={(event) => { setDescricao(event.target.value); setError(null) }} className="w-full rounded-md border border-border bg-bg px-3 py-2 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
        <p className="text-right text-[11px] text-text-muted" aria-live="polite">{descricao.length}/{DESCRIPTION_MAX}</p>
      </div>
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={create.isPending} className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-bg disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={create.isPending} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-bg-brand hover:bg-primary-hover disabled:opacity-60">{create.isPending ? 'Abrindo…' : 'Abrir chamado'}</button>
      </div>
    </form>
  </Modal>
}
