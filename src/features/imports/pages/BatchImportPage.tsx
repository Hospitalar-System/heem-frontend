import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2, RefreshCw, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { SettingsNav } from '@/features/settings/components/SettingsNav'
import { getImportRequestErrorMessage, isImportInProgress, useImportStatus, useSubmitImport, type ImportResult } from '../api/imports'
import { ImportErrorsTable } from '../components/ImportErrorsTable'
import { batchImportErrorMessages, batchImportTypes, createBatchImportTemplate, formatFileSize, validateImportFile, type BatchImportType } from '../types'

const choiceClass = 'flex min-h-[76px] cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-3 outline-none transition-colors hover:bg-bg/60 has-[:checked]:border-primary has-[:checked]:bg-primary/5 focus-within:ring-2 focus-within:ring-primary'

export function BatchImportPage() {
  const [type, setType] = useState<BatchImportType>('equipamentos')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [uploadPercent, setUploadPercent] = useState(0)
  const [started, setStarted] = useState<ImportResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const sending = useRef(false)
  const submit = useSubmitImport()
  const statusQuery = useImportStatus(started?.id ?? null, started ?? undefined)
  const result = statusQuery.data ?? started
  const inProgress = submit.isPending || (started !== null && isImportInProgress(result?.status))
  const finished = result !== null && !isImportInProgress(result.status)
  const selectedType = batchImportTypes.find((item) => item.id === type)!

  function downloadTemplate() {
    const blob = new Blob([createBatchImportTemplate(type)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `modelo-${type}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function selectFile(nextFile?: File) {
    setFileError('')
    if (!nextFile) return
    const problem = validateImportFile(nextFile)
    if (problem) {
      setFile(null)
      setFileError(problem)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    submit.reset()
    setFile(nextFile)
  }

  function startOver() {
    submit.reset()
    setStarted(null)
    setUploadPercent(0)
    removeFile()
  }

  function sendFile() {
    if (!file || sending.current) return
    sending.current = true
    setUploadPercent(0)
    submit.mutate({ tipo: type, arquivo: file, onUploadProgress: setUploadPercent }, {
      onSuccess: (created) => setStarted(created),
      onSettled: () => { sending.current = false },
    })
  }

  function removeFile() {
    setFile(null)
    setFileError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return <AdminPageShell tabs={<SettingsNav />} title="Importação em lote" subtitle="Prepare arquivos CSV para cadastro de dados">
    <div className="mx-auto max-w-4xl space-y-4">
      <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><FileSpreadsheet aria-hidden="true" size={17} /></span>
          <div><h2 className="text-sm font-semibold text-text-primary">O que deseja importar?</h2><p className="mt-1 text-xs text-text-secondary">Selecione o tipo de registro para baixar o modelo e preparar seu arquivo.</p></div>
        </div>
        <fieldset className="grid gap-2 md:grid-cols-3">
          <legend className="sr-only">Tipo de importação</legend>
          {batchImportTypes.map((item) => <label key={item.id} className={choiceClass}>
            <input type="radio" name="import-type" value={item.id} checked={type === item.id} onChange={() => { setType(item.id); removeFile() }} disabled={inProgress} className="mt-0.5 accent-primary focus-visible:ring-2 focus-visible:ring-primary" />
            <span className="min-w-0"><span className="block text-xs font-semibold text-text-primary">{item.label}</span><span className="mt-1 block text-[11px] leading-4 text-text-secondary">{item.description}</span></span>
          </label>)}
        </fieldset>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-sm font-semibold text-text-primary">Modelo de {selectedType.label.toLocaleLowerCase('pt-BR')}</h2><p className="mt-1 text-xs text-text-secondary">Arquivo CSV separado por ponto e vírgula.</p></div>
          <button type="button" onClick={downloadTemplate} className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-bg px-3 text-xs font-medium text-text-primary outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary"><Download aria-hidden="true" size={14} />Baixar modelo</button>
        </div>
        <details className="mt-3 rounded-md border border-border bg-bg px-3 py-2">
          <summary className="cursor-pointer text-[11px] font-medium text-text-secondary">Colunas do modelo</summary>
          <p className="mt-2 break-words font-mono text-[10px] leading-5 text-text-muted">{selectedType.headers.join(';')}</p>
          {'requiredNote' in selectedType ? <p className="mt-2 text-xs leading-5 text-text-secondary">{selectedType.requiredNote}</p> : null}
          {type === 'equipamentos' ? <ul className="mt-2 list-disc space-y-1 pl-4 text-[11px] leading-4 text-text-secondary">{Object.entries(batchImportErrorMessages).map(([code, message]) => <li key={code}><code className="text-text-primary">{code}</code>: {message}</li>)}</ul> : null}
        </details>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="mb-3"><h2 className="text-sm font-semibold text-text-primary">Arquivo CSV</h2><p className="mt-1 text-xs text-text-secondary">Escolha o arquivo correspondente ao modelo de {selectedType.label.toLocaleLowerCase('pt-BR')}.</p></div>
        <input ref={inputRef} type="file" accept=".csv,text/csv" aria-label="Selecionar arquivo CSV" onChange={(event) => selectFile(event.target.files?.[0])} className="sr-only" />
        {file ? <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg p-3">
          <FileSpreadsheet aria-hidden="true" size={18} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-text-primary">{file.name}</span><span className="mt-0.5 block text-[10px] text-text-muted">{formatFileSize(file.size)}</span></span>
          <button type="button" onClick={removeFile} disabled={inProgress} aria-label="Remover arquivo" title="Remover arquivo" className="grid size-8 place-items-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X aria-hidden="true" size={15} /></button>
        </div> : <button type="button" onClick={() => inputRef.current?.click()} disabled={inProgress} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-bg px-4 py-5 text-center outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-primary">
          <Upload aria-hidden="true" size={18} className="text-text-secondary" /><span className="text-xs font-medium text-text-primary">Selecionar arquivo CSV</span><span className="text-[10px] text-text-muted">Extensão aceita: .csv</span>
        </button>}
        {fileError && <p role="alert" className="mt-2 text-xs text-danger">{fileError}</p>}
      </section>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {submit.isPending && <span className="text-xs text-text-secondary">Enviando arquivo… {uploadPercent}%</span>}
        <button type="button" onClick={sendFile} disabled={!file || inProgress || finished} aria-busy={submit.isPending} className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-bg-brand outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{submit.isPending ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : <Upload aria-hidden="true" size={14} />}Enviar para processamento</button>
      </div>
      {submit.isPending && <div role="progressbar" aria-label="Progresso do envio do arquivo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={uploadPercent} className="h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full bg-primary transition-[width]" style={{ width: `${uploadPercent}%` }} /></div>}
      {submit.isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
        <span className="min-w-0 flex-1">{getImportRequestErrorMessage(submit.error)}</span>
        <button type="button" onClick={sendFile} className="inline-flex h-8 items-center gap-2 rounded-md border border-danger/40 px-3 font-medium outline-none hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-primary"><RefreshCw aria-hidden="true" size={13} />Tentar novamente</button>
      </div>}

      {result && <section aria-labelledby="import-result-title" className="space-y-4 rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="import-result-title" className="text-sm font-semibold text-text-primary">Acompanhamento da importação</h2><p className="mt-1 text-xs text-text-secondary">Arquivo {file?.name ?? 'enviado'} · {selectedType.label}</p></div>
          {finished && <button type="button" onClick={startOver} className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-bg px-3 text-xs font-medium text-text-primary outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary"><Upload aria-hidden="true" size={14} />Enviar outro arquivo</button>}
        </div>
        <div role="status" aria-live="polite" className="flex items-start gap-2 text-xs text-text-primary">
          {isImportInProgress(result.status) ? <Loader2 aria-hidden="true" size={15} className="mt-0.5 shrink-0 animate-spin text-primary" /> : result.status === 'concluido' ? <CheckCircle2 aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-primary" /> : <AlertTriangle aria-hidden="true" size={15} className="mt-0.5 shrink-0 text-danger" />}
          <span>{statusText(result)}</span>
        </div>
        <div role="progressbar" aria-label="Progresso do processamento" aria-valuemin={0} aria-valuemax={Math.max(result.total, 1)} aria-valuenow={Math.min(result.processadas, Math.max(result.total, 1))} className="h-1.5 overflow-hidden rounded-full bg-border"><div className="h-full bg-primary transition-[width]" style={{ width: `${percent(result)}%` }} /></div>
        <dl className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {[['Processadas', `${result.processadas.toLocaleString('pt-BR')} de ${result.total.toLocaleString('pt-BR')}`], ['Criadas', result.criados], ['Ignoradas (já existentes)', result.ignorados], ['Com erro', result.comErro]].map(([label, value]) => <div key={label} className="rounded-md border border-border bg-bg p-3"><dt className="text-[11px] text-text-secondary">{label}</dt><dd className="mt-1 text-sm font-semibold tabular-nums text-text-primary">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</dd></div>)}
        </dl>
        {statusQuery.isError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          <span className="min-w-0 flex-1">Não foi possível atualizar o status. {getImportRequestErrorMessage(statusQuery.error)}</span>
          <button type="button" onClick={() => void statusQuery.refetch()} className="inline-flex h-8 items-center gap-2 rounded-md border border-danger/40 px-3 font-medium outline-none hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-primary"><RefreshCw aria-hidden="true" size={13} />Atualizar status</button>
        </div>}
        {result.status === 'falhou' && <button type="button" onClick={() => void statusQuery.refetch()} className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-bg px-3 text-xs font-medium text-text-primary outline-none hover:bg-surface focus-visible:ring-2 focus-visible:ring-primary"><RefreshCw aria-hidden="true" size={13} />Atualizar status</button>}
        <ImportErrorsTable errors={result.erros} inProgress={isImportInProgress(result.status)} truncated={result.errosTruncados} totalWithError={result.comErro} fileName={file?.name ?? 'importacao.csv'} />
      </section>}
    </div>
  </AdminPageShell>
}

function percent(result: ImportResult) {
  if (result.status === 'concluido') return 100
  return result.total > 0 ? Math.min(100, Math.round((result.processadas / result.total) * 100)) : 0
}

function statusText(result: ImportResult) {
  const count = `${result.processadas.toLocaleString('pt-BR')} de ${result.total.toLocaleString('pt-BR')} linhas`
  switch (result.status) {
    case 'pendente': return 'Importação recebida e aguardando processamento.'
    case 'processando': return `Processando: ${count}.`
    case 'concluido': return result.comErro > 0
      ? `Importação concluída com erros: ${result.criados.toLocaleString('pt-BR')} criadas, ${result.ignorados.toLocaleString('pt-BR')} ignoradas e ${result.comErro.toLocaleString('pt-BR')} com erro. Corrija as linhas com erro e envie o arquivo de novo; linhas já criadas serão ignoradas.`
      : `Importação concluída com sucesso: ${result.criados.toLocaleString('pt-BR')} criadas e ${result.ignorados.toLocaleString('pt-BR')} ignoradas (já existentes).`
    case 'falhou': return `A importação falhou após ${count}. O que já foi processado foi mantido; o sistema pode tentar novamente. Atualize o status ou envie o arquivo de novo (linhas já criadas serão ignoradas).`
  }
}
