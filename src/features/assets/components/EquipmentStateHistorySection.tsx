import { Link, useSearchParams } from 'react-router-dom'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { PAGINATION_SIZES } from '@/components/ui/Pagination'
import { useEquipmentStateHistory } from '../api/equipment-state'
import type { EquipmentStateHistoryEntry } from '../types'
import { EquipmentStateBadge } from './EquipmentStateBadge'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date)
}

/** Histórico de estado (mais recente primeiro), paginado no servidor; página/tamanho na URL (`epagina`/`etamanho`). */
export function EquipmentStateHistorySection({ equipmentId, isAdmin }: { equipmentId: string; isAdmin: boolean }) {
  const [params, setParams] = useSearchParams()
  const rawPage = Number(params.get('epagina'))
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const rawSize = Number(params.get('etamanho'))
  const size = (PAGINATION_SIZES as readonly number[]).includes(rawSize) ? rawSize : 10
  const update = (patch: Record<string, string | undefined>) => setParams((current) => {
    const next = new URLSearchParams(current)
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key) }
    return next
  })
  const query = useEquipmentStateHistory(equipmentId, { pagina: page - 1, tamanho: size })
  const columns: DataColumn<EquipmentStateHistoryEntry>[] = [
    { key: 'data', header: 'Data', className: 'whitespace-nowrap', cell: (row) => <span className="text-text-secondary">{formatDateTime(row.alteradoEm)}</span> },
    { key: 'de', header: 'De', className: 'whitespace-nowrap', cell: (row) => row.estadoAnterior ? <EquipmentStateBadge state={row.estadoAnterior} /> : <span className="text-text-muted">—</span> },
    { key: 'para', header: 'Para', className: 'whitespace-nowrap', cell: (row) => <EquipmentStateBadge state={row.estadoNovo} /> },
    { key: 'descricao', header: 'Descrição', className: 'max-w-[320px]', cell: (row) => <span className="break-words text-text-secondary">{row.descricao || '—'}</span> },
    { key: 'por', header: 'Alterado por', cell: (row) => <span className="text-text-secondary">{row.alteradoPorNome || '—'}</span> },
    { key: 'origem', header: 'Origem', className: 'whitespace-nowrap', cell: (row) => row.origem === 'ORDEM_TRABALHO'
      ? <span className="text-text-secondary">Ordem de trabalho{isAdmin && row.ordemTrabalhoId ? <> · <Link to={`/work-orders/${row.ordemTrabalhoId}`} className="font-medium text-primary underline">Abrir OT</Link></> : null}</span>
      : <span className="text-text-secondary">{row.origem === 'MANUAL' ? 'Manual' : row.origem}</span> },
  ]
  return <DataTable
    label="Histórico de estado"
    columns={columns}
    rows={query.data?.items ?? []}
    getRowId={(row) => row.id}
    isLoading={query.isLoading}
    loadingLabel="Carregando histórico de estado"
    error={query.isError ? { message: 'Não foi possível carregar o histórico de estado.', onRetry: () => void query.refetch() } : null}
    empty={{ title: 'Nenhuma mudança de estado', description: 'Este equipamento ainda não teve o estado alterado.' }}
    pagination={{ page, size, total: query.data?.total ?? 0, onPageChange: (next) => update({ epagina: next > 1 ? String(next) : undefined }), onSizeChange: (next) => update({ etamanho: next === 10 ? undefined : String(next), epagina: undefined }) }}
    minWidth="900px"
  />
}
