import { useSearchParams } from 'react-router-dom'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { PAGINATION_SIZES, Pagination } from '@/components/ui/Pagination'
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
  const rows = query.data?.items ?? []
  const pagination = { page, size, total: query.data?.total ?? 0, onPageChange: (next: number) => update({ mpagina: next > 1 ? String(next) : undefined }), onSizeChange: (next: number) => update({ mtamanho: next === 10 ? undefined : String(next), mpagina: undefined }) }
  // Abaixo de sm a tabela de 6 colunas não cabe: cada movimentação vira um card (carregando, erro e vazio seguem na tabela).
  const cards = !query.isLoading && !query.isError && rows.length > 0
  return <>
    <div className={cards ? 'hidden sm:block' : undefined}>
      <DataTable
        label="Movimentações"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        isLoading={query.isLoading}
        loadingLabel="Carregando movimentações"
        error={query.isError ? { message: 'Não foi possível carregar as movimentações.', onRetry: () => void query.refetch() } : null}
        empty={{ title: 'Nenhuma movimentação', description: 'Este equipamento ainda não foi transferido de setor.' }}
        pagination={pagination}
        minWidth="900px"
      />
    </div>
    {cards ? <div className="sm:hidden">
      <ul aria-label="Movimentações" className="grid gap-2">
        {rows.map((row) => <MovementCard key={row.id} row={row} />)}
      </ul>
      <Pagination {...pagination} className="mt-2 rounded-lg border border-border bg-surface" />
    </div> : null}
  </>
}

/** Nome de lugar que quebra entre setor e hospital, nunca no meio de um nome. */
function Lugar({ setor, hospital, mostrarHospital }: { setor: string | null; hospital: string | null; mostrarHospital: boolean }) {
  return <><span className="whitespace-nowrap">{setor || 'Sem setor'}</span>{mostrarHospital && hospital ? <> · <span className="whitespace-nowrap">{hospital}</span></> : null}</>
}

function MovementCard({ row }: { row: EquipmentMovement }) {
  const entre = row.hospitalOrigemId !== row.hospitalDestinoId
  return <li className="rounded-lg border border-border bg-surface px-3 py-2.5 text-xs">
    <div className="flex items-baseline justify-between gap-3">
      <span className="whitespace-nowrap text-text-secondary">{formatDateTime(row.movimentadoEm)}</span>
      <span className="truncate text-text-muted">{row.movimentadoPorNome || '—'}</span>
    </div>
    <p className="mt-1 text-text-secondary"><Lugar setor={row.setorOrigemNome} hospital={row.hospitalOrigemNome} mostrarHospital={entre} /> → <span className="font-semibold text-text-primary"><Lugar setor={row.setorDestinoNome} hospital={row.hospitalDestinoNome} mostrarHospital={entre} /></span></p>
    <p className="mt-1"><span className={row.tipoMotivo ? 'font-semibold text-text-primary' : 'text-text-muted'}>{tipoMotivoLabel(row.tipoMotivo)}</span>{row.motivo ? <span className="text-text-muted"> · {row.motivo}</span> : null}</p>
  </li>
}
