import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { loginSchema, type LoginFormInput, type LoginFormValues } from '../schemas/login.schema'
import { useLogin } from '../hooks/useLogin'

export function LoginForm() {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const mutation = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInput, undefined, LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  return (
    <form className="w-full space-y-[18px]" onSubmit={handleSubmit((values) => mutation.mutate(values))} noValidate>
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-[13px] font-medium text-text-secondary">E-mail</label>
        <div className="relative">
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="nome@hospital.com.br"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'email-error' : undefined}
            className="h-[42px] w-full rounded-[7px] border border-border bg-surface px-3 text-[14px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-danger"
            {...register('email')}
          />
        </div>
        {errors.email && <p id="email-error" className="text-sm text-danger">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-[13px] font-medium text-text-secondary">Senha</label>
        <div className="relative">
          <input
            id="password"
            type={passwordVisible ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Digite sua senha"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="h-[42px] w-full rounded-[7px] border border-border bg-surface px-3 pr-11 text-[14px] text-text-primary outline-none transition placeholder:text-text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-danger"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((visible) => !visible)}
            aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={passwordVisible}
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-text-muted outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary"
          >
            {passwordVisible ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
          </button>
        </div>
        {errors.password && <p id="password-error" className="text-sm text-danger">{errors.password.message}</p>}
      </div>

      <div className="flex items-center justify-between gap-3 pt-0.5">
        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
          <input type="checkbox" className="size-4 accent-primary focus-visible:ring-2 focus-visible:ring-primary" {...register('rememberMe')} />
          Lembrar-me
        </label>
        <span className="text-[13px] font-medium text-primary">Esqueci a senha</span>
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="flex h-[45px] w-full items-center justify-center gap-2 rounded-[8px] bg-primary px-4 text-sm font-medium text-bg-brand outline-none transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-login disabled:cursor-wait disabled:opacity-70"
      >
        {mutation.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {mutation.isPending ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
