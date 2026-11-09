import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { EquipmentListTable } from '../components/EquipmentListTable'
import { formatLastMaintenance } from '../utils/last-maintenance'
import type { Equipment } from '../types'

vi.mock('../components/EquipmentPhotoSection', () => ({ EquipmentThumb: () => null }))

const base = {
  setorId: 'sector-1', modelo: 'X', numeroSerie: '1', marca: 'M', fotoUrl: null, categoriaNome: null, dadosGerais: {}, classeRiscoAnvisa: 'II',
  statusCicloVida: 'ATIVO', criticidade: 'MEDIA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_B', modoOperacao: 'CONTINUO',
  dataInstalacao: null, dataGarantiaFim: null, nivelRisco: 'BAIXO',
}
const items = [
  { ...base, id: 'e1', codigo: 'EQ-1', nome: 'Ventilador', ultimaManutencaoEm: '2026-10-20T15:30:00Z' },
  { ...base, id: 'e2', codigo: 'EQ-2', nome: 'Monitor', ultimaManutencaoEm: null },
  { ...base, id: 'e3', codigo: 'EQ-3', nome: 'Bomba' },
] as unknown as Equipment[]

describe('última manutenção na lista de equipamentos', () => {
  it('formata o instante em dd/mm/aaaa e trata nulo, ausente e inválido como sem manutenção', () => {
    expect(formatLastMaintenance('2026-10-20T15:30:00Z')).toMatch(/^20\/10\/2026$/)
    expect(formatLastMaintenance(null)).toBeNull()
    expect(formatLastMaintenance(undefined)).toBeNull()
    expect(formatLastMaintenance('lixo')).toBeNull()
  })

  it('mostra a data na coluna "Últ. manut." e traço quando nunca houve', () => {
    render(<MemoryRouter><EquipmentListTable items={items} sectorNameById={new Map([['sector-1', 'UTI']])} /></MemoryRouter>)
    // Só o equipamento com manutenção concluída mostra data; nulo e ausente ficam com traço.
    expect(screen.getAllByText(/\d{2}\/\d{2}\/\d{4}/)).toHaveLength(1)
    expect(screen.getByText('20/10/2026')).toBeInTheDocument()
    expect(screen.getAllByTitle('Nenhuma manutenção concluída')).toHaveLength(2)
    expect(screen.getByRole('columnheader', { name: 'Últ. manut.' })).toBeInTheDocument()
  })
})
