import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { useChecklistItems, useChecklists } from '@/features/maintenance/api/work-orders'
import { checklistItemTypeLabel } from '@/features/maintenance/types'
import { useCategories } from '../api/categories'
import type { Equipment } from '../types'
import { ChecklistExecutionsSection } from './ChecklistExecutionsSection'

interface Props {
  equipment: Equipment
  isAdmin: boolean
}

export function Panel({ children, role }: { children: React.ReactNode; role?: 'alert' }) {
  return <div role={role} className="rounded-md border border-dashed border-border px-4 py-5 text-xs text-text-secondary">{children}</div>
}

export function Retry({ onClick }: { onClick: () => void }) {
  return <button type="button" onClick={onClick} className="ml-2 text-primary underline">Tentar novamente</button>
}

export function EquipmentChecklistSection({ equipment, isAdmin }: Props) {
  const categories = useCategories()
  const checklists = useChecklists()
  const category = equipment.categoriaId ? categories.data?.find((item) => item.id === equipment.categoriaId) : undefined
  const checklistId = category?.checklistPadraoId ?? undefined
  const items = useChecklistItems(checklistId)
  const checklistName = checklists.data?.find((item) => item.id === checklistId)?.nome
  const sorted = [...(items.data ?? [])].sort((a, b) => a.ordem - b.ordem)
  return <div className="space-y-4">
    <section aria-labelledby="equipment-default-checklist" className="rounded-lg border border-border bg-surface p-5">
      <h3 id="equipment-default-checklist" className="text-sm font-semibold text-text-primary">Checklist padrão da categoria</h3>
      <div className="mt-3">
        {!equipment.categoriaId ? <Panel>Este equipamento não tem categoria, por isso não há checklist padrão.{isAdmin ? <> <Link to={`/assets/${equipment.id}/edit`} className="text-primary underline">Definir categoria</Link></> : null}</Panel>
          : categories.isLoading ? <div aria-label="Carregando checklist" aria-busy="true" className="h-24 animate-pulse rounded-md bg-bg" />
          : categories.isError ? <Panel role="alert">Não foi possível carregar a categoria do equipamento.<Retry onClick={() => void categories.refetch()} /></Panel>
          : !checklistId ? <Panel>Nenhum checklist padrão{category ? ` para a categoria ${category.nome}` : ''}.{isAdmin ? <> <Link to="/settings/categories" className="text-primary underline">Ir para Categorias</Link></> : null}</Panel>
          : items.isLoading ? <div aria-label="Carregando checklist" aria-busy="true" className="h-24 animate-pulse rounded-md bg-bg" />
          : items.isError ? <Panel role="alert">Não foi possível carregar os itens do checklist.<Retry onClick={() => void items.refetch()} /></Panel>
          : <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-text-secondary">{checklistName ?? 'Checklist'} · categoria {category?.nome}</p>
              {isAdmin ? <Link to="/checklists" className="text-xs text-primary underline">Abrir checklists</Link> : null}
            </div>
            {sorted.length === 0 ? <p className="mt-3 text-xs text-text-muted">Este checklist não possui itens cadastrados.</p>
              : <ol className="mt-3 divide-y divide-border rounded-md border border-border">
                {sorted.map((item, index) => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="min-w-0 text-xs font-medium text-text-primary">{index + 1}. {item.descricao}</span>
                  <span className="flex items-center gap-2 text-[11px] text-text-muted">{checklistItemTypeLabel(item.tipo)}{item.unidade ? ` · ${item.unidade}` : ''}{item.obrigatorio ? <Badge variant="info">Obrigatório</Badge> : null}</span>
                </li>)}
              </ol>}
          </>}
      </div>
    </section>
    <ChecklistExecutionsSection equipmentId={equipment.id} isAdmin={isAdmin} />
  </div>
}
