import { ArrowUpRight } from 'lucide-react'
import { LoginForm } from '../components/LoginForm'
import { ThemeSwitcher } from '@/app/ThemeSwitcher'

export function LoginPage() {
  return (
    <main className="min-h-screen bg-bg-login text-text-primary">
      <div className="flex min-h-screen w-full flex-col md:flex-row">
        <section aria-label="Sobre o HEMM" className="flex min-h-[38vh] w-full items-center bg-bg-brand px-8 py-10 sm:px-12 md:min-h-screen md:w-1/2 md:px-[10.5%]">
          <div className="w-full max-w-[440px]">
            <a href="/login" className="mb-10 inline-flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-primary md:mb-10" aria-label="HEMM — página de login">
              <span className="grid size-11 place-items-center rounded-[10px] bg-primary text-lg font-bold text-bg-brand">H</span>
              <span className="text-[26px] font-bold tracking-tight">HEMM</span>
            </a>
            <h1 className="max-w-[410px] text-[30px] font-bold leading-[1.34] tracking-tight sm:text-[32px]">Gestão de manutenção de equipamentos hospitalares</h1>
            <p className="mt-4 max-w-[390px] text-[15px] leading-[1.65] text-text-secondary">Engenharia clínica sob controle: checklists, ordens de trabalho e chamados de emergência em uma só plataforma.</p>
          </div>
        </section>

        <section aria-labelledby="login-title" className="flex min-h-[62vh] w-full flex-col bg-bg-login px-8 py-7 sm:px-12 md:min-h-screen md:w-1/2 md:px-10 xl:px-16">
          <header className="flex justify-end">
            <ThemeSwitcher />
          </header>

          <div className="mx-auto flex w-full max-w-[346px] flex-1 flex-col justify-center py-10 md:py-0">
            <div className="mb-5">
              <h2 id="login-title" className="text-[24px] font-bold leading-tight tracking-tight">Entrar</h2>
              <p className="mt-1.5 text-sm text-text-secondary">Acesse o painel administrativo</p>
            </div>
            <LoginForm />
          </div>

          <footer className="flex items-center justify-end gap-1 text-[11px] text-text-muted">
            <span>HEMM · v1.0</span>
            <ArrowUpRight aria-hidden="true" size={12} />
          </footer>
        </section>
      </div>
    </main>
  )
}
