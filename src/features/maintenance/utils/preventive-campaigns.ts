import type { CampaignAssignmentMode, CampaignInput, CampaignPendingReason, CampaignRecurrence, CampaignStatus } from '../types/campaigns'
import type { CampaignFormValues } from '../schemas/preventive-campaigns.schema'

export const campaignStatusLabels: Record<CampaignStatus, string> = {
  pendente: 'Na fila',
  processando: 'Gerando OTs',
  concluida: 'Concluída',
  falhou: 'Falhou',
  cancelada: 'Cancelada',
}

export const assignmentModeLabels: Record<CampaignAssignmentMode, string> = {
  tecnico: 'Um técnico',
  equilibrado: 'Dividir entre os técnicos',
  sem_responsavel: 'Sem responsável',
}

export function recurrenceLabel(recorrencia: CampaignRecurrence, intervalo: number | null) {
  if (recorrencia === 'avulsa' || !intervalo) return 'Avulsa'
  const unit = recorrencia === 'dias' ? (intervalo === 1 ? 'dia' : 'dias') : (intervalo === 1 ? 'mês' : 'meses')
  return `A cada ${intervalo} ${unit}`
}

export const pendingReasons: CampaignPendingReason[] = ['SEM_CATEGORIA', 'CATEGORIA_SEM_CHECKLIST', 'CHECKLIST_INDISPONIVEL', 'SEM_TECNICO_DISPONIVEL']

/** Motivo da pendência e como resolvê-la (textos estáveis; o backend só devolve o código). */
export const pendingReasonInfo: Record<CampaignPendingReason, { title: string; help: string }> = {
  SEM_CATEGORIA: { title: 'Sem categoria', help: 'Defina a categoria na ficha do equipamento.' },
  CATEGORIA_SEM_CHECKLIST: { title: 'Categoria sem checklist padrão', help: 'Vincule um checklist padrão à categoria em Categorias.' },
  CHECKLIST_INDISPONIVEL: { title: 'Checklist padrão indisponível', help: 'O checklist da categoria está inativo, foi excluído ou é de outro hospital. Escolha outro checklist padrão para a categoria.' },
  SEM_TECNICO_DISPONIVEL: { title: 'Sem técnico disponível', help: 'Vincule um técnico ativo ao hospital ou escolha outro modo de atribuição.' },
}

/** Corpo EXATO enviado ao backend (prévia e criação), a partir dos valores do formulário. */
export function campaignBody(values: CampaignFormValues): CampaignInput {
  return {
    hospitalId: values.hospitalId,
    nome: values.nome.trim(),
    setorIds: values.setorIds,
    categoriaIds: values.categoriaIds,
    dataInicio: values.dataInicio,
    ...(values.dataFim ? { dataFim: values.dataFim } : {}),
    recorrencia: values.recorrencia,
    ...(values.recorrencia !== 'avulsa' ? { intervalo: Number(values.intervalo) } : {}),
    modoAtribuicao: values.modoAtribuicao,
    ...(values.modoAtribuicao === 'tecnico' ? { tecnicoId: values.tecnicoId } : {}),
  }
}

export type CampaignFormField = 'hospitalId' | 'setorIds' | 'categoriaIds' | 'dataInicio' | 'dataFim' | 'recorrencia' | 'intervalo' | 'modoAtribuicao' | 'tecnicoId'

/** `ProblemDetail.code` do backend (15.2) -> mensagem em pt-BR e campo a destacar. */
const campaignErrors: Record<string, { message: string; field?: CampaignFormField }> = {
  HOSPITAL_INVALIDO: { message: 'O hospital escolhido não existe ou não está disponível. Selecione outro.', field: 'hospitalId' },
  SETOR_INVALIDO: { message: 'Algum setor escolhido não pertence ao hospital selecionado.', field: 'setorIds' },
  CATEGORIA_INVALIDA: { message: 'Alguma categoria escolhida não existe ou está desativada.', field: 'categoriaIds' },
  DATA_INICIO_NO_PASSADO: { message: 'A data de início não pode estar no passado.', field: 'dataInicio' },
  JANELA_INVALIDA: { message: 'A data final não pode ser anterior à data de início.', field: 'dataFim' },
  RECORRENCIA_INVALIDA: { message: 'Recorrência inválida: escolha avulsa, a cada N dias ou a cada N meses, com intervalo maior que zero.', field: 'intervalo' },
  JANELA_MAIOR_QUE_RECORRENCIA: { message: 'O período (início até o fim) não pode alcançar a próxima repetição. Reduza o período ou aumente o intervalo.', field: 'dataFim' },
  MODO_ATRIBUICAO_INVALIDO: { message: 'Modo de atribuição inválido. Escolha outra opção.', field: 'modoAtribuicao' },
  TECNICO_OBRIGATORIO: { message: 'Selecione o técnico responsável.', field: 'tecnicoId' },
  TECNICO_INVALIDO: { message: 'O técnico escolhido está inativo ou não está vinculado a este hospital.', field: 'tecnicoId' },
}

export function campaignApiError(error: unknown, fallback: string): { message: string; field?: CampaignFormField; status?: number; code?: string } {
  const response = typeof error === 'object' && error !== null && 'response' in error
    ? (error as { response?: { status?: number; data?: { detail?: string; code?: string } } }).response
    : undefined
  if (!response) return { message: 'Sem conexão com o servidor. Verifique sua rede e tente novamente.' }
  const status = response.status
  const known = response.data?.code ? campaignErrors[response.data.code] : undefined
  if (known) return { ...known, status, code: response.data?.code }
  if (status === 403) return { message: 'Acesso não permitido. Apenas o administrador do cliente gerencia campanhas de preventiva.', status }
  if (status === 404) return { message: 'Campanha não encontrada. Ela pode ter sido removida ou você não tem acesso a este hospital.', status }
  if (status === 429) return { message: 'Muitas requisições em pouco tempo. Aguarde um instante e tente novamente.', status }
  if (status !== undefined && status >= 500) return { message: 'O servidor está indisponível no momento. Tente novamente em instantes.', status }
  return { message: response.data?.detail ?? fallback, status, code: response.data?.code }
}
