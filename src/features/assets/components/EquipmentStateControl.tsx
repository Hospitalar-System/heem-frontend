import { ArrowLeftRight } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/Checkbox'
import { DatePicker } from '@/components/ui/DatePicker'
import { isoOf, todayCivil } from '@/components/ui/civil-date'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useChangeEquipmentState } from '../api/equipment-state'
import type { Equipment, EquipmentState } from '../types'
import { ADMIN_ONLY_STATES, DESCRIPTION_MAX, QUICK_STATES, canChangeFrom, changeStateErrorMessage, equipmentStateLabel, isKnownState, type StateRole } from '../utils/equipment-state'
import { EquipmentStateBadge } from './EquipmentStateBadge'
import { BAIXA_STATES, destinoBaixaOptions, motivoBaixaOptions, type DestinoBaixa, type MotivoBaixa } from '../utils/baixa'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
function formatDate(value: string | null | undefined) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date)
}

/** Selo do estado atual, para ficar junto ao título da ficha. */
export function EquipmentStateSummary({ equipment }: { equipment: Equipment }) {
  return <EquipmentStateBadge state={equipment.statusCicloVida} />
}

/** Descrição e data do estado atual, abaixo do título. */
export function EquipmentStateNote({ equipment }: { equipment: Equipment }) {
  const updatedAt = formatDate(equipment.estadoAtualizadoEm)
  if (!equipment.descricaoEstado && !updatedAt) return null
  return <div className="mt-1 min-w-0 max-w-xl">
    {equipment.descricaoEstado ? <p data-testid="descricao-estado" className="break-words text-xs text-text-secondary">{equipment.descricaoEstado}</p> : null}
    {updatedAt ? <p className="text-[11px] text-text-muted">atualizado em {updatedAt}</p> : null}
  </div>
}

/** Botão "Alterar estado" (admin/técnico), do mesmo tamanho dos demais botões do cabeçalho. */
export function EquipmentStateControl({ equipment, role }: { equipment: Equipment; role: StateRole }) {
  const [open, setOpen] = useState(false)
  const canChange = role !== 'leitura' && canChangeFrom(equipment.statusCicloVida, role)
  if (!canChange) return null
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border px-3 text-xs font-semibold max-sm:h-11 text-text-primary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><ArrowLeftRight aria-hidden="true" size={14} />Alterar estado</button>
    {open ? <ChangeStateModal equipment={equipment} role={role} onClose={() => setOpen(false)} /> : null}
  </>
}

function ChangeStateModal({ equipment, role, onClose }: { equipment: Equipment; role: StateRole; onClose: () => void }) {
  const mutation = useChangeEquipmentState(equipment.id)
  const current = equipment.statusCicloVida
  const [state, setState] = useState<EquipmentState>(isKnownState(current) ? current : 'ATIVO')
  const [description, setDescription] = useState(equipment.descricaoEstado ?? '')
  const [confirmed, setConfirmed] = useState(false)
  const [motivoBaixa, setMotivoBaixa] = useState('')
  const [destinoBaixa, setDestinoBaixa] = useState('')
  const [dataBaixa, setDataBaixa] = useState('')
  const [error, setError] = useState<string | null>(null)
  const needsDescription = state === 'EM_MANUTENCAO'
  const showDescription = state !== 'ATIVO'
  const discarding = state === 'DESCARTADO'
  const showBaixa = BAIXA_STATES.includes(state)
  const others = role === 'admin' ? ADMIN_ONLY_STATES : []

  const submit = () => {
    const text = description.trim()
    if (needsDescription && !text) { setError('Informe a descrição: ela é obrigatória para Em manutenção.'); return }
    if (text.length > DESCRIPTION_MAX) { setError(`A descrição pode ter no máximo ${DESCRIPTION_MAX} caracteres.`); return }
    if (discarding && !confirmed) { setError('Confirme o descarte para continuar.'); return }
    setError(null)
    mutation.mutate({
      estado: state,
      ...(showDescription && text ? { descricao: text } : {}),
      ...(showBaixa && motivoBaixa ? { motivoBaixa: motivoBaixa as MotivoBaixa } : {}),
      ...(showBaixa && destinoBaixa ? { destinoBaixa: destinoBaixa as DestinoBaixa } : {}),
      ...(showBaixa && dataBaixa ? { dataBaixa } : {}),
    }, {
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
      {showBaixa ? <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Motivo da baixa (opcional)<Select aria-label="Motivo da baixa" value={motivoBaixa} onChange={setMotivoBaixa} size="sm" disabled={mutation.isPending} options={motivoBaixaOptions} /></label>
          <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Destino do equipamento (opcional)<Select aria-label="Destino do equipamento" value={destinoBaixa} onChange={setDestinoBaixa} size="sm" disabled={mutation.isPending} options={destinoBaixaOptions} /></label>
        </div>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Data da baixa (opcional)<DatePicker aria-label="Data da baixa" value={dataBaixa} max={isoOf(todayCivil())} onChange={setDataBaixa} size="sm" disabled={mutation.isPending} /></label>
        <p className="text-[11px] text-text-muted">O documento de baixa é anexado na aba Documentos da ficha (tipo “Documento de baixa”).</p>
      </div> : null}
      {discarding ? <div className={`rounded-md border p-3 text-xs ${error && !confirmed ? 'border-danger' : 'border-danger/40'}`}><Checkbox checked={confirmed} invalid={Boolean(error) && !confirmed} disabled={mutation.isPending} onCheckedChange={setConfirmed} label="Entendo que Descartado é definitivo: o equipamento não poderá mais mudar de estado." /></div> : null}
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={mutation.isPending} className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-bg disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={mutation.isPending} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-bg-brand hover:bg-primary-hover disabled:opacity-60">{mutation.isPending ? 'Salvando…' : 'Salvar estado'}</button>
      </div>
    </form>
  </Modal>
}
