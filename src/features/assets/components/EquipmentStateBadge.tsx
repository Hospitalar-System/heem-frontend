import { Badge, type BadgeVariant } from '@/components/ui/Badge'
import { equipmentStateLabel, isKnownState } from '../utils/equipment-state'

/**
 * Cor semântica + estilo de borda (o estado nunca depende só da cor):
 * Apto contínua, Não apto dupla grossa, Em manutenção tracejada, Desativado pontilhada.
 * A borda usa a cor do texto do selo (sem branco, sem barra de opacidade).
 */
const style: Record<string, { tone: BadgeVariant; border: string }> = {
  ATIVO: { tone: 'success', border: 'border border-solid' },
  NAO_APTO: { tone: 'danger', border: 'border-[3px] border-double' },
  EM_MANUTENCAO: { tone: 'warning', border: 'border border-dashed' },
  DESATIVADO: { tone: 'neutral', border: 'border border-dotted' },
  INATIVO: { tone: 'neutral', border: 'border border-solid' },
  DESCARTADO: { tone: 'neutral', border: 'border border-solid' },
}

/** `state` aceita valor desconhecido (enum novo no backend): mostra o texto cru em tom neutro. */
export function EquipmentStateBadge({ state, className = '' }: { state: string | null | undefined; className?: string }) {
  const known = isKnownState(state)
  const { tone, border } = known ? style[state] : { tone: 'neutral' as const, border: 'border border-solid' }
  return <Badge variant={tone} data-state={state ?? ''} data-border={border.includes('double') ? 'double' : border.includes('dashed') ? 'dashed' : border.includes('dotted') ? 'dotted' : 'solid'} className={`${border} border-current ${className}`.trim()}>{equipmentStateLabel(state)}</Badge>
}
