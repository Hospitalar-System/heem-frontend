import { describe, expect, it } from 'vitest'
import { emptyOrigin, originDescription, originError, originPayload, origemManutencaoSummary } from '../utils/origem-manutencao'

describe('origem do Em manutenção (Story 23.1)', () => {
  it('não repete a justificativa quando ela já é a descrição derivada', () => {
    const origem = { tipo: 'justificativa', destino: 'manutencao_hospital', justificativa: 'Placa queimada' }
    expect(origemManutencaoSummary(origem, 'Placa queimada')).toBe('Origem: Manutenção no hospital')
    expect(origemManutencaoSummary(origem, 'Outra descrição')).toBe('Origem: Manutenção no hospital · Justificativa: Placa queimada')
    const long = 'x'.repeat(250)
    expect(origemManutencaoSummary({ ...origem, justificativa: long }, 'x'.repeat(200))).toBe('Origem: Manutenção no hospital')
  })

  it('valida, monta o corpo e deriva a descrição', () => {
    expect(originError(emptyOrigin)).toMatch(/Escolha a OT/)
    const ot = { ...emptyOrigin, ordemTrabalhoId: 'ot-1', ordemTrabalhoCodigo: 'OT-9' }
    expect(originPayload(ot)).toEqual({ ordemTrabalhoId: 'ot-1' })
    expect(originDescription(ot)).toBe('OT OT-9')
    const ext = { ...emptyOrigin, mode: 'justificativa' as const, destino: 'manutencao_externa' as const, justificativa: ' Troca ' }
    expect(originError(ext)).toMatch(/fornecedor/)
    expect(originPayload({ ...ext, fornecedor: ' Sul ' })).toEqual({ destino: 'manutencao_externa', justificativa: 'Troca', fornecedor: 'Sul' })
    expect(originDescription(ext)).toBe('Troca')
  })
})
