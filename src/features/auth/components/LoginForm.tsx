import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, LogIn } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { isDemoMode } from '@/lib/demo-mode'
import { AuthError, getAuthProvider } from '../api/auth-provider'
import { AccessBlockedError, getLoginErrorMessage, useLogin } from '../hooks/useLogin'
import { loginSchema, type LoginFormInput, type LoginFormValues } from '../schemas/login.schema'
import { AccessBlockedScreen } from './AccessBlockedScreen'
import { buttonClass, FormField, inputClass } from './AuthFormParts'
import { Checkbox } from '@/components/ui/Checkbox'

export function LoginForm() {
  const mutation = useLogin()
  const form = useForm<LoginFormInput, unknown, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })
  const { errors } = form.formState
  const pending = mutation.isPending
  const { isWaking, cancel } = mutation
  const canResetPassword = getAuthProvider().supportsPasswordReset

  // Voltar da espera (cancelar) devolve o foco ao campo de senha, já limpo.
  const handleCancel = () => {
    cancel()
    setTimeout(() => form.setFocus('password'), 0)
  }

  if (mutation.error instanceof AccessBlockedError) {
    return <AccessBlockedScreen reason={mutation.error.reason} onBack={() => mutation.reset()} />
  }

  const errorMessage = mutation.isError ? getLoginErrorMessage(mutation.error) : null
  const isTimeout = mutation.isError && mutation.error instanceof AuthError && mutation.error.kind === 'timeout'
  const retryAfterTimeout = () => { mutation.reset(); setTimeout(() => form.setFocus('password'), 0) }
  const errorRegion = (
    <div role="alert">
      {errorMessage && <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p>}
      {isTimeout && !isDemoMode && <button type="button" onClick={retryAfterTimeout} className="mt-2 w-full rounded-md px-3 py-2 text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">Tentar de novo (o e-mail foi mantido; digite a senha)</button>}
    </div>
  )
  const submitLabel = pending ? 'Conectando…' : isDemoMode ? 'Entrar na demonstração' : 'Entrar'
  const submitIcon = pending
    ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
    : <LogIn aria-hidden="true" className="size-4" />

  if (isDemoMode) {
    return (
      <div className="w-full space-y-4">
        <p className="text-sm leading-6 text-text-secondary">
          Modo demonstração: entre como <span className="font-medium text-text-primary">Admin do Cliente</span>. Os dados são locais e não serão enviados ao servidor.
        </p>
        {errorRegion}
        <button type="button" onClick={() => mutation.mutate(undefined)} disabled={pending} className={buttonClass}>
          {submitIcon}
          {submitLabel}
        </button>
      </div>
    )
  }

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values, {
      // A senha nunca fica no formulário depois do envio, com sucesso ou erro.
      onSettled: () => form.resetField('password', { defaultValue: '' }),
    })
    // Já limpa agora: o valor foi capturado pelo envio e não precisa ficar no formulário durante a espera.
    form.resetField('password', { defaultValue: '' })
  })

  return (
    <form onSubmit={onSubmit} noValidate aria-busy={pending} className="w-full space-y-4">
      <FormField id="login-email" label="E-mail" error={errors.email?.message}>
        <input
          id="login-email"
          type="email"
          autoComplete="username"
          autoFocus
          disabled={pending}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? 'login-email-error' : undefined}
          className={inputClass}
          {...form.register('email')}
        />
      </FormField>
      <FormField id="login-password" label="Senha" error={errors.password?.message}>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          disabled={pending}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? 'login-password-error' : undefined}
          className={inputClass}
          {...form.register('password')}
        />
      </FormField>
      <Checkbox label="Lembrar de mim" disabled={pending} containerClassName="text-sm text-text-secondary" {...form.register('rememberMe')} />
      {errorRegion}
      <div role="status" aria-live="polite">
        {pending && isWaking && (
          <div className="space-y-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-text-secondary">
            <div aria-hidden="true" className="h-1 overflow-hidden rounded-full bg-border"><div className="h-full w-1/3 animate-pulse rounded-full bg-primary" /></div>
          <p>
            O servidor está acordando, isso pode levar até 2 ou 3 minutos na primeira entrada do dia. Aguarde…
          </p>
          </div>
        )}
      </div>
      <button type="submit" disabled={pending} className={buttonClass}>
        {submitIcon}
        {submitLabel}
      </button>
      {pending && isWaking && (
        <button type="button" onClick={handleCancel} className="w-full rounded-md px-3 py-2 text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">
          Cancelar
        </button>
      )}
      {canResetPassword && (
        <p className="text-center">
          <Link to="/esqueci-senha" className="rounded-md text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">Esqueci minha senha</Link>
        </p>
      )}
    </form>
  )
}
