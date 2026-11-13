import { useCallback, useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/axios'
import { exportStatusSchema, useRequestReportExport } from '../api/reports'
import type { ExportRequest, ExportStatus } from '../api/reports'
import { DOCUMENT_ENDPOINT } from '../api/documents'
import { exportErrorMessage, exportLayoutLabel } from './export-builder-model'

export const EXPORT_POLL_FIRST_MS = 1500
export const EXPORT_POLL_MAX_INTERVAL_MS = 5000
export const EXPORT_POLL_GROWTH = 1.3
/** Tempo total de acompanhamento antes de desistir (~3 min). */
export const EXPORT_TIMEOUT_MS = 180_000

export type ExportPhase = 'idle' | 'requesting' | 'generating' | 'done' | 'error'

export interface ExportFlowState { phase: ExportPhase; error: string | null; filename: string | null; /** Nível e orientação efetivos, ex.: "Completo · Paisagem". */ layout?: string }

const TIMEOUT_MESSAGE = 'O relatório está demorando mais que o esperado. Tente de novo em instantes.'
const POLL_ERROR_MESSAGE = 'Não foi possível consultar o andamento do relatório. Verifique a conexão e tente de novo.'
const FAILED_MESSAGE = 'Não foi possível gerar o relatório. Tente de novo.'

const safeUrl = (url: string | null | undefined) => (url && /^(https?:\/\/|data:)/i.test(url) ? url : null)

/** Download direto: âncora programática com atributo download (sem nova aba nem window.open). */
export function triggerDownload(url: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener noreferrer'
  anchor.hidden = true
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

type CreateDocument<B> = (body: B) => Promise<ExportStatus>

/**
 * Fluxo da exportação: cria, acompanha por polling (1,5 s crescendo até 5 s, teto de ~3 min), baixa sozinho UMA vez ao
 * concluir e permite baixar de novo (refazendo o GET para obter URL assinada nova). Cancelar só para o acompanhamento.
 */
export function useExportDownload() {
  const requestExport = useRequestReportExport()
  return useDocumentFlow<ExportRequest>(requestExport.mutateAsync)
}

/** Documento avulso (laudo da OT, dossiê do equipamento): POST arbitrário no mesmo fluxo assíncrono das exportações. */
export function useGenerateDocument({ path = DOCUMENT_ENDPOINT, body, filename }: { path?: string; body: Record<string, unknown>; filename: string }) {
  const create = useCallback<CreateDocument<Record<string, unknown>>>(async (payload) => exportStatusSchema.parse((await apiClient.post<unknown>(path, payload)).data), [path])
  const flow = useDocumentFlow<Record<string, unknown>>(create)
  const { start } = flow
  const generate = useCallback(() => start(body, filename), [start, body, filename])
  return { ...flow, start: generate }
}

function useDocumentFlow<B>(create: CreateDocument<B>) {
  const [state, setState] = useState<ExportFlowState>({ phase: 'idle', error: null, filename: null })
  const run = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const current = useRef<{ id: string; url: string; filename: string } | null>(null)
  const mutate = create

  const stop = useCallback(() => {
    run.current += 1
    clearTimeout(timer.current)
  }, [])
  useEffect(() => stop, [stop])

  const wait = (ms: number) => new Promise<void>((resolve) => { timer.current = setTimeout(resolve, ms) })

  const start = useCallback(async (body: B, filename: string) => {
    stop()
    const token = run.current
    const alive = () => run.current === token
    current.current = null
    setState({ phase: 'requesting', error: null, filename })
    const fail = (error: string) => { if (alive()) setState({ phase: 'error', error, filename }) }
    let created
    try {
      created = await mutate(body)
    } catch (error) {
      fail(exportErrorMessage(error))
      return
    }
    if (!alive()) return
    setState({ phase: 'generating', error: null, filename })
    let status = created
    let waited = 0
    let interval = EXPORT_POLL_FIRST_MS
    for (;;) {
      if (status.status === 'falhou') return fail(FAILED_MESSAGE)
      if (status.status === 'concluido') {
        const url = safeUrl(status.urlDownload)
        if (!url) return fail('O relatório foi gerado, mas o link de download não foi fornecido. Tente de novo.')
        current.current = { id: created.id, url, filename }
        triggerDownload(url, filename)
        setState({ phase: 'done', error: null, filename, layout: exportLayoutLabel(status.nivel ?? created.nivel, status.orientacao ?? created.orientacao) })
        return
      }
      if (waited >= EXPORT_TIMEOUT_MS) return fail(TIMEOUT_MESSAGE)
      await wait(interval)
      if (!alive()) return
      waited += interval
      interval = Math.min(EXPORT_POLL_MAX_INTERVAL_MS, Math.round(interval * EXPORT_POLL_GROWTH))
      try {
        status = exportStatusSchema.parse((await apiClient.get<unknown>(`/relatorios/exportacoes/${created.id}`)).data)
      } catch {
        return fail(POLL_ERROR_MESSAGE)
      }
      if (!alive()) return
    }
  }, [mutate, stop])

  const cancel = useCallback(() => {
    stop()
    current.current = null
    setState({ phase: 'idle', error: null, filename: null })
  }, [stop])

  /** Baixa de novo; se a URL assinada expirou, o GET devolve uma nova. */
  const downloadAgain = useCallback(async () => {
    const last = current.current
    if (!last) return
    let url = last.url
    try {
      const fresh = exportStatusSchema.parse((await apiClient.get<unknown>(`/relatorios/exportacoes/${last.id}`)).data)
      const next = fresh.status === 'concluido' ? safeUrl(fresh.urlDownload) : null
      if (next) url = next
    } catch {
      // Sem resposta: tenta com a URL anterior.
    }
    current.current = { ...last, url }
    triggerDownload(url, last.filename)
  }, [])

  return { ...state, start, cancel, downloadAgain }
}
