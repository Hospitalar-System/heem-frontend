import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { useHospitals, useSectors } from '@/features/assets/api/assets'
import { routineScopeLabels, type RoutineScope } from '../utils/routines'

const scopes: RoutineScope[] = ['equipamento', 'setor', 'hospital']
const scopeHelp: Record<RoutineScope, string> = {
  equipamento: 'Plano de um equipamento: recorrente a cada N dias, ou uma OT avulsa agendada.',
  setor: 'Campanha para os equipamentos de um setor: avulsa ou periódica (dias ou meses).',
  hospital: 'Campanha para o parque do hospital: avulsa ou periódica (dias ou meses).',
}
const radioClass = 'size-4 accent-primary'

/**
 * Escolha do escopo de uma nova rotina. Equipamento reaproveita o formulário de plano (ou o agendamento de OT avulsa);
 * setor/hospital abrem o fluxo de campanha já com o escopo pré-selecionado. Não reimplementa formulários.
 */
export function NewRoutineModal({ onClose, onPlan }: { onClose: () => void; onPlan: () => void }) {
  const uid = useId()
  const navigate = useNavigate()
  const [scope, setScope] = useState<RoutineScope>('equipamento')
  const [recurrent, setRecurrent] = useState(true)
  const [hospitalId, setHospitalId] = useState('')
  const [sectorId, setSectorId] = useState('')
  const hospitals = useHospitals()
  const sectors = useSectors(scope === 'setor' ? hospitalId : '')
  const ready = scope === 'equipamento' || (scope === 'hospital' ? Boolean(hospitalId) : Boolean(hospitalId && sectorId))

  function proceed() {
    if (!ready) return
    if (scope === 'equipamento') {
      if (recurrent) onPlan()
      else navigate('/work-orders/new')
      return
    }
    const params = new URLSearchParams({ hospitalId })
    if (scope === 'setor') params.set('setorId', sectorId)
    navigate(`/work-orders/campanhas/new?${params.toString()}`)
  }

  return <Modal title="Nova rotina" description="Escolha a que a rotina preventiva se aplica." onClose={onClose}>
    <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); proceed() }}>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs font-medium text-text-secondary">Escopo da rotina</legend>
        {scopes.map((item) => <label key={item} className="flex items-center gap-2 text-xs text-text-primary">
          <input type="radio" name={`${uid}-scope`} className={radioClass} checked={scope === item} onChange={() => { setScope(item); setSectorId('') }} />
          {routineScopeLabels[item]}
        </label>)}
        <p className="text-xs text-text-secondary">{scopeHelp[scope]}</p>
      </fieldset>

      {scope === 'equipamento' && <fieldset className="grid gap-2">
        <legend className="mb-1 text-xs font-medium text-text-secondary">Recorrência</legend>
        <label className="flex items-center gap-2 text-xs text-text-primary"><input type="radio" name={`${uid}-recurrence`} className={radioClass} checked={recurrent} onChange={() => setRecurrent(true)} />Recorrente (plano preventivo)</label>
        <label className="flex items-center gap-2 text-xs text-text-primary"><input type="radio" name={`${uid}-recurrence`} className={radioClass} checked={!recurrent} onChange={() => setRecurrent(false)} />Avulsa (agendar uma OT)</label>
      </fieldset>}

      {scope !== 'equipamento' && <>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Hospital
          <Select required value={hospitalId} onChange={(next) => { setHospitalId(next); setSectorId('') }} placeholder="Selecione um hospital" options={(hospitals.data ?? []).map((item) => ({ value: item.id, label: item.nome }))} />
        </label>
        {hospitals.isError && <p role="alert" className="text-xs text-danger">Não foi possível carregar os hospitais.</p>}
        {scope === 'setor' && <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Setor
          <Select required disabled={!hospitalId} value={sectorId} onChange={setSectorId} placeholder={hospitalId ? 'Selecione um setor' : 'Selecione primeiro um hospital'} options={(sectors.data ?? []).map((item) => ({ value: item.id, label: `${item.codigo} · ${item.nome}` }))} />
        </label>}
      </>}

      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Cancelar</button>
        <button type="submit" disabled={!ready} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">Continuar</button>
      </div>
    </form>
  </Modal>
}
