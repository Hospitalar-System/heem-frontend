import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axios from 'axios'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearAuthSession, setAuthSession } from '@/features/auth/session'
import type { UserRole } from '@/features/auth/types'
import { apiClient } from '@/lib/axios'
import { CompanyProfilePage } from '../pages/CompanyProfilePage'
import type { CompanyProfile } from '../types/company'

const { success, error } = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/components/layout/AdminPageShell', () => ({ AdminPageShell: ({ title, children }: PropsWithChildren<{ title: string }>) => <main><h1>{title}</h1>{children}</main> }))
vi.mock('sonner', () => ({ toast: { success, error } }))
vi.mock('@/lib/axios', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))
vi.mock('axios', () => ({ default: { put: vi.fn() } }))

const empty: CompanyProfile = { cadastrada: false, razaoSocial: null, cnpj: null, endereco: { logradouro: null, numero: null, complemento: null, bairro: null, cidade: null, uf: null, cep: null }, contatoTelefone: null, contatoEmail: null, responsavelTecnicoNome: null, responsavelTecnicoCrea: null, contratoNumero: null, corMarca: '#3ED597', logoUrl: null, atualizadoEm: null }
const filled: CompanyProfile = { ...empty, cadastrada: true, razaoSocial: 'MedServ Ltda', cnpj: '11222333000181', contratoNumero: 'CT-1', endereco: { ...empty.endereco, cidade: 'Porto Alegre', uf: 'RS', cep: '90010123' }, corMarca: '#112233', logoUrl: 'https://cdn.test/logo.png' }
let profile: CompanyProfile
const NOTICE = 'O logo e a cor da marca aparecem nos relatórios em PDF (cabeçalho e destaques). Sem logo, os relatórios mostram só o nome da empresa.'

function login(role: UserRole) {
  clearAuthSession()
  setAuthSession('token', { id: 'u1', name: 'Teste', roles: [role], tenantId: 'tenant-1' })
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/settings/company']}><Routes><Route path="/settings/company" element={<CompanyProfilePage />} /><Route path="/access-denied" element={<p>negado</p>} /></Routes></MemoryRouter></QueryClientProvider>)
}

const png = (size = 1024, type = 'image/png') => new File([new Uint8Array(size)], 'logo.png', { type })
const uploader = () => userEvent.setup({ applyAccept: false })

beforeEach(() => {
  vi.clearAllMocks()
  profile = { ...filled }
  vi.mocked(apiClient.get).mockImplementation(async () => ({ data: profile }) as never)
  vi.mocked(apiClient.put).mockImplementation(async (_url, body) => ({ data: { ...profile, ...(body as object) } }) as never)
  vi.mocked(apiClient.post).mockResolvedValue({ data: { chave: 'prestadora/logo-1', uploadUrl: 'https://storage.test/put?sig=1', expiraEm: '2026-01-01T00:00:00Z' } } as never)
  vi.mocked(apiClient.delete).mockResolvedValue({ data: null } as never)
  vi.mocked(axios.put).mockResolvedValue({} as never)
  login('admin_cliente')
})
afterEach(() => clearAuthSession())

describe('Perfil da empresa: cadastro', () => {
  it('mostra o aviso sobre os relatórios e o banner quando não cadastrada', async () => {
    profile = { ...empty }
    renderPage()
    expect(await screen.findByText('Complete razão social e CNPJ para que o perfil apareça nos relatórios.')).toBeInTheDocument()
    expect(screen.getByText(NOTICE)).toBeVisible()
  })

  it('não mostra o banner quando já cadastrada, mas mantém o aviso', async () => {
    renderPage()
    await screen.findByDisplayValue('MedServ Ltda')
    expect(screen.queryByText(/Complete razão social e CNPJ/)).not.toBeInTheDocument()
    expect(screen.getByText(NOTICE)).toBeVisible()
  })

  it('exige razão social e CNPJ e bloqueia CNPJ inválido, UF, CEP e e-mail inválidos', async () => {
    profile = { ...empty }
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByRole('button', { name: 'Salvar cadastro' }))
    expect(await screen.findByText('Informe a razão social.')).toBeInTheDocument()
    expect(screen.getByText('Informe o CNPJ.')).toBeInTheDocument()

    await user.type(screen.getByLabelText(/^Razão social/), 'MedServ')
    await user.type(screen.getByLabelText(/^CNPJ/), '11222333000180')
    await user.type(screen.getByLabelText(/^UF/), 'XX')
    await user.type(screen.getByLabelText(/^CEP/), '1234')
    await user.type(screen.getByLabelText(/^E-mail/), 'sem-arroba')
    await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
    expect(await screen.findByText('Informe um CNPJ válido.')).toBeInTheDocument()
    expect(screen.getByText('Informe uma UF válida (2 letras).')).toBeInTheDocument()
    expect(screen.getByText('Informe um CEP com 8 dígitos.')).toBeInTheDocument()
    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(apiClient.put).not.toHaveBeenCalled()
  })

  it('bloqueia campos acima dos limites', async () => {
    const user = userEvent.setup()
    renderPage()
    const razao = await screen.findByLabelText(/^Razão social/)
    await user.clear(razao)
    fireEvent.change(razao, { target: { value: 'a'.repeat(151) } })
    fireEvent.change(screen.getByLabelText('Bairro'), { target: { value: 'b'.repeat(101) } })
    fireEvent.change(screen.getByLabelText('CREA'), { target: { value: 'c'.repeat(31) } })
    fireEvent.change(screen.getByLabelText('Número do contrato'), { target: { value: 'd'.repeat(61) } })
    await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
    expect(await screen.findByText('Razão social: no máximo 150 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Bairro: no máximo 100 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('CREA: no máximo 30 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Contrato: no máximo 60 caracteres.')).toBeInTheDocument()
    expect(apiClient.put).not.toHaveBeenCalled()
  })

  it('aplica máscaras e envia o corpo do PUT sem cadastrada, corMarca, logoUrl e atualizadoEm', async () => {
    profile = { ...empty }
    const user = userEvent.setup()
    renderPage()
    await user.type(await screen.findByLabelText(/^Razão social/), '  MedServ Ltda ')
    await user.type(screen.getByLabelText(/^CNPJ/), '11222333000181')
    expect(screen.getByLabelText(/^CNPJ/)).toHaveValue('11.222.333/0001-81')
    await user.type(screen.getByLabelText(/^CEP/), '90010123')
    expect(screen.getByLabelText(/^CEP/)).toHaveValue('90010-123')
    await user.type(screen.getByLabelText(/^UF/), 'rs')
    expect(screen.getByLabelText(/^UF/)).toHaveValue('RS')
    await user.type(screen.getByLabelText('Cidade'), 'Porto Alegre')
    await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledTimes(1))
    expect(apiClient.put).toHaveBeenCalledWith('/prestadora', {
      razaoSocial: 'MedServ Ltda', cnpj: '11222333000181', contratoNumero: null,
      endereco: { logradouro: null, numero: null, complemento: null, bairro: null, cidade: 'Porto Alegre', uf: 'RS', cep: '90010123' },
      contatoTelefone: null, contatoEmail: null, responsavelTecnicoNome: null, responsavelTecnicoCrea: null,
    })
    const body = vi.mocked(apiClient.put).mock.calls[0][1] as Record<string, unknown>
    for (const key of ['cadastrada', 'corMarca', 'logoUrl', 'atualizadoEm']) expect(body).not.toHaveProperty(key)
    await waitFor(() => expect(success).toHaveBeenCalledWith('Perfil da empresa salvo.'))
  })

  it('traduz VALIDACAO_FALHOU e ACESSO_NEGADO', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByDisplayValue('MedServ Ltda')
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { status: 400, data: { code: 'VALIDACAO_FALHOU' } } })
    await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Os dados não foram aceitos. Revise os campos e tente novamente.')
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { status: 403, data: { code: 'ACESSO_NEGADO' } } })
    await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
    expect(await screen.findByText('Seu perfil não pode alterar o perfil da empresa.')).toBeInTheDocument()
  })

  it('409 PRESTADORA_CONCORRENTE mostra a mensagem e recarrega o perfil pelo botão', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByDisplayValue('MedServ Ltda')
    vi.mocked(apiClient.put).mockRejectedValueOnce({ response: { status: 409, data: { code: 'PRESTADORA_CONCORRENTE' } } })
    await user.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
    expect(await screen.findByText(/Outra pessoa acabou de cadastrar o perfil da empresa\. Recarregue a página e tente de novo\./)).toBeInTheDocument()
    const getCalls = vi.mocked(apiClient.get).mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Recarregar perfil' }))
    await waitFor(() => expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(getCalls))
    expect(screen.queryByRole('button', { name: 'Recarregar perfil' })).not.toBeInTheDocument()
  })
})

describe('Perfil da empresa: cor da marca', () => {
  it('bloqueia hex inválido e só salva cor válida em PUT /marca', async () => {
    const user = userEvent.setup()
    renderPage()
    const hex = await screen.findByLabelText('Cor (#RRGGBB)')
    await user.clear(hex)
    await user.type(hex, '#12')
    expect(screen.getByText('Use o formato #RRGGBB, por exemplo #3ED597.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar cor' })).toBeDisabled()
    await user.clear(hex)
    await user.type(hex, '#aa5500')
    expect(screen.getByRole('button', { name: 'Salvar cor' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Salvar cor' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/prestadora/marca', { corMarca: '#AA5500' }))
  })

  it('restaurar padrão volta para #3ED597 e salva null', async () => {
    const user = userEvent.setup()
    renderPage()
    const hex = await screen.findByLabelText('Cor (#RRGGBB)')
    expect(hex).toHaveValue('#112233')
    await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }))
    expect(hex).toHaveValue('#3ED597')
    await user.click(screen.getByRole('button', { name: 'Salvar cor' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/prestadora/marca', { corMarca: null }))
  })

  it('avisa quando o contraste do texto é baixo', async () => {
    const user = userEvent.setup()
    renderPage()
    const hex = await screen.findByLabelText('Cor (#RRGGBB)')
    expect(screen.queryByText(/Contraste baixo/)).not.toBeInTheDocument()
    await user.clear(hex)
    await user.type(hex, '#787878')
    expect(screen.getByText(/Contraste baixo/)).toBeInTheDocument()
  })

  it('permite salvar a cor antes do cadastro completo', async () => {
    profile = { ...empty }
    const user = userEvent.setup()
    renderPage()
    const hex = await screen.findByLabelText('Cor (#RRGGBB)')
    await user.clear(hex)
    await user.type(hex, '#112233')
    await user.click(screen.getByRole('button', { name: 'Salvar cor' }))
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/prestadora/marca', { corMarca: '#112233' }))
  })
})

describe('Perfil da empresa: logo', () => {
  it('envia o logo em 3 passos, com PUT limpo sem Authorization, e mostra Enviando…', async () => {
    profile = { ...filled, logoUrl: null }
    let release: () => void = () => {}
    vi.mocked(axios.put).mockImplementation(() => new Promise((resolve) => { release = () => resolve({} as never) }))
    const user = uploader()
    renderPage()
    const file = png(2048)
    await user.upload(await screen.findByLabelText('Arquivo do logo'), file)
    await user.click(screen.getByRole('button', { name: 'Enviar logo' }))
    expect(await screen.findByRole('button', { name: 'Enviando…' })).toBeDisabled()
    await waitFor(() => expect(axios.put).toHaveBeenCalled())
    release()
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith('/prestadora/logo', { chave: 'prestadora/logo-1' }))
    expect(apiClient.post).toHaveBeenCalledWith('/prestadora/logo/upload-url', { contentType: 'image/png' })
    expect(axios.put).toHaveBeenCalledWith('https://storage.test/put?sig=1', file, { headers: { 'Content-Type': 'image/png' } })
    expect(vi.mocked(axios.put).mock.calls[0][2]).not.toHaveProperty('headers.Authorization')
    await waitFor(() => expect(success).toHaveBeenCalledWith('Logo atualizado.'))
  })

  it('mostra a prévia local antes de enviar', async () => {
    profile = { ...filled, logoUrl: null }
    const create = vi.fn(() => 'blob:preview')
    Object.defineProperty(URL, 'createObjectURL', { value: create, configurable: true })
    Object.defineProperty(URL, 'revokeObjectURL', { value: vi.fn(), configurable: true })
    const user = uploader()
    renderPage()
    await user.upload(await screen.findByLabelText('Arquivo do logo'), png())
    expect(await screen.findByAltText('Pré-visualização do novo logo')).toHaveAttribute('src', 'blob:preview')
    expect(apiClient.post).not.toHaveBeenCalled()
  })

  it('bloqueia arquivo acima de 2 MB e tipo inválido, sem chamar a API', async () => {
    const user = uploader()
    renderPage()
    const input = await screen.findByLabelText('Arquivo do logo')
    await user.upload(input, png(2 * 1024 * 1024 + 1))
    expect(await screen.findByText('Arquivo muito grande. O logo deve ter no máximo 2 MB.')).toBeInTheDocument()
    await user.upload(input, png(10, 'image/gif'))
    expect(await screen.findByText('Formato não aceito. Envie uma imagem PNG ou JPEG.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Enviar logo' })).not.toBeInTheDocument()
    expect(apiClient.post).not.toHaveBeenCalled()
    expect(axios.put).not.toHaveBeenCalled()
  })

  it('remove o logo só depois da confirmação', async () => {
    const user = userEvent.setup()
    renderPage()
    expect(await screen.findByAltText('Logo atual da empresa')).toHaveAttribute('src', 'https://cdn.test/logo.png')
    await user.click(screen.getByRole('button', { name: 'Remover logo' }))
    expect(apiClient.delete).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))
    expect(apiClient.delete).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Remover logo' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/prestadora/logo'))
  })
})

describe('Perfil da empresa: leitura e acesso', () => {
  it.each([['tecnico'], ['interno_hospital']] as [UserRole][])('%s vê tudo em leitura, sem ações', async (role) => {
    login(role)
    renderPage()
    expect(await screen.findByDisplayValue('MedServ Ltda')).toBeDisabled()
    expect(screen.getByLabelText(/^CNPJ/)).toHaveValue('11.222.333/0001-81')
    expect(screen.getByLabelText('Cor (#RRGGBB)')).toBeDisabled()
    expect(screen.getByAltText('Logo atual da empresa')).toBeInTheDocument()
    expect(screen.getByText(NOTICE)).toBeVisible()
    for (const name of ['Salvar cadastro', 'Salvar cor', 'Restaurar padrão', 'Trocar logo', 'Remover logo', 'Enviar logo']) expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Arquivo do logo')).not.toBeInTheDocument()
  })

  it('super_admin não acessa', async () => {
    login('super_admin')
    renderPage()
    expect(await screen.findByText('negado')).toBeInTheDocument()
    expect(apiClient.get).not.toHaveBeenCalled()
  })
})
