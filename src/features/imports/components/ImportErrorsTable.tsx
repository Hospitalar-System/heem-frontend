import { CheckCircle2, Download } from 'lucide-react'
import { useState } from 'react'
import type { ImportRowError } from '../api/imports'
import { createImportErrorsCsv, describeRowError, extractRowErrorField } from '../types'

const PAGE_SIZE = 20

interface Props {
  errors: ImportRowError[]
  inProgress: boolean
  truncated: boolean
  totalWithError: number
  fileName: string
}

function downloadErrorsReport(errors: ImportRowError[], fileName: string) {
  const blob = new Blob([createImportErrorsCsv(errors)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `erros-${fileName.replace(/\.csv$/i, '')}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function ImportErrorsTable({ errors, inProgress, truncated, totalWithError, fileName }: Props) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(errors.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const visible = errors.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  if (errors.length === 0) {
    if (inProgress) {
      return <div aria-hidden="true" className="space-y-2" data-testid="errors-skeleton">
        <div className="h-4 w-1/3 animate-pulse rounded bg-border" /><div className="h-8 animate-pulse rounded bg-border/60" /><div className="h-8 animate-pulse rounded bg-border/60" />
      </div>
    }
    return <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-border bg-bg px-4 py-6 text-center">
      <CheckCircle2 aria-hidden="true" size={20} className="text-primary" />
      <p className="text-xs font-medium text-text-primary">Nenhum erro por linha</p>
      <p className="text-[11px] text-text-secondary">Todas as linhas processadas foram criadas ou já existiam.</p>
    </div>
  }

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-xs font-semibold text-text-primary">Erros por linha ({totalWithError.toLocaleString('pt-BR')})</h3>
      <button type="button" onClick={() => downloadErrorsReport(errors, fileName)} className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-bg px-3 text-xs font-medium text-text-primary outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary"><Download aria-hidden="true" size={14} />Baixar relatório de erros</button>
    </div>
    {truncated && <p className="rounded-md border border-warning/30 bg-warning/5 px-3 py-2 text-[11px] leading-4 text-text-secondary">O relatório guarda apenas parte dos erros ({errors.length.toLocaleString('pt-BR')} de {totalWithError.toLocaleString('pt-BR')}). Corrija esses e envie o arquivo de novo para ver os demais.</p>}
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[560px] text-left text-xs">
        <caption className="sr-only">Erros por linha da importação</caption>
        <thead className="bg-bg text-[11px] text-text-secondary"><tr><th scope="col" className="px-3 py-2 font-medium">Linha</th><th scope="col" className="px-3 py-2 font-medium">Código</th><th scope="col" className="px-3 py-2 font-medium">Campo</th><th scope="col" className="px-3 py-2 font-medium">Motivo</th></tr></thead>
        <tbody className="divide-y divide-border">{visible.map((error, index) => <tr key={`${error.linha}-${error.code}-${index}`}>
          <td className="px-3 py-2 tabular-nums text-text-primary">{error.linha}</td>
          <td className="px-3 py-2 text-text-primary">{error.codigo || '—'}</td>
          <td className="px-3 py-2 font-mono text-text-secondary">{extractRowErrorField(error.code, error.mensagem) || '—'}</td>
          <td className="px-3 py-2 text-text-primary">{describeRowError(error.code, error.mensagem)}</td>
        </tr>)}</tbody>
      </table>
    </div>
    {pages > 1 && <nav aria-label="Paginação dos erros" className="flex items-center justify-between gap-2 text-xs text-text-secondary">
      <button type="button" disabled={current === 0} onClick={() => setPage(current - 1)} className="h-8 rounded-md border border-border px-3 outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">Anterior</button>
      <span>Página {current + 1} de {pages}</span>
      <button type="button" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} className="h-8 rounded-md border border-border px-3 outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">Próxima</button>
    </nav>}
  </div>
}
