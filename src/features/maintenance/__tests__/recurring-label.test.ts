import { describe, expect, it } from 'vitest'
import { recurringNextLabel } from '../utils/preventive-campaigns'

describe('recurringNextLabel', () => {
  it('mostra "Recorrente, próxima execução dd/mm" para campanha recorrente ativa', () => {
    expect(recurringNextLabel({ recorrencia: 'meses', ativa: true, proximaData: '2026-12-15' })).toBe('Recorrente, próxima execução 15/12')
    expect(recurringNextLabel({ recorrencia: 'dias', ativa: true, proximaData: '2026-11-03' })).toBe('Recorrente, próxima execução 03/11')
  })

  it('não mostra para avulsa, inativa ou sem próxima data', () => {
    expect(recurringNextLabel({ recorrencia: 'avulsa', ativa: true, proximaData: '2026-12-15' })).toBeNull()
    expect(recurringNextLabel({ recorrencia: 'meses', ativa: false, proximaData: '2026-12-15' })).toBeNull()
    expect(recurringNextLabel({ recorrencia: 'meses', ativa: true, proximaData: null })).toBeNull()
  })
})
