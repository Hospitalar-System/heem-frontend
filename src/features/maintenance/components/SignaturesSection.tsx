import { PenLine } from 'lucide-react'
import type { ReactNode } from 'react'
import { signatureRoleLabels, type Signature, type SignatureRole } from '../types/signatures'

function formatDateTime(value: string) {
  if (!Number.isFinite(Date.parse(value))) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
}

function detailOf(signature: Signature) {
  if (signature.papel === 'tecnico') return signature.registroProfissional ? `CREA ${signature.registroProfissional}` : 'CREA não cadastrado'
  return signature.cargo ?? '—'
}

/** Story 22.2: assinaturas do detalhe da OT e do chamado (imagem, nome, CREA ou cargo, data e hora). */
export function SignaturesSection({ signatures, emptyText, actions, className = '' }: { signatures: Signature[] | null | undefined; emptyText: string; actions?: ReactNode; className?: string }) {
  const list = signatures ?? []
  return <section aria-labelledby="signatures-title" className={`rounded-lg border border-border bg-surface p-5 ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <h3 id="signatures-title" className="flex items-center gap-2 text-sm font-semibold text-text-primary"><PenLine aria-hidden="true" size={16} />Assinaturas</h3>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
    {list.length === 0 ? <p className="mt-4 rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-text-muted">{emptyText}</p>
      : <ul className="mt-4 grid gap-3 sm:grid-cols-2">{list.map((item) => <li key={item.id} className="rounded-md border border-border p-3">
        <div className="grid h-24 place-items-center overflow-hidden rounded bg-white"><img src={item.urlImagem} alt={`Assinatura de ${item.nome}`} className="max-h-20 max-w-full object-contain" /></div>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-text-muted">{signatureRoleLabels[item.papel as SignatureRole] ?? item.papel}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-text-primary" title={item.nome}>{item.nome}</p>
        <p className="mt-0.5 text-xs text-text-secondary">{detailOf(item)} · {formatDateTime(item.assinadoEm)}</p>
      </li>)}</ul>}
  </section>
}
