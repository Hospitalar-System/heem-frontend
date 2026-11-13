import { z } from 'zod'
import { EXPORT_CONTENTS, EXPORT_FORMATS } from '../api/reports'
import type { ExportRequest } from '../api/reports'

/**
 * Controles que o backend (ExportacaoRequest) aceita. Com false, somem da tela e não entram no corpo.
 */
export const EXPORT_BACKEND_SUPPORT = { nivel: true, orientacao: true } as const

/** Orientação padrão do backend por tipo: paisagem nas listagens, retrato nos demais. */
export function defaultOrientation(conteudo: string): 'retrato' | 'paisagem' {
  return ['chamados', 'ordens_trabalho', 'medicoes'].includes(conteudo) ? 'paisagem' : 'retrato'
}

export const exportContentLabels: Record<(typeof EXPORT_CONTENTS)[number], string> = {
  chamados: 'Chamados',
  ordens_trabalho: 'Ordens de trabalho',
  medicoes: 'Medições',
  indicadores: 'Indicadores',
  campanha: 'Campanha preventiva',
}

export const exportFormatLabels: Record<(typeof EXPORT_FORMATS)[number], string> = { pdf: 'PDF', xlsx: 'XLSX', csv: 'CSV' }

export const exportBuilderSchema = z.object({
  conteudo: z.enum(EXPORT_CONTENTS),
  desde: z.string(),
  ate: z.string(),
  hospitalId: z.string(),
  setorId: z.string(),
  campanhaId: z.string(),
  nivel: z.enum(['resumo', 'completo']),
  orientacao: z.enum(['retrato', 'paisagem']),
  formato: z.enum(EXPORT_FORMATS),
}).superRefine((value, ctx) => {
  if (value.conteudo === 'campanha') {
    if (!value.campanhaId) ctx.addIssue({ code: 'custom', path: ['campanhaId'], message: 'Escolha a campanha.' })
    return
  }
  if (!value.desde) ctx.addIssue({ code: 'custom', path: ['desde'], message: 'Informe a data inicial.' })
  if (!value.ate) ctx.addIssue({ code: 'custom', path: ['ate'], message: 'Informe a data final.' })
  if (value.desde && value.ate && value.desde > value.ate) ctx.addIssue({ code: 'custom', path: ['ate'], message: 'A data final deve ser igual ou posterior à data inicial.' })
})

export type ExportBuilderValues = z.infer<typeof exportBuilderSchema>

const startOfDay = (value: string) => new Date(`${value}T00:00:00.000Z`).toISOString()
const endOfDay = (value: string) => new Date(`${value}T23:59:59.999Z`).toISOString()

function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/** Padrão: últimos 30 dias, incluindo hoje. */
export function defaultExportValues(now = new Date()): ExportBuilderValues {
  const from = new Date(now)
  from.setDate(from.getDate() - 29)
  return { conteudo: 'chamados', desde: isoDate(from), ate: isoDate(now), hospitalId: '', setorId: '', campanhaId: '', nivel: 'completo', orientacao: defaultOrientation('chamados'), formato: 'pdf' }
}

/** Corpo do POST: nível e orientação só para PDF (CSV/XLSX ignoram); o backend aceita qualquer caixa, enviamos maiúsculas. */
export function buildExportBody(values: ExportBuilderValues): ExportRequest {
  const pdf = values.formato === 'pdf'
  const layout = {
    ...(EXPORT_BACKEND_SUPPORT.nivel && pdf ? { nivel: values.nivel.toUpperCase() as 'RESUMO' | 'COMPLETO' } : {}),
    ...(EXPORT_BACKEND_SUPPORT.orientacao && pdf ? { orientacao: values.orientacao.toUpperCase() as 'RETRATO' | 'PAISAGEM' } : {}),
  }
  if (values.conteudo === 'campanha') return { conteudo: 'campanha', formato: values.formato, campanhaId: values.campanhaId, ...layout }
  return {
    conteudo: values.conteudo,
    formato: values.formato,
    ...layout,
    desde: startOfDay(values.desde),
    ate: endOfDay(values.ate),
    ...(values.hospitalId ? { hospitalId: values.hospitalId } : {}),
    ...(values.hospitalId && values.setorId ? { setorId: values.setorId } : {}),
  }
}

/** Mensagem amigável por code do backend; 503 SERVICO_OCUPADO pede nova tentativa. */
export function exportErrorMessage(error: unknown): string {
  const response = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { status?: number; data?: { code?: string; detail?: string } } }).response
    : undefined
  const code = response?.data?.code
  if (response?.status === 503 || code === 'SERVICO_OCUPADO') return 'O serviço de relatórios está ocupado no momento. Aguarde alguns instantes e tente novamente.'
  if (code === 'CAMPANHA_NAO_ENCONTRADA') return 'Campanha não encontrada. Atualize a lista e escolha outra.'
  return response?.data?.detail || (code ? `Não foi possível gerar o relatório (${code}).` : 'Não foi possível gerar o relatório. Tente novamente.')
}

/** "Completo · Paisagem" a partir dos valores efetivos devolvidos pelo backend (qualquer caixa). */
export function exportLayoutLabel(nivel?: string | null, orientacao?: string | null) {
  const pretty = (value?: string | null) => (value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : '')
  return [pretty(nivel), pretty(orientacao)].filter(Boolean).join(' · ')
}

/** Nome do arquivo baixado: relatorio-<tipo>-<data>.<extensão>. */
export function exportFilename(body: ExportRequest, now = new Date()) {
  return `relatorio-${body.conteudo.replaceAll('_', '-')}-${isoDate(now)}.${body.formato}`
}
