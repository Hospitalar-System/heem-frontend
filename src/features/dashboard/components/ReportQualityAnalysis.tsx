import { useCallback } from 'react'
import type { QualityAnalysis, QualityTechnician } from '../api/reports'
import { formatCount, formatPercent, useSortedRows } from './report-format'
import { SectionEmpty, SortableHeader } from './report-ui'

type SortKey = 'nome' | 'aptos' | 'comChamado' | 'percentual'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' })
const formatDate = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? '—' : dateFormat.format(d) }

/**
 * Story 23.4: Aptos dados pelo técnico (conclusão de OT ou mudança de estado) seguidos de chamado no mesmo equipamento
 * dentro da janela do cliente. Dado de desempenho individual: a página inteira já é só do admin do cliente.
 */
export function ReportQualityAnalysis({ data: bruto }: { data: QualityAnalysis }) {
  // Tolerante a resposta parcial (contrato aditivo): listas ausentes viram vazias.
  const data = { ...bruto, tecnicos: Array.isArray(bruto.tecnicos) ? bruto.tecnicos : [], casos: Array.isArray(bruto.casos) ? bruto.casos : [] }
  const getValue = useCallback((row: QualityTechnician, key: SortKey) => row[key], [])
  const { sorted, sort, toggle } = useSortedRows(data.tecnicos, getValue, { key: 'percentual', direction: 'desc' })
  return (
    <section aria-labelledby="quality-analysis-title" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="quality-analysis-title" className="text-sm font-semibold text-text-primary">Qualidade da análise</h2>
          <p className="mt-1 text-xs text-text-muted">Aptos seguidos de chamado no mesmo equipamento em até {data.janelaDias} dias (janela do cliente). Chamados de instalação não contam.</p>
        </div>
        <dl className="flex items-baseline gap-4 text-right">
          <div><dt className="text-[11px] text-text-muted">Aptos</dt><dd className="text-sm font-semibold tabular-nums text-text-primary">{formatCount(data.aptos)}</dd></div>
          <div><dt className="text-[11px] text-text-muted">Com chamado</dt><dd className="text-sm font-semibold tabular-nums text-text-primary">{formatCount(data.comChamado)}</dd></div>
          <div><dt className="text-[11px] text-text-muted">Percentual</dt><dd className="text-sm font-semibold tabular-nums text-text-primary">{formatPercent(data.percentual)}</dd></div>
        </dl>
      </div>
      {data.tecnicos.length === 0 ? <div className="p-5"><SectionEmpty>Nenhum Apto dado no período para os filtros selecionados.</SectionEmpty></div> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs tabular-nums">
            <caption className="sr-only">Qualidade da análise por técnico</caption>
            <thead className="text-text-secondary">
              <tr className="table-head">
                <SortableHeader label="Técnico" sortKey="nome" sort={sort} onToggle={toggle} align="left" />
                <SortableHeader label="Aptos" sortKey="aptos" sort={sort} onToggle={toggle} />
                <SortableHeader label="Com chamado" shortLabel="C/ cham." sortKey="comChamado" sort={sort} onToggle={toggle} />
                <SortableHeader label="Percentual" shortLabel="%" sortKey="percentual" sort={sort} onToggle={toggle} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.tecnicoId} className="row-divider">
                  <th scope="row" className="px-4 py-2 text-left font-medium text-text-primary">{row.nome}</th>
                  <td className="px-4 py-2 text-right text-text-secondary">{formatCount(row.aptos)}</td>
                  <td className="px-4 py-2 text-right text-text-secondary">{formatCount(row.comChamado)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-text-primary">{formatPercent(row.percentual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data.casos.length > 0 && (
        <div className="border-t border-border px-5 py-4">
          <h3 className="text-xs font-semibold text-text-primary">Casos</h3>
          <p className="mt-1 text-[11px] text-text-muted">{data.casosTruncados ? `Os ${data.casos.length} casos mais recentes; há outros no período.` : 'Do mais recente para o mais antigo.'}</p>
          <ul className="mt-3 grid gap-2">
            {data.casos.map((c) => (
              <li key={`${c.tecnicoId}-${c.equipamentoCodigo}-${c.aptoEm}-${c.chamadoCodigo}`} className="rounded-md border border-border bg-bg px-3 py-2 text-xs">
                {/* códigos (EQ-…, CH-…) nunca quebram no hífen: a linha quebra antes deles */}
                <p className="font-medium text-text-primary">{c.equipamentoNome} <span className="whitespace-nowrap font-normal text-text-muted">{c.equipamentoCodigo}</span></p>
                <p className="mt-0.5 text-text-secondary">Apto por {c.tecnicoNome} em {formatDate(c.aptoEm)} · chamado <span className="whitespace-nowrap">{c.chamadoCodigo}</span> em {formatDate(c.chamadoAbertoEm)}, {c.diasDepois} {c.diasDepois === 1 ? 'dia' : 'dias'} depois</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
