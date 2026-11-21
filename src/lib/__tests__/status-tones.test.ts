import { describe, expect, it } from 'vitest'
import { equipmentStateTone, severityTone, slaTones, ticketStatusTone, workOrderStatusTone } from '../status-tones'

describe('tons dos selos', () => {
  it('estado do chamado: aberto neutro, em andamento azul, resolvido verde, cancelado cinza', () => {
    expect(ticketStatusTone('ABERTO')).toBe('neutral')
    expect(ticketStatusTone('EM_ANDAMENTO')).toBe('info')
    expect(ticketStatusTone('RESOLVIDO')).toBe('success')
    expect(ticketStatusTone('CANCELADO')).toBe('muted')
    expect(ticketStatusTone('AGUARDANDO_PEÇA')).toBe('warning')
  })

  it('estado da OT segue a mesma lógica', () => {
    expect(workOrderStatusTone('AGENDADA')).toBe('neutral')
    expect(workOrderStatusTone('EM_EXECUCAO')).toBe('info')
    expect(workOrderStatusTone('CONCLUIDA')).toBe('success')
    expect(workOrderStatusTone('CANCELADA')).toBe('muted')
  })

  it('severidade: crítica vermelho, alta âmbar, média e baixa neutros', () => {
    expect(severityTone('CRITICA')).toBe('danger')
    expect(severityTone('ALTA')).toBe('warning')
    expect(severityTone('MEDIA')).toBe('neutral')
    expect(severityTone('BAIXA')).toBe('neutral')
  })

  it('SLA: verde, âmbar e vermelho, os três em contorno (forma própria da família)', () => {
    expect(slaTones.no_prazo).toEqual({ tone: 'success', outline: true })
    expect(slaTones.em_risco).toEqual({ tone: 'warning', outline: true })
    expect(slaTones.vencido).toEqual({ tone: 'danger', outline: true })
  })

  it('estado do equipamento: tons distintos por estado', () => {
    expect(equipmentStateTone('ATIVO')).toBe('success')
    expect(equipmentStateTone('NAO_APTO')).toBe('danger')
    expect(equipmentStateTone('EM_MANUTENCAO')).toBe('warning')
    expect(equipmentStateTone('DESATIVADO')).toBe('neutral')
    expect(equipmentStateTone('INATIVO')).toBe('muted')
    expect(equipmentStateTone('DESCARTADO')).toBe('muted')
  })
})
