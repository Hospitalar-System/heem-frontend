import { Select } from '@/components/ui/Select'
import { useTenantUsers } from '@/features/tenants-users/api/users'
import { useEquipmentWorkOrders } from '../api/assets'
import { destinoManutencaoOptions, FORNECEDOR_MAX, JUSTIFICATIVA_ORIGEM_MAX, workOrderOptionLabel, type DestinoManutencao, type OriginMode, type OriginValue } from '../utils/origem-manutencao'

const labelClass = 'grid gap-1.5 text-xs font-medium text-text-secondary'
const inputClass = 'h-9 w-full rounded-md border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

/** Story 23.1: origem obrigatória ao entrar em "Em manutenção" (OT do mesmo equipamento ou justificativa). */
export function MaintenanceOriginFields({ equipmentId, value, onChange, isAdmin, disabled, invalid }: {
  equipmentId: string
  value: OriginValue
  onChange: (next: OriginValue) => void
  isAdmin: boolean
  disabled: boolean
  /** Mostra borda de erro no campo que falta. */
  invalid: boolean
}) {
  const orders = useEquipmentWorkOrders(equipmentId)
  const set = (patch: Partial<OriginValue>) => onChange({ ...value, ...patch })
  const options = (orders.data ?? []).filter((order) => order.status !== 'CANCELADA').map((order) => ({ value: order.id, label: workOrderOptionLabel(order) }))
  const missingOt = invalid && value.mode === 'ot' && !value.ordemTrabalhoId
  const missingSupplier = invalid && value.mode === 'justificativa' && value.destino === 'manutencao_externa' && !value.fornecedor.trim()
  const missingText = invalid && value.mode === 'justificativa' && !value.justificativa.trim()
  const mode = (next: OriginMode, text: string) => <label className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-3 text-xs ${value.mode === next ? 'bg-bg font-semibold' : ''}`}>
    <input type="radio" name="maintenance-origin" value={next} checked={value.mode === next} disabled={disabled} onChange={() => set({ mode: next })} className="accent-[var(--primary)]" />
    {text}
  </label>

  return <fieldset className="space-y-3 rounded-md border border-warning/40 p-3">
    <legend className="px-1 text-xs font-medium text-text-secondary">Origem da manutenção (obrigatória)</legend>
    <div role="radiogroup" aria-label="Origem da manutenção" className="grid gap-2 sm:grid-cols-2">
      {mode('ot', 'OT vinculada')}
      {mode('justificativa', 'Justificativa')}
    </div>
    {value.mode === 'ot' ? <div className="space-y-1.5">
      <label className={labelClass}>OT do equipamento<Select aria-label="OT vinculada" size="sm" value={value.ordemTrabalhoId} onChange={(next) => set({ ordemTrabalhoId: next, ordemTrabalhoCodigo: (orders.data ?? []).find((order) => order.id === next)?.codigo ?? '' })} disabled={disabled || orders.isLoading} aria-invalid={missingOt || undefined} placeholder={orders.isLoading ? 'Carregando OTs…' : 'Escolha a OT'} options={options} /></label>
      {!orders.isLoading && !options.length ? <p className="text-[11px] text-text-muted">{orders.isError ? 'Não foi possível carregar as OTs deste equipamento.' : 'Este equipamento não tem OT aberta ou concluída. Use a justificativa.'}</p> : null}
    </div> : <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>Destino<Select aria-label="Destino da manutenção" size="sm" value={value.destino} onChange={(next) => set({ destino: next as DestinoManutencao })} disabled={disabled} options={destinoManutencaoOptions} /></label>
        <label className={labelClass}>Fornecedor{value.destino === 'manutencao_externa' ? ' (obrigatório)' : ' (opcional)'}
          <input value={value.fornecedor} maxLength={FORNECEDOR_MAX} disabled={disabled} aria-required={value.destino === 'manutencao_externa'} aria-invalid={missingSupplier || undefined} onChange={(event) => set({ fornecedor: event.target.value })} className={`${inputClass} ${missingSupplier ? 'border-danger' : 'border-border'}`} />
        </label>
      </div>
      {isAdmin ? <RetiradoPorField value={value.retiradoPor} onChange={(next) => set({ retiradoPor: next })} disabled={disabled} /> : <p className="text-[11px] text-text-muted">Retirado por: você (quem está registrando).</p>}
      <div className="space-y-1.5">
        <label htmlFor="maintenance-origin-text" className="block text-xs font-medium text-text-secondary">Justificativa (obrigatória)</label>
        <textarea id="maintenance-origin-text" value={value.justificativa} maxLength={JUSTIFICATIVA_ORIGEM_MAX} rows={3} disabled={disabled} aria-required aria-invalid={missingText || undefined} onChange={(event) => set({ justificativa: event.target.value })} className={`w-full rounded-md border bg-bg px-3 py-2 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 ${missingText ? 'border-danger' : 'border-border'}`} />
        <p className="text-right text-[11px] text-text-muted" aria-live="polite">{value.justificativa.length}/{JUSTIFICATIVA_ORIGEM_MAX}</p>
      </div>
    </div>}
  </fieldset>
}

/** Só admin lista os usuários do cliente (GET /users é restrito ao admin). */
function RetiradoPorField({ value, onChange, disabled }: { value: string; onChange: (next: string) => void; disabled: boolean }) {
  const users = useTenantUsers()
  const options = [{ value: '', label: 'Eu (quem está registrando)' }, ...(users.data ?? []).filter((user) => user.ativo).map((user) => ({ value: user.id, label: user.nome }))]
  return <label className={labelClass}>Retirado por<Select aria-label="Retirado por" size="sm" value={value} onChange={onChange} disabled={disabled || users.isLoading} options={options} /></label>
}
