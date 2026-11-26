/**
 * Contratos provisórios dos documentos gerados pelo backend de exportação (mesmo fluxo assíncrono:
 * POST cria, GET /relatorios/exportacoes/{id} acompanha e entrega a URL de download).
 * TODO: confirmar nome do conteudo com o backend (laudo_ot e dossie_equipamento são provisórios).
 */
export const DOCUMENT_ENDPOINT = '/relatorios/exportacoes'
/** Confirmado pelo backend (ConteudoExportacao.EMERGENCIAS). */
export const EMERGENCIAS_CONTEUDO = 'emergencias'
export const LAUDO_OT_CONTEUDO = 'laudo_ot'
export const DOSSIE_EQUIPAMENTO_CONTEUDO = 'dossie_equipamento'
/** Story 22.4: comprovante individual do chamado (HEEM-CH), só PDF. */
export const COMPROVANTE_CHAMADO_CONTEUDO = 'comprovante_chamado'

export const laudoOtBody = (ordemTrabalhoId: string) => ({ conteudo: LAUDO_OT_CONTEUDO, formato: 'pdf', ordemTrabalhoId })
export const dossieEquipamentoBody = (equipamentoId: string) => ({ conteudo: DOSSIE_EQUIPAMENTO_CONTEUDO, formato: 'pdf', equipamentoId })
export const comprovanteChamadoBody = (chamadoId: string) => ({ conteudo: COMPROVANTE_CHAMADO_CONTEUDO, formato: 'pdf', chamadoId })

export const OT_TIPO_VALUES = ['preventiva', 'corretiva'] as const
export const OT_STATUS_VALUES = ['agendada', 'em_execucao', 'concluida', 'cancelada'] as const
export const otTipoOptions = [{ value: 'preventiva', label: 'Preventiva' }, { value: 'corretiva', label: 'Corretiva' }]
export const otStatusOptions = [{ value: 'agendada', label: 'Agendada' }, { value: 'em_execucao', label: 'Em execução' }, { value: 'concluida', label: 'Concluída' }, { value: 'cancelada', label: 'Cancelada' }]
