/* eslint-disable testing-library/no-node-access -- verificações de atributos do campo isca e de ids de erro */
import { render, screen, within, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AxiosError, type AxiosResponse } from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/app/theme-provider'
import { clearAuthSession } from '@/features/auth/session'
import { enviarLead } from '../api/enviarLead'
import { DialogoAgendar } from '../components/DialogoAgendar'
import type { Interesse } from '../content/vitrine'
import { LandingPage } from '../pages/LandingPage'

vi.mock('../api/enviarLead', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/enviarLead')>()),
  enviarLead: vi.fn(),
}))
const enviar = vi.mocked(enviarLead)

const DADOS = { nome: 'Maria Souza', email: 'Maria@Hospital.ORG.br', organizacao: 'Hospital Santa Casa' }

function erroHttp(status: number, data?: unknown, headers: Record<string, string> = {}) {
  const resposta = { status, statusText: '', data, headers, config: {} } as unknown as AxiosResponse
  return new AxiosError('falhou', String(status), undefined, undefined, resposta)
}

function renderLanding() {
  return render(
    <ThemeProvider>
      <MemoryRouter><LandingPage /></MemoryRouter>
    </ThemeProvider>,
  )
}

function renderDialogo(interesse?: Interesse, onFechar = vi.fn()) {
  render(<DialogoAgendar interesse={interesse} onFechar={onFechar} />)
  return { onFechar }
}

async function preencher(user: ReturnType<typeof userEvent.setup>, { consentir = true } = {}) {
  await user.type(screen.getByLabelText('Nome completo *'), `  ${DADOS.nome}  `)
  await user.type(screen.getByLabelText('E-mail profissional *'), DADOS.email)
  await user.type(screen.getByLabelText('Hospital ou instituição *'), DADOS.organizacao)
  if (consentir) await user.click(screen.getByRole('checkbox'))
}

const botaoEnviar = () => screen.getByRole('button', { name: /Enviar cadastro|Tentar de novo|Enviando/ })

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia
  clearAuthSession()
  enviar.mockReset()
})
afterEach(() => vi.restoreAllMocks())

describe('abertura pelos botões "Agendar demonstração"', () => {
  it('nav, hero e chamada final abrem o diálogo e devolvem o foco ao botão de origem', async () => {
    const user = userEvent.setup()
    renderLanding()
    const origens = [
      within(screen.getByRole('banner')).getByRole('button', { name: 'Agendar demonstração' }),
      within(screen.getByRole('region', { name: /A engenharia clínica/ })).getByRole('button', { name: 'Agendar demonstração' }),
      within(screen.getByRole('region', { name: /Veja o/ })).getByRole('button', { name: 'Agendar demonstração' }),
    ]
    for (const origem of origens) {
      await user.click(origem)
      expect(screen.getByRole('dialog', { name: 'Quero conhecer o HEEM' })).toBeInTheDocument()
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(origem).toHaveFocus()
    }
  })

  it('a barra "ask" abre com o interesse mapeado para o valor do backend', async () => {
    const user = userEvent.setup()
    renderLanding()
    await user.click(screen.getByRole('button', { name: /Quero abrir um chamado para um equipamento/ }))
    expect(screen.getByRole('combobox', { name: 'O que você quer resolver?' })).toHaveTextContent('Chamados e ordens de serviço')
  })

  it.each<[Interesse, string]>([
    ['chamado', 'Chamados e ordens de serviço'],
    ['equipamento', 'Gestão de ativos e equipamentos'],
    ['ordens', 'Manutenção preventiva'],
    ['indicadores', 'Indicadores e relatórios'],
  ])('interesse %s vem selecionado como "%s"', async (interesse, rotulo) => {
    const user = userEvent.setup()
    renderDialogo(interesse)
    const combo = screen.getByRole('combobox', { name: 'O que você quer resolver?' })
    expect(combo).toHaveTextContent(rotulo)
    await user.click(combo)
    expect(screen.getByRole('option', { name: rotulo })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('option', { selected: true })).toHaveLength(1)
  })

  it('sem interesse, nada vem selecionado e há os 5 rótulos em português', () => {
    renderDialogo()
    const combo = screen.getByRole('combobox', { name: 'O que você quer resolver?' })
    expect(combo).toHaveTextContent('Selecione')
    expect(combo).toHaveClass('empty')
    const lista = document.getElementById(combo.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(lista).toHaveAttribute('role', 'listbox')
    expect(within(lista).getAllByRole('option', { hidden: true }).map((o) => o.textContent)).toEqual([
      'Gestão de ativos e equipamentos', 'Manutenção preventiva', 'Chamados e ordens de serviço', 'Indicadores e relatórios', 'Outro',
    ])
    expect(within(lista).queryAllByRole('option', { selected: true, hidden: true })).toHaveLength(0)
  })

  it('"Entrar" continua levando a /login', () => {
    renderLanding()
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
    expect(within(screen.getByRole('contentinfo')).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login')
  })
})

describe('acessibilidade do diálogo', () => {
  it('tem role dialog, aria-modal e nome pelo título', () => {
    renderDialogo()
    const dialogo = screen.getByRole('dialog', { name: 'Quero conhecer o HEEM' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveAttribute('aria-labelledby', 'dlg-agendar-titulo')
  })

  it('foca o primeiro campo e prende o foco com Tab e Shift+Tab', async () => {
    const user = userEvent.setup()
    renderDialogo()
    const dialogo = screen.getByRole('dialog')
    expect(screen.getByLabelText('Nome completo *')).toHaveFocus()
    for (let i = 0; i < 14; i += 1) {
      await user.tab()
      expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    }
    for (let i = 0; i < 14; i += 1) {
      await user.tab({ shift: true })
      expect(dialogo).toContainElement(document.activeElement as HTMLElement)
    }
  })

  it('Escape e o botão Fechar chamam onFechar', async () => {
    const user = userEvent.setup()
    const { onFechar } = renderDialogo()
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(onFechar).toHaveBeenCalledTimes(2)
  })

  it('não fecha por Escape nem pelo botão enquanto envia', async () => {
    const user = userEvent.setup()
    enviar.mockReturnValue(new Promise(() => {}))
    const { onFechar } = renderDialogo()
    await preencher(user)
    await user.click(botaoEnviar())
    await user.keyboard('{Escape}')
    expect(onFechar).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled()
  })

  it('link da Política de Privacidade abre em nova aba com rel seguro', () => {
    renderDialogo()
    const link = screen.getByRole('link', { name: 'Política de Privacidade' })
    expect(link).toHaveAttribute('href', '/privacidade')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('campo isca existe, está escondido e fora da ordem de tabulação', () => {
    renderDialogo()
    const isca = document.getElementById('contato_alt') as HTMLInputElement
    expect(isca).toHaveAttribute('tabindex', '-1')
    expect(isca).toHaveAttribute('autocomplete', 'off')
    expect(isca).toHaveAttribute('name', 'contato_alt')
    expect(isca).toHaveAttribute('data-lpignore', 'true')
    expect(isca).toHaveAttribute('data-1p-ignore')
    expect(document.querySelector('[name="website"], #website')).toBeNull()
    expect(isca.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(isca).toHaveValue('')
  })
})

describe('validação', () => {
  it('ao enviar vazio mostra erros por campo, marca aria-invalid e foca o primeiro inválido', async () => {
    const user = userEvent.setup()
    renderDialogo()
    await user.click(botaoEnviar())
    const nome = screen.getByLabelText('Nome completo *')
    expect(await screen.findByText('Informe seu nome completo.')).toBeInTheDocument()
    expect(screen.getByText('Informe seu e-mail profissional.')).toBeInTheDocument()
    expect(screen.getByText('Informe o hospital ou a instituição.')).toBeInTheDocument()
    expect(screen.getByText('Para enviar, concorde com o contato e o uso dos dados.')).toBeInTheDocument()
    expect(nome).toHaveAttribute('aria-invalid', 'true')
    expect(nome).toHaveAttribute('aria-describedby', 'nome-erro')
    expect(document.getElementById('nome-erro')).toBeInTheDocument()
    await waitFor(() => expect(nome).toHaveFocus())
    expect(enviar).not.toHaveBeenCalled()
  })

  it('valida e-mail ao sair do campo', async () => {
    const user = userEvent.setup()
    renderDialogo()
    await user.type(screen.getByLabelText('E-mail profissional *'), 'sem-arroba')
    await user.tab()
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
  })

  it('respeita os tamanhos máximos', async () => {
    const user = userEvent.setup()
    renderDialogo()
    fireEvent.change(screen.getByLabelText('Nome completo *'), { target: { value: 'a'.repeat(121) } })
    fireEvent.change(screen.getByLabelText('E-mail profissional *'), { target: { value: `${'a'.repeat(250)}@x.com` } })
    fireEvent.change(screen.getByLabelText('Hospital ou instituição *'), { target: { value: 'a'.repeat(161) } })
    fireEvent.change(screen.getByLabelText('Telefone (opcional)'), { target: { value: '1'.repeat(31) } })
    await user.click(botaoEnviar())
    expect(await screen.findAllByText(/Use no máximo/)).toHaveLength(4)
    expect(screen.getByText('Use no máximo 120 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Use no máximo 254 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Use no máximo 160 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Use no máximo 30 caracteres.')).toBeInTheDocument()
    expect(enviar).not.toHaveBeenCalled()
  })

  it('exige o consentimento', async () => {
    const user = userEvent.setup()
    renderDialogo()
    await preencher(user, { consentir: false })
    await user.click(botaoEnviar())
    expect(await screen.findByText('Para enviar, concorde com o contato e o uso dos dados.')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true')
    expect(enviar).not.toHaveBeenCalled()
  })
})

describe('envio', () => {
  it('envia o corpo normalizado e mostra a tela de sucesso', async () => {
    const user = userEvent.setup()
    enviar.mockResolvedValue(undefined)
    const { onFechar } = renderDialogo('ordens')
    await preencher(user)
    await user.click(screen.getByRole('combobox', { name: 'Cargo' }))
    await user.click(screen.getByRole('option', { name: 'Engenharia clínica' }))
    await user.type(screen.getByLabelText('Telefone (opcional)'), ' (51) 90000-0000 ')
    await user.click(botaoEnviar())

    expect(await screen.findByRole('heading', { name: 'Cadastro recebido' })).toBeInTheDocument()
    expect(screen.getByText('Obrigado! Em breve entraremos em contato pelo e-mail informado.')).toBeInTheDocument()
    expect(enviar).toHaveBeenCalledTimes(1)
    expect(enviar.mock.calls[0][0]).toEqual({
      nome: 'Maria Souza',
      email: 'maria@hospital.org.br',
      organizacao: 'Hospital Santa Casa',
      cargo: 'Engenharia clínica',
      telefone: '(51) 90000-0000',
      interesse: 'manutencao_preventiva',
      consentimento: true,
      contato_alt: '',
    })
    await user.click(screen.getByRole('button', { name: 'Voltar à página' }))
    expect(onFechar).toHaveBeenCalled()
  })

  it('reabrir mostra o formulário limpo', async () => {
    const user = userEvent.setup()
    enviar.mockResolvedValue(undefined)
    const { unmount } = render(<DialogoAgendar onFechar={vi.fn()} />)
    await preencher(user)
    await user.click(botaoEnviar())
    await screen.findByRole('heading', { name: 'Cadastro recebido' })
    unmount()
    renderDialogo()
    expect(screen.getByLabelText('Nome completo *')).toHaveValue('')
    expect(screen.getByLabelText('E-mail profissional *')).toHaveValue('')
    expect(screen.getByRole('checkbox')).not.toBeChecked()
  })

  it('duplo clique envia uma vez só e mostra "Enviando…" desabilitado', async () => {
    const user = userEvent.setup()
    enviar.mockReturnValue(new Promise(() => {}))
    renderDialogo()
    await preencher(user)
    await user.dblClick(botaoEnviar())
    expect(enviar).toHaveBeenCalledTimes(1)
    const botao = screen.getByRole('button', { name: 'Enviando…' })
    expect(botao).toBeDisabled()
  })

  it('honeypot preenchido por script ainda envia e mostra sucesso normal', async () => {
    const user = userEvent.setup()
    enviar.mockResolvedValue(undefined)
    renderDialogo()
    await preencher(user)
    fireEvent.change(document.getElementById('contato_alt') as HTMLInputElement, { target: { value: 'http://spam' } })
    await user.click(botaoEnviar())
    expect(await screen.findByRole('heading', { name: 'Cadastro recebido' })).toBeInTheDocument()
    expect(enviar.mock.calls[0][0].contato_alt).toBe('http://spam')
  })

  it.each([
    ['429 com Retry-After 3600', erroHttp(429, { code: 'LIMITE_REQUISICOES' }, { 'retry-after': '3600' }), 'Muitas tentativas. Tente novamente em 60 minutos.'],
    ['429 com Retry-After 61 arredonda para cima', erroHttp(429, { code: 'LIMITE_REQUISICOES' }, { 'retry-after': '61' }), 'Muitas tentativas. Tente novamente em 2 minutos.'],
    ['429 sem Retry-After', erroHttp(429, { code: 'LIMITE_REQUISICOES' }), 'Muitas tentativas. Aguarde um pouco e tente novamente.'],
    ['400 CONSENTIMENTO_OBRIGATORIO', erroHttp(400, { code: 'CONSENTIMENTO_OBRIGATORIO' }), 'É necessário concordar com o contato para enviar o cadastro.'],
    ['400 VALIDACAO_FALHOU', erroHttp(400, { code: 'VALIDACAO_FALHOU' }), 'Confira os dados informados.'],
    ['400 INTERESSE_INVALIDO', erroHttp(400, { code: 'INTERESSE_INVALIDO' }), 'Confira os dados informados.'],
    ['413', erroHttp(413, { code: 'CORPO_MUITO_GRANDE' }), 'Mensagem muito grande.'],
    ['503', erroHttp(503, { code: 'SERVICO_INDISPONIVEL' }), 'Não foi possível enviar agora. Tente de novo em instantes.'],
    ['rede', new AxiosError('Network Error', 'ERR_NETWORK'), 'Não foi possível enviar agora. Tente de novo em instantes.'],
    ['timeout', new AxiosError('timeout', 'ECONNABORTED'), 'Não foi possível enviar agora. Tente de novo em instantes.'],
  ])('erro %s mostra mensagem, mantém o digitado e permite tentar de novo', async (_nome, erro, mensagem) => {
    const user = userEvent.setup()
    enviar.mockRejectedValueOnce(erro)
    renderDialogo()
    await preencher(user)
    await user.click(botaoEnviar())

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(mensagem))
    expect(screen.getByLabelText('Nome completo *')).toHaveValue(`  ${DADOS.nome}  `)
    expect(screen.getByLabelText('E-mail profissional *')).toHaveValue(DADOS.email)
    expect(screen.getByRole('checkbox')).toBeChecked()
    expect(screen.queryByText(DADOS.email, { exact: false, selector: '[role="alert"]' })).not.toBeInTheDocument()

    enviar.mockResolvedValueOnce(undefined)
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByRole('heading', { name: 'Cadastro recebido' })).toBeInTheDocument()
    expect(enviar).toHaveBeenCalledTimes(2)
  })

  it('consentimento recusado pelo servidor marca o campo', async () => {
    const user = userEvent.setup()
    enviar.mockRejectedValueOnce(erroHttp(400, { code: 'CONSENTIMENTO_OBRIGATORIO' }))
    renderDialogo()
    await preencher(user)
    await user.click(botaoEnviar())
    await waitFor(() => expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true'))
  })
})

describe('privacidade', () => {
  it('não usa localStorage, sessionStorage nem cookies e não escreve dados em console', async () => {
    const user = userEvent.setup()
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const cookie = vi.spyOn(document, 'cookie', 'set')
    const consoles = (['log', 'info', 'warn', 'error', 'debug'] as const).map((metodo) => vi.spyOn(console, metodo).mockImplementation(() => {}))
    enviar.mockRejectedValueOnce(erroHttp(503))
    renderDialogo('chamado')
    await preencher(user)
    await user.click(botaoEnviar())
    await screen.findByText(/Não foi possível enviar agora/)
    enviar.mockResolvedValueOnce(undefined)
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    await screen.findByRole('heading', { name: 'Cadastro recebido' })

    expect(setItem).not.toHaveBeenCalled()
    expect(cookie).not.toHaveBeenCalled()
    const impresso = JSON.stringify(consoles.flatMap((spy) => spy.mock.calls.map((chamada) => chamada.map(String))))
    for (const dado of [DADOS.nome, DADOS.email.toLowerCase(), DADOS.organizacao]) expect(impresso).not.toContain(dado)
    expect(window.location.search).toBe('')
  })
})
