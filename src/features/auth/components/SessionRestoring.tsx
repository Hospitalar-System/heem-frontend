// Exibido pelas rotas protegidas enquanto a sessão é restaurada (refresh + /me) na abertura do app.
export function SessionRestoring() {
  return (
    <main aria-busy="true" role="status" className="grid min-h-screen place-items-center bg-bg text-text-secondary">
      <div className="flex flex-col items-center gap-3">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
        <span className="text-sm">Restaurando sua sessão…</span>
      </div>
    </main>
  )
}
