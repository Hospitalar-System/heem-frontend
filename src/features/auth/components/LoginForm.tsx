import { LoaderCircle, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useLogin } from '../hooks/useLogin'

export function LoginForm() {
  const mutation = useLogin()
  const [profile, setProfile] = useState('tecnico')
  const profileLabels: Record<string, string> = {
    'admin-cliente': 'Admin do Cliente',
    tecnico: 'Técnico',
    'interno-hospital': 'Interno do Hospital',
    'super-admin': 'Super Admin',
  }
  const profileLabel = profileLabels[profile] ?? 'Perfil selecionado'

  return (
    <div className="w-full space-y-4">
      <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary" htmlFor="development-profile">Perfil de desenvolvimento
        <select id="development-profile" value={profile} onChange={(event) => setProfile(event.target.value)} disabled={mutation.isPending} className="h-10 rounded-md border border-border bg-surface px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60">
          <option value="tecnico">Técnico</option>
          <option value="admin-cliente">Admin do Cliente</option>
          <option value="interno-hospital">Interno do Hospital</option>
          <option value="super-admin">Super Admin</option>
        </select>
      </label>
      <p className="text-xs leading-5 text-text-muted">Acesso local de desenvolvimento; selecione Admin do Cliente para consultar relatórios.</p>
      <button
        type="button"
        onClick={() => mutation.mutate(profile)}
        disabled={mutation.isPending}
        className="flex h-[45px] w-full items-center justify-center gap-2 rounded-[8px] bg-primary px-4 text-sm font-medium text-bg-brand outline-none transition hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-bg-login disabled:cursor-wait disabled:opacity-70"
      >
        {mutation.isPending
          ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          : <LogIn aria-hidden="true" className="size-4" />}
        {mutation.isPending ? 'Conectando…' : `Entrar como ${profileLabel}`}
      </button>
    </div>
  )
}
