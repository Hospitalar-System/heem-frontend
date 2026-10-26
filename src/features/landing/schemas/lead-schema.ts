import { z } from 'zod'
import type { Interesse } from '../content/vitrine'

export const LIMITES_LEAD = { nome: 120, email: 254, organizacao: 160, cargo: 80, telefone: 30 } as const

/** Valores aceitos pelo backend (Story 16.1) para `interesse`, com o rótulo exibido no formulário. */
export const opcoesInteresse = [
  { valor: 'gestao_de_ativos', rotulo: 'Gestão de ativos e equipamentos' },
  { valor: 'manutencao_preventiva', rotulo: 'Manutenção preventiva' },
  { valor: 'chamados_e_os', rotulo: 'Chamados e ordens de serviço' },
  { valor: 'indicadores', rotulo: 'Indicadores e relatórios' },
  { valor: 'outro', rotulo: 'Outro' },
] as const

export type ValorInteresse = (typeof opcoesInteresse)[number]['valor']

export const opcoesCargo = ['Engenharia clínica', 'Gestão hospitalar', 'Manutenção', 'TI / Sistemas', 'Outro'] as const

/** Interesse da vitrine do site -> valor do backend. */
export const interesseParaBackend: Record<Interesse, ValorInteresse> = {
  chamado: 'chamados_e_os',
  equipamento: 'gestao_de_ativos',
  ordens: 'manutencao_preventiva',
  indicadores: 'indicadores',
}

function obrigatorio(max: number, rotulo: string) {
  return z
    .string()
    .trim()
    .min(1, `Informe ${rotulo}.`)
    .max(max, `Use no máximo ${max} caracteres.`)
}

function opcional(max: number) {
  return z.string().trim().max(max, `Use no máximo ${max} caracteres.`)
}

export const leadSchema = z.object({
  nome: obrigatorio(LIMITES_LEAD.nome, 'seu nome completo'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Informe seu e-mail profissional.')
    .max(LIMITES_LEAD.email, `Use no máximo ${LIMITES_LEAD.email} caracteres.`)
    .email('Informe um e-mail válido.'),
  organizacao: obrigatorio(LIMITES_LEAD.organizacao, 'o hospital ou a instituição'),
  cargo: opcional(LIMITES_LEAD.cargo),
  telefone: opcional(LIMITES_LEAD.telefone),
  interesse: z.string(),
  consentimento: z.boolean().refine((valor) => valor === true, 'Para enviar, concorde com o contato e o uso dos dados.'),
  /** Isca anti-robô. Nome neutro no DOM (gerenciadores de senha preenchem "website"); vira `website` só no corpo. */
  contato_alt: z.string(),
})

export type LeadFormValues = z.infer<typeof leadSchema>
