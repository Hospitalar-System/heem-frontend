import { useEffect, useState } from 'react'
import { ArrowLeft, Plus, Trash2, Upload } from 'lucide-react'
import { useForm, useFieldArray, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Field } from '@/components/ui/Modal'
import { equipmentSchema, toEquipmentInput, type EquipmentFormValues } from '../schemas/assets.schema'
import { useEquipment, useHospitals, useSaveEquipment, useSector, useSectors, useUploadEquipmentPhoto } from '../api/assets'
import type { CreateEquipmentInput } from '../types'
import { Select } from '@/components/ui/Select'
import { FormSelect } from '@/components/ui/FormSelect'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60'
const emptyValues: EquipmentFormValues = {
  setorId: '', codigo: '', nome: '', modelo: '', numeroSerie: '', marca: '', dadosGerais: [],
  classeRiscoAnvisa: 'I', statusCicloVida: 'ATIVO', criticidade: 'MEDIA', tipoProtecao: 'CLASSE_I',
  parteAplicada: 'TIPO_B', modoOperacao: 'CONTINUO', dataInstalacao: '', dataGarantiaFim: '',
}

export function EquipmentFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const editing = Boolean(id)
  const equipment = useEquipment(id ?? '')
  const currentSector = useSector(equipment.data?.setorId ?? '')
  const hospitals = useHospitals()
  const [hospitalId, setHospitalId] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [submitError, setSubmitError] = useState('')
  const sectors = useSectors(hospitalId)
  const save = useSaveEquipment()
  const uploadPhoto = useUploadEquipmentPhoto()
  const form = useForm<EquipmentFormValues>({ resolver: zodResolver(equipmentSchema), defaultValues: emptyValues })
  const rows = useFieldArray({ control: form.control, name: 'dadosGerais' })
  const originalPhoto = equipment.data?.fotoUrl
  useEffect(() => {
    if (currentSector.data?.hospitalId) setHospitalId(currentSector.data.hospitalId)
  }, [currentSector.data?.hospitalId])

  useEffect(() => {
    if (!equipment.data) return
    form.reset({
      setorId: equipment.data.setorId,
      codigo: equipment.data.codigo,
      nome: equipment.data.nome,
      modelo: equipment.data.modelo ?? '',
      numeroSerie: equipment.data.numeroSerie ?? '',
      marca: equipment.data.marca ?? '',
      dadosGerais: Object.entries(equipment.data.dadosGerais ?? {}).map(([key, value]) => ({ key, value: stringifyValue(value) })),
      classeRiscoAnvisa: equipment.data.classeRiscoAnvisa,
      statusCicloVida: equipment.data.statusCicloVida,
      criticidade: equipment.data.criticidade,
      tipoProtecao: equipment.data.tipoProtecao,
      parteAplicada: equipment.data.parteAplicada,
      modoOperacao: equipment.data.modoOperacao,
      dataInstalacao: equipment.data.dataInstalacao ?? '',
      dataGarantiaFim: equipment.data.dataGarantiaFim ?? '',
    })
  }, [equipment.data, form])

  const busy = save.isPending || uploadPhoto.isPending
  const submit = form.handleSubmit(async (values) => {
    setSubmitError('')
    try {
      const photoKey = photo ? await uploadPhoto.mutateAsync(photo) : originalPhoto ?? null
      const payload = toEquipmentInput(values, photoKey)
      const result = editing
        ? await save.mutateAsync({ id, data: removeCreateOnlyFields(payload) })
        : await save.mutateAsync({ data: payload })
      toast.success(editing ? 'Equipamento atualizado.' : 'Equipamento cadastrado.')
      navigate(`/assets/${result.id}`, { replace: true })
    } catch (error) {
      const message = getEquipmentError(error)
      setSubmitError(message)
      toast.error(message)
    }
  })

  if (editing && (equipment.isLoading || currentSector.isLoading)) return <AdminPageShell title={equipment.data?.nome ?? 'Equipamento'} subtitle="Ativos"><div aria-busy="true" className="h-96 animate-pulse rounded-lg border border-border bg-surface" /></AdminPageShell>
  if (editing && (equipment.isError || currentSector.isError || !equipment.data)) return <AdminPageShell title="Equipamento" subtitle="Ativos"><section role="alert" className="rounded-lg border border-danger/40 bg-surface p-5 text-sm"><p>Não foi possível carregar os dados para edição.</p><Link to="/assets" className="mt-3 inline-flex items-center gap-2 text-primary underline"><ArrowLeft size={14} />Voltar à lista</Link></section></AdminPageShell>

  return <AdminPageShell title={editing ? 'Editar equipamento' : 'Novo equipamento'} subtitle="Equipamentos">
    <div className="mx-auto max-w-5xl">
      <Link to={editing ? `/assets/${id}` : '/assets'} className="mb-4 inline-flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary"><ArrowLeft size={14} />{editing ? 'Voltar ao equipamento' : 'Voltar à lista'}</Link>
      <form onSubmit={submit} className="space-y-4">
        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Identificação</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {editing ? <Field label="Código"><input value={equipment.data?.codigo ?? ''} disabled className={inputClass} /></Field> : <Field label="Código" error={form.formState.errors.codigo?.message}><input autoFocus className={inputClass} {...form.register('codigo')} /></Field>}
            <Field label="Nome" error={form.formState.errors.nome?.message}><input className={inputClass} {...form.register('nome')} /></Field>
            <Field label="Modelo"><input className={inputClass} {...form.register('modelo')} /></Field>
            <Field label="Número de série"><input className={inputClass} {...form.register('numeroSerie')} /></Field>
            <Field label="Fabricante"><input className={inputClass} {...form.register('marca')} /></Field>
            {editing ? <Field label="Setor e hospital"><input value={`${currentSector.data?.nome ?? '—'} · ${hospitals.data?.find((hospital) => hospital.id === currentSector.data?.hospitalId)?.nome ?? '—'}`} disabled className={inputClass} /></Field> : <>
              <Field label="Hospital" error={hospitals.isError ? 'Não foi possível carregar hospitais.' : undefined}><Select value={hospitalId} onChange={(next) => { setHospitalId(next); form.setValue('setorId', '') }} placeholder="Selecione um hospital" options={(hospitals.data ?? []).map((hospital) => ({ value: hospital.id, label: hospital.nome }))} /></Field>
              <Field label="Setor" error={form.formState.errors.setorId?.message}><FormSelect control={form.control} name="setorId" disabled={!hospitalId || sectors.isLoading} placeholder={hospitalId ? 'Selecione um setor' : 'Selecione primeiro um hospital'} aria-invalid={Boolean(form.formState.errors.setorId)} options={(sectors.data ?? []).map((sector) => ({ value: sector.id, label: `${sector.codigo} · ${sector.nome}` }))} /></Field>
            </>}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Classificação técnica</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SelectField label="Classe de risco ANVISA" name="classeRiscoAnvisa" control={form.control} options={['I', 'II', 'III', 'IV']} />
            <SelectField label="Status do ciclo de vida" name="statusCicloVida" control={form.control} options={['ATIVO', 'EM_MANUTENCAO', 'INATIVO', 'DESATIVADO', 'DESCARTADO']} />
            <SelectField label="Criticidade" name="criticidade" control={form.control} options={['ALTA', 'MEDIA', 'BAIXA']} />
            <SelectField label="Tipo de proteção" name="tipoProtecao" control={form.control} options={['CLASSE_I', 'CLASSE_II', 'ALIMENTACAO_INTERNA']} />
            <SelectField label="Parte aplicada" name="parteAplicada" control={form.control} options={['TIPO_B', 'TIPO_BF', 'TIPO_CF']} />
            <SelectField label="Modo de operação" name="modoOperacao" control={form.control} options={['CONTINUO', 'INTERMITENTE', 'CURTA_DURACAO']} />
            <Field label="Data de instalação"><input type="date" className={inputClass} {...form.register('dataInstalacao')} /></Field>
            <Field label="Fim da garantia"><input type="date" className={inputClass} {...form.register('dataGarantiaFim')} /></Field>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Dados gerais</h2><p className="mt-1 text-xs text-text-secondary">Atributos adicionais em formato chave e valor.</p></div><button type="button" onClick={() => rows.append({ key: '', value: '' })} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-bg"><Plus size={14} />Adicionar campo</button></div>
          {rows.fields.length ? <div className="mt-4 space-y-2">{rows.fields.map((row, index) => <div key={row.id} className="grid grid-cols-[1fr_1fr_36px] gap-2"><input aria-label={`Chave ${index + 1}`} placeholder="Chave" className={inputClass} {...form.register(`dadosGerais.${index}.key`)} /><input aria-label={`Valor ${index + 1}`} placeholder="Valor" className={inputClass} {...form.register(`dadosGerais.${index}.value`)} /><button type="button" aria-label={`Remover campo ${index + 1}`} onClick={() => rows.remove(index)} className="grid size-9 place-items-center rounded-md text-text-secondary hover:bg-bg hover:text-danger"><Trash2 size={15} /></button></div>)}</div> : <p className="mt-4 text-xs text-text-muted">Nenhum dado adicional.</p>}
        </section>

        <section className="rounded-lg border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold">Foto do equipamento</h2>
          <p className="mt-1 text-xs text-text-secondary">A imagem será enviada diretamente ao armazenamento usando URL assinada.</p>
          <label className="mt-4 flex min-h-20 cursor-pointer items-center gap-3 rounded-md border border-dashed border-border px-4 py-3 text-xs text-text-secondary hover:bg-bg"><Upload size={16} /><span>{photo?.name ?? (originalPhoto ? 'Selecionar uma nova foto para substituir a atual' : 'Selecionar foto')}</span><input type="file" accept="image/*" className="sr-only" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} /></label>
        </section>

        {submitError ? <p role="alert" className="rounded-md border border-danger/40 bg-surface p-3 text-xs text-danger">{submitError}</p> : null}
        <div className="flex justify-end gap-2 pb-4"><Link to={editing ? `/assets/${id}` : '/assets'} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-medium">Cancelar</Link><button type="submit" disabled={busy || (editing && equipment.isLoading) || (!editing && (hospitals.isLoading || !sectors.data?.length && !form.getValues('setorId')))} className="h-9 rounded-md bg-primary px-4 text-xs font-semibold text-bg-brand hover:bg-primary-hover disabled:opacity-50">{busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Cadastrar equipamento'}</button></div>
      </form>
    </div>
  </AdminPageShell>
}

type EquipmentFieldName = 'classeRiscoAnvisa' | 'statusCicloVida' | 'criticidade' | 'tipoProtecao' | 'parteAplicada' | 'modoOperacao'
function SelectField({ label, name, control, options }: { label: string; name: EquipmentFieldName; control: Control<EquipmentFormValues>; options: string[] }) {
  return <Field label={label}><FormSelect control={control} name={name} options={options.map((option) => ({ value: option, label: option.replaceAll('_', ' ') }))} /></Field>
}

function stringifyValue(value: unknown) {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return JSON.stringify(value)
}

function removeCreateOnlyFields(input: CreateEquipmentInput) {
  const { setorId, codigo, ...editable } = input
  void setorId
  void codigo
  return editable
}

function getEquipmentError(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; code?: string } } }).response
    if (response?.data?.detail) return response.data.detail
    if (response?.data?.code) return response.data.code
  }
  return error instanceof Error ? error.message : 'Não foi possível salvar o equipamento. Tente novamente.'
}
