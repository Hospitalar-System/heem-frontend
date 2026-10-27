import { Link } from 'react-router-dom'
import { AlertTriangle, Clock3, FileClock } from 'lucide-react'
import type { DashboardSummary, TicketSeverity } from '../types'

const severityLabels: Record<TicketSeverity, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Média',
  low: 'Baixa',
}

const severityTones: Record<TicketSeverity, string> = {
  critical: 'text-danger',
  high: 'text-warning',
  medium: 'text-text-secondary',
  low: 'text-primary',
}

export function DashboardAttention({ data }: { data: DashboardSummary }) {
  const alerts = [
    { label: 'SLAs vencidos', count: data.overdueSla, Icon: AlertTriangle, to: undefined },
    { label: 'Preventivas atrasadas', count: data.overduePreventiveWorkOrders, Icon: Clock3, to: undefined },
    { label: `Documentos vencendo em ${data.expiringDocumentsWithinDays} dias`, count: data.expiringDocuments, Icon: FileClock, to: '/assets?documentos=vencendo' },
  ]

  return (
    <section aria-label="Chamados por severidade e itens que exigem atenção" className="grid gap-3 xl:grid-cols-[1.1fr_2fr]">
      <article className="rounded-lg border border-border bg-surface p-4">
        <h2 className="text-xs font-semibold text-text-primary">Chamados por severidade</h2>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
          {data.emergenciesBySeverity.map(({ severity, count }) => (
            <li key={severity} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-text-secondary">{severityLabels[severity]}</span>
              <span className={`font-semibold tabular-nums ${severityTones[severity]}`}>{count.toLocaleString('pt-BR')}</span>
            </li>
          ))}
        </ul>
      </article>

      <div className="grid gap-3 sm:grid-cols-3">
        {alerts.map(({ label, count, Icon, to }, index) => {
          const cardClass = 'flex min-h-[82px] items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3'
          const content = (
            <>
            <span className={`grid size-8 shrink-0 place-items-center rounded-md ${index === 2 ? 'bg-warning/10 text-warning' : 'bg-danger/10 text-danger'}`}>
              <Icon aria-hidden="true" size={15} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[10px] text-text-secondary">{label}</p>
              <p className="mt-0.5 text-lg font-semibold leading-5 tabular-nums text-text-primary">{count.toLocaleString('pt-BR')}</p>
            </div>
            </>
          )
          return to
            ? <Link key={label} to={to} className={`${cardClass} outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary`}>{content}</Link>
            : <article key={label} className={cardClass}>{content}</article>
        })}
      </div>
    </section>
  )
}
