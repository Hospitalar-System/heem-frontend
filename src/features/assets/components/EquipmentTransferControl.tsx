import { MoveRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { DatePicker } from '@/components/ui/DatePicker'
import { isoOf, todayCivil } from '@/components/ui/civil-date'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { endOfSystemDay } from '@/lib/system-day'
import { useHospitals, useSectors } from '../api/assets'
import { MOTIVO_MAX, TIPOS_MOTIVO, tipoMotivoLabels, transferErrorMessage, useTransferEquipment, type TipoMotivo } from '../api/movements'
import type { Equipment } from '../types'

type FieldErrors = Partial<Record<'hospital' | 'setor' | 'tipo' | 'motivo', string>>
const fieldIds = { hospital: 'transfer-hospital', setor: 'transfer-setor', tipo: 'transfer-tipo', motivo: 'transfer-motivo' } as const
const errorId = (key: keyof typeof fieldIds) => `${fieldIds[key]}-error`

/**
 * "Transferir" (Story 24.1/24.5): o admin do cliente transfere entre setores e hospitais do cliente; o técnico, só entre
 * setores do mesmo hospital. O interno do hospital não vê o botão.
 */
export function EquipmentTransferControl({ equipment, hospitalId, role }: { equipment: Equipment; hospitalId: string; role: 'admin' | 'tecnico' | 'leitura' }) {
  const [open, setOpen] = useState(false)
  if (role === 'leitura' || !hospitalId) return null
  return <>
    <button type="button" onClick={() => setOpen(true)} className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-border px-3 text-xs font-semibold text-text-primary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary max-sm:h-11"><MoveRight aria-hidden="true" size={14} />Transferir</button>
    {open ? <TransferModal equipment={equipment} currentHospitalId={hospitalId} isAdmin={role === 'admin'} onClose={() => setOpen(false)} /> : null}
  </>
}

function TransferModal({ equipment, currentHospitalId, isAdmin, onClose }: { equipment: Equipment; currentHospitalId: string; isAdmin: boolean; onClose: () => void }) {
  const mutation = useTransferEquipment(equipment.id)
  const hospitals = useHospitals()
  const [hospitalId, setHospitalId] = useState(currentHospitalId)
  const sectors = useSectors(hospitalId)
  const [setorId, setSetorId] = useState('')
  const [tipo, setTipo] = useState<TipoMotivo | ''>('')
  const [motivo, setMotivo] = useState('')
  const [data, setData] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  // Um clientId por diálogo aberto: o reenvio (ex.: rede caiu depois de gravar) não duplica a movimentação.
  const clientId = useMemo(() => crypto.randomUUID(), [])
  const today = isoOf(todayCivil())
  const destinos = (sectors.data ?? []).filter((sector) => sector.id !== equipment.setorId && sector.ativo !== false)

  const submit = () => {
    const next: FieldErrors = {}
    if (!setorId) next.setor = 'Escolha o setor de destino.'
    if (!tipo) next.tipo = 'Escolha o tipo do motivo.'
    if (!motivo.trim()) next.motivo = 'Descreva o motivo da transferência.'
    setErrors(next)
    const first = (Object.keys(fieldIds) as (keyof typeof fieldIds)[]).find((key) => next[key])
    if (first) { requestAnimationFrame(() => document.getElementById(fieldIds[first])?.focus()); return }
    setError(null)
    mutation.mutate({
      setorDestinoId: setorId,
      tipoMotivo: tipo as TipoMotivo,
      motivo: motivo.trim(),
      // Hoje ou vazio = agora; um dia anterior vai como o fim daquele dia (nunca no futuro).
      ...(data && data < today ? { movimentadoEm: endOfSystemDay(data) } : {}),
      clientId,
    }, {
      onSuccess: () => {
        const nome = destinos.find((sector) => sector.id === setorId)?.nome
        toast.success(nome ? `Equipamento transferido para ${nome}.` : 'Equipamento transferido.')
        onClose()
      },
      onError: (failure) => setError(transferErrorMessage(failure)),
    })
  }

  const fieldClass = (key: keyof FieldErrors) => `w-full rounded-md border bg-bg px-3 py-2 text-xs text-text-primary outline-none focus:ring-2 ${errors[key] ? 'border-danger focus:border-danger focus:ring-danger/20' : 'border-border focus:border-primary focus:ring-primary/20'}`
  const fieldError = (key: keyof FieldErrors) => errors[key] ? <p id={errorId(key)} className="text-[11px] text-danger">{errors[key]}</p> : null
  const invalid = (key: keyof FieldErrors) => ({ 'aria-invalid': errors[key] ? true : undefined, 'aria-describedby': errors[key] ? errorId(key) : undefined })

  return <Modal title="Transferir equipamento" description={`${equipment.codigo} · ${equipment.nome}`} onClose={onClose} busy={mutation.isPending}>
    <form onSubmit={(event) => { event.preventDefault(); submit() }} className="space-y-4" noValidate>
      {isAdmin ? <div className="grid gap-1.5">
        <label htmlFor={fieldIds.hospital} className="text-xs font-medium text-text-secondary">Hospital de destino</label>
        <Select id={fieldIds.hospital} aria-label="Hospital de destino" size="sm" value={hospitalId} disabled={mutation.isPending} onChange={(next) => { setHospitalId(next); setSetorId(''); setErrors((current) => ({ ...current, setor: undefined })) }} options={(hospitals.data ?? []).map((hospital) => ({ value: hospital.id, label: hospital.nome }))} />
      </div> : <p className="text-[11px] text-text-muted">O técnico transfere entre setores do mesmo hospital.</p>}
      <div className="grid gap-1.5">
        <label htmlFor={fieldIds.setor} className="text-xs font-medium text-text-secondary">Setor de destino</label>
        <Select id={fieldIds.setor} aria-label="Setor de destino" size="sm" value={setorId} placeholder={sectors.isLoading ? 'Carregando setores…' : 'Escolha o setor'} disabled={mutation.isPending || sectors.isLoading} onChange={(next) => { setSetorId(next); setErrors((current) => ({ ...current, setor: undefined })) }} options={destinos.map((sector) => ({ value: sector.id, label: sector.nome }))} {...invalid('setor')} />
        {!sectors.isLoading && destinos.length === 0 ? <p className="text-[11px] text-text-muted">Não há outro setor ativo neste hospital.</p> : null}
        {fieldError('setor')}
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={fieldIds.tipo} className="text-xs font-medium text-text-secondary">Tipo do motivo</label>
        <Select id={fieldIds.tipo} aria-label="Tipo do motivo" size="sm" value={tipo} placeholder="Escolha o tipo" disabled={mutation.isPending} onChange={(next) => { setTipo(next as TipoMotivo); setErrors((current) => ({ ...current, tipo: undefined })) }} options={TIPOS_MOTIVO.map((value) => ({ value, label: tipoMotivoLabels[value] }))} {...invalid('tipo')} />
        {fieldError('tipo')}
      </div>
      <div className="grid gap-1.5">
        <label htmlFor={fieldIds.motivo} className="text-xs font-medium text-text-secondary">Motivo</label>
        <textarea id={fieldIds.motivo} value={motivo} maxLength={MOTIVO_MAX} rows={3} aria-required disabled={mutation.isPending} onChange={(event) => { setMotivo(event.target.value); setErrors((current) => ({ ...current, motivo: undefined })) }} className={fieldClass('motivo')} {...invalid('motivo')} />
        <div className="flex justify-between gap-2">{fieldError('motivo') ?? <span />}<p className="text-[11px] text-text-muted" aria-live="polite">{motivo.length}/{MOTIVO_MAX}</p></div>
      </div>
      <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Data da movimentação (opcional)
        <DatePicker aria-label="Data da movimentação" size="sm" value={data} max={today} disabled={mutation.isPending} onChange={setData} />
        <span className="text-[11px] font-normal text-text-muted">Vazia ou hoje: vale a partir de agora.</span>
      </label>
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} disabled={mutation.isPending} className="h-9 rounded-md border border-border px-3 text-xs font-medium hover:bg-bg disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={mutation.isPending} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-bg-brand hover:bg-primary-hover disabled:opacity-60">{mutation.isPending ? 'Transferindo…' : 'Transferir'}</button>
      </div>
    </form>
  </Modal>
}
