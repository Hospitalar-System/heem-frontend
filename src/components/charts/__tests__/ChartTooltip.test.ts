import { describe, expect, it } from 'vitest'
import { chartTooltipProps } from '../ChartTooltip'

describe('chartTooltipProps', () => {
  it('usa tokens do tema para fundo, borda, rótulo e valor', () => {
    expect(chartTooltipProps.contentStyle.background).toBe('var(--surface)')
    expect(chartTooltipProps.contentStyle.border).toBe('1px solid var(--border)')
    expect(chartTooltipProps.labelStyle.color).toBe('var(--text-primary)')
    expect(chartTooltipProps.itemStyle.color).toBe('var(--text-primary)')
  })

  it('usa destaque discreto e translúcido, sem cobrir a barra', () => {
    expect(chartTooltipProps.cursor.fill).toContain('color-mix')
    expect(chartTooltipProps.cursor.fill).toContain('transparent')
  })
})
