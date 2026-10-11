import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DashboardSummary } from '../types'

export function MtbfChart({ data }: { data: DashboardSummary['mtbfBySector'] }) {
  return (
    <section aria-labelledby="mtbf-chart-title" className="min-w-0 rounded-lg border border-border bg-surface p-4 xl:h-[283px] xl:p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 id="mtbf-chart-title" className="text-sm font-semibold text-text-primary">MTBF por setor</h2>
        <span className="text-[10px] text-text-muted">horas · tendência</span>
      </div>
      <div role="img" aria-label={`Tendência de MTBF em horas por setor: ${data.map(({ sector, hours }) => `${sector}: ${hours}`).join(', ')}`} className="h-[190px] xl:h-[224px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="mtbf-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.16} />
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="sector" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
            <YAxis hide domain={['dataMin - 80', 'dataMax + 80']} />
            <Tooltip
              contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12 }}
              formatter={(value) => [`${value} h`, 'MTBF']}
            />
            <Area type="linear" dataKey="hours" stroke="var(--primary)" strokeWidth={2} fill="url(#mtbf-fill)" dot={{ r: 3, fill: 'var(--primary)', stroke: 'var(--surface)', strokeWidth: 1 }} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}
