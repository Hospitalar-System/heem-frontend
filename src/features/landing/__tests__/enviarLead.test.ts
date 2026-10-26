import { AxiosError, type AxiosResponse } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { post, create } = vi.hoisted(() => {
  const post = vi.fn()
  return { post, create: vi.fn(() => ({ post })) }
})

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return { ...actual, default: { ...actual.default, create } }
})

import { descreverErroLead, enviarLead, montarCorpoLead } from '../api/enviarLead'

const valores = {
  nome: '  Maria Souza ',
  email: ' Maria@Hospital.ORG.br ',
  organizacao: ' Hospital Santa Casa ',
  cargo: '',
  telefone: '',
  interesse: '',
  consentimento: true,
  contato_alt: '',
}

beforeEach(() => post.mockReset())

describe('cliente HTTP público dos leads', () => {
  it('é criado sem cookies, com timeout de 15 s e sem Authorization', () => {
    expect(create).toHaveBeenCalledTimes(1)
    const config = (create.mock.calls[0] as unknown as [Record<string, unknown>])[0]
    expect(config.withCredentials).toBe(false)
    expect(config.timeout).toBe(15_000)
    expect(JSON.stringify(config.headers)).not.toMatch(/authorization/i)
  })

  it('faz POST /public/leads com o corpo exato (e-mail normalizado, opcionais ausentes omitidos)', async () => {
    post.mockResolvedValue({ status: 202 })
    await enviarLead(valores)
    expect(post).toHaveBeenCalledWith('/public/leads', {
      nome: 'Maria Souza',
      email: 'maria@hospital.org.br',
      organizacao: 'Hospital Santa Casa',
      consentimento: true,
      website: '',
    })
  })

  it('a isca vai no corpo como website', () => {
    expect(montarCorpoLead({ ...valores, contato_alt: 'x' }).website).toBe('x')
  })

  it('inclui cargo, telefone e interesse quando preenchidos', () => {
    expect(montarCorpoLead({ ...valores, cargo: 'Manutenção', telefone: ' 5190000 ', interesse: 'outro' })).toEqual({
      nome: 'Maria Souza',
      email: 'maria@hospital.org.br',
      organizacao: 'Hospital Santa Casa',
      cargo: 'Manutenção',
      telefone: '5190000',
      interesse: 'outro',
      consentimento: true,
      website: '',
    })
  })
})

describe('descreverErroLead', () => {
  const http = (status: number, data?: unknown, headers: Record<string, string> = {}) =>
    new AxiosError('x', String(status), undefined, undefined, { status, statusText: '', data, headers, config: {} } as unknown as AxiosResponse)

  it('429 usa Retry-After em minutos (arredondando para cima) e singulariza', () => {
    expect(descreverErroLead(http(429, {}, { 'retry-after': '3600' })).mensagem).toBe('Muitas tentativas. Tente novamente em 60 minutos.')
    expect(descreverErroLead(http(429, {}, { 'retry-after': '30' })).mensagem).toBe('Muitas tentativas. Tente novamente em 1 minuto.')
  })

  it('nunca repete o texto do servidor', () => {
    const { mensagem } = descreverErroLead(http(400, { code: 'VALIDACAO_FALHOU', detail: 'maria@hospital.org.br inválido' }))
    expect(mensagem).toBe('Confira os dados informados.')
  })

  it('erro sem resposta ou não HTTP é genérico', () => {
    expect(descreverErroLead(new Error('boom')).mensagem).toBe('Não foi possível enviar agora. Tente de novo em instantes.')
  })
})
