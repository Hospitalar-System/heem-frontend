import { Link } from 'react-router-dom'
import type { RecurrentEquipments } from '../api/reports'
import { formatCount } from './report-format'
import { SectionEmpty } from './report-ui'

/** Story 23.8: equipamentos que voltam a falhar (contagem de chamados de falha, nunca causa nem previsão). */
export function ReportRecurrentEquipment({ data: bruto }: { data: RecurrentEquipments }) {
  const data = { ...bruto, equipamentos: Array.isArray(bruto.equipamentos) ? bruto.equipamentos : [] }
  return (
    <section aria-labelledby="recurrent-title" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 id="recurrent-title" className="text-sm font-semibold text-text-primary">Equipamentos reincidentes</h2>
          <p className="mt-1 text-xs text-text-muted">{data.chamadosMinimos} ou mais chamados de falha (ou sem tipo) nos últimos {data.dias} dias, pela regra do cliente. Situação atual, independente do período.</p>
        </div>
        <dl className="text-right"><dt className="text-[11px] text-text-muted">Equipamentos</dt><dd className="text-sm font-semibold tabular-nums text-text-primary">{formatCount(data.equipamentos.length)}</dd></dl>
      </div>
      {data.equipamentos.length === 0 ? <div className="p-5"><SectionEmpty>Nenhum equipamento reincidente para os filtros selecionados.</SectionEmpty></div> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-xs tabular-nums">
            <caption className="sr-only">Equipamentos reincidentes</caption>
            <thead className="text-text-secondary"><tr className="table-head">
              {['Equipamento', 'Hospital / setor', 'Chamados'].map((label, index) => <th key={label} scope="col" className={`px-4 py-2 font-medium ${index === 2 ? 'text-right' : 'text-left'}`}>{label}</th>)}
            </tr></thead>
            <tbody>{data.equipamentos.map((item) => <tr key={item.equipamentoId} className="row-divider">
              <th scope="row" className="px-4 py-2 text-left font-medium text-text-primary"><Link to={`/assets/${item.equipamentoId}`} className="underline decoration-dotted underline-offset-4">{item.nome}</Link><span className="ml-2 whitespace-nowrap font-normal text-text-muted">{item.codigo}</span></th>
              <td className="px-4 py-2 text-text-secondary">{item.hospitalNome} · {item.setorNome}</td>
              <td className="px-4 py-2 text-right font-semibold text-text-primary">{formatCount(item.chamados)}</td>
            </tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}
