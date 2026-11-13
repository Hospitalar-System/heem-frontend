import { z } from 'zod'

export const userSchema = z.object({
  codigo: z.string().trim().min(1, 'Informe o código.'),
  nome: z.string().trim().min(1, 'Informe o nome.'),
  email: z.email('Informe um e-mail válido.'),
  role: z.enum(['admin_cliente', 'tecnico', 'interno_hospital']),
  crea: z.string().trim().max(30, 'CREA: no máximo 30 caracteres.').optional(),
}).superRefine((value, ctx) => {
  if (value.crea && value.role !== 'tecnico') ctx.addIssue({ code: 'custom', path: ['crea'], message: 'O CREA só vale para técnicos.' })
})
