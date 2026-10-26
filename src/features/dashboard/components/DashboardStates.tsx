import { AlertCircle, ClipboardList, LoaderCircle, PackagePlus, RotateCw } from 'lucide-react'
import { Link } from 'react-router-dom'

export function DashboardLoadingState() {
  return (
    <div aria-label="Carregando dashboard" aria-busy="true" className="space-y-5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-[118px] animate-pulse rounded-lg border border-border bg-surface xl:h-[147px]" />)}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, index) => <div key={index} className="h-[250px] animate-pulse rounded-lg border border-border bg-surface xl:h-[283px]" />)}
      </div>
      <div className="h-[270px] animate-pulse rounded-lg border border-border bg-surface" />
      <span className="sr-only">Carregando os indicadores e chamados recentes.</span>
    </div>
  )
}

export function DashboardEmptyState() {
  return (
    <section className="grid min-h-[calc(100vh-10rem)] place-items-center py-10 text-center">
      <div className="mx-auto flex max-w-[430px] flex-col items-center">
        <span className="mb-4 grid size-[72px] place-items-center rounded-2xl border border-border bg-surface text-text-muted">
          <ClipboardList aria-hidden="true" size={30} strokeWidth={1.5} />
        </span>
        <h2 className="text-base font-semibold text-text-primary">Ainda não há dados para exibir</h2>
        <p className="mt-2 text-xs leading-5 text-text-secondary">Cadastre seus equipamentos ou consulte os relatórios para começar a acompanhar OTs, chamados e disponibilidade.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/assets/new" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-medium text-bg-brand outline-none hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary">
            <PackagePlus aria-hidden="true" size={14} /> Cadastrar equipamento
          </Link>
          <Link to="/reports/export" className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary">
            Exportar relatório
          </Link>
        </div>
      </div>
    </section>
  )
}

export function DashboardErrorState({ onRetry, kind = 'network' }: { onRetry: () => void; kind?: 'network' | 'contract' }) {
  return (
    <section role="alert" className="grid min-h-[calc(100vh-10rem)] place-items-center py-10 text-center">
      <div className="mx-auto flex max-w-sm flex-col items-center">
        <AlertCircle aria-hidden="true" className="mb-3 text-danger" size={30} />
        <h2 className="text-base font-semibold text-text-primary">Não foi possível carregar o dashboard</h2>
        <p className="mt-2 text-xs text-text-secondary">
          {kind === 'contract'
            ? 'Os dados chegaram em um formato que o painel ainda não reconhece. Tente novamente em instantes; se continuar, avise o suporte.'
            : 'Verifique sua conexão e tente novamente.'}
        </p>
        <button type="button" onClick={onRetry} className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary">
          <RotateCw aria-hidden="true" size={14} /> Tentar novamente
        </button>
      </div>
    </section>
  )
}

export function DashboardLoadingIndicator() {
  return <LoaderCircle aria-label="Carregando" className="size-4 animate-spin text-primary" />
}
