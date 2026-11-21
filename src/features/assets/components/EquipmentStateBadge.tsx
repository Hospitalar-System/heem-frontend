import { CircleCheck, CircleMinus, OctagonX, PowerOff, Trash2, Wrench } from 'lucide-react'
import type { ComponentType } from 'react'
import { Badge } from '@/components/ui/Badge'
import { equipmentStateTone } from '@/lib/status-tones'
import { equipmentStateLabel, isKnownState } from '../utils/equipment-state'

/**
 * Selo do estado do equipamento no mesmo sistema dos demais selos (forma, tamanho, raio e tipografia do `Badge`; tons
 * do mapa único `status-tones`). Sem anel duplo nem borda tracejada: o estado nunca depende só da cor, porque o texto
 * ("Apto", "Não apto", "Em manutenção"...) sempre aparece e cada estado leva um ícone pequeno.
 */
const icons: Record<string, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  ATIVO: CircleCheck,
  NAO_APTO: OctagonX,
  EM_MANUTENCAO: Wrench,
  DESATIVADO: PowerOff,
  INATIVO: CircleMinus,
  DESCARTADO: Trash2,
}

/** `state` aceita valor desconhecido (enum novo no backend): mostra o texto cru em tom neutro, sem ícone. */
export function EquipmentStateBadge({ state, className = '' }: { state: string | null | undefined; className?: string }) {
  const known = isKnownState(state)
  const tone = known ? equipmentStateTone(state) : 'neutral'
  const Icon = known ? icons[state] : null
  return <Badge variant={tone} icon={Icon ? <Icon size={12} strokeWidth={2} /> : undefined} data-state={state ?? ''} data-tone={tone} className={className}>{equipmentStateLabel(state)}</Badge>
}
