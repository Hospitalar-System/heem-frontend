import { Download, FileSpreadsheet, FileText, RotateCw, SlidersHorizontal, Table2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { isDemoMode } from '@/lib/demo-mode'
import { Select } from '@/components/ui/Select'
import { DatePicker } from '@/components/ui/DatePicker'
import { useCampaigns } from '@/features/maintenance/api/preventive-campaigns'
import { useTenantUsers } from '@/features/tenants-users/api/users'
import { otStatusOptions, otTipoOptions } from '../api/documents'
import { POSICAO_PARQUE_CONTEUDO, PRODUTIVIDADE_CONTEUDO } from '../api/reports'
import type { ExportRequest } from '../api/reports'
import { EXPORT_BACKEND_SUPPORT, buildExportBody, dataReferenciaError, visibleExportContents, defaultExportValues, defaultOrientation, exportContentLabels, exportFilename, exportFormatLabels, todayIso, usesPeriod, usesSector } from './export-builder-model'
import type { ExportBuilderValues } from './export-builder-model'
import { useExportDownload } from './use-export-download'

type Format = ExportBuilderValues['formato']

const levelOptions = [{ value: 'resumo', label: 'Resumo' }, { value: 'completo', label: 'Completo' }] as const
const orientationOptions = [{ value: 'retrato', label: 'Retrato' }, { value: 'paisagem', label: 'Paisagem' }] as const

const radioLabel = 'flex min-h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-primary hover:bg-bg has-[:checked]:border-primary has-[:checked]:bg-[var(--primary-soft)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary'
const fieldLabel = 'grid min-w-0 gap-1 text-xs text-text-secondary'
const alertBox = 'flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger bg-surface px-3 py-2 text-xs text-text-primary'
const smallButton = 'rounded-md border border-border bg-surface px-3 py-1.5 font-medium outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary'
const actionBase = 'inline-flex h-9 max-[479px]:h-11 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50'
const actionSecondary = `${actionBase} border border-border bg-surface text-text-primary hover:bg-bg`
const actionPrimary = `${actionBase} bg-primary text-bg-brand hover:bg-primary-hover`

export interface ExportFiltersSummary {
  /** Período, hospital e setor vêm dos filtros do topo da página (um único conjunto de filtros). */
  desde: string
  ate: string
  hospitalId: string
  setorId: string
  invalidRange: boolean
}

/**
 * Exportação compacta: "Conteúdo [tipo] [opções] [Excel] [CSV] [PDF]". Nível, orientação e filtros de OT ficam
 * num popover do botão de opções. Período, hospital e setor vêm dos filtros da página.
 */
export function ExportBuilder({ filters, onContentChange }: { filters: ExportFiltersSummary; /** Avisa a página do conteúdo escolhido (ex.: a posição do parque desliga Desde e Até). */ onContentChange?: (conteudo: ExportBuilderValues['conteudo']) => void }) {
  const { desde, ate, hospitalId, setorId, invalidRange } = filters
  const ids = useId()
  const [values, setValues] = useState<ExportBuilderValues>(() => defaultExportValues())
  const [campaignError, setCampaignError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const optionsButtonRef = useRef<HTMLButtonElement>(null)
  const orientationTouched = useRef(false)
  const { conteudo } = values
  const isCampaign = conteudo === 'campanha'
  // Stories 23.3/24.4: produtividade escolhe o técnico; a posição do parque usa uma data no lugar do período.
  const isProductivity = conteudo === PRODUTIVIDADE_CONTEUDO
  const isPosition = conteudo === POSICAO_PARQUE_CONTEUDO
  const users = useTenantUsers()
  const technicians = (users.data ?? []).filter((user) => user.role === 'tecnico' && user.ativo !== false)
  const [dateError, setDateError] = useState<string | null>(null)
  const showOtFilters = EXPORT_BACKEND_SUPPORT.filtrosOt && conteudo === 'ordens_trabalho'
  const hasLayout = EXPORT_BACKEND_SUPPORT.nivel || EXPORT_BACKEND_SUPPORT.orientacao
  const hasMenu = hasLayout || showOtFilters
  const campaigns = useCampaigns({ ...(hospitalId ? { hospitalId } : {}), tamanho: 100 }, isCampaign)
  const flow = useExportDownload()
  const [lastBody, setLastBody] = useState<ExportRequest | null>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const againRef = useRef<HTMLButtonElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const pdfRef = useRef<HTMLButtonElement>(null)

  const patch = (next: Partial<ExportBuilderValues>) => setValues((current) => ({ ...current, ...next }))

  function send(body: ExportRequest) {
    setLastBody(body)
    void flow.start(body, exportFilename(body))
  }

  useEffect(() => { onContentChange?.(conteudo) }, [conteudo, onContentChange])

  // Trocar o tipo reaplica a orientação padrão dele, se a pessoa ainda não escolheu uma.
  useEffect(() => {
    if (!orientationTouched.current) setValues((current) => ({ ...current, orientacao: defaultOrientation(conteudo) }))
  }, [conteudo])

  // Foco acompanha o estado: Cancelar enquanto gera, "Baixar novamente" ao concluir, "Tentar de novo" na falha.
  useEffect(() => {
    if (flow.phase === 'generating') cancelRef.current?.focus()
    else if (flow.phase === 'done') againRef.current?.focus()
    else if (flow.phase === 'error') retryRef.current?.focus()
  }, [flow.phase])

  // Ao abrir o popover, o foco vai para a primeira opção.
  useEffect(() => {
    if (menuOpen) document.getElementById(`${ids}-menu`)?.querySelector<HTMLElement>('input, button, [role="combobox"]')?.focus()
  }, [menuOpen, ids])

  // Popover: fecha com Esc (devolvendo o foco ao botão) e ao clicar fora.
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (event: MouseEvent) => { const target = event.target as HTMLElement; if (!menuRef.current?.contains(target) && !target.closest('[role="listbox"]')) setMenuOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { setMenuOpen(false); optionsButtonRef.current?.focus() } }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [menuOpen])

  function cancel() {
    flow.cancel()
    setLastBody(null)
    requestAnimationFrame(() => pdfRef.current?.focus())
  }

  function generate(formato: Format) {
    if (usesPeriod(conteudo) && invalidRange) return
    if (isCampaign && !values.campanhaId) { setCampaignError(true); return }
    if (isPosition) {
      const erro = dataReferenciaError(values.dataReferencia)
      setDateError(erro)
      if (erro) return
    }
    setCampaignError(false)
    setMenuOpen(false)
    send(buildExportBody({ ...values, formato, desde, ate, hospitalId, setorId: hospitalId && usesSector(conteudo) ? setorId : '' }))
  }

  const busy = flow.phase === 'requesting' || flow.phase === 'generating'
  const blocked = busy || (usesPeriod(conteudo) && invalidRange)
  const summary = lastBody ? `${exportContentLabels[lastBody.conteudo]} em ${exportFormatLabels[lastBody.formato]}` : ''

  return (
    <div className="col-span-full grid gap-2">
      <div className="relative flex flex-wrap items-end justify-end gap-2">
        <label className={`${fieldLabel} w-full min-[480px]:w-auto min-[480px]:min-w-44`}>
          <span>Conteúdo</span>
          <Select size="sm" aria-label="Conteúdo da exportação" value={conteudo} onChange={(next) => { setCampaignError(false); setDateError(null); patch({ conteudo: next as ExportBuilderValues['conteudo'] }) }} options={visibleExportContents().map((value) => ({ value, label: exportContentLabels[value] }))} />
        </label>
        {isProductivity && (
          <label className={`${fieldLabel} w-full min-[480px]:w-auto min-[480px]:min-w-44`}>
            <span>Técnico</span>
            <Select size="sm" aria-label="Técnico" value={values.tecnicoId} onChange={(next) => patch({ tecnicoId: next })} options={[{ value: '', label: 'Todos' }, ...technicians.map((user) => ({ value: user.id, label: user.nome }))]} />
          </label>
        )}
        {isPosition && (
          <label className={`${fieldLabel} w-full min-[480px]:w-auto min-[480px]:min-w-40`}>
            <span>Data de referência</span>
            <DatePicker size="sm" required aria-label="Data de referência" value={values.dataReferencia} max={todayIso()} aria-invalid={dateError ? true : undefined} aria-describedby={dateError ? `${ids}-data-error` : undefined} onChange={(next) => { setDateError(null); patch({ dataReferencia: next }) }} />
          </label>
        )}
        {isCampaign && (
          <label className={`${fieldLabel} w-full min-[480px]:w-auto min-[480px]:min-w-48`}>
            <span>Campanha</span>
            <Select size="sm" aria-label="Campanha" placeholder="Escolha a campanha" value={values.campanhaId} onChange={(next) => { setCampaignError(false); patch({ campanhaId: next }) }} aria-invalid={campaignError} aria-describedby={campaignError ? `${ids}-campanha-error` : undefined} options={(campaigns.data?.items ?? []).map((campaign) => ({ value: campaign.id, label: campaign.nome }))} />
          </label>
        )}
        <div role="group" aria-label="Exportar" className="grid w-full gap-1 text-xs text-text-secondary min-[480px]:w-auto">
          <span>Exportar</span>
          <div className="flex items-center gap-2 max-[479px]:[&>*]:h-11">
          {hasMenu && <div ref={menuRef}>
            <button ref={optionsButtonRef} type="button" aria-label="Opções de exportação" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls={`${ids}-menu`} onClick={() => setMenuOpen((open) => !open)} className={`${actionSecondary} w-9 px-0`}>
              <SlidersHorizontal aria-hidden="true" size={14} />
            </button>
            {menuOpen && <div id={`${ids}-menu`} role="dialog" aria-label="Opções de exportação" className="absolute right-0 top-full z-30 mt-1 grid w-[min(20rem,calc(100vw-2rem))] gap-3 rounded-lg border border-border bg-surface p-3 shadow-lg">
              {EXPORT_BACKEND_SUPPORT.nivel && <fieldset className="grid gap-1.5">
                <legend className="mb-1 text-xs font-medium text-text-secondary">Nível</legend>
                <div className="grid grid-cols-2 gap-2">
                  {levelOptions.map((option) => <label key={option.value} className={radioLabel}>
                    <input type="radio" name={`${ids}-nivel`} value={option.value} checked={values.nivel === option.value} onChange={() => patch({ nivel: option.value })} className="size-4 accent-primary" />
                    {option.label}
                  </label>)}
                </div>
              </fieldset>}
              {EXPORT_BACKEND_SUPPORT.orientacao && <fieldset className="grid gap-1.5">
                <legend className="mb-1 text-xs font-medium text-text-secondary">Orientação do PDF</legend>
                <div className="grid grid-cols-2 gap-2">
                  {orientationOptions.map((option) => <label key={option.value} className={radioLabel}>
                    <input type="radio" name={`${ids}-orientacao`} value={option.value} checked={values.orientacao === option.value} onChange={() => { orientationTouched.current = true; patch({ orientacao: option.value }) }} className="size-4 accent-primary" />
                    {option.label}
                  </label>)}
                </div>
              </fieldset>}
              {hasLayout && <p className="text-[11px] text-text-secondary">Nível e orientação valem só para PDF; o padrão de orientação depende do conteúdo.</p>}
              {showOtFilters && <>
                <label className={fieldLabel}>
                  <span>Tipo da OT</span>
                  <Select size="sm" aria-label="Tipo da OT" value={values.tipoOt} onChange={(next) => patch({ tipoOt: next as ExportBuilderValues['tipoOt'] })} options={[{ value: '', label: 'Todos' }, ...otTipoOptions]} />
                </label>
                <label className={fieldLabel}>
                  <span>Status da OT</span>
                  <Select size="sm" aria-label="Status da OT" value={values.statusOt} onChange={(next) => patch({ statusOt: next as ExportBuilderValues['statusOt'] })} options={[{ value: '', label: 'Todos' }, ...otStatusOptions]} />
                </label>
              </>}
            </div>}
          </div>}
          <button type="button" aria-label="Exportar Excel" disabled={blocked} onClick={() => generate('xlsx')} className={actionSecondary}><FileSpreadsheet aria-hidden="true" size={14} /> Excel</button>
          <button type="button" aria-label="Exportar CSV" disabled={blocked} onClick={() => generate('csv')} className={actionSecondary}><Table2 aria-hidden="true" size={14} /> CSV</button>
          <button ref={pdfRef} type="button" aria-label="Exportar PDF" disabled={blocked} onClick={() => generate('pdf')} className={actionPrimary}><FileText aria-hidden="true" size={14} /> {busy ? 'Gerando…' : 'PDF'}</button>
          </div>
        </div>
      </div>
      {campaignError && <p id={`${ids}-campanha-error`} role="alert" className="text-right text-xs text-danger">Escolha a campanha.</p>}
      {dateError && <p id={`${ids}-data-error`} role="alert" className="text-left text-xs text-danger min-[480px]:text-right">{dateError}</p>}
      {isProductivity && <p className="text-left text-[11px] text-text-muted min-[480px]:text-right">Produtividade usa o período e o hospital dos filtros; o setor não se aplica.</p>}
      {isPosition && <p className="text-left text-[11px] text-text-muted min-[480px]:text-right">Posição do parque usa a data de referência no lugar do período.</p>}
      {isDemoMode ? <p className="text-left text-[11px] text-text-muted min-[480px]:text-right">Modo demonstração: os arquivos são amostras ilustrativas, não o modelo final dos relatórios.</p> : null}

      <div role="status" aria-live="polite" className={busy || flow.phase === 'done' ? 'flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-secondary' : 'sr-only'}>
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
  )
}
