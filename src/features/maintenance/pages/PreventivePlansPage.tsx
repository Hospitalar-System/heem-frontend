import { AlertTriangle, ArrowRight, CalendarClock, ClipboardList, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AdminPageShell } from '@/components/layout/AdminPageShell'

export function PreventivePlansPage() {
  return <AdminPageShell title="Planos preventivos" subtitle="Manutenção recorrente e geração programada de OTs">
    <div className="mx-auto max-w-4xl space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><CalendarClock aria-hidden="true" size={17} /></span>
          <div><h2 className="text-sm font-semibold text-text-primary">Rotinas recorrentes</h2><p className="mt-1 text-xs text-text-secondary">Configure ciclos de manutenção para gerar ordens de trabalho automaticamente.</p></div>
        </div>
        <button type="button" disabled title="Aguardando API de planos preventivos do backend" className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand opacity-50 disabled:cursor-not-allowed"><Plus aria-hidden="true" size={14} />Novo plano</button>
      </section>

      <section role="status" className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/5 p-4 md:p-5">
        <AlertTriangle aria-hidden="true" size={17} className="mt-0.5 shrink-0 text-warning" />
        <div className="min-w-0"><h2 className="text-xs font-semibold text-text-primary">Gestão de planos indisponível</h2><p className="mt-1 text-xs leading-5 text-text-secondary">A criação, recorrência e consulta de planos dependem das Stories 9.1 e 9.2 do backend. As rotas atuais permitem agendar uma OT preventiva individual, mas ainda não permitem manter um plano recorrente. Nenhum plano está sendo simulado nesta tela.</p></div>
      </section>

      <section className="grid min-h-56 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center">
        <div className="max-w-md">
          <span className="mx-auto grid size-10 place-items-center rounded-md bg-bg text-text-secondary"><ClipboardList aria-hidden="true" size={18} /></span>
          <h2 className="mt-3 text-sm font-semibold text-text-primary">Planos serão exibidos aqui</h2>
          <p className="mt-1 text-xs leading-5 text-text-secondary">Quando o backend disponibilizar as rotas de planos preventivos, você poderá acompanhar a próxima execução, pendências e o histórico das OTs geradas.</p>
          <Link to="/work-orders" className="mt-4 inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium text-text-primary outline-none hover:bg-bg focus-visible:ring-2 focus-visible:ring-primary">Consultar ordens de trabalho<ArrowRight aria-hidden="true" size={14} /></Link>
        </div>
      </section>
    </div>
  </AdminPageShell>
}
