import { Link } from 'react-router-dom'
import { useEquipmentParts } from '@/features/maintenance/api/tickets'

/** Story 25.2: peças trocadas nos chamados do equipamento (mais recentes primeiro, até 200). */
export function EquipmentPartsSection({ equipmentId }: { equipmentId: string }) {
  const parts = useEquipmentParts(equipmentId)
  if (parts.isLoading) return <div aria-label="Carregando peças trocadas" aria-busy="true" className="h-56 animate-pulse rounded-lg border border-border bg-surface" />
  if (parts.isError) return <section role="alert" className="rounded-lg border border-danger/40 bg-surface p-5 text-sm"><p>Não foi possível carregar as peças trocadas deste equipamento.</p><button type="button" onClick={() => void parts.refetch()} className="mt-2 text-xs text-primary underline">Tentar novamente</button></section>
  const items = parts.data ?? []
  if (!items.length) return <section className="grid min-h-48 place-items-center rounded-lg border border-dashed border-border bg-surface p-6 text-center"><div><h3 className="text-sm font-semibold">Nenhuma peça trocada</h3><p className="mt-1 text-xs text-text-secondary">As peças registradas nos chamados deste equipamento aparecem aqui.</p></div></section>
  return <div className="overflow-x-auto rounded-lg border border-border bg-surface">
    <table className="tabular-nums w-full min-w-[620px] border-collapse text-left">
      <thead><tr className="table-head h-11 text-[11px]"><th scope="col" className="px-4">Chamado</th><th scope="col" className="px-4">Peça</th><th scope="col" className="px-4 text-center">Qtd.</th><th scope="col" className="px-4">Código</th><th scope="col" className="px-4">Registrada em</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item.id} className="row-idle row-divider h-11 text-xs">
        <td className="px-4 font-medium"><Link to={`/tickets/${item.chamadoId}`} className="hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{item.chamadoCodigo ?? 'Chamado'}</Link></td>
        <td className="px-4 text-text-primary">{item.descricao}</td>
        <td className="px-4 text-center text-text-secondary">{item.quantidade}</td>
        <td className="px-4 text-text-secondary">{item.codigo || '—'}</td>
        <td className="px-4 text-text-secondary">{formatDate(item.registradoEm)}</td>
      </tr>)}</tbody>
    </table>
  </div>
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}
