import { FileCheck2, Upload } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useEquipmentDocuments, useUploadEquipmentDocument } from '../api/equipment-documents'

/**
 * Story 23.6: para entrar em Obsoleto o equipamento precisa ter um laudo de obsolescência anexado. Mostra o laudo que
 * já existe ou permite anexar um aqui mesmo (tipo LAUDO_OBSOLESCENCIA); o backend confere de novo ao salvar.
 */
export function ObsolescenceReportField({ equipmentId, disabled, error, onReady }: {
  equipmentId: string
  disabled: boolean
  /** Mensagem de erro exibida abaixo do campo. */
  error?: string | null
  /** Avisa o diálogo se já há laudo (habilita salvar). */
  onReady: (ready: boolean) => void
}) {
  const ids = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const documents = useEquipmentDocuments(equipmentId, { pagina: 0, tamanho: 100 })
  const upload = useUploadEquipmentDocument(equipmentId)
  const [progress, setProgress] = useState<number | null>(null)
  const report = (documents.data?.items ?? []).find((document) => document.tipoDocumento === 'LAUDO_OBSOLESCENCIA')

  const ready = Boolean(report)
  useEffect(() => { onReady(ready) }, [ready, onReady])

  const send = (file: File | undefined) => {
    if (!file) return
    setProgress(0)
    upload.mutate({ file, tipoDocumento: 'LAUDO_OBSOLESCENCIA', validadeAte: null, onProgress: setProgress }, { onSettled: () => setProgress(null) })
  }

  return <div role="group" aria-labelledby={`${ids}-title`} aria-describedby={error ? `${ids}-error` : undefined} className={`space-y-2 rounded-md border p-3 ${error ? 'border-danger' : 'border-border'}`}>
    <p id={`${ids}-title`} className="text-xs font-medium text-text-secondary">Laudo de obsolescência (obrigatório)</p>
    {documents.isLoading ? <p className="text-[11px] text-text-muted">Verificando os documentos do equipamento…</p>
      : report ? <p className="flex items-center gap-2 text-xs text-text-primary"><FileCheck2 aria-hidden size={14} className="shrink-0 text-success" /><span className="min-w-0 break-words">Laudo anexado: {report.nomeArquivo}</span></p>
      : <>
        <p className="text-[11px] text-text-muted">O equipamento continua em uso e no parque; o laudo registra a condenação. Anexe o arquivo (PDF ou imagem).</p>
        <input ref={inputRef} id={`${ids}-file`} type="file" accept="application/pdf,image/*" className="sr-only" disabled={disabled || upload.isPending} onChange={(event) => { send(event.target.files?.[0]); event.target.value = '' }} />
        <button type="button" disabled={disabled || upload.isPending} onClick={() => inputRef.current?.click()} className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium text-text-primary hover:bg-bg disabled:opacity-50">
          <Upload aria-hidden size={14} />{upload.isPending ? `Enviando… ${progress ?? 0}%` : 'Anexar laudo'}
        </button>
        {upload.isError ? <p role="alert" className="text-[11px] text-danger">Não foi possível enviar o laudo. Tente novamente.</p> : null}
      </>}
    {error ? <p id={`${ids}-error`} className="text-[11px] text-danger">{error}</p> : null}
  </div>
}
