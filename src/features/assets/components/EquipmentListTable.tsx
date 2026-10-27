import { useNavigate } from 'react-router-dom'
import { parseDate, formatBr } from '@/components/ui/civil-date'
import { DataTable, type DataColumn, type DataTableProps } from '@/components/ui/DataTable'
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

type EquipmentListTableProps = Pick<DataTableProps<Equipment>, 'isLoading' | 'error' | 'empty'> & { items: Equipment[]; sectorNameById: Map<string, string> }

export function EquipmentListTable({ items, sectorNameById, isLoading, error, empty }: EquipmentListTableProps) {
  const navigate = useNavigate()
  const columns: DataColumn<Equipment>[] = [
    { key: 'codigo', header: 'Código', className: 'whitespace-nowrap', cell: (item) => <span className="font-medium text-text-secondary">{item.codigo}</span> },
    { key: 'nome', header: 'Nome', className: 'max-w-[320px]', cell: (item) => <span className="flex items-center gap-3 text-sm font-medium text-text-primary"><EquipmentThumb equipmentId={item.id} nome={item.nome} fotoVersao={item.fotoVersao} /><span className="truncate">{item.nome}</span></span> },
    { key: 'categoria', header: 'Categoria', cell: (item) => <span className="text-text-secondary">{item.categoriaNome ?? <span className="text-text-muted">Sem categoria</span>}</span> },
    { key: 'modelo', header: 'Modelo', cell: (item) => <span className="text-text-secondary">{item.modelo || '—'}</span> },
    { key: 'serie', header: 'Nº série', cell: (item) => <span className="text-text-secondary">{item.numeroSerie || '—'}</span> },
    { key: 'setor', header: 'Setor', cell: (item) => <span className="text-text-secondary">{sectorNameById.get(item.setorId) ?? '—'}</span> },
    { key: 'manutencao', header: 'Últ. manut.', cell: () => <span className="text-text-muted" title="A API não fornece a data da última manutenção na listagem">—</span> },
    { key: 'documentos', header: 'Documentos', cell: (item) => <DocumentsIndicator vencidos={item.documentosVencidos} vencendo={item.documentosVencendo} proximaValidade={item.proximaValidade} /> },
    { key: 'status', header: 'Status', cell: (item) => <EquipmentStatusBadge status={item.statusCicloVida} /> },
  ]
  return <DataTable
    label="Equipamentos"
    columns={columns}
    rows={items}
    getRowId={(item) => item.id}
    onRowClick={(item) => navigate(`/assets/${item.id}`)}
    rowProps={(item) => ({ role: 'link', 'aria-label': `Abrir ${item.codigo}, ${item.nome}` })}
    isLoading={isLoading}
    loadingLabel="Carregando equipamentos"
    error={error}
    empty={empty}
    minWidth="1200px"
  />
}
