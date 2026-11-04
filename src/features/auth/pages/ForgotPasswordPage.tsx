import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, Mail } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { isDemoMode } from '@/lib/demo-mode'
import { getAuthProvider } from '../api/auth-provider'
import { AuthShell } from '../components/AuthShell'
import { buttonClass, FormField, inputClass } from '../components/AuthFormParts'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas/password.schema'

const backLinkClass = 'inline-flex rounded-md text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary'

function errorText(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Não foi possível concluir a solicitação. Tente novamente.'
}

export function ForgotPasswordPage() {
  const provider = getAuthProvider()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null)
    try {
      await provider.requestPasswordReset(email)
      // Resposta sempre genérica: nunca revela se o e-mail está cadastrado.
      setSent(true)
    } catch (caught) {
      setError(errorText(caught))
    }
  })

  const available = provider.supportsPasswordReset && !isDemoMode

  return (
    <AuthShell titleId="forgot-title" title="Esqueci minha senha" subtitle={available && !sent ? 'Informe o e-mail da sua conta para receber o link de redefinição' : undefined}>
      {!available ? (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-text-secondary">A redefinição de senha por e-mail não está disponível neste ambiente. Procure o administrador da sua conta.</p>
          <Link to="/login" className={backLinkClass}>Voltar ao login</Link>
        </div>
      ) : sent ? (
        <div className="space-y-4">
          <p role="status" className="rounded-md border border-border bg-bg px-3 py-2 text-sm leading-6 text-text-primary">
            Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.
          </p>
          <Link to="/login" className={backLinkClass}>Voltar ao login</Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate aria-busy={isSubmitting} className="w-full space-y-4">
          <FormField id="forgot-email" label="E-mail" error={errors.email?.message}>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              autoFocus
              disabled={isSubmitting}
              aria-invalid={errors.email ? true : undefined}
              aria-describedby={errors.email ? 'forgot-email-error' : undefined}
              className={inputClass}
              {...form.register('email')}
            />
          </FormField>
          <div role="alert">
            {error && <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className={buttonClass}>
            {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Mail aria-hidden="true" className="size-4" />}
            {isSubmitting ? 'Enviando…' : 'Enviar link'}
          </button>
          <Link to="/login" className={backLinkClass}>Voltar ao login</Link>
        </form>
      )}
    </AuthShell>
  )
}
