import { Download, FileDown, RotateCw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { isDemoMode } from '@/lib/demo-mode'
import { useGenerateDocument } from './use-export-download'

const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary'
const primaryButton = `inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-text-primary hover:bg-bg disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`
const smallButton = `rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg ${focusRing}`

interface Props {
  label: string
  body: Record<string, unknown>
  filename: string
}

/** Botão que gera um documento (PDF) pelo fluxo das exportações: gerando com Cancelar, baixado com "Baixar novamente", falha com "Tentar de novo". */
export function GenerateDocumentButton({ label, body, filename }: Props) {
  const flow = useGenerateDocument({ body, filename })
  const cancelRef = useRef<HTMLButtonElement>(null)
  const againRef = useRef<HTMLButtonElement>(null)
  const retryRef = useRef<HTMLButtonElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const busy = flow.phase === 'requesting' || flow.phase === 'generating'

  useEffect(() => {
    if (flow.phase === 'generating') cancelRef.current?.focus()
    else if (flow.phase === 'done') againRef.current?.focus()
    else if (flow.phase === 'error') retryRef.current?.focus()
  }, [flow.phase])

  function cancel() {
    flow.cancel()
    requestAnimationFrame(() => submitRef.current?.focus())
  }

  return (
    <div className="flex min-w-0 flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button ref={submitRef} type="button" disabled={busy} onClick={() => void flow.start()} className={primaryButton}>
          {busy ? <RotateCw aria-hidden="true" className="animate-spin text-primary" size={14} /> : <FileDown aria-hidden="true" size={14} />}
          {busy ? 'Gerando…' : label}
        </button>
        {flow.phase === 'generating' && <button ref={cancelRef} type="button" onClick={cancel} className={smallButton}>Cancelar</button>}
      </div>
      <div role="status" aria-live="polite" className={flow.phase === 'done' ? 'flex flex-wrap items-center justify-end gap-2 text-xs text-text-secondary' : 'sr-only'}>
        {flow.phase === 'done' && <>
          <span className="flex items-center gap-1.5"><Download aria-hidden="true" size={14} />Baixado</span>
          <button ref={againRef} type="button" onClick={() => void flow.downloadAgain()} className={smallButton}>Baixar novamente</button>
        </>}
      </div>
      {flow.phase === 'error' && <div role="alert" className="flex flex-wrap items-center justify-end gap-2 text-xs text-text-primary">
        <span>{flow.error}</span>
        <button ref={retryRef} type="button" onClick={() => void flow.start()} className={smallButton}>Tentar de novo</button>
      </div>}
      {isDemoMode ? <p className="text-[11px] text-text-muted">Amostra ilustrativa (modo demonstração).</p> : null}
    </div>
  )
}
