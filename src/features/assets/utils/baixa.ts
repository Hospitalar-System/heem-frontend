/** Baixa estruturada do equipamento (opcional): motivo, destino e data, valores do contrato da API. */
export type MotivoBaixa = 'OBSOLESCENCIA' | 'DEFEITO_IRREPARAVEL' | 'FIM_VIDA_UTIL' | 'CUSTO_MANUTENCAO' | 'SINISTRO' | 'OUTRO'
export type DestinoBaixa = 'VENDA' | 'DOACAO' | 'DEVOLUCAO_FABRICANTE' | 'SUCATA' | 'OUTRO'

export const motivoBaixaLabels: Record<MotivoBaixa, string> = {
  OBSOLESCENCIA: 'Obsolescência',
  DEFEITO_IRREPARAVEL: 'Defeito irreparável',
  FIM_VIDA_UTIL: 'Fim da vida útil',
  CUSTO_MANUTENCAO: 'Custo de manutenção',
  SINISTRO: 'Sinistro',
  OUTRO: 'Outro',
}

export const destinoBaixaLabels: Record<DestinoBaixa, string> = {
  VENDA: 'Venda',
  DOACAO: 'Doação',
  DEVOLUCAO_FABRICANTE: 'Devolução ao fabricante',
  SUCATA: 'Sucata',
  OUTRO: 'Outro',
}

const toOptions = <T extends string>(labels: Record<T, string>, empty: string) => [{ value: '', label: empty }, ...(Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }))]
export const motivoBaixaOptions = toOptions(motivoBaixaLabels, 'Não informado')
export const destinoBaixaOptions = toOptions(destinoBaixaLabels, 'Não informado')

/** Estados em que a baixa pode ser detalhada (o backend rejeita os campos em qualquer outro). */
export const BAIXA_STATES: readonly string[] = ['INATIVO', 'DESATIVADO', 'DESCARTADO']

export function motivoBaixaLabel(value: string | null | undefined) {
  return value && value in motivoBaixaLabels ? motivoBaixaLabels[value as MotivoBaixa] : value || null
}
export function destinoBaixaLabel(value: string | null | undefined) {
  return value && value in destinoBaixaLabels ? destinoBaixaLabels[value as DestinoBaixa] : value || null
}
/** "2026-11-23" -> "23/11/2026" sem passar por Date (sem deslocamento de fuso). */
export function formatDataBaixa(value: string | null | undefined) {
  const match = value ? /^(\d{4})-(\d{2})-(\d{2})/.exec(value) : null
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null
}
/** Linha secundária do histórico: "Motivo: …, Destino: …, Data da baixa: …" (só o que existir). */
export function baixaSummary(entry: { motivoBaixa?: string | null; destinoBaixa?: string | null; dataBaixa?: string | null }) {
  const parts = [
    motivoBaixaLabel(entry.motivoBaixa) && `Motivo: ${motivoBaixaLabel(entry.motivoBaixa)}`,
    destinoBaixaLabel(entry.destinoBaixa) && `Destino: ${destinoBaixaLabel(entry.destinoBaixa)}`,
    formatDataBaixa(entry.dataBaixa) && `Data da baixa: ${formatDataBaixa(entry.dataBaixa)}`,
  ].filter(Boolean)
  return parts.length ? parts.join(' · ') : null
}
