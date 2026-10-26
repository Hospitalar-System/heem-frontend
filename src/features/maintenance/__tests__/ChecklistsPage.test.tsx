import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type PropsWithChildren } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/lib/axios'
import { ChecklistsPage } from '../pages/ChecklistsPage'

vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }))
vi.mock('@/components/layout/AdminPageShell', () => ({
  AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main>,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const checklist = { id: 'checklist-1', nome: 'Inspeção preventiva', ativo: true }
const items = [
  { id: 'item-1', descricao: 'Verificar cabo', tipo: 'BOOLEANO', unidade: null, obrigatorio: true, ordem: 0 },
  { id: 'item-2', descricao: 'Medir pressão', tipo: 'numerico', unidade: 'mmHg', obrigatorio: false, ordem: 1 },
]
let checklistList = [checklist]

function TestProviders({ children }: PropsWithChildren) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }))
  return <QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>
}

describe('ChecklistsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    checklistList = [checklist]
    vi.mocked(apiClient.get).mockImplementation(async (url) => {
      if (url === '/checklists') return { data: checklistList } as never
      if (url === '/checklists/checklist-1/itens') return { data: items } as never
      if (url === '/checklists/checklist-new/itens') return { data: [] } as never
      return { data: [] } as never
    })
    vi.mocked(apiClient.post).mockImplementation(async (url) => {
      if (url === '/checklists') {
        const created = { id: 'checklist-new', nome: 'Novo modelo', ativo: true }
        checklistList = [...checklistList, created]
        return { data: created } as never
      }
      return { data: { id: 'item-new', descricao: 'Teste funcional', tipo: 'TEXTO', unidade: null, obrigatorio: true, ordem: 2 } } as never
    })
    vi.mocked(apiClient.put).mockResolvedValue({ data: {} } as never)
  })

  it('loads checklist and its ordered items from the API', async () => {
    render(<ChecklistsPage />, { wrapper: TestProviders })
    expect(await screen.findByText('Inspeção preventiva')).toBeInTheDocument()
    expect(await screen.findByText('1. Verificar cabo')).toBeInTheDocument()
    expect(screen.getByText('2. Medir pressão')).toBeInTheDocument()
    expect(apiClient.get).toHaveBeenCalledWith('/checklists/checklist-1/itens')
  })

  it('mostra rótulos hospitalares para o tipo e normaliza valores legados ao editar', async () => {
    const user = userEvent.setup()
    render(<ChecklistsPage />, { wrapper: TestProviders })
    await screen.findByText('1. Verificar cabo')
    expect(screen.getByText('Sim ou Não · Obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Número (medição) · mmHg')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toHaveValue('BOOLEANO')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(expect.arrayContaining(['Número (medição)', 'Sim ou Não', 'Texto livre', 'Lista de opções']))
    await user.click(screen.getByText('2. Medir pressão'))
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toHaveValue('NUMERICO')
  })

  it('creates a checklist and adds an item with configured properties', async () => {
    const user = userEvent.setup()
    render(<ChecklistsPage />, { wrapper: TestProviders })
    await user.click(await screen.findByRole('button', { name: 'Novo' }))
    await user.type(screen.getByRole('textbox', { name: 'Código do checklist' }), 'CL-001')
    await user.type(screen.getByRole('textbox', { name: 'Nome do checklist' }), 'Novo modelo')
    await user.type(screen.getByRole('textbox', { name: 'Descrição' }), 'Verificar cabo')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'Sim ou Não')
    await user.click(screen.getByRole('button', { name: 'Criar checklist' }))
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/checklists', {
      codigo: 'CL-001', nome: 'Novo modelo', itens: [
        { descricao: 'Verificar cabo', tipo: 'BOOLEANO', unidade: null, obrigatorio: true },
      ],
    }))

    await user.click((await screen.findAllByRole('button', { name: 'Adicionar item' }))[0])
    await user.type(screen.getByRole('textbox', { name: 'Descrição' }), 'Teste funcional')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tipo' }), 'Lista de opções')
    await user.click(screen.getByRole('checkbox', { name: 'Item obrigatório' }))
    await user.click(screen.getAllByRole('button', { name: 'Adicionar item' })[1])
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/checklists/checklist-new/itens', {
      descricao: 'Teste funcional', tipo: 'SELECAO', unidade: null, obrigatorio: true,
    }))
  })

  it('persists item edits and reordering', async () => {
    const user = userEvent.setup()
    render(<ChecklistsPage />, { wrapper: TestProviders })
    await screen.findByText('1. Verificar cabo')
    await user.clear(screen.getByRole('textbox', { name: 'Descrição' }))
    await user.type(screen.getByRole('textbox', { name: 'Descrição' }), 'Inspecionar cabo')
    await user.click(screen.getByRole('button', { name: 'Salvar item' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/checklists/itens/item-1', {
      descricao: 'Inspecionar cabo', tipo: 'BOOLEANO', unidade: null, obrigatorio: true,
    }))

    screen.getByRole('button', { name: 'Mover Verificar cabo para baixo' }).focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/checklists/checklist-1/itens/ordem', {
      itens: [{ id: 'item-2', ordem: 0 }, { id: 'item-1', ordem: 1 }],
    }))
  })
})
