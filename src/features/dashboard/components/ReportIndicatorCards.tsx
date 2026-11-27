import { pauseReasonLabel } from '@/features/maintenance/utils/pausa'
import type { ReportIndicators } from '../api/reports'
import { formatCount, reportGlossary, formatHours, formatPercent } from './report-format'

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
        <MetricCard label="MTTA — tempo médio de atendimento" hint={reportGlossary[0].text} value={formatHours(metrics.mttaHoras)} />
        <MetricCard label="MTTR — tempo médio de resolução" hint={reportGlossary[1].text} value={formatHours(metrics.mttrHoras)} />
        <MetricCard label="MTBF médio" hint={reportGlossary[2].text} value={formatHours(metrics.mtbfHoras)} />
        <MetricCard label="Disponibilidade média" hint="Disponibilidade dos equipamentos no período, considerando as severidades indicadas na legenda." value={formatPercent(metrics.disponibilidadePercentual)} />
        <MetricCard label="Tempo de triagem" hint={reportGlossary[3].text} value={formatHours(metrics.triagemHoras)} />
        <MetricCard label="Espera de peça" hint={reportGlossary[4].text} value={formatHours(metrics.esperaPecaHoras)} />
        <MetricCard label="SLA de atendimento cumprido" hint="Percentual de chamados com o prazo de atendimento cumprido, entre os já decididos." value={formatPercent(metrics.slaAtendimentoPct)} />
        <MetricCard label="SLA de resolução cumprido" hint="Percentual de chamados com o prazo de resolução cumprido, entre os já decididos." value={formatPercent(metrics.slaResolucaoPct)} />
      </section>

      <section aria-label="Legenda dos indicadores" className="rounded-lg border border-border bg-surface px-5 py-4">
        <h2 className="text-sm font-semibold text-text-primary">Como ler os indicadores</h2>
        <dl className="mt-2 grid gap-x-8 gap-y-1 text-xs text-text-secondary md:grid-cols-2">
          {reportGlossary.map(({ term, text }) => <div key={term}><dt className="inline font-semibold text-text-primary">{term}: </dt><dd className="inline">{text}</dd></div>)}
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

      {(typeof metrics.chamadosResolvidosComOt === 'number' || metrics.assinaturasPendentes) && <section aria-label="Chamados resolvidos e assinaturas" className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-surface px-5 py-4">
        {typeof metrics.chamadosResolvidosComOt === 'number' && <>
          <Stat label="Resolvidos com OT" value={formatCount(metrics.chamadosResolvidosComOt)} />
          <Stat label="Resolvidos sem OT" value={formatCount(metrics.chamadosResolvidosSemOt ?? 0)} />
          <Stat label="Resolvidos sem OT (%)" value={formatPercent(metrics.resolvidosSemOtPct)} />
        </>}
        {metrics.assinaturasPendentes && <>
          <Stat label="Assinaturas pendentes: OTs" value={formatCount(metrics.assinaturasPendentes.ots)} />
          <Stat label="Assinaturas pendentes: chamados" value={formatCount(metrics.assinaturasPendentes.chamados)} />
          <Stat label="Assinaturas pendentes: campanhas" value={formatCount(metrics.assinaturasPendentes.campanhas)} />
        </>}
      </section>}

      {metrics.chamadosDePreventiva && <section aria-label="Chamados de preventiva Não apto" className="flex flex-wrap items-center gap-6 rounded-lg border border-border bg-surface px-5 py-4">
        <Stat label="Chamados de preventiva: abertos à mão" value={formatCount(metrics.chamadosDePreventiva.manuais)} />
        <Stat label="Chamados de preventiva: automáticos" value={formatCount(metrics.chamadosDePreventiva.automaticos)} />
      </section>}

      {Array.isArray(metrics.esperaPorMotivo) && <section aria-labelledby="pause-wait-title" className="overflow-hidden rounded-lg border border-border bg-surface">
        <div className="border-b border-border px-5 py-4"><h2 id="pause-wait-title" className="text-sm font-semibold text-text-primary">Espera por motivo de pausa</h2><p className="mt-1 text-xs text-text-muted">Chamados pausados no período e o tempo parado por motivo. Aguardando orçamento e fornecedor externo não contam no prazo de resolução.</p></div>
        {metrics.esperaPorMotivo.length === 0 ? <p className="px-5 py-4 text-xs text-text-muted">Nenhum chamado pausado no período.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[480px] text-xs tabular-nums">
          <caption className="sr-only">Espera por motivo de pausa</caption>
          <thead className="text-text-secondary"><tr className="table-head">{['Motivo', 'Chamados', 'Horas médias', 'Horas totais'].map((label, index) => <th key={label} scope="col" className={`px-4 py-2 font-medium ${index ? 'text-right' : 'text-left'}`}>{label}</th>)}</tr></thead>
          <tbody>{metrics.esperaPorMotivo.map((row) => <tr key={row.motivo} className="row-divider"><th scope="row" className="px-4 py-2 text-left font-medium text-text-primary">{pauseReasonLabel(row.motivo)}</th><td className="px-4 py-2 text-right text-text-secondary">{formatCount(row.chamados)}</td><td className="px-4 py-2 text-right text-text-secondary">{formatHours(row.horasMedias)}</td><td className="px-4 py-2 text-right text-text-secondary">{formatHours(row.horasTotais)}</td></tr>)}</tbody>
        </table></div>}
      </section>}
    </>
  )
}
