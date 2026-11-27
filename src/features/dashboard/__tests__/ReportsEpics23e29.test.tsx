import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { chooseOption } from '@/test/select-helpers'
import type { NotDoneVisits, ReportIndicators, TicketRatings } from '../api/reports'
import { ReportIndicatorCards } from '../components/ReportIndicatorCards'
import { ReportNotDoneVisits } from '../components/ReportNotDoneVisits'
import { ReportTicketRatings } from '../components/ReportTicketRatings'

const notDone: NotDoneVisits = {
  encerradas: 24, naoRealizadas: 3, percentual: 12.5,
  porHospital: [{ id: 'h1', nome: 'Hospital São Lucas', encerradas: 24, naoRealizadas: 3, percentual: 12.5 }],
  porSetor: [{ id: 's1', nome: 'UTI Adulto', encerradas: 15, naoRealizadas: 2, percentual: 13.3 }],
  porTecnico: [{ id: 't1', nome: 'Bruno Técnico', encerradas: 24, naoRealizadas: 3, percentual: 12.5 }],
  emUsoSeguidas: [{ equipamentoId: 'e2', codigo: 'EQ-1002', nome: 'Ventilador pulmonar', hospitalNome: 'Hospital São Lucas', setorNome: 'Centro Cirúrgico', seguidas: 2, ultimaEm: '2026-11-20T10:00:00Z' }],
}

describe('Visitas não realizadas (Story 23.7)', () => {
  it('mostra totais, agrupa por hospital, setor ou técnico e lista os equipamentos com visitas seguidas', async () => {
    render(<MemoryRouter><ReportNotDoneVisits data={notDone} /></MemoryRouter>)
    const section = screen.getByRole('region', { name: 'Visitas não realizadas (equipamento em uso)' })
    expect(within(section).getAllByText('24').length).toBeGreaterThan(0)
    expect(within(section).getByRole('table', { name: 'Visitas não realizadas por hospital' })).toHaveTextContent('Hospital São Lucas')
    await chooseOption(userEvent.setup(), 'Agrupar visitas não realizadas por', 'Técnico')
    expect(within(section).getByRole('table', { name: 'Visitas não realizadas por técnico' })).toHaveTextContent('Bruno Técnico')
    const streak = within(section).getByRole('table', { name: 'Equipamentos com visitas seguidas não realizadas' })
    expect(within(streak).getByRole('link', { name: 'Ventilador pulmonar' })).toHaveAttribute('href', '/assets/e2')
  })

  it('sem preventiva encerrada mostra estado vazio e tolera listas ausentes', () => {
    render(<MemoryRouter><ReportNotDoneVisits data={{ encerradas: 0, naoRealizadas: 0, percentual: null } as unknown as NotDoneVisits} /></MemoryRouter>)
    expect(screen.getByText('Nenhuma preventiva encerrada no período para os filtros selecionados.')).toBeInTheDocument()
    expect(screen.getByText('Nenhum equipamento nessa situação.')).toBeInTheDocument()
  })
})

describe('Avaliação dos solicitantes (Story 23.5)', () => {
  const ratings: TicketRatings = { quantidade: 9, media: 4.4, porTecnico: [{ id: 't1', nome: 'Bruno Técnico', quantidade: 7, media: 4.6 }, { id: null, nome: 'x', quantidade: 2, media: 3.5 }], porHospital: [{ id: 'h1', nome: 'Hospital São Lucas', quantidade: 9, media: 4.4 }] }

  it('mostra a média em escala de 5, por técnico (sem responsável nomeado) e por hospital', async () => {
    render(<ReportTicketRatings data={ratings} />)
    const section = screen.getByRole('region', { name: 'Avaliação dos solicitantes' })
    expect(within(section).getAllByText('4,4 / 5').length).toBeGreaterThan(0)
    const table = within(section).getByRole('table', { name: 'Avaliações por técnico' })
    expect(table).toHaveTextContent('Bruno Técnico')
    expect(table).toHaveTextContent('Sem responsável')
    await chooseOption(userEvent.setup(), 'Agrupar avaliações por', 'Hospital')
    expect(within(section).getByRole('table', { name: 'Avaliações por hospital' })).toHaveTextContent('Hospital São Lucas')
  })

  it('sem avaliação mostra estado vazio e média "—"', () => {
    render(<ReportTicketRatings data={{ quantidade: 0, media: null, porTecnico: [], porHospital: [] }} />)
    expect(screen.getByText('Nenhuma avaliação no período para os filtros selecionados.')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })
})

describe('Chamados resolvidos e assinaturas (Story 29.2)', () => {
  const base = { mtbfHoras: 1, mttaHoras: 1, triagemHoras: 1, mttrHoras: 1, esperaPecaHoras: 1, slaAtendimentoPct: 90, slaResolucaoPct: 90, disponibilidadePercentual: 99, qtdOtsPreventivas: 1, qtdOtsCorretivas: 1, preventiva: { atrasadas: 0, concluidasNoPrazo: 0, concluidasForaDoPrazo: 0, percentualNoPrazo: null, canceladas: 0 }, severidadesConsideradas: [] } as ReportIndicators

  it('mostra resolvidos com e sem OT, % sem OT e assinaturas pendentes', () => {
    render(<ReportIndicatorCards metrics={{ ...base, chamadosResolvidosComOt: 6, chamadosResolvidosSemOt: 4, resolvidosSemOtPct: 40, assinaturasPendentes: { ots: 2, chamados: 1, campanhas: 0 } }} />)
    const section = screen.getByRole('region', { name: 'Chamados resolvidos e assinaturas' })
    expect(within(section).getByRole('group', { name: 'Resolvidos com OT' })).toHaveTextContent('6')
    expect(within(section).getByRole('group', { name: 'Resolvidos sem OT' })).toHaveTextContent('4')
    expect(within(section).getByRole('group', { name: 'Assinaturas pendentes: OTs' })).toHaveTextContent('2')
    expect(within(section).getByRole('group', { name: 'Assinaturas pendentes: campanhas' })).toHaveTextContent('0')
  })

  it('backend antigo (sem os campos) não mostra a seção', () => {
    render(<ReportIndicatorCards metrics={base} />)
    expect(screen.queryByRole('region', { name: 'Chamados resolvidos e assinaturas' })).not.toBeInTheDocument()
  })
})
describe('Equipamentos reincidentes (Story 23.8)', () => {
  it('mostra a regra, a lista com link para a ficha e o estado vazio', async () => {
    const { ReportRecurrentEquipment } = await import('../components/ReportRecurrentEquipment')
    const { unmount } = render(<MemoryRouter><ReportRecurrentEquipment data={{ chamadosMinimos: 3, dias: 90, equipamentos: [{ equipamentoId: 'e2', codigo: 'EQ-1002', nome: 'Ventilador pulmonar', hospitalId: 'h1', hospitalNome: 'Hospital São Lucas', setorId: 's2', setorNome: 'Centro Cirúrgico', chamados: 3 }] }} /></MemoryRouter>)
    const section = screen.getByRole('region', { name: 'Equipamentos reincidentes' })
    expect(section).toHaveTextContent('3 ou mais chamados de falha (ou sem tipo) nos últimos 90 dias')
    expect(within(section).getByRole('link', { name: 'Ventilador pulmonar' })).toHaveAttribute('href', '/assets/e2')
    unmount()
    render(<MemoryRouter><ReportRecurrentEquipment data={{ chamadosMinimos: 3, dias: 90, equipamentos: [] }} /></MemoryRouter>)
    expect(screen.getByText('Nenhum equipamento reincidente para os filtros selecionados.')).toBeInTheDocument()
  })
})
