import { z } from 'zod'

export const forgotPasswordSchema = z.object({
  email: z.string().trim().min(1, 'Informe seu e-mail.').email('Informe um e-mail válido.'),
})

// O servidor decide o resto das regras de senha; aqui só o mínimo e a confirmação.
export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas não conferem.',
  })

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
