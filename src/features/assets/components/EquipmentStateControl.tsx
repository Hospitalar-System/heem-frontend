import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { useChangeEquipmentState } from '../api/equipment-state'
import type { Equipment, EquipmentState } from '../types'
import { ADMIN_ONLY_STATES, DESCRIPTION_MAX, QUICK_STATES, canChangeFrom, changeStateErrorMessage, equipmentStateLabel, isKnownState, type StateRole } from '../utils/equipment-state'
import { EquipmentStateBadge } from './EquipmentStateBadge'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
function formatDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date)
}

/** Cabeçalho da ficha: selo do estado atual, descrição, data e (admin/técnico) o botão "Alterar estado". */
export function EquipmentStateControl({ equipment, role }: { equipment: Equipment; role: StateRole }) {
  const [open, setOpen] = useState(false)
  const updatedAt = formatDate(equipment.estadoAtualizadoEm)
  const canChange = role !== 'leitura' && canChangeFrom(equipment.statusCicloVida, role)
  return <div className="flex min-w-0 max-w-sm flex-col items-start gap-1.5 sm:items-end">
    <EquipmentStateBadge state={equipment.statusCicloVida} />
    {equipment.descricaoEstado ? <p data-testid="descricao-estado" className="break-words text-xs text-text-secondary sm:text-right">{equipment.descricaoEstado}</p> : null}
    {updatedAt ? <p className="text-[11px] text-text-muted">atualizado em {updatedAt}</p> : null}
    {canChange ? <button type="button" onClick={() => setOpen(true)} className="inline-flex h-8 items-center rounded-md border border-border px-3 text-xs font-medium hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Alterar estado</button> : null}
    {open ? <ChangeStateModal equipment={equipment} role={role} onClose={() => setOpen(false)} /> : null}
  </div>
}

function ChangeStateModal({ equipment, role, onClose }: { equipment: Equipment; role: StateRole; onClose: () => void }) {
  const mutation = useChangeEquipmentState(equipment.id)
  const current = equipment.statusCicloVida
  const [state, setState] = useState<EquipmentState>(isKnownState(current) ? current : 'ATIVO')
  const [description, setDescription] = useState(equipment.descricaoEstado ?? '')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const needsDescription = state === 'EM_MANUTENCAO'
  const showDescription = state !== 'ATIVO'
  const discarding = state === 'DESCARTADO'
  const others = role === 'admin' ? ADMIN_ONLY_STATES : []

  const submit = () => {
    const text = description.trim()
    if (needsDescription && !text) { setError('Informe a descrição: ela é obrigatória para Em manutenção.'); return }
    if (text.length > DESCRIPTION_MAX) { setError(`A descrição pode ter no máximo ${DESCRIPTION_MAX} caracteres.`); return }
    if (discarding && !confirmed) { setError('Confirme o descarte para continuar.'); return }
    setError(null)
    mutation.mutate({ estado: state, ...(showDescription && text ? { descricao: text } : {}) }, {
      onSuccess: () => { toast.success(`Estado alterado para ${equipmentStateLabel(state)}.`); onClose() },
      onError: (failure) => setError(changeStateErrorMessage(failure)),
    })
  }

  const option = (value: EquipmentState) => <label key={value} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-xs ${state === value ? 'bg-bg font-semibold' : ''}`}>
    <input type="radio" name="equipment-state" value={value} aria-label={equipmentStateLabel(value)} checked={state === value} disabled={mutation.isPending} onChange={() => { setState(value); setError(null); setConfirmed(false) }} className="accent-[var(--primary)]" />
    <EquipmentStateBadge state={value} />
  </label>

  return <Modal title="Alterar estado" description={`${equipment.codigo} · ${equipment.nome}`} onClose={onClose} busy={mutation.isPending}>
    <form onSubmit={(event) => { event.preventDefault(); submit() }} className="space-y-4" noValidate>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-medium text-text-secondary">Novo estado</legend>
        <div role="radiogroup" aria-label="Novo estado" className="grid gap-2 sm:grid-cols-2">{QUICK_STATES.map(option)}</div>
      </fieldset>
      {others.length ? <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-medium text-text-secondary">Outros</legend>
        <div role="radiogroup" aria-label="Outros estados" className="grid gap-2 sm:grid-cols-2">{others.map(option)}</div>
      </fieldset> : null}
      {showDescription ? <div className="space-y-1.5">
        <label htmlFor="equipment-state-description" className="block text-xs font-medium text-text-secondary">Descrição{needsDescription ? ' (obrigatória)' : ' (opcional)'}</label>
        <textarea id="equipment-state-description" value={description} maxLength={DESCRIPTION_MAX} rows={3} aria-required={needsDescription} aria-invalid={Boolean(error) && needsDescription && !description.trim()} disabled={mutation.isPending} onChange={(event) => { setDescription(event.target.value); setError(null) }} className={`w-full rounded-md border bg-bg px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 focus:ring-primary/20 ${needsDescription ? 'border-warning focus:border-warning' : 'border-border focus:border-primary'}`} />
        <p className="text-right text-[11px] text-text-muted" aria-live="polite">{description.length}/{DESCRIPTION_MAX}</p>
      </div> : null}
      {discarding ? <label className="flex items-start gap-2 rounded-md border border-danger/40 p-3 text-xs"><input type="checkbox" checked={confirmed} disabled={mutation.isPending} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5" /><span>Entendo que Descartado é definitivo: o equipamento não poderá mais mudar de estado.</span></label> : null}
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={mutation.isPending} className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-bg disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={mutation.isPending} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-bg-brand hover:bg-primary-hover disabled:opacity-60">{mutation.isPending ? 'Salvando…' : 'Salvar estado'}</button>
      </div>
    </form>
  </Modal>
}
