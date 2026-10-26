import axios from 'axios'
import type { LeadFormValues } from '../schemas/lead-schema'

// Cliente PRÓPRIO e público: sem Bearer, sem refresh, sem cookies e sem modo demo do sistema.
const clientePublico = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  withCredentials: false,
  timeout: 15_000,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})

export type CorpoLead = {
  nome: string
  email: string
  organizacao: string
  cargo?: string
  telefone?: string
  interesse?: string
  consentimento: true
  website: string
}

export function montarCorpoLead(valores: LeadFormValues): CorpoLead {
  const cargo = valores.cargo.trim()
  const telefone = valores.telefone.trim()
  return {
    nome: valores.nome.trim(),
    email: valores.email.trim().toLowerCase(),
    organizacao: valores.organizacao.trim(),
    ...(cargo ? { cargo } : {}),
    ...(telefone ? { telefone } : {}),
    ...(valores.interesse ? { interesse: valores.interesse } : {}),
    consentimento: true,
    website: valores.website,
  }
}

/** Resposta esperada: 202 sem corpo. Qualquer erro é lançado como veio; use `descreverErroLead`. */
export async function enviarLead(valores: LeadFormValues): Promise<void> {
  await clientePublico.post('/public/leads', montarCorpoLead(valores))
}

export interface ErroLead {
  mensagem: string
  /** Quando o erro é do consentimento, o formulário o marca no campo. */
  campo?: 'consentimento'
}

const GENERICO = 'Não foi possível enviar agora. Tente de novo em instantes.'

/** Traduz o erro em mensagem para o visitante. Nunca inclui dados digitados nem o texto do servidor. */
export function descreverErroLead(erro: unknown): ErroLead {
  if (!axios.isAxiosError(erro) || !erro.response) return { mensagem: GENERICO }
  const { status, data, headers } = erro.response
  const code = typeof (data as { code?: unknown } | undefined)?.code === 'string' ? (data as { code: string }).code : undefined

  if (status === 429) {
    const segundos = Number(headers?.['retry-after'])
    if (Number.isFinite(segundos) && segundos > 0) {
      const minutos = Math.max(1, Math.ceil(segundos / 60))
      return { mensagem: `Muitas tentativas. Tente novamente em ${minutos} ${minutos === 1 ? 'minuto' : 'minutos'}.` }
    }
    return { mensagem: 'Muitas tentativas. Aguarde um pouco e tente novamente.' }
  }
  if (status === 413) return { mensagem: 'Mensagem muito grande. Reduza o tamanho dos campos e tente de novo.' }
  if (status === 400) {
    if (code === 'CONSENTIMENTO_OBRIGATORIO') {
      return { mensagem: 'É necessário concordar com o contato para enviar o cadastro.', campo: 'consentimento' }
    }
    if (code === 'VALIDACAO_FALHOU' || code === 'INTERESSE_INVALIDO' || code === 'CAPTCHA_INVALIDO') {
      return { mensagem: 'Confira os dados informados.' }
    }
  }
  return { mensagem: GENERICO }
}
