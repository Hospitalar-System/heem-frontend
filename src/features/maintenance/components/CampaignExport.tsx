import { Download, FileDown, RotateCw } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Select } from '@/components/ui/Select'
import { useReportExport, useRequestCampaignExport, type CampaignExportFormat } from '@/features/dashboard/api/reports'
import { campaignApiError, campaignExportFormats, campaignLevelOptions } from '../utils/preventive-campaigns'

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'
const secondaryButton = `rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg ${focusRing}`
/** Só links http(s) (e data: do modo demonstração) viram download; qualquer outro esquema é ignorado. */
const safeUrl = (url: string | null | undefined) => (url && /^(https?:\/\/|data:)/i.test(url) ? url : null)

/**
 * "Exportar relatório" da campanha (Story F4.10): escolhe o formato, solicita a exportação assíncrona,
 * acompanha o andamento e, quando o arquivo fica pronto, INICIA o download sozinho (uma vez por exportação) e oferece
 * baixar de novo. Nada fica guardado no navegador.
 */
export function CampaignExport({ campaignId, children }: { campaignId: string; children?: ReactNode }) {
  const [formato, setFormato] = useState<CampaignExportFormat>('pdf')
  const [nivel, setNivel] = useState<'RESUMO' | 'COMPLETO'>('COMPLETO')
  const [exportId, setExportId] = useState<string | null>(null)
  const request = useRequestCampaignExport()
  const status = useReportExport(exportId)
  const submitting = useRef(false)
  const downloadedFor = useRef<string | null>(null)
  const [downloaded, setDownloaded] = useState(false)
  const processing = status.data?.status === 'pendente' && !status.pollStopped
  const busy = request.isPending || processing

  async function submit() {
    if (submitting.current || busy) return
    submitting.current = true
    setExportId(null)
    setDownloaded(false)
    try {
      const result = await request.mutateAsync({ campanhaId: campaignId, formato, ...(formato === 'pdf' ? { nivel } : {}) })
      setExportId(result.id)
    } catch {
      // O erro da mutação é exibido abaixo, sem rejeitar o manipulador do clique.
    } finally {
      submitting.current = false
    }
  }

  const requestError = request.isError ? campaignApiError(request.error, 'Não foi possível solicitar o relatório. Tente novamente.') : undefined
  const downloadUrl = status.data?.status === 'concluido' ? safeUrl(status.data.urlDownload) : null

  // Download automático ao concluir: um único clique programático por exportação (sem nova aba).
  useEffect(() => {
    if (!downloadUrl || !exportId || downloadedFor.current === exportId) return
    downloadedFor.current = exportId
    const anchor = document.createElement('a')
    anchor.href = downloadUrl
    if (downloadUrl.startsWith('data:')) anchor.download = `relatorio-campanha.${formato}`
    anchor.rel = 'noopener noreferrer'
    anchor.hidden = true
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    setDownloaded(true)
  }, [downloadUrl, exportId, formato])
  const message = request.isPending ? 'Solicitando…'
    : processing ? 'Gerando…'
      : status.data?.status === 'concluido' ? (downloadUrl ? 'Relatório baixado' : 'Link de download indisponível. Tente de novo.')
        : status.pollStopped ? 'Atualização pausada.'
          : ''

  return <div className="flex min-w-0 flex-col items-end gap-1.5">
    <div data-testid="campaign-controls" className="flex flex-row flex-wrap items-center justify-end gap-2">
      <div className="w-24"><Select aria-label="Formato do relatório" value={formato} onChange={(next) => setFormato(next as CampaignExportFormat)} options={campaignExportFormats} disabled={busy} /></div>
      {formato === 'pdf' && <div className="w-28"><Select aria-label="Nível do relatório" value={nivel} onChange={(next) => setNivel(next as 'RESUMO' | 'COMPLETO')} options={campaignLevelOptions} disabled={busy} /></div>}
      <button type="button" disabled={busy} onClick={() => void submit()} className={`inline-flex h-10 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover ${focusRing} disabled:cursor-not-allowed disabled:opacity-50`}>
        <FileDown aria-hidden="true" size={14} />Exportar relatório
      </button>
      {children}
    </div>
    <div aria-live="polite" aria-atomic="true" className={message ? 'flex min-h-4 items-center justify-end gap-2 text-xs text-text-secondary' : 'sr-only'}>
      {(request.isPending || processing) && <RotateCw aria-hidden="true" className="animate-spin text-primary" size={14} />}
      {message && <span>{message}</span>}
      {downloaded && downloadUrl && <a href={downloadUrl} rel="noopener noreferrer" className={`inline-flex items-center gap-1 rounded font-medium text-primary hover:underline ${focusRing}`}><Download aria-hidden="true" size={14} />Baixar novamente</a>}
      {status.pollStopped && <button type="button" onClick={() => void status.refetch()} className={`rounded font-medium text-primary underline ${focusRing}`}>Atualizar</button>}
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
