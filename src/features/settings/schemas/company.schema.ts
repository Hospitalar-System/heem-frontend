import { z } from 'zod'
import { isValidCnpj } from '@/lib/br-documents'

export const UF_LIST = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const
export const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/

const optional = (max: number, label: string) => z.string().trim().max(max, `${label}: no máximo ${max} caracteres.`)

export const companySchema = z.object({
  razaoSocial: z.string().trim().min(1, 'Informe a razão social.').max(150, 'Razão social: no máximo 150 caracteres.'),
  cnpj: z.string().trim().min(1, 'Informe o CNPJ.').refine(isValidCnpj, 'Informe um CNPJ válido.'),
  contratoNumero: optional(60, 'Contrato'),
  logradouro: optional(100, 'Logradouro'),
  numero: optional(100, 'Número'),
  complemento: optional(100, 'Complemento'),
  bairro: optional(100, 'Bairro'),
  cidade: optional(100, 'Cidade'),
  uf: z.string().trim().refine((value) => value === '' || (UF_LIST as readonly string[]).includes(value.toUpperCase()), 'Informe uma UF válida (2 letras).'),
  cep: z.string().trim().refine((value) => value === '' || /^\d{5}-?\d{3}$/.test(value), 'Informe um CEP com 8 dígitos.'),
  contatoTelefone: optional(30, 'Telefone'),
  contatoEmail: z.string().trim().max(180, 'E-mail: no máximo 180 caracteres.').refine((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), 'Informe um e-mail válido.'),
  responsavelTecnicoNome: optional(150, 'Responsável técnico'),
  responsavelTecnicoCrea: optional(30, 'CREA'),
})
export type CompanyFormValues = z.infer<typeof companySchema>
