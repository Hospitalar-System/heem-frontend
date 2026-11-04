import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, LogIn } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { isDemoMode } from '@/lib/demo-mode'
import { getAuthProvider } from '../api/auth-provider'
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
  const canResetPassword = getAuthProvider().supportsPasswordReset

  if (mutation.error instanceof AccessBlockedError) {
    return <AccessBlockedScreen reason={mutation.error.reason} onBack={() => mutation.reset()} />
  }

  const errorMessage = mutation.isError ? getLoginErrorMessage(mutation.error) : null
  const errorRegion = (
    <div role="alert">
      {errorMessage && <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{errorMessage}</p>}
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
      <button type="submit" disabled={pending} className={buttonClass}>
        {submitIcon}
        {submitLabel}
      </button>
      {canResetPassword && (
        <p className="text-center">
          <Link to="/esqueci-senha" className="rounded-md text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary">Esqueci minha senha</Link>
        </p>
      )}
    </form>
  )
}
