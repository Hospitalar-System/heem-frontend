import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { TicketSlaBadge } from '@/features/maintenance/components/TicketSlaBadge'
import type { DashboardTicket, TicketSeverity } from '../types'

const severityStyle: Record<TicketSeverity, { label: string; className: string }> = {
  critical: { label: 'Crítica', className: 'border-danger/25 bg-danger/10 text-danger' },
  high: { label: 'Alta', className: 'border-warning/25 bg-warning/10 text-warning' },
  medium: { label: 'Média', className: 'border-border bg-bg text-text-secondary' },
  low: { label: 'Baixa', className: 'border-primary/25 bg-primary/10 text-primary' },
}

export function RecentTicketsTable({ tickets, query }: { tickets: DashboardTicket[]; query: string }) {
  const search = query.trim().toLocaleLowerCase('pt-BR')
  const visibleTickets = tickets.filter((ticket) =>
    [ticket.code, ticket.statusLabel].some((value) =>
      value.toLocaleLowerCase('pt-BR').includes(search),
    ),
  )

  return (
    <section aria-labelledby="recent-tickets-title" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex h-12 items-center justify-between border-b border-border px-4 2xl:h-[58px] 2xl:px-5">
        <h2 id="recent-tickets-title" className="text-sm font-semibold text-text-primary">Chamados recentes</h2>
        <Link to="/tickets" className="inline-flex items-center gap-1 rounded text-xs font-medium text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-primary">
          Ver todos <ArrowRight aria-hidden="true" size={13} />
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-xs">
          <thead className="table-head text-[10px]">
            <tr className="h-9 2xl:h-12">
              <th scope="col" className="px-5 font-medium">Chamado</th>
              <th scope="col" className="px-4 font-medium">Status</th>
              <th scope="col" className="px-4 font-medium">Severidade</th>
              <th scope="col" className="px-4 font-medium">SLA</th>
              <th scope="col" className="px-4 font-medium">Abertura</th>
            </tr>
          </thead>
          <tbody>
            {visibleTickets.map((ticket) => {
              const severity = ticket.severity ? severityStyle[ticket.severity] : null
              return (
                <tr key={ticket.id} className="row-divider h-10 transition hover:bg-surface-hi 2xl:h-12">
                  <td className="px-5">
                    <Link to={`/tickets/${ticket.id}`} className="rounded text-text-secondary outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-primary">{ticket.code}</Link>
                  </td>
                  <td className="px-4 text-text-primary">{ticket.statusLabel}</td>
                  <td className="px-4">
                    {severity ? <span className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-medium ${severity.className}`}>{severity.label}</span> : <span className="text-text-muted">—</span>}
                  </td>
                  <td className="px-4">{ticket.slaStatus ? <TicketSlaBadge status={ticket.slaStatus} /> : <span className="text-text-muted">—</span>}</td>
                  <td className="whitespace-nowrap px-4 text-text-secondary">{ticket.openedLabel}</td>
                </tr>
              )
            })}
            {visibleTickets.length === 0 && (
              <tr>
                <td colSpan={5} className="h-20 px-5 text-center text-text-muted">Nenhum chamado corresponde à busca.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
