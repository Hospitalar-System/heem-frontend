import { Navigate, useLocation } from 'react-router-dom'

/** Manda para /login guardando o destino atual (caminho interno) para voltar depois de entrar. */
export function RedirectToLogin() {
  const location = useLocation()
  return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />
}
