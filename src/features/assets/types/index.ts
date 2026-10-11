export type RiscoSetor = 'CRITICO' | 'SEMI_CRITICO' | 'NAO_CRITICO'
export type GrupoInstalacao = 'GRUPO_0' | 'GRUPO_1' | 'GRUPO_2'

export interface Hospital { id: string; nome: string; cnpj: string }
export interface HospitalInput { nome: string; cnpj: string }
export interface Setor { id: string; hospitalId: string; codigo: string; nome: string; andar?: string | null; classificacaoRisco: RiscoSetor; grupoInstalacao: GrupoInstalacao }
export type SetorInput = Omit<Setor, 'id' | 'hospitalId'>
export interface HospitalMetrics { setores: number; equipamentos: number; ordensDevidas: number | null }
export interface EquipamentoResumo { id: string }
export interface OrdemResumo { equipamentoId: string; dataAgendada: string; status: 'AGENDADA' | 'EM_EXECUCAO' }
