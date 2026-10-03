import { LoaderCircle, LogIn } from 'lucide-react'
import { useLogin } from '../hooks/useLogin'

export function LoginForm() {
  const mutation = useLogin()

  return (
    <div className="w-full space-y-4">
      <p className="text-sm leading-6 text-text-secondary">
        A autenticação local usa o perfil de desenvolvimento <span className="font-medium text-text-primary">Técnico</span>.
      </p>
      <button
        type="button"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="flex h-[45px] w-full items-center justify-center gap-2 rounded-[8px] bg-primary px-4 text-sm font-medium text-bg-brand outline-none transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-login disabled:cursor-wait disabled:opacity-70"
      >
        {mutation.isPending
          ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          : <LogIn aria-hidden="true" className="size-4" />}
        {mutation.isPending ? 'Conectando…' : 'Entrar como Técnico'}
      </button>
    </div>
  )
}
