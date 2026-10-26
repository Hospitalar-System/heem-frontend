import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AppProviders } from '@/app/providers'
import { AppRouter } from '@/app/router'
import { restoreSession } from '@/features/auth/api/restore-session'

// Inicia a restauração antes do primeiro render: rotas protegidas aguardam em vez de ir ao login.
void restoreSession()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <AppRouter />
    </AppProviders>
  </StrictMode>,
)
