import { zodResolver } from '@hookform/resolvers/zod'
import { isDemoMode } from '@/lib/demo-mode'
import { Download, FileDown, RotateCw } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { PageAction } from '@/components/ui/PageAction'
import { Select } from '@/components/ui/Select'
import { useCampaigns } from '@/features/maintenance/api/preventive-campaigns'
import { otStatusOptions, otTipoOptions } from '../api/documents'
import { EXPORT_FORMATS } from '../api/reports'
import type { ExportRequest } from '../api/reports'
import { EXPORT_BACKEND_SUPPORT, buildExportBody, visibleExportContents, defaultExportValues, defaultOrientation, exportBuilderSchema, exportContentLabels, exportFilename, exportFormatLabels } from './export-builder-model'
import type { ExportBuilderValues } from './export-builder-model'
import { useExportDownload } from './use-export-download'

const levelOptions = [{ value: 'resumo', label: 'Resumo' }, { value: 'completo', label: 'Completo' }] as const
const orientationOptions = [{ value: 'retrato', label: 'Retrato' }, { value: 'paisagem', label: 'Paisagem' }] as const

const radioLabel = 'flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-primary hover:bg-bg has-[:checked]:border-primary has-[:checked]:bg-[var(--primary-soft)] has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary'
const fieldLabel = 'grid min-w-0 gap-1 text-xs text-text-secondary'
const alertBox = 'flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger bg-surface px-3 py-2 text-xs text-text-primary'
const smallButton = 'rounded-md border border-border bg-surface px-3 py-1.5 font-medium outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary'

export interface ExportFiltersSummary {
  /** Período, hospital e setor vêm dos filtros do topo da página (um único conjunto de filtros). */
  desde: string
  ate: string
  hospitalId: string
  setorId: string
  hospitalName: string
  sectorName: string
  invalidRange: boolean
  onEditFilters: () => void
}

const formatDay = (value: string) => (value ? value.split('-').reverse().join('/') : '—')

/** Escolha do relatório a exportar: tipo, formato e, para campanha, a campanha. Período/hospital/setor vêm dos filtros da página. */
export function ExportBuilder({ filters }: { filters: ExportFiltersSummary }) {
  const { desde, ate, hospitalId, setorId, hospitalName, sectorName, invalidRange, onEditFilters } = filters
  const ids = useId()
  const [defaults] = useState(() => defaultExportValues())
  const { control, register, handleSubmit, setValue, formState: { errors } } = useForm<ExportBuilderValues>({ resolver: zodResolver(exportBuilderSchema), defaultValues: defaults })
  const [conteudo, formato] = useWatch({ control, name: ['conteudo', 'formato'] })
  const isPdf = formato === 'pdf'
  const orientationTouched = useRef(false)
  const isCampaign = conteudo === 'campanha'
  const showOtFilters = EXPORT_BACKEND_SUPPORT.filtrosOt && conteudo === 'ordens_trabalho'
  const campaigns = useCampaigns({ ...(hospitalId ? { hospitalId } : {}), tamanho: 100 }, isCampaign)
  const flow = useExportDownload()
  const [lastBody, setLastBody] = useState<ExportRequest | null>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const againRef = useRef<HTMLButtonElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)

  function send(body: ExportRequest) {
    setLastBody(body)
    void flow.start(body, exportFilename(body))
  }

  // Trocar o tipo reaplica a orientação padrão dele, se a pessoa ainda não escolheu uma.
  useEffect(() => {
    if (!orientationTouched.current) setValue('orientacao', defaultOrientation(conteudo))
  }, [conteudo, setValue])

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

  const submit = handleSubmit((values) => {
    if (values.conteudo !== 'campanha' && invalidRange) return
    send(buildExportBody({ ...values, desde, ate, hospitalId, setorId: hospitalId ? setorId : '' }))
  })
  const busy = flow.phase === 'requesting' || flow.phase === 'generating'
  const summary = lastBody ? `${exportContentLabels[lastBody.conteudo]} em ${exportFormatLabels[lastBody.formato]}` : ''

  return (
    <section aria-labelledby={`${ids}-title`} className="rounded-lg border border-border bg-surface p-4 xl:p-5">
      <div className="mb-4">
        <h2 id={`${ids}-title`} className="text-sm font-semibold text-text-primary">Gerar relatório</h2>
        <p className="mt-1 text-xs text-text-muted">Escolha o tipo e o formato do arquivo. Período, hospital e setor seguem os filtros acima.</p>
      </div>
      <form noValidate onSubmit={(event) => { event.preventDefault(); void submit() }} className="grid gap-4">
        <fieldset className="grid gap-1.5">
          <legend className="mb-1 text-xs font-medium text-text-secondary">Tipo de relatório</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {visibleExportContents().map((value) => <label key={value} className={radioLabel}>
              <input type="radio" value={value} className="size-4 accent-primary" {...register('conteudo')} />
              {exportContentLabels[value]}
            </label>)}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-bg px-3 py-2 text-xs text-text-secondary">
          <p data-testid="export-filters-summary">
            {isCampaign ? 'O período não se aplica à campanha' : `Período ${formatDay(desde)} a ${formatDay(ate)}`}
            {` · Hospital: ${hospitalName}`}
            {!isCampaign && ` · Setor: ${sectorName}`}
          </p>
          <button type="button" onClick={onEditFilters} className="font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">Alterar filtros</button>
        </div>
        {!isCampaign && invalidRange && <p className="text-xs text-danger">Corrija o período nos filtros acima para gerar o relatório.</p>}

        {isCampaign && (
          <label className={fieldLabel}>
            <span>Campanha</span>
            <Controller control={control} name="campanhaId" render={({ field }) => <Select size="sm" aria-label="Campanha" placeholder="Escolha a campanha" value={field.value} onChange={field.onChange} aria-invalid={Boolean(errors.campanhaId)} aria-describedby={errors.campanhaId ? `${ids}-campanha-error` : undefined} options={(campaigns.data?.items ?? []).map((campaign) => ({ value: campaign.id, label: campaign.nome }))} />} />
            {errors.campanhaId && <span id={`${ids}-campanha-error`} role="alert" className="text-xs text-danger">{errors.campanhaId.message}</span>}
            <span className="text-[11px] text-text-muted">O relatório da campanha cobre todas as ordens de trabalho dela.</span>
          </label>
        )}

        {showOtFilters && <div className="grid gap-4 md:grid-cols-2">
          <label className={fieldLabel}>
            <span>Tipo da OT</span>
            <Controller control={control} name="tipoOt" render={({ field }) => <Select size="sm" aria-label="Tipo da OT" value={field.value} onChange={field.onChange} options={[{ value: '', label: 'Todos' }, ...otTipoOptions]} />} />
          </label>
          <label className={fieldLabel}>
            <span>Status da OT</span>
            <Controller control={control} name="statusOt" render={({ field }) => <Select size="sm" aria-label="Status da OT" value={field.value} onChange={field.onChange} options={[{ value: '', label: 'Todos' }, ...otStatusOptions]} />} />
          </label>
        </div>}

        {(EXPORT_BACKEND_SUPPORT.nivel || EXPORT_BACKEND_SUPPORT.orientacao) && <div className="grid gap-4 md:grid-cols-2">
          {EXPORT_BACKEND_SUPPORT.nivel && <fieldset className="grid gap-1.5">
            <legend className="mb-1 text-xs font-medium text-text-secondary">Nível</legend>
            <div className="grid grid-cols-2 gap-2">
              {levelOptions.map((option) => <label key={option.value} className={radioLabel}>
                <input type="radio" value={option.value} className="size-4 accent-primary" {...register('nivel')} />
                {option.label}
              </label>)}
            </div>
          </fieldset>}
          {EXPORT_BACKEND_SUPPORT.orientacao && <fieldset className="grid gap-1.5" disabled={!isPdf}>
            <legend className="mb-1 text-xs font-medium text-text-secondary">Orientação do PDF</legend>
            <div className="grid grid-cols-2 gap-2">
              {orientationOptions.map((option) => <label key={option.value} className={radioLabel}>
                <input type="radio" value={option.value} className="size-4 accent-primary" {...register('orientacao', { onChange: () => { orientationTouched.current = true } })} />
                {option.label}
              </label>)}
            </div>
            <p className="text-[11px] text-text-muted">{isPdf ? 'O padrão depende do tipo; você pode trocar.' : 'Só vale para PDF.'}</p>
          </fieldset>}
        </div>}

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
          {flow.phase === 'done' && <span className="flex items-center gap-2"><Download aria-hidden="true" size={14} />Relatório baixado ({flow.filename}){flow.layout ? ` · ${flow.layout}` : ''}.</span>}
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
