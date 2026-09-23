import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom'
import { LoginPage } from '@/features/auth/pages/LoginPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  { path: '/login', element: <LoginPage /> },
  { path: '/platform/clients', element: <PendingDashboard audience="administração da plataforma" /> },
  { path: '/dashboard', element: <PendingDashboard audience="administração hospitalar" /> },
  { path: '/field', element: <PendingDashboard audience="equipe técnica" /> },
  { path: '/hospital/requests', element: <PendingDashboard audience="solicitações hospitalares" /> },
])

function PendingDashboard({ audience }: { audience: string }) {
  return (
    <main className="grid min-h-screen place-items-center bg-bg p-6 text-center text-text-primary">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8">
        <h1 className="text-xl font-semibold">Acesso confirmado</h1>
        <p className="mt-2 text-sm text-text-secondary">A área de {audience} será disponibilizada nas próximas etapas do HEMM.</p>
        <a href="/login" className="mt-5 inline-block text-sm text-primary underline">Voltar ao login</a>
      </div>
    </main>
  )
}

export function AppRouter() {
  return <RouterProvider router={router} />
}
