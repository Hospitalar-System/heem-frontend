import { Activity, ClipboardList, PackageCheck, Siren, TrendingUp } from 'lucide-react'
import type { DashboardSummary } from '../types'

export function DashboardKpis({ data }: { data: DashboardSummary }) {
  const iconTone = {
    primary: 'bg-primary/10 text-primary',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
  }
  const cards = [
    {
      label: 'Equipamentos ativos',
      value: data.activeEquipment.toLocaleString('pt-BR'),
      note: `▲ ${data.equipmentChangePercent.toLocaleString('pt-BR')}% vs. mês anterior`,
      Icon: PackageCheck,
      tone: 'primary',
      noteTone: 'text-primary',
    },
    {
      label: 'OT em aberto',
      value: data.openWorkOrders.toLocaleString('pt-BR'),
      note: `▲ ${data.newWorkOrdersToday} novas hoje`,
      Icon: ClipboardList,
      tone: 'warning',
      noteTone: 'text-warning',
    },
    {
      label: 'Emergências hoje',
      value: data.emergenciesToday.toLocaleString('pt-BR'),
      note: `${data.criticalEmergenciesOpen} críticas em aberto`,
      Icon: Siren,
      tone: 'danger',
      noteTone: 'text-danger',
    },
    {
      label: 'Disponibilidade',
      value: `${data.availabilityPercent.toLocaleString('pt-BR')}%`,
      note: `▲ ${data.availabilityChangePp.toLocaleString('pt-BR')} p.p. na semana`,
      Icon: Activity,
      tone: 'primary',
      noteTone: 'text-primary',
    },
  ] as const

  return (
    <section aria-label="Indicadores operacionais" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
      {cards.map(({ label, value, note, Icon, tone, noteTone }) => (
        <article key={label} className="min-h-[118px] rounded-lg border border-border bg-surface p-4 xl:min-h-[147px] xl:p-5">
          <div className="flex items-start justify-between gap-2">
            <h2 className="pt-1 text-xs font-medium text-text-secondary">{label}</h2>
            <span className={`grid size-7 shrink-0 place-items-center rounded-md ${iconTone[tone]}`}>
              <Icon aria-hidden="true" size={14} strokeWidth={2} />
            </span>
          </div>
          <p className={`mt-1 text-[26px] font-semibold leading-8 tracking-tight ${tone === 'danger' ? 'text-danger' : 'text-text-primary'}`}>{value}</p>
          <p className={`mt-1 flex items-center gap-1 text-[10px] font-medium ${noteTone}`}>
            {tone === 'primary' && label === 'Disponibilidade' && <TrendingUp aria-hidden="true" size={10} />}
            {note}
          </p>
        </article>
      ))}
    </section>
  )
}
