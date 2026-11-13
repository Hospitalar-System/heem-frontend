import { zodResolver } from '@hookform/resolvers/zod'
import { isDemoMode } from '@/lib/demo-mode'
import { Download, FileDown, RotateCw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { PageAction } from '@/components/ui/PageAction'
import { DatePicker } from '@/components/ui/DatePicker'
import { Select } from '@/components/ui/Select'
import { useHospitals, useSectors } from '@/features/assets/api/assets'
import { useCampaigns } from '@/features/maintenance/api/preventive-campaigns'
import { EXPORT_CONTENTS, EXPORT_FORMATS } from '../api/reports'
import type { ExportRequest } from '../api/reports'
import { EXPORT_BACKEND_SUPPORT, buildExportBody, defaultExportValues, exportBuilderSchema, exportContentLabels, exportFilename, exportFormatLabels } from './export-builder-model'
import type { ExportBuilderValues } from './export-builder-model'
import { useExportDownload } from './use-export-download'

const levelOptions = [{ value: 'resumo', label: 'Resumo' }, { value: 'completo', label: 'Completo' }] as const
const orientationOptions = [{ value: 'retrato', label: 'Retrato' }, { value: 'paisagem', label: 'Paisagem' }] as const

const radioLabel = 'flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-primary hover:bg-bg has-[:checked]:border-primary has-[:checked]:bg-[var(--primary-soft)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary'
const fieldLabel = 'grid min-w-0 gap-1 text-xs text-text-secondary'
const alertBox = 'flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger bg-surface px-3 py-2 text-xs text-text-primary'
const smallButton = 'rounded-md border border-border bg-surface px-3 py-1.5 font-medium outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary'

/** Escolha do relatório a exportar: tipo, período, hospital/setor, nível, orientação e formato. */
export function ExportBuilder() {
  const ids = useId()
  const [defaults] = useState(() => defaultExportValues())
  const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<ExportBuilderValues>({ resolver: zodResolver(exportBuilderSchema), defaultValues: defaults })
  const [conteudo, desde, ate, hospitalId] = useWatch({ control, name: ['conteudo', 'desde', 'ate', 'hospitalId'] })
  const isCampaign = conteudo === 'campanha'
  const hospitals = useHospitals()
  const sectors = useSectors(hospitalId)
  const campaigns = useCampaigns({ ...(hospitalId ? { hospitalId } : {}), tamanho: 100 }, isCampaign)
  const flow = useExportDownload()
  const [lastBody, setLastBody] = useState<ExportRequest | null>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const againRef = useRef<HTMLButtonElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const hospitalOptions = [{ value: '', label: 'Todos' }, ...(hospitals.data ?? []).map((hospital) => ({ value: hospital.id, label: hospital.nome }))]

  function send(body: ExportRequest) {
    setLastBody(body)
    void flow.start(body, exportFilename(body))
  }

  // Foco acompanha o estado: Cancelar enquanto gera, "Baixar novamente" ao concluir, "Tentar de novo" na falha.
  useEffect(() => {
    if (flow.phase === 'generating') cancelRef.current?.focus()
    else if (flow.phase === 'done') againRef.current?.focus()
    else if (flow.phase === 'error') retryRef.current?.focus()
  }, [flow.phase])

  function cancel() {
    flow.cancel()
    setLastBody(null)
    requestAnimationFrame(() => submitRef.current?.focus())
  }

  const submit = handleSubmit((values) => send(buildExportBody(values)))
  const busy = flow.phase === 'requesting' || flow.phase === 'generating'
  const summary = lastBody ? `${exportContentLabels[lastBody.conteudo]} em ${exportFormatLabels[lastBody.formato]}` : ''

  return (
    <section aria-labelledby={`${ids}-title`} className="rounded-lg border border-border bg-surface p-4 xl:p-5">
      <div className="mb-4">
        <h2 id={`${ids}-title`} className="text-sm font-semibold text-text-primary">Gerar relatório</h2>
        <p className="mt-1 text-xs text-text-muted">Escolha o tipo, o período e o formato do arquivo.</p>
      </div>
      <form noValidate onSubmit={(event) => { event.preventDefault(); void submit() }} className="grid gap-4">
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-xs font-medium text-text-secondary">Tipo de relatório</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {EXPORT_CONTENTS.map((value) => <label key={value} className={radioLabel}>
              <input type="radio" value={value} className="size-4 accent-primary" {...register('conteudo')} />
              {exportContentLabels[value]}
            </label>)}
          </div>
        </fieldset>

        {isCampaign ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={fieldLabel}>
              <span>Hospital</span>
              <Controller control={control} name="hospitalId" render={({ field }) => <Select size="sm" aria-label="Hospital da exportação" value={field.value} onChange={(next) => { field.onChange(next); setValue('campanhaId', ''); setValue('setorId', '') }} options={hospitalOptions} />} />
            </label>
            <label className={fieldLabel}>
              <span>Campanha</span>
              <Controller control={control} name="campanhaId" render={({ field }) => <Select size="sm" aria-label="Campanha" placeholder="Escolha a campanha" value={field.value} onChange={field.onChange} aria-invalid={Boolean(errors.campanhaId)} aria-describedby={errors.campanhaId ? `${ids}-campanha-error` : undefined} options={(campaigns.data?.items ?? []).map((campaign) => ({ value: campaign.id, label: campaign.nome }))} />} />
              {errors.campanhaId && <span id={`${ids}-campanha-error`} role="alert" className="text-xs text-danger">{errors.campanhaId.message}</span>}
            </label>
            <p className="text-[11px] text-text-muted sm:col-span-2">O relatório da campanha cobre todas as ordens de trabalho dela; o período não se aplica.</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <label className={fieldLabel}>
              <span>De</span>
              <Controller control={control} name="desde" render={({ field }) => <DatePicker size="sm" required aria-label="Período de" value={field.value} max={ate || undefined} onChange={field.onChange} />} />
              {errors.desde && <span role="alert" className="text-xs text-danger">{errors.desde.message}</span>}
            </label>
            <label className={fieldLabel}>
              <span>Até</span>
              <Controller control={control} name="ate" render={({ field }) => <DatePicker size="sm" required aria-label="Período até" value={field.value} min={desde || undefined} onChange={field.onChange} />} />
              {errors.ate && <span role="alert" className="text-xs text-danger">{errors.ate.message}</span>}
            </label>
            <label className={fieldLabel}>
              <span>Hospital</span>
              <Controller control={control} name="hospitalId" render={({ field }) => <Select size="sm" aria-label="Hospital da exportação" value={field.value} onChange={(next) => { field.onChange(next); setValue('setorId', '') }} options={hospitalOptions} />} />
            </label>
            <label className={fieldLabel}>
              <span>Setor</span>
              <Controller control={control} name="setorId" render={({ field }) => <Select size="sm" aria-label="Setor da exportação" value={field.value} disabled={!hospitalId} onChange={field.onChange} options={[{ value: '', label: 'Todos' }, ...(sectors.data ?? []).map((sector) => ({ value: sector.id, label: sector.nome }))]} />} />
            </label>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="grid gap-1.5" disabled={!EXPORT_BACKEND_SUPPORT.nivel}>
            <legend className="mb-1 text-xs font-medium text-text-secondary">Nível</legend>
            <div className="grid grid-cols-2 gap-2">
              {levelOptions.map((option) => <label key={option.value} className={radioLabel}>
                <input type="radio" value={option.value} className="size-4 accent-primary" {...register('nivel')} />
                {option.label}
              </label>)}
            </div>
            {!EXPORT_BACKEND_SUPPORT.nivel && <p className="text-[11px] text-text-muted">Disponível em breve. Por enquanto o arquivo traz o relatório completo.</p>}
          </fieldset>
          <fieldset className="grid gap-1.5" disabled={!EXPORT_BACKEND_SUPPORT.orientacao}>
            <legend className="mb-1 text-xs font-medium text-text-secondary">Orientação do PDF</legend>
            <div className="grid grid-cols-2 gap-2">
              {orientationOptions.map((option) => <label key={option.value} className={radioLabel}>
                <input type="radio" value={option.value} className="size-4 accent-primary" {...register('orientacao')} />
                {option.label}
              </label>)}
            </div>
            <p className="text-[11px] text-text-muted">{EXPORT_BACKEND_SUPPORT.orientacao ? 'Só vale para PDF.' : 'Disponível em breve. Por enquanto o PDF sai em retrato.'}</p>
          </fieldset>
        </div>

        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-xs font-medium text-text-secondary">Formato</legend>
          <div className="grid max-w-md grid-cols-3 gap-2">
            {EXPORT_FORMATS.map((value) => <label key={value} className={radioLabel}>
              <input type="radio" value={value} className="size-4 accent-primary" {...register('formato')} />
              {exportFormatLabels[value]}
            </label>)}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <PageAction icon={FileDown} disabled={busy} buttonRef={submitRef} onClick={() => void submit()}>{busy ? 'Gerando…' : 'Gerar relatório'}</PageAction>
        </div>
        {isDemoMode ? <p className="text-[11px] text-text-muted">Modo demonstração: os arquivos são amostras ilustrativas, não o modelo final dos relatórios.</p> : null}
      </form>

      <div className="mt-4 grid gap-2">
        <div role="status" aria-live="polite" className={flow.phase === 'generating' || flow.phase === 'requesting' || flow.phase === 'done' ? 'flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-secondary' : 'sr-only'}>
          {flow.phase === 'requesting' && <span className="flex items-center gap-2"><RotateCw aria-hidden="true" className="animate-spin text-primary" size={14} />Solicitando o relatório…</span>}
          {flow.phase === 'generating' && <span className="flex items-center gap-2"><RotateCw aria-hidden="true" className="animate-spin text-primary" size={14} />Gerando… {summary}. Isso pode levar alguns instantes.</span>}
          {flow.phase === 'done' && <span className="flex items-center gap-2"><Download aria-hidden="true" size={14} />Relatório baixado ({flow.filename}).</span>}
          {flow.phase === 'generating' && <button ref={cancelRef} type="button" onClick={cancel} className={smallButton}>Cancelar</button>}
          {flow.phase === 'done' && <button ref={againRef} type="button" onClick={() => void flow.downloadAgain()} className={smallButton}>Baixar novamente</button>}
        </div>
        {flow.phase === 'error' && <div role="alert" className={alertBox}>
          <span>{flow.error}</span>
          {lastBody && <button ref={retryRef} type="button" onClick={() => send(lastBody)} className={smallButton}>Tentar de novo</button>}
        </div>}
      </div>
    </section>
  )
}
