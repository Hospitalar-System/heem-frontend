import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Pagination } from '@/components/ui/Pagination'
import { useEquipmentChecklistExecutions } from '../api/equipment-checklist-executions'
import type { ChecklistExecution, ChecklistExecutionItem } from '../types'

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 })
const PARECER_LIMIT = 160

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}

function formatValue(item: ChecklistExecutionItem) {
  if (item.valor === null || item.valor === undefined) return '—'
  if (typeof item.valor === 'boolean') return item.valor ? 'Sim' : 'Não'
  if (typeof item.valor === 'number') return `${numberFormat.format(item.valor)}${item.unidade ? ` ${item.unidade}` : ''}`
  return item.valor
}

function formatRange(item: ChecklistExecutionItem) {
  const unit = item.unidade ? ` ${item.unidade}` : ''
  const { faixaMin: min, faixaMax: max } = item
  if (min !== null && max !== null) return `${numberFormat.format(min)}–${numberFormat.format(max)}${unit}`
  if (min !== null) return `mín. ${numberFormat.format(min)}${unit}`
  if (max !== null) return `máx. ${numberFormat.format(max)}${unit}`
  if (item.valorReferencia !== null && item.valorReferencia !== undefined && item.valorReferencia !== '') return `Ref.: ${typeof item.valorReferencia === 'number' ? numberFormat.format(item.valorReferencia) : item.valorReferencia}`
  return '—'
}

function summarize(items: ChecklistExecutionItem[]) {
  const ok = items.filter((item) => item.conforme === true).length
  const bad = items.filter((item) => item.conforme === false).length
  return { ok, bad, none: items.length - ok - bad }
}

function Panel({ children, role }: { children: React.ReactNode; role?: 'alert' }) {
  return <div role={role} className="rounded-md border border-dashed border-border px-4 py-5 text-xs text-text-secondary">{children}</div>
}

function ConformityBadge({ conforme }: { conforme: boolean | null }) {
  if (conforme === true) return <Badge variant="success">Conforme</Badge>
  if (conforme === false) return <Badge variant="danger">Não conforme</Badge>
  return <Badge variant="neutral">Sem medição</Badge>
}

function Parecer({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > PARECER_LIMIT
  return <p className="mt-2 text-xs text-text-secondary">
    <span className="font-medium text-text-primary">Parecer técnico: </span>
    <span className="whitespace-pre-line">{long && !open ? `${text.slice(0, PARECER_LIMIT).trimEnd()}…` : text}</span>
    {long ? <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="ml-2 text-primary underline">{open ? 'Mostrar menos' : 'Mostrar mais'}</button> : null}
  </p>
}

function ExecutionCard({ execution, isAdmin }: { execution: ChecklistExecution; isAdmin: boolean }) {
  const [open, setOpen] = useState(false)
  const panelId = `execution-items-${execution.otId}`
  const { ok, bad, none } = summarize(execution.itens)
  return <li className="px-3 py-3">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      {isAdmin ? <Link to={`/work-orders/${execution.otId}`} className="font-medium text-primary underline">{execution.otCodigo}</Link> : <span className="font-medium text-text-primary">{execution.otCodigo}</span>}
      <span className="text-text-secondary">Concluída em {formatDate(execution.concluidaEm)}{execution.tecnicoNome ? ` · ${execution.tecnicoNome}` : ''}</span>
    </div>
    <p className="mt-1 text-xs text-text-secondary">{ok} {ok === 1 ? 'conforme' : 'conformes'} / {bad} {bad === 1 ? 'não conforme' : 'não conformes'} / {none} sem medição</p>
    {execution.parecerTecnico ? <Parecer text={execution.parecerTecnico} /> : null}
    <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)} className="mt-2 inline-flex items-center gap-1 rounded-md text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <ChevronDown aria-hidden="true" size={14} className={open ? 'rotate-180' : ''} />
      {open ? 'Ocultar itens' : 'Ver itens'}<span className="sr-only"> da execução {execution.otCodigo}</span>
    </button>
    {open ? <div id={panelId} className="mt-2 overflow-x-auto rounded-md border border-border">
      {execution.itens.length === 0 ? <p className="px-3 py-3 text-xs text-text-muted">Esta execução não registrou itens.</p>
        : <table className="w-full text-left text-xs">
          <caption className="sr-only">Itens da execução {execution.otCodigo}</caption>
          <thead className="bg-bg text-text-muted"><tr><th scope="col" className="px-3 py-2 font-medium">Item</th><th scope="col" className="px-3 py-2 font-medium">Valor medido</th><th scope="col" className="px-3 py-2 font-medium">Esperado</th><th scope="col" className="px-3 py-2 font-medium">Resultado</th></tr></thead>
          <tbody className="divide-y divide-border">{execution.itens.map((item) => <tr key={item.itemId}>
            <th scope="row" className="px-3 py-2 font-medium text-text-primary">{item.descricao}</th>
            <td className="px-3 py-2 tabular-nums text-text-primary">{formatValue(item)}</td>
            <td className="px-3 py-2 tabular-nums text-text-secondary">{formatRange(item)}</td>
            <td className="px-3 py-2"><ConformityBadge conforme={item.conforme} /></td>
          </tr>)}</tbody>
        </table>}
    </div> : null}
  </li>
}

export function ChecklistExecutionsSection({ equipmentId, isAdmin }: { equipmentId: string; isAdmin: boolean }) {
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const query = useEquipmentChecklistExecutions(equipmentId, { pagina: page - 1, tamanho: size })
  const list = query.data?.items ?? []
  const total = query.data?.total ?? 0

  return <section aria-labelledby="equipment-checklist-runs" className="rounded-lg border border-border bg-surface p-5">
    <h3 id="equipment-checklist-runs" className="text-sm font-semibold text-text-primary">Execuções anteriores</h3>
    <div className="mt-3">
      {query.isLoading ? <div aria-label="Carregando execuções" aria-busy="true" className="h-16 animate-pulse rounded-md bg-bg" />
        : query.isError && !query.data ? <Panel role="alert">Não foi possível carregar as execuções do checklist.<button type="button" onClick={() => void query.refetch()} className="ml-2 text-primary underline">Tentar novamente</button></Panel>
        : list.length === 0 ? <Panel>Nenhuma execução registrada.</Panel>
        : <>
          <ul className="divide-y divide-border rounded-md border border-border">
            {list.map((execution) => <ExecutionCard key={execution.otId} execution={execution} isAdmin={isAdmin} />)}
          </ul>
          <Pagination page={page} size={size} total={total} onPageChange={setPage} onSizeChange={(next) => { setSize(next); setPage(1) }} className="mt-2 rounded-lg border border-border bg-surface" />
          <p className="mt-2 text-[11px] text-text-muted">A faixa esperada e o valor de referência são os do item atual do checklist; se o item foi editado depois da medição, o resultado gravado na época pode divergir.</p>
        </>}
    </div>
  </section>
}
