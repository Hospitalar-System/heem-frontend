import type { CSSProperties } from 'react'

/** Estilos do tooltip dos gráficos pelos tokens do tema: mesmo padrão visual dos cartões (surface/border). */
export const chartTooltipContentStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
  color: 'var(--text-primary)',
  fontSize: 12,
}

export const chartTooltipLabelStyle: CSSProperties = { color: 'var(--text-primary)', fontWeight: 600 }

export const chartTooltipItemStyle: CSSProperties = { color: 'var(--text-primary)' }

/** Destaque discreto da coluna sob o cursor: tom de texto com baixa opacidade, nunca cobre a barra. */
export const chartTooltipCursor = { fill: 'color-mix(in srgb, var(--text-muted) 14%, transparent)' }

/**
 * Props comuns do <Tooltip> de todos os gráficos (recharts), legíveis nos temas claro e escuro.
 * Use como <Tooltip {...chartTooltipProps} formatter={...} />: o recharts só reconhece o <Tooltip> direto, não um wrapper.
 */
export const chartTooltipProps = {
  cursor: chartTooltipCursor,
  contentStyle: chartTooltipContentStyle,
  labelStyle: chartTooltipLabelStyle,
  itemStyle: chartTooltipItemStyle,
}
