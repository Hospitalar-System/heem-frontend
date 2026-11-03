import { zodResolver } from '@hookform/resolvers/zod'
import { useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useForm, type FieldErrors } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { FormSelect } from '@/components/ui/FormSelect'
import { Modal } from '@/components/ui/Modal'
import { useEquipments, useHospitals, useSectors } from '@/features/assets/api/assets'
import { useTenantUsers, useUserHospitalLinks } from '@/features/tenants-users/api/users'
import { createTicketErrorMessage, useCreateTicket } from '../api/tickets'
import { newTicketSchema, newTicketSeverityOptions, type NewTicketFormValues } from '../schemas/tickets.schema'
import type { CreateTicketInput } from '../types'

const inputClass = 'w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-danger'
const fieldOrder = ['hospitalId', 'setorId', 'equipamentoId', 'severidade', 'descricao', 'tecnicoResponsavelId'] as const
type FieldName = (typeof fieldOrder)[number]

function Row({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return <div className="grid gap-1.5">
    <label id={`${id}-label`} htmlFor={id} className="text-xs font-medium text-text-secondary">{label}</label>
    {children}
    {hint}
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>}
  </div>
}

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const r = Math.floor(Math.random() * 16)
    return (char === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Admin do cliente registra um chamado recebido por telefone/mensagem; o hospital vem do equipamento. */
export function NewTicketModal({ onClose }: { onClose: () => void }) {
  const uid = useId()
  const navigate = useNavigate()
  const create = useCreateTicket()
  const submitting = useRef(false)
  // Mesmo id em todas as tentativas desta abertura: reenviar após falha de rede não duplica o chamado.
  const [ticketId] = useState(newId)
  const [formError, setFormError] = useState('')
  const form = useForm<NewTicketFormValues>({
    resolver: zodResolver(newTicketSchema),
    shouldFocusError: false, // o foco é movido por focusFirstInvalid (os Selects não expõem ref ao RHF)
    defaultValues: { hospitalId: '', setorId: '', equipamentoId: '', severidade: 'MEDIA', descricao: '', tecnicoResponsavelId: '' },
  })
  const { errors } = form.formState
  const hospitalId = form.watch('hospitalId')
  const setorId = form.watch('setorId')
  const severidade = form.watch('severidade')
  const descricao = form.watch('descricao')

  const hospitals = useHospitals()
  const sectors = useSectors(hospitalId)
  const equipment = useEquipments()
  const users = useTenantUsers()
  const hospitalLinks = useUserHospitalLinks(users.data ?? [])
  const linksLoading = hospitalLinks.some((query) => query.isLoading)

  const equipmentOptions = useMemo(() => {
    if (!hospitalId) return []
    const sectorIds = new Set((sectors.data ?? []).map((item) => item.id))
    return (equipment.data ?? [])
      .filter((item) => (setorId ? item.setorId === setorId : sectorIds.has(item.setorId)))
      .map((item) => ({ value: item.id, label: `${item.codigo} · ${item.nome}` }))
  }, [equipment.data, hospitalId, sectors.data, setorId])
  const technicianOptions = useMemo(() => (users.data ?? []).flatMap((user, index) =>
    user.role === 'tecnico' && user.ativo && hospitalLinks[index]?.data?.includes(hospitalId) ? [{ value: user.id, label: user.nome }] : []), [hospitalId, hospitalLinks, users.data])

  async function submit(values: NewTicketFormValues) {
    if (submitting.current) return
    submitting.current = true
    setFormError('')
    const body: CreateTicketInput = {
      id: ticketId,
      equipamentoId: values.equipamentoId,
      descricao: values.descricao.trim(),
      severidade: values.severidade,
      ...(values.tecnicoResponsavelId ? { tecnicoResponsavelId: values.tecnicoResponsavelId } : {}),
    }
    try {
      const created = await create.mutateAsync(body)
      toast.success('Chamado aberto.')
      navigate(`/tickets/${created.id}`)
    } catch (error) {
      setFormError(createTicketErrorMessage(error))
    } finally {
      submitting.current = false
    }
  }

  function focusFirstInvalid(invalid: FieldErrors<NewTicketFormValues>) {
    const first = fieldOrder.find((name) => invalid[name])
    if (first) document.getElementById(first === 'severidade' ? `${uid}-severidade-${severidade}` : `${uid}-${first}`)?.focus()
  }

  const ids = Object.fromEntries(fieldOrder.map((name) => [name, `${uid}-${name}`])) as Record<FieldName, string>
  const invalid = (name: FieldName) => errors[name] ? { 'aria-invalid': true as const, 'aria-describedby': `${ids[name]}-error` } : {}
  const busy = create.isPending
  const loadError = hospitals.isError || equipment.isError || users.isError
  const hospitalPicked = Boolean(hospitalId)
  const selectedSeverity = newTicketSeverityOptions.find((option) => option.value === severidade)

  return <Modal title="Novo chamado" description="Registre um chamado recebido por telefone ou mensagem." busy={busy} onClose={onClose}>
    <form noValidate className="space-y-3" onSubmit={(event) => void form.handleSubmit(submit, focusFirstInvalid)(event)}>
      {loadError && <p role="alert" className="text-xs text-danger">Não foi possível carregar hospitais, equipamentos ou técnicos. Feche e tente novamente.</p>}
      <Row id={ids.hospitalId} label="Hospital" error={errors.hospitalId?.message}>
        <FormSelect control={form.control} name="hospitalId" id={ids.hospitalId} aria-labelledby={`${ids.hospitalId}-label`} placeholder="Selecione um hospital"
          options={(hospitals.data ?? []).map((item) => ({ value: item.id, label: item.nome }))} {...invalid('hospitalId')}
          onValueChange={() => { form.setValue('setorId', ''); form.setValue('equipamentoId', ''); form.setValue('tecnicoResponsavelId', ''); form.clearErrors(['hospitalId', 'setorId', 'equipamentoId']) }} />
      </Row>
      <Row id={ids.setorId} label="Setor (opcional)">
        <FormSelect control={form.control} name="setorId" id={ids.setorId} aria-labelledby={`${ids.setorId}-label`} disabled={!hospitalPicked}
          placeholder={hospitalPicked ? 'Todos os setores' : 'Selecione primeiro um hospital'}
          options={[{ value: '', label: 'Todos os setores' }, ...(sectors.data ?? []).map((item) => ({ value: item.id, label: `${item.codigo} · ${item.nome}` }))]}
          onValueChange={() => { form.setValue('equipamentoId', ''); form.clearErrors('equipamentoId') }} />
      </Row>
      <Row id={ids.equipamentoId} label="Equipamento" error={errors.equipamentoId?.message}
        hint={hospitalPicked && !equipment.isLoading && !sectors.isLoading && equipmentOptions.length === 0 ? <p className="text-xs text-warning">Não há equipamentos para este hospital{setorId ? ' e setor' : ''}.</p> : undefined}>
        <FormSelect control={form.control} name="equipamentoId" id={ids.equipamentoId} aria-labelledby={`${ids.equipamentoId}-label`} disabled={!hospitalPicked}
          placeholder={hospitalPicked ? 'Selecione um equipamento' : 'Selecione primeiro um hospital'} options={equipmentOptions} {...invalid('equipamentoId')}
          onValueChange={() => form.clearErrors('equipamentoId')} />
      </Row>

      <fieldset className="grid gap-1.5" aria-describedby={`${ids.severidade}-help${errors.severidade ? ` ${ids.severidade}-error` : ''}`}>
        <legend className="mb-1 text-xs font-medium text-text-secondary">Severidade</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {newTicketSeverityOptions.map((option) => <label key={option.value} title={option.help} className="flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-border px-2 text-xs font-medium text-text-primary hover:bg-bg has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary">
            <input id={`${ids.severidade}-${option.value}`} type="radio" value={option.value} className="size-4 accent-primary" {...form.register('severidade')} />
            {option.label}
          </label>)}
        </div>
        <p id={`${ids.severidade}-help`} className="text-[11px] text-text-muted">{selectedSeverity ? `${selectedSeverity.label}: ${selectedSeverity.help}.` : 'Escolha a severidade.'}</p>
        {errors.severidade && <p id={`${ids.severidade}-error`} role="alert" className="text-xs text-danger">{errors.severidade.message}</p>}
      </fieldset>

      <Row id={ids.descricao} label="Descrição" error={errors.descricao?.message}
        hint={<div className="flex justify-between gap-2 text-[11px] text-text-muted"><span>Não inclua nome ou dados de paciente.</span><span>{descricao.length} caracteres</span></div>}>
        <textarea id={ids.descricao} rows={4} autoComplete="off" className={inputClass} {...invalid('descricao')} {...form.register('descricao')} />
      </Row>

      <Row id={ids.tecnicoResponsavelId} label="Atribuir a um técnico agora (opcional)" error={errors.tecnicoResponsavelId?.message}
        hint={hospitalPicked && !users.isLoading && !linksLoading && technicianOptions.length === 0 ? <p className="text-xs text-warning">Não há técnicos ativos vinculados a este hospital.</p> : undefined}>
        <FormSelect control={form.control} name="tecnicoResponsavelId" id={ids.tecnicoResponsavelId} aria-labelledby={`${ids.tecnicoResponsavelId}-label`} disabled={!hospitalPicked}
          placeholder={hospitalPicked ? 'Sem técnico (chamado fica aberto)' : 'Selecione primeiro um hospital'}
          options={[{ value: '', label: 'Sem técnico (chamado fica aberto)' }, ...technicianOptions]} />
      </Row>

      {formError && <p role="alert" className="text-xs text-danger">{formError}</p>}
      <div className="flex justify-end gap-2 border-t border-border pt-3">
        <button type="button" disabled={busy} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">Cancelar</button>
        <button type="submit" disabled={busy} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Abrindo…' : 'Abrir chamado'}</button>
      </div>
    </form>
  </Modal>
}
