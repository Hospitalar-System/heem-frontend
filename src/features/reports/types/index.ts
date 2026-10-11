export interface IndicadoresResponse {
  mtbfHoras: number | null
  tempoMedioAtendimentoHoras: number | null
  tempoMedioResolucaoHoras: number | null
  disponibilidadePercentual: number
  qtdOtsPreventivas: number
  qtdOtsCorretivas: number
}

export interface IndicadoresParams {
  desde: string
  ate: string
  hospitalId?: string
  setorId?: string
}

export interface ReportFilters {
  startDate: string
  endDate: string
  hospitalId: string
  setorId: string
}
