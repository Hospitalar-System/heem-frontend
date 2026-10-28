import { AdminPageShell } from './AdminPageShell'

/** Fallback do carregamento de rotas autenticadas: mantém barra lateral e cabeçalho e mostra só o esqueleto do conteúdo. */
export function RouteContentFallback() {
  return <AdminPageShell title="Carregando…">
    <div aria-label="Carregando conteúdo" aria-busy="true" role="status" className="space-y-3">
      <div className="h-10 w-full max-w-md animate-pulse rounded-md bg-surface" />
      {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-md bg-surface" />)}
    </div>
  </AdminPageShell>
}
