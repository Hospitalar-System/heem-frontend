import type { ReportIndicators } from '../api/reports'
import { formatCount, formatHours, formatPercent } from './report-format'

const glossary = [
  { term: 'MTTA', text: 'Tempo médio de atendimento: da abertura do chamado até a primeira resposta.' },
  { term: 'MTTR', text: 'Tempo médio de resolução: da abertura do chamado até o chamado ser resolvido.' },
  { term: 'MTBF', text: 'Tempo médio entre falhas: intervalo médio entre aberturas de chamados do mesmo equipamento.' },
  { term: 'Triagem', text: 'Da abertura até o chamado entrar em andamento.' },
  { term: 'Espera de peça', text: 'Tempo médio em "aguardando peça", entre os chamados que passaram por esse estado.' },
]

function MetricCard({ label, hint, value }: { label: string; hint: string; value: string }) {
  return <article aria-label={label} title={hint} className="min-h-[110px] rounded-lg border border-border bg-surface p-5"><h2 className="text-xs font-medium text-text-secondary">{label}</h2><p className="mt-4 text-3xl font-semibold text-text-primary">{value}</p></article>
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div role="group" aria-label={label}><p className="text-xs text-text-secondary">{label}</p><p className="mt-1 text-2xl font-semibold text-text-primary">{value}</p></div>
}

export function ReportIndicatorCards({ metrics }: { metrics: ReportIndicators }) {
  const preventive = metrics.preventiva
  return (
    <>
      <section aria-label="Indicadores do período" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-4">
        <MetricCard label="MTTA — tempo médio de atendimento" hint={glossary[0].text} value={formatHours(metrics.mttaHoras)} />
        <MetricCard label="MTTR — tempo médio de resolução" hint={glossary[1].text} value={formatHours(metrics.mttrHoras)} />
        <MetricCard label="MTBF médio" hint={glossary[2].text} value={formatHours(metrics.mtbfHoras)} />
        <MetricCard label="Disponibilidade média" hint="Disponibilidade dos equipamentos no período, considerando as severidades indicadas na legenda." value={formatPercent(metrics.disponibilidadePercentual)} />
        <MetricCard label="Tempo de triagem" hint={glossary[3].text} value={formatHours(metrics.triagemHoras)} />
        <MetricCard label="Espera de peça" hint={glossary[4].text} value={formatHours(metrics.esperaPecaHoras)} />
        <MetricCard label="SLA de atendimento cumprido" hint="Percentual de chamados com o prazo de atendimento cumprido, entre os já decididos." value={formatPercent(metrics.slaAtendimentoPct)} />
        <MetricCard label="SLA de resolução cumprido" hint="Percentual de chamados com o prazo de resolução cumprido, entre os já decididos." value={formatPercent(metrics.slaResolucaoPct)} />
      </section>

      <section aria-label="Legenda dos indicadores" className="rounded-lg border border-border bg-surface px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">Como ler os indicadores</h2>
        <dl className="mt-2 grid gap-x-8 gap-y-1 text-xs text-text-secondary md:grid-cols-2">
          {glossary.map(({ term, text }) => <div key={term}><dt className="inline font-semibold text-text-primary">{term}: </dt><dd className="inline">{text}</dd></div>)}
        </dl>
        {metrics.severidadesConsideradas?.length > 0 && <p className="mt-2 text-[11px] text-text-muted">Severidades consideradas na disponibilidade: {metrics.severidadesConsideradas.join(', ')}.</p>}
      </section>

      <section aria-label="Ordens de trabalho no período" className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-surface px-5 py-4">
        <Stat label="OT preventivas" value={formatCount(metrics.qtdOtsPreventivas)} />
        <Stat label="OT corretivas" value={formatCount(metrics.qtdOtsCorretivas)} />
        {preventive && <>
          <Stat label="Preventivas atrasadas" value={formatCount(preventive.atrasadas)} />
          <Stat label="Concluídas no prazo" value={formatCount(preventive.concluidasNoPrazo)} />
          <Stat label="Concluídas fora do prazo" value={formatCount(preventive.concluidasForaDoPrazo)} />
          <Stat label="Preventivas no prazo" value={formatPercent(preventive.percentualNoPrazo)} />
          <Stat label="Preventivas canceladas" value={formatCount(preventive.canceladas)} />
        </>}
      </section>
    </>
  )
}
