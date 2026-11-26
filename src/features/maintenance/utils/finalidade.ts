/** Finalidade da OT (opcional). O texto da tela diz só "Finalidade"; os valores são os do contrato da API. */
export type Finalidade = 'RECORRENTE' | 'POS_REPARO' | 'ACEITACAO'

export const finalidadeLabels: Record<Finalidade, string> = {
  RECORRENTE: 'Recorrente',
  POS_REPARO: 'Pós-reparo',
  ACEITACAO: 'Aceitação',
}

/** Opções do Select: "Não informada" = sem valor (o campo não vai no corpo). */
export const finalidadeOptions = [
  { value: '', label: 'Não informada' },
  ...(Object.keys(finalidadeLabels) as Finalidade[]).map((value) => ({ value, label: finalidadeLabels[value] })),
]

export function finalidadeLabel(value: string | null | undefined) {
  return value && value in finalidadeLabels ? finalidadeLabels[value as Finalidade] : null
}
