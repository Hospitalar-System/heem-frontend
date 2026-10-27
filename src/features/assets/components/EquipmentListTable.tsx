import { useNavigate } from 'react-router-dom'
import { parseDate, formatBr } from '@/components/ui/civil-date'
import type { Equipment } from '../types'
import { EquipmentStatusBadge } from './EquipmentStatusBadge'
import { EquipmentThumb } from './EquipmentPhotoSection'

export function DocumentsIndicator({ vencidos, vencendo, proximaValidade }: { vencidos?: number | null; vencendo?: number | null; proximaValidade?: string | null }) {
  const expired = vencidos ?? 0
  const expiring = vencendo ?? 0
  if (expired === 0 && expiring === 0) return <span className="text-text-muted" aria-label="Sem documentos com atenção">—</span>
  const next = parseDate(proximaValidade)
  const expiredText = `${expired} ${expired === 1 ? 'vencido' : 'vencidos'}`
  const expiringText = `${expiring} vencendo`
  const nextText = next ? formatBr(next) : null
  const label = [expired > 0 ? expiredText : null, expiring > 0 ? expiringText : null, nextText ? `próxima validade ${nextText}` : null].filter(Boolean).join(', ')
  return <span className="flex flex-col gap-0.5" role="group" aria-label={`Documentos: ${label}`}>
    <span className="flex flex-wrap gap-x-2 font-semibold">
      {expired > 0 ? <span className="text-danger">{expiredText}</span> : null}
      {expiring > 0 ? <span className="text-warning">{expiringText}</span> : null}
    </span>
    {nextText ? <span className="text-[11px] text-text-muted">Próx.: {nextText}</span> : null}
  </span>
}

export function EquipmentListTable({ items, sectorNameById }: { items: Equipment[]; sectorNameById: Map<string, string> }) {
  const navigate = useNavigate()
  return <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[1200px] border-collapse text-left">
        <thead><tr className="table-head h-12 text-[11px]">{['Código', 'Nome', 'Categoria', 'Modelo', 'Nº série', 'Setor', 'Últ. manut.', 'Documentos', 'Status'].map((heading) => <th key={heading} scope="col" className="px-4">{heading}</th>)}</tr></thead>
        <tbody>{items.map((item) => <tr key={item.id} role="link" tabIndex={0} aria-label={`Abrir ${item.codigo}, ${item.nome}`} onClick={() => navigate(`/assets/${item.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/assets/${item.id}`) } }} className="h-12 row-clickable border-b border-border/70 text-xs last:border-0">
          <td className="whitespace-nowrap px-4 font-medium text-text-secondary">{item.codigo}</td><td className="max-w-[320px] px-4 text-sm font-medium text-text-primary"><span className="flex items-center gap-3"><EquipmentThumb equipmentId={item.id} nome={item.nome} fotoVersao={item.fotoVersao} /><span className="truncate">{item.nome}</span></span></td><td className="px-4 text-text-secondary">{item.categoriaNome ?? <span className="text-text-muted">Sem categoria</span>}</td><td className="px-4 text-text-secondary">{item.modelo || '—'}</td><td className="px-4 text-text-secondary">{item.numeroSerie || '—'}</td><td className="px-4 text-text-secondary">{sectorNameById.get(item.setorId) ?? '—'}</td><td className="px-4 text-text-muted" title="A API não fornece a data da última manutenção na listagem">—</td><td className="px-4"><DocumentsIndicator vencidos={item.documentosVencidos} vencendo={item.documentosVencendo} proximaValidade={item.proximaValidade} /></td><td className="px-4"><EquipmentStatusBadge status={item.statusCicloVida} /></td>
        </tr>)}</tbody>
      </table>
    </div>
}
