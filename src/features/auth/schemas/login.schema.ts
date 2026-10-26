import { z } from 'zod'

// A senha só precisa existir: quem valida regras e tamanho é o Keycloak.
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe seu e-mail.')
    .email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
  rememberMe: z.boolean().default(false),
})

export type LoginFormInput = z.input<typeof loginSchema>
export type LoginFormValues = z.output<typeof loginSchema>
