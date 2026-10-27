import { zodResolver } from '@hookform/resolvers/zod'
import { LoaderCircle, LogIn } from 'lucide-react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { isDemoMode } from '@/lib/demo-mode'
import { AccessBlockedError, getLoginErrorMessage, useLogin } from '../hooks/useLogin'
import { loginSchema, type LoginFormInput, type LoginFormValues } from '../schemas/login.schema'
import { AccessBlockedScreen } from './AccessBlockedScreen'
import { Checkbox } from '@/components/ui/Checkbox'

const inputClass = 'h-[45px] w-full rounded-[8px] border border-border bg-bg px-3 text-sm text-text-primary outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-danger disabled:opacity-60'
const buttonClass = 'flex h-[45px] w-full items-center justify-center gap-2 rounded-[8px] bg-primary px-4 text-sm font-medium text-bg-brand outline-none transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-login disabled:cursor-wait disabled:opacity-70'

// Rótulo e mensagem de erro ficam fora do <label> para o nome acessível do campo continuar só "E-mail"/"Senha".
function FormField({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-medium text-text-secondary">{label}</label>
      {children}
      {error && <p id={`${id}-error`} role="alert" className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export function LoginForm() {
  const mutation = useLogin()
  const form = useForm<LoginFormInput, unknown, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })
  const { errors } = form.formState
  const pending = mutation.isPending

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
    </form>
  )
}
