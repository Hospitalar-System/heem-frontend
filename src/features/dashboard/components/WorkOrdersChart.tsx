import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts'
import { chartTooltipProps } from '@/components/charts/ChartTooltip'
import type { DashboardSummary, WorkOrderStatus } from '../types'

const statusColors: Record<WorkOrderStatus, string> = {
  scheduled: 'var(--text-secondary)',
  inProgress: 'var(--warning)',
  completed: 'var(--primary)',
  canceled: 'var(--text-muted)',
}

export function WorkOrdersChart({ data }: { data: DashboardSummary['workOrdersByStatus'] }) {
  return (
    <section aria-labelledby="work-orders-chart-title" className="min-w-0 rounded-lg border border-border bg-surface p-4 xl:h-[283px] xl:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="work-orders-chart-title" className="text-sm font-semibold text-text-primary">OT por status</h2>
        <span className="text-[10px] text-text-muted">Total por status</span>
      </div>
      <div role="img" aria-label={`Ordens de trabalho por status: ${data.map(({ label, count }) => `${label}: ${count}`).join(', ')}`} className="h-[190px] xl:h-[224px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 2, left: 2, bottom: 0 }}>
            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} interval={0} />
            <Tooltip {...chartTooltipProps} formatter={(value) => [value, 'Ordens']} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={108}>
              <LabelList dataKey="count" position="top" fill="var(--text-primary)" fontSize={10} fontWeight={600} />
              {data.map((entry) => <Cell key={entry.status} fill={statusColors[entry.status]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
