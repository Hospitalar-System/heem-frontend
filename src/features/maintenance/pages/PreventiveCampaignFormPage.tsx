import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { FormDatePicker } from '@/components/ui/FormDatePicker'
import { FormSelect } from '@/components/ui/FormSelect'
import { Modal } from '@/components/ui/Modal'
import { isoOf, todayCivil } from '@/components/ui/civil-date'
import { useCampaignLookups, useCampaignPreview, useCreateCampaign } from '../api/preventive-campaigns'
import { PendingBreakdown } from '../components/CampaignParts'
import { campaignFormSchema, type CampaignFormValues } from '../schemas/preventive-campaigns.schema'
import type { CampaignPreview } from '../types/campaigns'
import { assignmentModeLabels, campaignApiError, campaignBody } from '../utils/preventive-campaigns'
import { Checkbox } from '@/components/ui/Checkbox'

const inputClass = 'h-9 w-full rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-danger'
const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
const recurrenceOptions = [{ value: 'avulsa', label: 'Avulsa (uma vez)' }, { value: 'dias', label: 'A cada N dias' }, { value: 'meses', label: 'A cada N meses' }]
const modeOptions = (Object.keys(assignmentModeLabels) as Array<keyof typeof assignmentModeLabels>).map((value) => ({ value, label: assignmentModeLabels[value] }))

function Row({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: ReactNode; children: ReactNode }) {
  return <div className="grid gap-1.5">
    <label id={`${id}-label`} htmlFor={id} className="text-xs font-medium text-text-secondary">{label}</label>
    {children}
    {hint}
    {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>}
  </div>
}

/** Multi-seleção por caixas de marcação (o Select compartilhado é de valor único). Vazio = sem filtro. */
function CheckGroup({ legend, options, value, onChange, error, errorId, empty }: { legend: string; options: Array<{ value: string; label: string }>; value: string[]; onChange: (next: string[]) => void; error?: string; errorId: string; empty: string }) {
  return <fieldset className="grid gap-1.5" aria-describedby={error ? errorId : undefined}>
    <legend className="text-xs font-medium text-text-secondary">{legend} <span className="font-normal text-text-muted">(opcional; nenhum marcado = todos)</span></legend>
    {options.length === 0
      ? <p className="rounded-md border border-dashed border-border p-3 text-xs text-text-muted">{empty}</p>
      : <div className="grid max-h-40 gap-1 overflow-y-auto rounded-md border border-border bg-bg p-2">
        {options.map((option) => <Checkbox key={option.value} label={option.label} checked={value.includes(option.value)} onCheckedChange={(checked) => onChange(checked ? [...value, option.value] : value.filter((item) => item !== option.value))} containerClassName="rounded px-1 py-1 text-xs text-text-primary hover:bg-surface" />)}
      </div>}
    {error && <p id={errorId} role="alert" className="text-xs text-danger">{error}</p>}
  </fieldset>
}

function PreviewSummary({ preview }: { preview: CampaignPreview }) {
  return <div className="space-y-3">
    <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {[['Equipamentos elegíveis', preview.totalEquipamentos], ['OTs que serão geradas', preview.aGerar], ['Puladas (já têm OT preventiva aberta no período)', preview.puladas], ['Pendências', preview.totalPendencias]].map(([label, value]) =>
        <div key={label} className="rounded-md border border-border bg-bg p-3"><dt className="text-[11px] text-text-secondary">{label}</dt><dd className="mt-1 text-lg font-semibold text-text-primary">{value}</dd></div>)}
    </dl>
    {preview.distribuicaoPorTecnico.length > 0 && <div>
      <h4 className="text-xs font-semibold text-text-primary">Distribuição por técnico</h4>
      <ul className="mt-1 space-y-0.5 text-xs text-text-secondary">{preview.distribuicaoPorTecnico.map((item) => <li key={item.tecnicoId}>{item.nome}: {item.quantidade} {item.quantidade === 1 ? 'OT' : 'OTs'}</li>)}</ul>
    </div>}
    <div>
      <h4 className="mb-2 text-xs font-semibold text-text-primary">Pendências (não geram OT)</h4>
      <PendingBreakdown counts={preview.pendenciasPorMotivo} items={preview.pendencias} total={preview.totalPendencias} />
    </div>
  </div>
}

export function PreventiveCampaignFormPage() {
  const uid = useId()
  const navigate = useNavigate()
  const preview = useCampaignPreview()
  const create = useCreateCampaign()
  const submitting = useRef(false)
  const [previewed, setPreviewed] = useState<{ key: string; data: CampaignPreview } | null>(null)
  const [formError, setFormError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const form = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignFormSchema),
    defaultValues: { hospitalId: '', nome: '', setorIds: [], categoriaIds: [], dataInicio: '', dataFim: '', recorrencia: 'avulsa', intervalo: '', modoAtribuicao: 'equilibrado', tecnicoId: '' },
  })
  const { errors } = form.formState
  const values = form.watch()
  const lookups = useCampaignLookups(values.hospitalId)
  const currentKey = JSON.stringify(campaignBody(values))
  const previewIsCurrent = previewed?.key === currentKey
  const today = isoOf(todayCivil())
  const ids = Object.fromEntries(['hospital', 'nome', 'inicio', 'fim', 'recorrencia', 'intervalo', 'modo', 'tecnico', 'setores', 'categorias'].map((name) => [name, `${uid}-${name}`])) as Record<string, string>
  const invalid = (field: keyof CampaignFormValues, id: string) => errors[field] ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {}
  const hospitalName = lookups.hospitals.find((item) => item.id === values.hospitalId)?.nome ?? '—'

  function applyError(error: unknown, fallback: string, where: 'form' | 'confirm') {
    const mapped = campaignApiError(error, fallback)
    // Campo que não está na tela (intervalo na avulsa, técnico fora do modo "um técnico"): vira erro geral do formulário.
    const hidden = (mapped.field === 'intervalo' && values.recorrencia === 'avulsa') || (mapped.field === 'tecnicoId' && values.modoAtribuicao !== 'tecnico')
    if (mapped.field && !hidden) {
      form.setError(mapped.field, { type: 'server', message: mapped.message }, { shouldFocus: true })
      setConfirming(false)
    } else if (where === 'confirm' && !mapped.field) setConfirmError(mapped.message)
    else {
      setConfirming(false)
      setFormError(mapped.message)
    }
  }

  async function onPreview(submitted: CampaignFormValues) {
    setFormError('')
    const body = campaignBody(submitted)
    try {
      const data = await preview.mutateAsync(body)
      setPreviewed({ key: JSON.stringify(body), data })
    } catch (error) {
      setPreviewed(null)
      applyError(error, 'Não foi possível gerar a prévia da campanha.', 'form')
    }
  }

  async function confirm() {
    if (submitting.current || !previewed || !previewIsCurrent) return
    submitting.current = true
    setConfirmError('')
    try {
      const created = await create.mutateAsync(campaignBody(form.getValues()))
      toast.success('Campanha criada. As OTs estão sendo geradas.')
      navigate(`/work-orders/campanhas/${created.id}`)
    } catch (error) {
      applyError(error, 'Não foi possível criar a campanha.', 'confirm')
    } finally {
      submitting.current = false
    }
  }

  return <AdminPageShell title="Nova campanha de preventiva" subtitle="Defina o escopo, confira a prévia e gere as OTs">
    <div className="space-y-4">
      <Link to="/work-orders/campanhas" className={`inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-primary hover:underline ${focusRing}`}><ArrowLeft aria-hidden="true" size={14} />Voltar às campanhas</Link>

      {lookups.isLoading && <div aria-label="Carregando opções" aria-busy="true" className="space-y-3 rounded-lg border border-border bg-surface p-4"><div className="h-9 animate-pulse rounded-md bg-bg" /><div className="h-9 animate-pulse rounded-md bg-bg" /><div className="h-9 animate-pulse rounded-md bg-bg" /></div>}
      {lookups.isError && <p role="alert" className="rounded-lg border border-border bg-surface p-4 text-xs text-danger">Não foi possível carregar hospitais, setores, categorias ou técnicos. Recarregue a página e tente novamente.</p>}

      {!lookups.isLoading && <form noValidate aria-label="Nova campanha" className="space-y-4 rounded-lg border border-border bg-surface p-4 md:p-5" onSubmit={(event) => void form.handleSubmit(onPreview)(event)}>
        <div className="grid gap-3 md:grid-cols-2">
          <Row id={ids.nome} label="Nome da campanha" error={errors.nome?.message}>
            <input id={ids.nome} type="text" maxLength={140} autoComplete="off" placeholder="Ex.: Preventiva semestral" className={inputClass} {...invalid('nome', ids.nome)} {...form.register('nome')} />
          </Row>
          <Row id={ids.hospital} label="Hospital" error={errors.hospitalId?.message}>
            <FormSelect control={form.control} name="hospitalId" id={ids.hospital} aria-labelledby={`${ids.hospital}-label`} placeholder="Selecione um hospital" options={lookups.hospitals.map((item) => ({ value: item.id, label: item.nome }))} {...invalid('hospitalId', ids.hospital)}
              onValueChange={() => { form.setValue('setorIds', []); form.setValue('tecnicoId', ''); form.clearErrors(['hospitalId', 'setorIds', 'tecnicoId']) }} />
          </Row>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <CheckGroup legend="Setores" options={lookups.sectors.map((item) => ({ value: item.id, label: `${item.codigo} · ${item.nome}` }))} value={values.setorIds} onChange={(next) => { form.setValue('setorIds', next); form.clearErrors('setorIds') }} error={errors.setorIds?.message} errorId={`${ids.setores}-error`}
            empty={values.hospitalId ? (lookups.sectorsLoading ? 'Carregando setores…' : 'Este hospital não tem setores cadastrados.') : 'Selecione um hospital para escolher setores.'} />
          <CheckGroup legend="Categorias" options={lookups.categories.map((item) => ({ value: item.id, label: item.nome }))} value={values.categoriaIds} onChange={(next) => { form.setValue('categoriaIds', next); form.clearErrors('categoriaIds') }} error={errors.categoriaIds?.message} errorId={`${ids.categorias}-error`}
            empty="Nenhuma categoria ativa cadastrada." />
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Row id={ids.inicio} label="Data de início" error={errors.dataInicio?.message}>
            <FormDatePicker control={form.control} name="dataInicio" id={ids.inicio} aria-labelledby={`${ids.inicio}-label`} min={today} placeholder="Selecione a data" {...invalid('dataInicio', ids.inicio)} />
          </Row>
          <Row id={ids.fim} label="Data final (opcional)" error={errors.dataFim?.message} hint={<p className="text-[11px] text-text-muted">Define o período em que uma OT preventiva aberta faz o equipamento ser pulado. Sem data final, vale só o dia de início.</p>}>
            <FormDatePicker control={form.control} name="dataFim" id={ids.fim} aria-labelledby={`${ids.fim}-label`} min={values.dataInicio || today} placeholder="Sem data final" {...invalid('dataFim', ids.fim)} />
          </Row>
          <Row id={ids.recorrencia} label="Recorrência" error={errors.recorrencia?.message}>
            <FormSelect control={form.control} name="recorrencia" id={ids.recorrencia} aria-labelledby={`${ids.recorrencia}-label`} options={recurrenceOptions} {...invalid('recorrencia', ids.recorrencia)}
              onValueChange={() => form.clearErrors(['recorrencia', 'intervalo', 'dataFim'])} />
          </Row>
        </div>

        {values.recorrencia !== 'avulsa' && <div className="max-w-xs">
          <Row id={ids.intervalo} label={values.recorrencia === 'dias' ? 'Repetir a cada (dias)' : 'Repetir a cada (meses)'} error={errors.intervalo?.message}>
            <input id={ids.intervalo} type="text" inputMode="numeric" autoComplete="off" placeholder="Ex.: 3" className={inputClass} {...invalid('intervalo', ids.intervalo)} {...form.register('intervalo')} />
          </Row>
        </div>}

        <div className="grid gap-3 md:grid-cols-2">
          <Row id={ids.modo} label="Atribuição das OTs" error={errors.modoAtribuicao?.message}
            hint={<p className="text-[11px] text-text-muted">{values.modoAtribuicao === 'equilibrado' ? 'Divide entre os técnicos ativos do hospital, priorizando quem tem menos OTs abertas.' : values.modoAtribuicao === 'sem_responsavel' ? 'As OTs ficam sem responsável até um técnico assumir ou o administrador atribuir.' : 'Todas as OTs vão para o técnico escolhido.'}</p>}>
            <FormSelect control={form.control} name="modoAtribuicao" id={ids.modo} aria-labelledby={`${ids.modo}-label`} options={modeOptions} {...invalid('modoAtribuicao', ids.modo)}
              onValueChange={() => form.clearErrors(['modoAtribuicao', 'tecnicoId'])} />
          </Row>
          {values.modoAtribuicao === 'tecnico' && <Row id={ids.tecnico} label="Técnico" error={errors.tecnicoId?.message}
            hint={values.hospitalId && !lookups.techniciansLoading && lookups.technicians.length === 0 ? <p className="text-xs text-warning">Não há técnicos ativos vinculados a este hospital.</p> : undefined}>
            <FormSelect control={form.control} name="tecnicoId" id={ids.tecnico} aria-labelledby={`${ids.tecnico}-label`} disabled={!values.hospitalId} placeholder={values.hospitalId ? 'Selecione um técnico' : 'Selecione primeiro um hospital'}
              options={lookups.technicians.map((item) => ({ value: item.id, label: item.nome }))} {...invalid('tecnicoId', ids.tecnico)} onValueChange={() => form.clearErrors('tecnicoId')} />
          </Row>}
        </div>

        {formError && <p role="alert" className="text-xs text-danger">{formError}</p>}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
          <button type="submit" disabled={preview.isPending} className={`h-9 rounded-md border border-primary px-3 text-xs font-semibold text-primary hover:bg-primary/10 ${focusRing} disabled:cursor-not-allowed disabled:opacity-50`}>{preview.isPending ? 'Calculando prévia…' : 'Gerar prévia'}</button>
        </div>
      </form>}

      <section aria-label="Prévia da campanha" aria-live="polite" className="rounded-lg border border-border bg-surface p-4 md:p-5">
        <h2 className="text-sm font-semibold text-text-primary">Prévia</h2>
        {!previewed && <p className="mt-1 text-xs text-text-secondary">Preencha o formulário e gere a prévia para ver quantas OTs serão criadas. Nada é gravado nesta etapa.</p>}
        {previewed && !previewIsCurrent && <p role="status" className="mt-1 text-xs text-warning">Os campos foram alterados. Gere a prévia novamente para poder criar a campanha.</p>}
        {previewed && <div className={`mt-3 ${previewIsCurrent ? '' : 'opacity-60'}`}><PreviewSummary preview={previewed.data} /></div>}
        <div className="mt-4 flex justify-end border-t border-border pt-3">
          <button type="button" disabled={!previewIsCurrent || create.isPending} onClick={() => { setConfirmError(''); setConfirming(true) }} className={`h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover ${focusRing} disabled:cursor-not-allowed disabled:opacity-50`}>Criar campanha</button>
        </div>
      </section>
    </div>

    {confirming && previewed && <Modal title="Confirmar campanha" description="As OTs serão geradas em segundo plano; você acompanha o progresso no painel." busy={create.isPending} onClose={() => setConfirming(false)}>
      <div className="space-y-3">
        <p className="text-sm text-text-primary">Criar a campanha <strong>{values.nome.trim()}</strong> em <strong>{hospitalName}</strong>?</p>
        <ul className="space-y-0.5 text-xs text-text-secondary">
          <li>{previewed.data.aGerar} {previewed.data.aGerar === 1 ? 'OT será gerada' : 'OTs serão geradas'}</li>
          <li>{previewed.data.puladas} {previewed.data.puladas === 1 ? 'equipamento pulado' : 'equipamentos pulados'} (já têm OT preventiva aberta)</li>
          <li>{previewed.data.totalPendencias} {previewed.data.totalPendencias === 1 ? 'pendência' : 'pendências'} (não geram OT)</li>
        </ul>
        {confirmError && <p role="alert" className="text-xs text-danger">{confirmError}</p>}
        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button type="button" disabled={create.isPending} onClick={() => setConfirming(false)} className={`h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg ${focusRing} disabled:opacity-50`}>Voltar</button>
          <button type="button" disabled={create.isPending || !previewIsCurrent} onClick={() => void confirm()} className={`h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover ${focusRing} disabled:cursor-not-allowed disabled:opacity-50`}>{create.isPending ? 'Criando…' : 'Confirmar e gerar OTs'}</button>
        </div>
      </div>
    </Modal>}
  </AdminPageShell>
}
