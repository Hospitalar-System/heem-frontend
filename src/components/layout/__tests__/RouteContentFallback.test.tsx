import { render, screen } from '@testing-library/react'
import { lazy, Suspense, type ReactElement } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { RouteContentFallback } from '../RouteContentFallback'

vi.mock('@/app/ThemeSwitcher', () => ({ ThemeSwitcher: () => null }))
vi.mock('@/features/dashboard/components/NotificationsPopover', () => ({ NotificationsPopover: () => null }))
vi.mock('@/features/dashboard/components/DashboardSidebar', () => ({ DashboardSidebar: () => <aside aria-label="Navegação principal" /> }))

describe('RouteContentFallback', () => {
  it('mantém a barra lateral e o cabeçalho enquanto a página carrega', async () => {
    const Page = lazy(() => new Promise<{ default: () => ReactElement }>((resolve) => setTimeout(() => resolve({ default: () => <p>Página pronta</p> }), 30)))
    render(<Suspense fallback={<RouteContentFallback />}><Page /></Suspense>)
    expect(screen.getAllByLabelText('Navegação principal').length).toBeGreaterThan(0)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Carregando conteúdo' })).toHaveAttribute('aria-busy', 'true')
    expect(await screen.findByText('Página pronta')).toBeInTheDocument()
  })
})
