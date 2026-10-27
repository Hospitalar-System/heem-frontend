import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { FormDatePicker } from '@/components/ui/FormDatePicker'
import { FormSelect } from '@/components/ui/FormSelect'
import { Modal } from '@/components/ui/Modal'
import { useCreatePreventivePlan, useUpdatePreventivePlan, type usePlanLookups } from '../api/preventive-plans'
import { createPreventivePlanSchema, editPreventivePlanSchema, type PreventivePlanFormValues } from '../schemas/preventive-plans.schema'
import type { PreventivePlan } from '../types'
import { planApiError } from '../utils/preventive-plans'

type Lookups = ReturnType<typeof usePlanLookups>

const inputClass = 'h-9 w-full rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-danger'

function Row({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return <div className="grid gap-1.5">
    <label id={`${id}-label`} htmlFor={id} className="text-xs font-medium text-text-secondary">{label}</label>
    {children}
    {hint}
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>}
  </div>
}

/** Cria (sem `plan`) ou edita (com `plan`) um plano preventivo; equipamento e checklist ficam fixos na edição. */
export function PreventivePlanFormModal({ plan, lookups, onClose, onStale }: { plan?: PreventivePlan; lookups: Lookups; onClose: () => void; onStale?: () => void }) {
  const uid = useId()
  const create = useCreatePreventivePlan()
  const update = useUpdatePreventivePlan()
  const [formError, setFormError] = useState('')
  const isEdit = Boolean(plan)
  const form = useForm<PreventivePlanFormValues>({
    resolver: zodResolver(isEdit ? editPreventivePlanSchema : createPreventivePlanSchema),
    defaultValues: {
      equipamentoId: plan?.equipamentoId ?? '',
      checklistId: plan?.checklistId ?? '',
      tecnicoPadraoId: plan?.tecnicoPadraoId ?? '',
      intervaloDias: plan ? String(plan.intervaloDias) : '',
      dataAncora: plan?.dataAncora ?? '',
    },
  })
  const { errors } = form.formState
  const equipamentoId = form.watch('equipamentoId')
  const hospitalId = lookups.hospitalOfEquipment(equipamentoId)
  const busy = create.isPending || update.isPending

  const equipmentOptions = lookups.equipment.map((item) => ({ value: item.id, label: `${item.codigo} · ${item.nome}` }))
  const checklistOptions = isEdit
    ? lookups.checklists.map((item) => ({ value: item.id, label: item.nome }))
    : lookups.checklists
      .filter((item) => item.ativo !== false && (!item.hospitalId || item.hospitalId === hospitalId))
      .map((item) => ({ value: item.id, label: item.nome }))
  const technicianOptions = lookups.technicians.filter((item) => item.hospitalId === hospitalId).map((item) => ({ value: item.id, label: item.nome }))
  const selectedEquipment = lookups.equipment.find((item) => item.id === equipamentoId)

  async function submit(values: PreventivePlanFormValues) {
    setFormError('')
    const intervaloDias = Number(values.intervaloDias)
    try {
      if (plan) {
        await update.mutateAsync({ id: plan.id, tecnicoPadraoId: values.tecnicoPadraoId, intervaloDias, dataAncora: values.dataAncora })
        toast.success('Plano preventivo atualizado.')
      } else {
        await create.mutateAsync({ equipamentoId: values.equipamentoId, checklistId: values.checklistId, tecnicoPadraoId: values.tecnicoPadraoId, intervaloDias, dataAncora: values.dataAncora })
        toast.success('Plano preventivo criado.')
      }
      onClose()
    } catch (error) {
      const mapped = planApiError(error, isEdit ? 'Não foi possível salvar o plano preventivo.' : 'Não foi possível criar o plano preventivo.')
      if (mapped.field) form.setError(mapped.field, { type: 'server', message: mapped.message }, { shouldFocus: true })
      else setFormError(mapped.message)
      if (mapped.status === 404 || mapped.code === 'PLANO_INATIVO') onStale?.()
    }
  }

  const invalid = (field: keyof PreventivePlanFormValues, id: string) => errors[field] ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {}
  const ids = { equipamento: `${uid}-equipamento`, checklist: `${uid}-checklist`, tecnico: `${uid}-tecnico`, intervalo: `${uid}-intervalo`, ancora: `${uid}-ancora` }

  return <Modal title={isEdit ? 'Editar plano preventivo' : 'Novo plano preventivo'} description={isEdit ? 'Altere o técnico padrão, o intervalo ou a data âncora.' : 'Defina o equipamento, o checklist, a recorrência e o técnico padrão.'} busy={busy} onClose={onClose}>
    {lookups.isLoading
      ? <div aria-busy="true" aria-label="Carregando opções" className="space-y-3"><div className="h-9 animate-pulse rounded-md bg-bg" /><div className="h-9 animate-pulse rounded-md bg-bg" /><div className="h-9 animate-pulse rounded-md bg-bg" /></div>
      : <form noValidate className="space-y-3" onSubmit={(event) => void form.handleSubmit(submit)(event)}>
        {lookups.isError && <p role="alert" className="text-xs text-danger">Não foi possível carregar equipamentos, checklists ou técnicos. Feche e tente novamente.</p>}
        <Row id={ids.equipamento} label="Equipamento" error={errors.equipamentoId?.message}>
          <FormSelect control={form.control} name="equipamentoId" id={ids.equipamento} aria-labelledby={`${ids.equipamento}-label`} disabled={isEdit} placeholder="Selecione um equipamento" options={equipmentOptions} {...invalid('equipamentoId', ids.equipamento)}
            onValueChange={() => { form.setValue('checklistId', ''); form.setValue('tecnicoPadraoId', ''); form.clearErrors(['equipamentoId', 'checklistId', 'tecnicoPadraoId']) }} />
        </Row>
        <Row id={ids.checklist} label="Checklist" error={errors.checklistId?.message}
          hint={!isEdit && selectedEquipment && checklistOptions.length === 0 ? <p className="text-xs text-warning">Não há checklist ativo disponível para o hospital deste equipamento. Cadastre um em Checklists.</p> : undefined}>
          <FormSelect control={form.control} name="checklistId" id={ids.checklist} aria-labelledby={`${ids.checklist}-label`} disabled={isEdit || !selectedEquipment} placeholder={selectedEquipment || isEdit ? 'Selecione um checklist' : 'Selecione primeiro um equipamento'}
            options={checklistOptions} {...invalid('checklistId', ids.checklist)} onValueChange={() => form.clearErrors('checklistId')} />
        </Row>
        <Row id={ids.tecnico} label="Técnico padrão" error={errors.tecnicoPadraoId?.message}
          hint={selectedEquipment && hospitalId && technicianOptions.length === 0 ? <p className="text-xs text-warning">Não há técnicos ativos vinculados ao hospital do equipamento.</p> : undefined}>
          <FormSelect control={form.control} name="tecnicoPadraoId" id={ids.tecnico} aria-labelledby={`${ids.tecnico}-label`} disabled={!selectedEquipment} placeholder={selectedEquipment ? 'Selecione um técnico' : 'Selecione primeiro um equipamento'}
            options={technicianOptions} {...invalid('tecnicoPadraoId', ids.tecnico)} onValueChange={() => form.clearErrors('tecnicoPadraoId')} />
        </Row>
        <div className="grid gap-3 sm:grid-cols-2">
          <Row id={ids.intervalo} label="Intervalo (dias)" error={errors.intervaloDias?.message}>
            <input id={ids.intervalo} type="text" inputMode="numeric" autoComplete="off" placeholder="Ex.: 30" className={inputClass} {...invalid('intervaloDias', ids.intervalo)} {...form.register('intervaloDias')} />
          </Row>
          <Row id={ids.ancora} label="Data âncora" error={errors.dataAncora?.message}>
            <FormDatePicker control={form.control} name="dataAncora" id={ids.ancora} aria-labelledby={`${ids.ancora}-label`} placeholder="Selecione a data" {...invalid('dataAncora', ids.ancora)} />
          </Row>
        </div>
        <p className="text-[11px] text-text-muted">A próxima geração é a primeira data a partir de hoje na sequência da âncora, somando o intervalo a cada ciclo.</p>
        {formError && <p role="alert" className="text-xs text-danger">{formError}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button type="button" disabled={busy} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={busy} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar plano'}</button>
        </div>
      </form>}
  </Modal>
}
