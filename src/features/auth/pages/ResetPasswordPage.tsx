import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { isDemoMode } from '@/lib/demo-mode'
import { AuthError } from '../api/auth-error'
import { getAuthProvider } from '../api/auth-provider'
import { clearRecoveryUrl, parseRecoveryLink, type RecoveryLink } from '../api/recovery-link'
import { AuthShell } from '../components/AuthShell'
import { buttonClass, FormField, inputClass } from '../components/AuthFormParts'
import { resetPasswordSchema, type ResetPasswordValues } from '../schemas/password.schema'

const linkClass = 'inline-flex rounded-md text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary'
const REDIRECT_DELAY_MS = 3000

function errorText(error: unknown) {
  return error instanceof Error && error.message ? error.message : 'Não foi possível salvar a nova senha. Tente novamente.'
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  // O access token do link vive só aqui, em memória do componente: nunca vai a storage, log ou URL.
  const [link, setLink] = useState<RecoveryLink>(() => parseRecoveryLink(window.location))
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })
  const { errors, isSubmitting } = form.formState

  // Limpa o fragmento imediatamente (idempotente, seguro sob StrictMode) para o token não ficar no histórico.
  useEffect(() => { clearRecoveryUrl() }, [])

  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(() => navigate('/login', { replace: true }), REDIRECT_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [done, navigate])

  const provider = getAuthProvider()
  const invite = link.status === 'ready' && link.kind === 'invite'

  const onSubmit = form.handleSubmit(async ({ newPassword }) => {
    if (link.status !== 'ready') return
    setError(null)
    try {
      await provider.updatePassword(link.accessToken, newPassword)
      setLink({ status: 'invalid' }) // descarta o token da memória; a sessão do link nunca é usada
      setDone(true)
    } catch (caught) {
      if (caught instanceof AuthError && caught.kind === 'invalid_link') setLink({ status: 'invalid' })
      else setError(errorText(caught))
    } finally {
      // A senha nunca fica no formulário depois do envio, com sucesso ou erro.
      form.reset({ newPassword: '', confirmPassword: '' })
    }
  })

  if (done) {
    return (
      <AuthShell titleId="reset-title" title="Senha atualizada">
        <div className="space-y-4">
          <p role="status" className="rounded-md border border-border bg-bg px-3 py-2 text-sm leading-6 text-text-primary">
            Sua senha foi salva. Você será levado ao login para entrar com a nova senha.
          </p>
          <Link to="/login" replace className={linkClass}>Ir para o login agora</Link>
        </div>
      </AuthShell>
    )
  }

  if (link.status === 'invalid' || !provider.supportsPasswordReset || isDemoMode) {
    return (
      <AuthShell titleId="reset-title" title="Link inválido ou expirado">
        <div className="space-y-4">
          <p role="alert" className="text-sm leading-6 text-text-secondary">
            Este link para definir a senha é inválido ou já expirou. Solicite um novo link para continuar.
          </p>
          <Link to="/esqueci-senha" className={linkClass}>Solicitar novo link</Link>
          <div><Link to="/login" className={linkClass}>Voltar ao login</Link></div>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell titleId="reset-title" title={invite ? 'Definir senha' : 'Redefinir senha'} subtitle={invite ? 'Crie a senha de acesso da sua conta' : 'Escolha uma nova senha para sua conta'}>
      <form onSubmit={onSubmit} noValidate aria-busy={isSubmitting} className="w-full space-y-4">
        <FormField id="reset-password" label="Nova senha" error={errors.newPassword?.message}>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            disabled={isSubmitting}
            aria-invalid={errors.newPassword ? true : undefined}
            aria-describedby={errors.newPassword ? 'reset-password-error' : undefined}
            className={inputClass}
            {...form.register('newPassword')}
          />
        </FormField>
        <FormField id="reset-confirm" label="Confirmação da nova senha" error={errors.confirmPassword?.message}>
          <input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            disabled={isSubmitting}
            aria-invalid={errors.confirmPassword ? true : undefined}
            aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
            className={inputClass}
            {...form.register('confirmPassword')}
          />
        </FormField>
        <div role="alert">
          {error && <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
        </div>
        <button type="submit" disabled={isSubmitting} className={buttonClass}>
          {isSubmitting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <KeyRound aria-hidden="true" className="size-4" />}
          {isSubmitting ? 'Salvando…' : 'Salvar senha'}
        </button>
      </form>
    </AuthShell>
  )
}
