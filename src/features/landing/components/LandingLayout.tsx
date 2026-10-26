import { useEffect, useState, useSyncExternalStore } from 'react'
import type { PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'
import { ThemeSwitcher } from '@/app/ThemeSwitcher'
import { getRoleLandingPath } from '@/features/auth/hooks/useLogin'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { ScrollProgress } from './ScrollProgress'
import { NOME_PRODUTO } from '../brand'
import { Marca } from './Marca'
import { focusRing, landingButtonClasses } from './button-classes'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-500.css'
import '@fontsource/inter/latin-600.css'
import '@fontsource/inter/latin-700.css'
import '@fontsource/jetbrains-mono/latin-400.css'
import '@fontsource/jetbrains-mono/latin-500.css'
import '../landing.css'

const sectionLinks = [
  { href: '#recursos', label: 'Recursos' },
  { href: '#conformidade', label: 'Conformidade' },
  { href: '#para-quem', label: 'Para quem' },
  { href: '#contato', label: 'Contato' },
]


/** Destino do botão "Entrar": painel do papel quando há sessão; senão (ou papel desconhecido) /login. */
function useEnterTarget() {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const panel = auth.isAuthenticated && auth.user ? getRoleLandingPath(auth.user.roles) : null
  return panel ? { to: panel, label: 'Ir para o painel' } : { to: '/login', label: 'Entrar' }
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrolled
}

export function LandingLayout({ children }: PropsWithChildren) {
  const enter = useEnterTarget()
  const scrolled = useScrolled()

  return (
    <div className="landing min-h-screen font-sans text-base leading-relaxed">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-semibold focus:text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-text-primary"
      >
        Ir para o conteúdo
      </a>
      <ScrollProgress />

      <header className="landing-nav sticky top-0 z-20" data-scrolled={scrolled}>
        <div className="mx-auto flex h-[72px] w-[min(1120px,100%-32px)] items-center gap-4 md:gap-8">
          <a href="#topo" aria-label={`${NOME_PRODUTO}, início da página`} className={`rounded-md ${focusRing}`}>
            <Marca />
          </a>
          <nav aria-label="Seções da página" className="mx-auto hidden gap-[30px] text-[15px] text-text-secondary md:flex">
            {sectionLinks.map((link) => (
              <a key={link.href} href={link.href} className={`rounded-md transition hover:text-text-primary ${focusRing}`}>
                {link.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <ThemeSwitcher />
            <Link to={enter.to} className={`${landingButtonClasses.ghost} px-4`}>{enter.label}</Link>
            <a href="#contato" className={`${landingButtonClasses.primary} hidden px-4 sm:inline-flex`}>Agendar demonstração</a>
          </div>
        </div>
      </header>

      <main id="conteudo" tabIndex={-1} className="outline-none">{children}</main>

      <footer className="pb-12 pt-14 text-sm text-text-muted">
        <div className="mx-auto w-[min(1120px,100%-32px)]">
          <div className="flex flex-wrap items-center justify-between gap-5 border-t border-border pt-8">
            <Marca className="text-base text-text-primary" />
            <nav aria-label="Rodapé" className="flex flex-wrap gap-x-6 gap-y-2">
              <a href="#recursos" className={`rounded-md hover:text-text-primary ${focusRing}`}>Recursos</a>
              <a href="#conformidade" className={`rounded-md hover:text-text-primary ${focusRing}`}>Conformidade</a>
              <a href="#para-quem" className={`rounded-md hover:text-text-primary ${focusRing}`}>Para quem</a>
              <Link to="/privacidade" className={`rounded-md hover:text-text-primary ${focusRing}`}>Política de Privacidade</Link>
              <Link to="/termos" className={`rounded-md hover:text-text-primary ${focusRing}`}>Termos</Link>
            </nav>
          </div>
          <p className="mt-6">Telas e números são exemplos ilustrativos.</p>
        </div>
      </footer>
    </div>
  )
}
