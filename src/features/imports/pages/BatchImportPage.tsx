import { AlertTriangle, Download, FileSpreadsheet, LockKeyhole, Upload, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { batchImportErrorMessages, batchImportTypes, createBatchImportTemplate, formatFileSize, type BatchImportType } from '../types'

const choiceClass = 'flex min-h-[76px] cursor-pointer items-start gap-3 rounded-md border border-border bg-surface p-3 outline-none transition-colors hover:bg-bg/60 has-[:checked]:border-primary has-[:checked]:bg-primary/5 focus-within:ring-2 focus-within:ring-primary'

export function BatchImportPage() {
  const [type, setType] = useState<BatchImportType>('equipamentos')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
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
    if (!nextFile.name.toLocaleLowerCase('pt-BR').endsWith('.csv')) {
      setFile(null)
      setFileError('Selecione um arquivo com extensão .csv.')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setFile(nextFile)
  }

  function removeFile() {
    setFile(null)
    setFileError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return <AdminPageShell title="Importação em lote" subtitle="Prepare arquivos CSV para cadastro de dados">
    <div className="mx-auto max-w-4xl space-y-4">
      <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><FileSpreadsheet aria-hidden="true" size={17} /></span>
          <div><h2 className="text-sm font-semibold text-text-primary">O que deseja importar?</h2><p className="mt-1 text-xs text-text-secondary">Selecione o tipo de registro para baixar o modelo e preparar seu arquivo.</p></div>
        </div>
        <fieldset className="grid gap-2 md:grid-cols-3">
          <legend className="sr-only">Tipo de importação</legend>
          {batchImportTypes.map((item) => <label key={item.id} className={choiceClass}>
            <input type="radio" name="import-type" value={item.id} checked={type === item.id} onChange={() => { setType(item.id); removeFile() }} className="mt-0.5 accent-primary focus-visible:ring-2 focus-visible:ring-primary" />
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
          <p className="mt-2 text-[10px] leading-4 text-warning">Modelo preliminar: os cabeçalhos ainda precisam ser confirmados pelo contrato de importação do backend.</p>
        </details>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="mb-3"><h2 className="text-sm font-semibold text-text-primary">Arquivo CSV</h2><p className="mt-1 text-xs text-text-secondary">Escolha o arquivo correspondente ao modelo de {selectedType.label.toLocaleLowerCase('pt-BR')}.</p></div>
        <input ref={inputRef} type="file" accept=".csv,text/csv" aria-label="Selecionar arquivo CSV" onChange={(event) => selectFile(event.target.files?.[0])} className="sr-only" />
        {file ? <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg p-3">
          <FileSpreadsheet aria-hidden="true" size={18} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-text-primary">{file.name}</span><span className="mt-0.5 block text-[10px] text-text-muted">{formatFileSize(file.size)}</span></span>
          <button type="button" onClick={removeFile} aria-label="Remover arquivo" title="Remover arquivo" className="grid size-8 place-items-center rounded-md text-text-secondary hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X aria-hidden="true" size={15} /></button>
        </div> : <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-28 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-bg px-4 py-5 text-center outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-primary">
          <Upload aria-hidden="true" size={18} className="text-text-secondary" /><span className="text-xs font-medium text-text-primary">Selecionar arquivo CSV</span><span className="text-[10px] text-text-muted">Extensão aceita: .csv</span>
        </button>}
        {fileError && <p role="alert" className="mt-2 text-xs text-danger">{fileError}</p>}
      </section>

      <section role="status" className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4">
        <AlertTriangle aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-warning" />
        <div className="min-w-0"><h2 className="text-xs font-semibold text-text-primary">Processamento indisponível</h2><p className="mt-1 text-xs leading-5 text-text-secondary">A importação depende da API prevista na Story 11.1 do backend. Nenhum arquivo será enviado até o contrato estar disponível. O backend deverá informar o progresso, os registros criados ou ignorados e os erros por linha.</p></div>
        <LockKeyhole aria-hidden="true" size={14} className="mt-0.5 shrink-0 text-text-muted" />
      </section>
      <div className="flex justify-end"><button type="button" disabled title="Aguardando API de importação do backend" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-bg-brand opacity-50 disabled:cursor-not-allowed"><Upload aria-hidden="true" size={14} />Enviar para processamento</button></div>
    </div>
  </AdminPageShell>
}
