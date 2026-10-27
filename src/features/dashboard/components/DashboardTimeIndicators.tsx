import { AlertCircle, Info } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { ReportIndicators } from '../api/reports'
import { formatHours, reportGlossary } from './report-format'

const cards = [
  { key: 'mttaHoras', label: 'MTTA', title: 'Tempo médio de atendimento', hint: reportGlossary[0].text },
  { key: 'mttrHoras', label: 'MTTR', title: 'Tempo médio de resolução', hint: reportGlossary[1].text },
  { key: 'mtbfHoras', label: 'MTBF', title: 'Tempo médio entre falhas', hint: reportGlossary[2].text },
] as const

type IndicatorsQuery = Pick<UseQueryResult<ReportIndicators>, 'data' | 'isPending' | 'isError' | 'refetch'>

/** MTTA, MTTR e MTBF dos últimos dias (GET /relatorios/indicadores); falha daqui não derruba o restante do painel. */
export function DashboardTimeIndicators({ query, windowDays }: { query: IndicatorsQuery; windowDays: number }) {
  if (query.isPending) {
    return (
      <section aria-label="Tempos de manutenção" aria-busy="true" className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:gap-5">
        {cards.map(({ key }) => <div key={key} className="h-[96px] animate-pulse rounded-lg border border-border bg-surface" />)}
        <span className="sr-only">Carregando MTTA, MTTR e MTBF.</span>
      </section>
    )
  }
  if (query.isError || !query.data) {
    return (
      <section aria-label="Tempos de manutenção" role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
        <p className="flex items-center gap-2 text-xs text-text-secondary"><AlertCircle aria-hidden="true" className="text-danger" size={16} /> Não foi possível carregar MTTA, MTTR e MTBF.</p>
        <button type="button" onClick={() => void query.refetch()} className="rounded-md border border-border bg-bg px-3 py-1.5 text-xs font-medium text-text-primary outline-none hover:bg-surface-hi focus-visible:ring-2 focus-visible:ring-primary">Tentar novamente</button>
      </section>
    )
  }
  const data = query.data
  return (
    <section aria-label="Tempos de manutenção" className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:gap-5">
      {cards.map(({ key, label, title, hint }) => {
        const value = data[key] ?? null
        const hintId = `dashboard-${key}-hint`
        return (
          <article key={key} aria-label={`${label} — ${title}`} className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-xs font-medium text-text-secondary">{label} — {title}</h2>
              <span className="group relative">
                <button type="button" aria-label={`O que é ${label}`} aria-describedby={hintId} className="grid size-6 place-items-center rounded-md text-text-muted outline-none hover:text-text-primary focus-visible:ring-2 focus-visible:ring-primary">
                  <Info aria-hidden="true" size={14} />
                </button>
                <span id={hintId} role="tooltip" className="pointer-events-none absolute right-0 top-7 z-20 w-56 rounded-md border border-border bg-surface p-2 text-[11px] leading-4 text-text-primary opacity-0 shadow-lg transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">{hint}</span>
              </span>
            </div>
            <p className="mt-1 text-[26px] font-semibold leading-8 tracking-tight text-text-primary">{formatHours(value)}</p>
            <p className="mt-1 text-[10px] font-medium text-text-muted">{value === null ? 'Sem dados no período' : `Últimos ${windowDays} dias`}</p>
          </article>
        )
      })}
    </section>
  )
}
