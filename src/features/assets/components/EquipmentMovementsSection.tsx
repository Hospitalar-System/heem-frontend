import { useSearchParams } from 'react-router-dom'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { PAGINATION_SIZES } from '@/components/ui/Pagination'
import { tipoMotivoLabel, useEquipmentMovements, type EquipmentMovement } from '../api/movements'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
function formatDateTime(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : dateFormat.format(date)
}

/** "UTI 1" no mesmo hospital; entre hospitais, "UTI 1 · Santa Casa". */
function lugar(setor: string | null, hospital: string | null, mostrarHospital: boolean) {
  const s = setor || 'Sem setor'
  return mostrarHospital && hospital ? `${s} · ${hospital}` : s
}

/**
 * Movimentações do equipamento (Story 24.2/24.5), mais recente primeiro, paginadas no servidor; página/tamanho na URL
 * (`mpagina`/`mtamanho`). O escopo de hospital é do servidor.
 */
export function EquipmentMovementsSection({ equipmentId }: { equipmentId: string }) {
  const [params, setParams] = useSearchParams()
  const rawPage = Number(params.get('mpagina'))
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : 1
  const rawSize = Number(params.get('mtamanho'))
  const size = (PAGINATION_SIZES as readonly number[]).includes(rawSize) ? rawSize : 10
  const update = (patch: Record<string, string | undefined>) => setParams((current) => {
    const next = new URLSearchParams(current)
    for (const [key, value] of Object.entries(patch)) { if (value) next.set(key, value); else next.delete(key) }
    return next
  })
  const query = useEquipmentMovements(equipmentId, { pagina: page - 1, tamanho: size })
  const columns: DataColumn<EquipmentMovement>[] = [
    { key: 'data', header: 'Data', className: 'whitespace-nowrap', cell: (row) => <span className="text-text-secondary">{formatDateTime(row.movimentadoEm)}</span> },
    { key: 'de', header: 'De', className: 'max-w-[220px]', cell: (row) => { const entre = row.hospitalOrigemId !== row.hospitalDestinoId; return <span className="block break-words text-text-secondary">{lugar(row.setorOrigemNome, row.hospitalOrigemNome, entre)}</span> } },
    { key: 'para', header: 'Para', className: 'max-w-[220px]', cell: (row) => { const entre = row.hospitalOrigemId !== row.hospitalDestinoId; return <span className="block break-words font-medium text-text-primary">{lugar(row.setorDestinoNome, row.hospitalDestinoNome, entre)}</span> } },
    { key: 'tipo', header: 'Tipo', className: 'whitespace-nowrap', cell: (row) => <span className={row.tipoMotivo ? 'text-text-secondary' : 'text-text-muted'}>{tipoMotivoLabel(row.tipoMotivo)}</span> },
    { key: 'motivo', header: 'Motivo', className: 'max-w-[320px]', cell: (row) => <span className="block break-words text-text-secondary">{row.motivo || '—'}</span> },
    { key: 'por', header: 'Por', cell: (row) => <span className="text-text-secondary">{row.movimentadoPorNome || '—'}</span> },
  ]
  return <DataTable
    label="Movimentações"
    columns={columns}
    rows={query.data?.items ?? []}
    getRowId={(row) => row.id}
    isLoading={query.isLoading}
    loadingLabel="Carregando movimentações"
    error={query.isError ? { message: 'Não foi possível carregar as movimentações.', onRetry: () => void query.refetch() } : null}
    empty={{ title: 'Nenhuma movimentação', description: 'Este equipamento ainda não foi transferido de setor.' }}
    pagination={{ page, size, total: query.data?.total ?? 0, onPageChange: (next) => update({ mpagina: next > 1 ? String(next) : undefined }), onSizeChange: (next) => update({ mtamanho: next === 10 ? undefined : String(next), mpagina: undefined }) }}
    minWidth="900px"
  />
}
