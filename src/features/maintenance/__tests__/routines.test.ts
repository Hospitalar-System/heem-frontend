import { describe, expect, it } from 'vitest'
import type { PreventivePlan } from '../types'
import type { Campaign } from '../types/campaigns'
import { campaignScope, campaignSituation, campaignToRoutine, isRoutineActive, planToRoutine, routineOtsLink, scopeFromUrl, sortByNextExecution, type RoutineSituation } from '../utils/routines'

const base = { id: 'p1', equipamentoId: 'e1', checklistId: 'c1', tecnicoPadraoId: 't1', intervaloDias: 30, dataAncora: '2026-01-01', proximaData: '2026-12-01', ativo: true, pendencia: false, createdAt: '', updatedAt: '' } satisfies PreventivePlan
const camp = (extra: Partial<Campaign>) => ({ id: 'k1', nome: 'K', setorIds: [], status: 'concluida', ativa: true, proximaData: '2026-11-01', ots: { total: 2, agendadas: 0, emExecucao: 0, concluidas: 1, canceladas: 0, atrasadas: 0 }, ...extra }) as Campaign

describe('rotinas preventivas: utilitários', () => {
  it('normaliza a situação da campanha', () => {
    expect(campaignSituation({ status: 'pendente', ativa: true, proximaData: null })).toBe('em_execucao')
    expect(campaignSituation({ status: 'processando', ativa: true, proximaData: null })).toBe('em_execucao')
    expect(campaignSituation({ status: 'falhou', ativa: true, proximaData: null })).toBe('falhou')
    expect(campaignSituation({ status: 'cancelada', ativa: false, proximaData: null })).toBe('cancelada')
    expect(campaignSituation({ status: 'concluida', ativa: true, proximaData: '2026-11-01' })).toBe('ativa')
    expect(campaignSituation({ status: 'concluida', ativa: false, proximaData: null })).toBe('concluida')
    expect(campaignSituation({ status: 'concluida', ativa: true, proximaData: null })).toBe('concluida')
  })

  it('Falhou conta como ativa para o filtro; concluída, cancelada e inativa não', () => {
    const active: RoutineSituation[] = ['ativa', 'em_execucao', 'falhou']
    const inactive: RoutineSituation[] = ['concluida', 'cancelada', 'inativa']
    expect(active.every(isRoutineActive)).toBe(true)
    expect(inactive.some(isRoutineActive)).toBe(false)
  })

  it('escopo da campanha: sem setor = hospital, com setor = setor', () => {
    expect(campaignScope({ setorIds: [] })).toBe('hospital')
    expect(campaignScope({ setorIds: ['s1', 's2'] })).toBe('setor')
  })

  it('plano usa proximaExecucao (cai para proximaData), progresso e situação; inativo não tem próxima', () => {
    expect(planToRoutine({ ...base, otsGeradas: 5, otsConcluidas: 2, proximaExecucao: '2026-11-15' })).toMatchObject({ next: '2026-11-15', total: 5, concluidas: 2, situation: 'ativa', scope: 'equipamento' })
    expect(planToRoutine(base)).toMatchObject({ next: '2026-12-01', total: 0, concluidas: 0 })
    expect(planToRoutine({ ...base, ativo: false })).toMatchObject({ next: null, situation: 'inativa' })
  })

  it('campanha usa proximaData e os contadores do painel', () => {
    expect(campaignToRoutine(camp({}))).toMatchObject({ next: '2026-11-01', total: 2, concluidas: 1, scope: 'hospital' })
    expect(campaignToRoutine(camp({ ativa: false }))).toMatchObject({ next: null })
  })

  it('ordena pela próxima execução, sem data por último', () => {
    const list = [campaignToRoutine(camp({ id: 'a', nome: 'A', ativa: false })), planToRoutine({ ...base, id: 'b', proximaData: '2026-12-01' }), campaignToRoutine(camp({ id: 'c', nome: 'C', proximaData: '2026-11-01' }))]
    expect(sortByNextExecution(list).map((routine) => routine.key)).toEqual(['campanha:c', 'plano:b', 'campanha:a'])
  })

  it('monta o link para a lista de OTs e lê o escopo da URL', () => {
    expect(routineOtsLink(planToRoutine(base))).toBe('/work-orders?planoPreventivoId=p1')
    expect(routineOtsLink(campaignToRoutine(camp({})))).toBe('/work-orders?campanhaPreventivaId=k1')
    expect(scopeFromUrl('setor')).toBe('setor')
    expect(scopeFromUrl('qualquer')).toBe('')
    expect(scopeFromUrl(null)).toBe('')
  })
})
