import { ClipboardCheck } from 'lucide-react'
import { useCampaignFinalizations } from '../api/signatures'

function formatDateTime(value: string) {
  if (!Number.isFinite(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function plural(n: number, singular: string, pluralForm: string) {
  return `${n} ${n === 1 ? singular : pluralForm}`
}

/** Até 5 códigos de OT, cada um sem quebra, seguidos de "e mais N" (uma campanha pode cobrir centenas de OTs). */
const VISIBLE_ORDERS = 5
function CoveredOrders({ codes }: { codes: string[] }) {
  if (codes.length === 0) return null
  const rest = codes.length - VISIBLE_ORDERS
  return <p className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-text-secondary"><span className="sr-only">OTs cobertas: </span>{codes.slice(0, VISIBLE_ORDERS).map((code, index) => <span key={code} className="whitespace-nowrap">{code}{index < Math.min(codes.length, VISIBLE_ORDERS) - 1 || rest > 0 ? ',' : ''}</span>)}{rest > 0 ? <span className="whitespace-nowrap">e mais {rest}</span> : null}</p>
}

/**
 * Story 22.3 (web, só leitura para o Admin): finalizações registradas pelos técnicos, com as OTs cobertas e os
 * vereditos. A finalização e a assinatura acontecem no app (story M); o painel web não tem tela de técnico.
 */
export function CampaignFinalizationSection({ campaignId, technicianNames }: { campaignId: string; technicianNames?: Record<string, string> }) {
  const finalizations = useCampaignFinalizations(campaignId, true)
  const list = Array.isArray(finalizations.data) ? finalizations.data : []

  return <section aria-labelledby="finalization-title" className="rounded-lg border border-border bg-surface p-4 md:p-5">
    <h2 id="finalization-title" className="flex items-center gap-2 text-sm font-semibold text-text-primary"><ClipboardCheck aria-hidden="true" size={16} />Finalização</h2>
    <p className="mt-1 text-xs text-text-secondary">Finalizações registradas pelos técnicos no app, com as OTs cobertas por cada uma.</p>

    {finalizations.isLoading ? <div aria-busy="true" aria-label="Carregando finalizações" className="mt-4 h-16 animate-pulse rounded-md bg-bg" />
      : finalizations.isError ? <p role="alert" className="mt-4 text-xs text-danger">Não foi possível carregar as finalizações. <button type="button" onClick={() => void finalizations.refetch()} className="font-medium text-primary hover:underline">Tentar novamente</button></p>
        : list.length === 0 ? <p className="mt-4 rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-text-muted">Nenhuma finalização registrada ainda.</p>
          : <ul className="mt-4 divide-y divide-border rounded-md border border-border">{list.map((item) => <li key={item.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-3">
            <div className="min-w-0"><p className="text-sm font-medium text-text-primary">{technicianNames?.[item.tecnicoId] ?? 'Técnico'}</p><p className="mt-0.5 text-[11px] text-text-muted">Finalizada em {formatDateTime(item.finalizadoEm)}</p><CoveredOrders codes={item.resumo.ots.map((ot) => ot.codigo)} /></div>
            <p className="shrink-0 text-xs text-text-secondary">{plural(item.resumo.totalOts, 'OT', 'OTs')} · {item.resumo.aptos} aptos · {item.resumo.naoAptos} não aptos · {item.resumo.emManutencao} em manutenção{item.resumo.semVeredito > 0 ? ` · ${item.resumo.semVeredito} sem veredito` : ''}{item.resumo.emUso ? ` · ${item.resumo.emUso} em uso (não realizadas)` : ''}</p>
          </li>)}</ul>}
  </section>
}
