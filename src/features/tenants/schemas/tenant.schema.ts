import { z } from 'zod'

export const createTenantSchema = z.object({
  nome: z.string().trim().min(1, 'Informe a razão social.'),
  cnpj: z.string().refine((value) => normalizeCnpj(value).length === 14, 'Informe um CNPJ com 14 dígitos.'),
  adminNome: z.string().trim().min(1, 'Informe o nome do Admin do Cliente.'),
  adminEmail: z.email('Informe um e-mail válido.'),
  adminCodigo: z.string().trim().min(1, 'Informe o código do Admin do Cliente.'),
})

export function normalizeCnpj(value: string) { return value.replace(/\D/g, '') }
