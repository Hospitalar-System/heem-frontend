/** Origem do intervalo do plano preventivo (opcional) e justificativa livre; valores do contrato da API. */
export type OrigemIntervalo = 'FABRICANTE' | 'RISCO' | 'HISTORICO' | 'OUTRO'

export const JUSTIFICATIVA_MAX = 300

export const origemIntervaloLabels: Record<OrigemIntervalo, string> = {
  FABRICANTE: 'Fabricante',
  RISCO: 'Risco do equipamento',
  HISTORICO: 'Histórico de falhas',
  OUTRO: 'Outro',
}

export const origemIntervaloOptions = [
  { value: '', label: 'Não informada' },
  ...(Object.keys(origemIntervaloLabels) as OrigemIntervalo[]).map((value) => ({ value, label: origemIntervaloLabels[value] })),
]

export function origemIntervaloLabel(value: string | null | undefined) {
  return value && value in origemIntervaloLabels ? origemIntervaloLabels[value as OrigemIntervalo] : value || null
}
