import { Download, FileDown, RotateCw } from 'lucide-react'
import { useRef, useState } from 'react'
import { Select } from '@/components/ui/Select'
import { useReportExport, useRequestCampaignExport, type CampaignExportFormat } from '@/features/dashboard/api/reports'
import { campaignApiError, campaignExportFormats } from '../utils/preventive-campaigns'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
const secondaryButton = `rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg ${focusRing}`
/** Só links http(s) viram download; qualquer outro esquema é ignorado. */
const safeUrl = (url: string | null | undefined) => (url && /^https?:\/\//i.test(url) ? url : null)

/**
 * "Exportar relatório" da campanha (Story F4.10): escolhe o formato, solicita a exportação assíncrona,
 * acompanha o andamento e oferece o download quando o arquivo fica pronto. Nada fica guardado no navegador.
 */
export function CampaignExport({ campaignId }: { campaignId: string }) {
  const [formato, setFormato] = useState<CampaignExportFormat>('pdf')
  const [exportId, setExportId] = useState<string | null>(null)
  const request = useRequestCampaignExport()
  const status = useReportExport(exportId)
  const submitting = useRef(false)
  const processing = status.data?.status === 'pendente' && !status.pollStopped
  const busy = request.isPending || processing

  async function submit() {
    if (submitting.current || busy) return
    submitting.current = true
    setExportId(null)
    try {
      const result = await request.mutateAsync({ campanhaId: campaignId, formato })
      setExportId(result.id)
    } catch {
      // O erro da mutação é exibido abaixo, sem rejeitar o manipulador do clique.
    } finally {
      submitting.current = false
    }
  }

  const requestError = request.isError ? campaignApiError(request.error, 'Não foi possível solicitar o relatório. Tente novamente.') : undefined
  const downloadUrl = status.data?.status === 'concluido' ? safeUrl(status.data.urlDownload) : null
  const message = request.isPending ? 'Solicitando o relatório…'
    : processing ? 'Gerando o relatório. Isso pode levar alguns instantes…'
      : status.data?.status === 'concluido' ? (downloadUrl ? 'Relatório pronto para download.' : 'Relatório concluído, mas o link de download não foi fornecido. Tente novamente.')
        : status.pollStopped ? 'A atualização automática foi pausada.'
          : ''

  return <div className="flex min-w-0 flex-col items-stretch gap-2 sm:items-end">
    <div className="flex flex-wrap items-center gap-2">
      <Select size="sm" aria-label="Formato do relatório" value={formato} onChange={(next) => setFormato(next as CampaignExportFormat)} options={campaignExportFormats} disabled={busy} />
      <button type="button" disabled={busy} onClick={() => void submit()} className={`inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover ${focusRing} disabled:cursor-not-allowed disabled:opacity-50`}>
        <FileDown aria-hidden="true" size={14} />Exportar relatório
      </button>
    </div>
    <div aria-live="polite" aria-atomic="true" className={message ? 'flex flex-wrap items-center gap-2 text-xs text-text-secondary' : 'sr-only'}>
      {message && <span>{message}</span>}
      {(request.isPending || processing) && <RotateCw aria-hidden="true" className="animate-spin text-primary" size={14} />}
      {downloadUrl && <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1 rounded font-medium text-primary hover:underline ${focusRing}`}><Download aria-hidden="true" size={14} />Baixar relatório</a>}
      {status.pollStopped && <button type="button" onClick={() => void status.refetch()} className={`rounded font-medium text-primary underline ${focusRing}`}>Atualizar agora</button>}
    </div>
    {requestError && <p role="alert" className="text-xs text-danger">{requestError.message}</p>}
    {status.data?.status === 'falhou' && <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-danger">
      <span>Não foi possível gerar o relatório.</span>
      <button type="button" onClick={() => void submit()} className={secondaryButton}>Tentar de novo</button>
    </div>}
    {status.isError && <div role="alert" className="flex flex-wrap items-center gap-2 text-xs text-danger">
      <span>Não foi possível consultar o andamento do relatório.</span>
      <button type="button" onClick={() => void status.refetch()} className={secondaryButton}>Tentar novamente</button>
    </div>}
  </div>
}
