import { describe, expect, it } from 'vitest'
import { endOfSystemDay, startOfSystemDay } from '../system-day'

describe('dia do sistema', () => {
  it('início e fim do dia no fuso do sistema, em UTC', () => {
    expect(startOfSystemDay('2026-11-01')).toBe('2026-11-01T03:00:00.000Z')
    expect(endOfSystemDay('2026-11-30')).toBe('2026-12-01T02:59:59.999Z')
  })

  it('um chamado às 23h do último dia (02:00 UTC do dia seguinte) fica dentro do período', () => {
    const chamado = Date.parse('2026-12-01T02:00:00.000Z')
    expect(chamado).toBeGreaterThanOrEqual(Date.parse(startOfSystemDay('2026-11-01')))
    expect(chamado).toBeLessThanOrEqual(Date.parse(endOfSystemDay('2026-11-30')))
  })
})
