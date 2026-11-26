import { describe, expect, it } from 'vitest'
import { emptyOrigin, ordersForOrigin, originDescription, originErrors, originErrorsFromCode, originPayload, origemManutencaoLabel } from '../utils/origem-manutencao'

describe('origem do Em manutenção (Story 23.1)', () => {
  it('rótulo da coluna Origem nos termos do dossiê', () => {
    expect(origemManutencaoLabel({ tipo: 'ordem_trabalho', ordemTrabalhoId: 'ot-1' })).toBe('OT vinculada')
    expect(origemManutencaoLabel({ tipo: 'justificativa', destino: 'manutencao_externa', fornecedor: 'Assistec' })).toBe('Externa · Assistec')
    expect(origemManutencaoLabel({ tipo: 'justificativa', destino: 'manutencao_hospital' })).toBe('No hospital')
    expect(origemManutencaoLabel({ tipo: 'nao_informada' })).toBe('Não informada')
  })

  it('OTs do seletor: em execução e agendadas primeiro, depois concluídas dos últimos 30 dias; sem canceladas nem não realizadas', () => {
    const now = new Date('2026-11-26T12:00:00Z')
    const orders = [
      { id: 'c-old', codigo: 'C1', tipo: 'PREVENTIVA', status: 'CONCLUIDA', concluidaEm: '2026-10-01T10:00:00Z' },
      { id: 'c-new', codigo: 'C2', tipo: 'PREVENTIVA', status: 'CONCLUIDA', concluidaEm: '2026-11-20T10:00:00Z' },
      { id: 'c-mid', codigo: 'C3', tipo: 'PREVENTIVA', status: 'CONCLUIDA', concluidaEm: '2026-11-05T10:00:00Z' },
      { id: 'ag', codigo: 'A1', tipo: 'PREVENTIVA', status: 'AGENDADA', dataAgendada: '2026-11-30' },
      { id: 'ex', codigo: 'E1', tipo: 'CORRETIVA', status: 'EM_EXECUCAO' },
      { id: 'ca', codigo: 'X1', tipo: 'CORRETIVA', status: 'CANCELADA' },
      { id: 'nr', codigo: 'N1', tipo: 'PREVENTIVA', status: 'NAO_REALIZADA' },
    ]
    expect(ordersForOrigin(orders, now).map((order) => order.id)).toEqual(['ex', 'ag', 'c-new', 'c-mid'])
  })

  it('valida por campo, mapeia códigos do backend, monta o corpo e deriva a descrição', () => {
    expect(originErrors(emptyOrigin)).toEqual({ ot: expect.stringMatching(/Escolha a OT/) })
    const ot = { ...emptyOrigin, ordemTrabalhoId: 'ot-1', ordemTrabalhoCodigo: 'OT-9' }
    expect(originErrors(ot)).toEqual({})
    expect(originPayload(ot)).toEqual({ ordemTrabalhoId: 'ot-1' })
    expect(originDescription(ot)).toBe('OT OT-9')
    const ext = { ...emptyOrigin, mode: 'justificativa' as const, destino: 'manutencao_externa' as const, justificativa: ' ' }
    expect(Object.keys(originErrors(ext))).toEqual(['fornecedor', 'justificativa'])
    expect(originPayload({ ...ext, justificativa: ' Troca ', fornecedor: ' Sul ' })).toEqual({ destino: 'manutencao_externa', justificativa: 'Troca', fornecedor: 'Sul' })
    expect(originDescription({ ...ext, justificativa: 'x'.repeat(250) })).toBe('x'.repeat(200))
    expect(originErrorsFromCode('OT_DE_OUTRO_EQUIPAMENTO')).toHaveProperty('ot')
    expect(originErrorsFromCode('ORIGEM_OBRIGATORIA')).toBeNull()
  })
})
