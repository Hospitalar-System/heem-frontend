import { formatBr, parseDate } from '@/components/ui/civil-date'

/** `YYYY-MM-DD` -> `DD/MM/AAAA` sem passar por Date (evita deslocar o dia pelo fuso). */
export function formatPlanDate(value?: string | null) {
  const date = parseDate(value)
  return date ? formatBr(date) : '—'
}

export type PlanFormField = 'checklistId' | 'tecnicoPadraoId'

/** Erros do `ProblemDetail.code` do backend (9.1), com o campo do formulário a destacar quando houver. */
const planErrors: Record<string, { message: string; field?: PlanFormField }> = {
  PLANO_DUPLICADO: { message: 'Já existe um plano ativo para este equipamento e checklist.', field: 'checklistId' },
  TECNICO_PADRAO_INVALIDO: { message: 'O técnico padrão precisa ter papel de técnico e estar vinculado ao hospital do equipamento.', field: 'tecnicoPadraoId' },
  CHECKLIST_DE_OUTRO_HOSPITAL: { message: 'Este checklist pertence a outro hospital.', field: 'checklistId' },
  PLANO_INATIVO: { message: 'Este plano foi desativado e não pode mais ser editado.' },
}

export function planApiError(error: unknown, fallback: string): { message: string; field?: PlanFormField; status?: number; code?: string } {
  const response = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { status?: number; data?: { detail?: string; code?: string } } }).response
    : undefined
  const status = response?.status
  const known = response?.data?.code ? planErrors[response.data.code] : undefined
  if (known) return { ...known, status, code: response?.data?.code }
  if (status === 403) return { message: 'Acesso não permitido. Apenas o administrador do cliente gerencia planos preventivos.', status }
  if (status === 404) return { message: 'Plano preventivo não encontrado. A lista foi atualizada.', status }
  return { message: response?.data?.detail ?? fallback, status }
}
