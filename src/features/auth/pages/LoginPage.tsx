import { useSyncExternalStore } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthShell } from '../components/AuthShell'
import { LoginForm } from '../components/LoginForm'
import { SessionRestoring } from '../components/SessionRestoring'
import { useAuthRestoring } from '../hooks/useAuthRestoring'
import { getRoleLandingPath } from '../hooks/useLogin'
import { safeInternalPath } from '../utils/safe-redirect'
import { getAuthState, subscribeAuthState } from '../session'

export function LoginPage() {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const restoring = useAuthRestoring()
  const location = useLocation()

  // Aguarda a restauração da sessão para não piscar o formulário; já autenticado, segue ao destino por papel.
  if (restoring) return <SessionRestoring />
  const landing = auth.isAuthenticated && auth.user ? getRoleLandingPath(auth.user.roles) : null
  const destination = landing ? safeInternalPath((location.state as { from?: unknown } | null)?.from) ?? landing : null
  if (destination) return <Navigate to={destination} replace />

  return (
    <AuthShell titleId="login-title" title="Entrar" subtitle="Acesse o painel administrativo">
      <LoginForm />
    </AuthShell>
  )
}
