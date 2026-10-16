import { z } from 'zod'

export const platformUserSchema = z.object({
  codigo: z.string().trim().min(1, 'Informe o código.'),
  nome: z.string().trim().min(1, 'Informe o nome.'),
  email: z.email('Informe um e-mail válido.'),
  role: z.string().trim().min(1, 'Informe o papel.'),
})
