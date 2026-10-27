import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, ClipboardCheck, GripVertical, Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { PageAction } from '@/components/ui/PageAction'
import { useAddChecklistItem, useChecklistItems, useChecklists, useCreateChecklist, useReorderChecklistItems, useUpdateChecklistItem } from '../api/work-orders'
import { checklistItemSchema, createChecklistSchema } from '../schemas/checklists.schema'
import { checklistItemTypeChoices, checklistItemTypeLabel, normalizeChecklistItemType, type ChecklistItem } from '../types'
import { Select } from '@/components/ui/Select'

const inputClass = 'h-9 w-full rounded-md border border-border bg-bg px-3 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const initialItem = { descricao: '', tipo: '', unidade: '', obrigatorio: false }
const initialRequiredItem = { ...initialItem, obrigatorio: true }

function apiError(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const data = (error as { response?: { data?: { detail?: string; code?: string } } }).response?.data
    return data?.detail ?? data?.code ?? fallback
  }
  return fallback
}

export function ChecklistsPage() {
  const checklists = useChecklists()
  const createChecklist = useCreateChecklist()
  const [selectedId, setSelectedId] = useState('')
  const [search, setSearch] = useState('')
  const [checklistCode, setChecklistCode] = useState('')
  const [checklistName, setChecklistName] = useState('')
  const [firstItem, setFirstItem] = useState(initialRequiredItem)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [draft, setDraft] = useState(initialItem)
  const [announcement, setAnnouncement] = useState('')

  const currentChecklist = checklists.data?.find((item) => item.id === selectedId)
  const itemsQuery = useChecklistItems(selectedId || undefined)
  const addItem = useAddChecklistItem(selectedId)
  const updateItem = useUpdateChecklistItem(selectedId)
  const reorderItems = useReorderChecklistItems(selectedId)
  const items = useMemo(() => [...(itemsQuery.data ?? [])].sort((a, b) => a.ordem - b.ordem), [itemsQuery.data])
  const selectedItem = items.find((item) => item.id === selectedItemId)
  const visibleChecklists = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return (checklists.data ?? []).filter((item) => item.nome.toLocaleLowerCase('pt-BR').includes(term))
  }, [checklists.data, search])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  useEffect(() => {
    if (!showCreate && !selectedId && checklists.data?.length) setSelectedId(checklists.data[0].id)
  }, [checklists.data, selectedId, showCreate])

  useEffect(() => {
    if (!items.length) {
      setSelectedItemId('')
      return
    }
    if (!items.some((item) => item.id === selectedItemId)) setSelectedItemId(items[0].id)
  }, [items, selectedItemId])

  useEffect(() => {
    setDraft(selectedItem ? {
      descricao: selectedItem.descricao,
      tipo: normalizeChecklistItemType(selectedItem.tipo) ?? '',
      unidade: selectedItem.unidade ?? '',
      obrigatorio: selectedItem.obrigatorio,
    } : initialItem)
  }, [selectedItem])

  async function saveChecklist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = createChecklistSchema.safeParse({ codigo: checklistCode, nome: checklistName, itens: [firstItem] })
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Revise os dados do checklist.')
      return
    }
    const input = {
      ...parsed.data,
      itens: parsed.data.itens.map((item) => ({ ...item, unidade: item.unidade || null })),
    }
    try {
      const created = await createChecklist.mutateAsync(input)
      setSelectedId(created.id)
      setShowCreate(false)
      setChecklistCode('')
      setChecklistName('')
      setFirstItem(initialRequiredItem)
      toast.success('Checklist criado.')
    } catch (error) {
      toast.error(apiError(error, 'Não foi possível criar o checklist.'))
    }
  }

  async function saveItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = checklistItemSchema.safeParse(draft)
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Revise os dados do item.')
      return
    }
    const input = { ...parsed.data, unidade: parsed.data.unidade || null }
    try {
      if (selectedItem) {
        await updateItem.mutateAsync({ id: selectedItem.id, ...input })
        toast.success('Item atualizado.')
      } else {
        const created = await addItem.mutateAsync(input)
        setSelectedItemId(created.id)
        setDraft(initialItem)
        toast.success('Item adicionado.')
      }
    } catch (error) {
      toast.error(apiError(error, 'Não foi possível salvar o item.'))
    }
  }

  async function persistOrder(next: ChecklistItem[]) {
    try {
      await reorderItems.mutateAsync(next.map((item) => item.id))
      setAnnouncement(`Ordem atualizada. ${next.map((item, index) => `${item.descricao}, posição ${index + 1}`).join('. ')}.`)
    } catch (error) {
      toast.error(apiError(error, 'Não foi possível salvar a ordem. A ordem confirmada pelo servidor foi mantida.'))
    }
  }

  function moveItem(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= items.length || reorderItems.isPending) return
    void persistOrder(arrayMove(items, index, target))
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || reorderItems.isPending) return
    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    if (oldIndex !== -1 && newIndex !== -1) void persistOrder(arrayMove(items, oldIndex, newIndex))
  }

  return <AdminPageShell title="Checklists" subtitle="Modelos de verificação para ordens de trabalho" action={<PageAction onClick={() => { setShowCreate(true); setSelectedId('') }} collapseLabelOnMobile>Novo checklist</PageAction>}>
    <div className="grid min-h-[calc(100vh-150px)] gap-4 xl:grid-cols-[minmax(260px,0.8fr)_minmax(420px,1.5fr)]">
      <section aria-label="Lista de checklists" className="min-w-0 rounded-lg border border-border bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4"><h2 className="text-sm font-semibold">Checklists</h2></div>
        <div className="p-3"><label className="relative block"><Search aria-hidden="true" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input type="search" aria-label="Pesquisar checklists" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar checklists" className={`${inputClass} pl-8`} /></label></div>
        {checklists.isLoading && <div aria-label="Carregando checklists" aria-busy="true" className="space-y-2 p-3">{[1, 2, 3, 4].map((row) => <div key={row} className="h-14 animate-pulse rounded-md bg-bg" />)}</div>}
        {checklists.isError && <div role="alert" className="p-4 text-xs text-text-secondary"><p>Não foi possível carregar os checklists.</p><button type="button" onClick={() => void checklists.refetch()} className="mt-2 text-primary underline">Tentar novamente</button></div>}
        {!checklists.isLoading && !checklists.isError && visibleChecklists.length === 0 && <div className="grid min-h-48 place-items-center p-5 text-center"><div><ClipboardCheck aria-hidden="true" className="mx-auto text-text-muted" size={22} /><p className="mt-3 text-sm font-medium text-text-primary">{search ? 'Nenhum checklist encontrado' : 'Nenhum checklist cadastrado'}</p><p className="mt-1 text-xs text-text-secondary">{search ? 'Ajuste a pesquisa.' : 'Crie um modelo para padronizar as verificações.'}</p></div></div>}
        {!checklists.isLoading && !checklists.isError && visibleChecklists.length > 0 && <ul className="max-h-[calc(100vh-330px)] overflow-y-auto border-t border-border">{visibleChecklists.map((checklist) => <li key={checklist.id} className="border-b border-border last:border-0"><button type="button" aria-current={selectedId === checklist.id ? 'page' : undefined} onClick={() => { setSelectedId(checklist.id); setShowCreate(false) }} className={`flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${selectedId === checklist.id ? 'row-selected' : 'hover:bg-bg/60'}`}><span className="min-w-0"><span className="block truncate text-xs font-semibold text-text-primary">{checklist.nome}</span><span className="mt-1 block text-[10px] text-text-muted">{checklist.ativo === false ? 'Inativo' : 'Ativo'}</span></span><span className="shrink-0 text-[10px] text-text-muted">{checklist.quantidadeItens ?? '—'} itens</span></button></li>)}</ul>}
      </section>

      <section aria-label={showCreate ? 'Criar checklist' : 'Construtor de checklist'} className="min-w-0 rounded-lg border border-border bg-surface">
        {showCreate ? <div className="max-w-xl p-5">
          <h2 className="text-sm font-semibold">Novo checklist</h2>
          <p className="mt-1 text-xs text-text-secondary">Informe o código, o nome e configure o primeiro item.</p>
          <form className="mt-5 space-y-4" onSubmit={(event) => void saveChecklist(event)}>
            <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Código do checklist<input autoFocus required maxLength={40} value={checklistCode} onChange={(event) => setChecklistCode(event.target.value)} className={inputClass} placeholder="Ex.: CL-INS-001" /></label>
            <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Nome do checklist<input required maxLength={120} value={checklistName} onChange={(event) => setChecklistName(event.target.value)} className={inputClass} placeholder="Ex.: Inspeção preventiva mensal" /></label>
            <fieldset className="space-y-3 rounded-md border border-border p-4">
              <legend className="px-1 text-xs font-semibold text-text-primary">Primeiro item obrigatório</legend>
              <label className="grid gap-1.5 text-[11px] font-medium text-text-secondary">Descrição<input required maxLength={240} value={firstItem.descricao} onChange={(event) => setFirstItem((item) => ({ ...item, descricao: event.target.value }))} className={inputClass} placeholder="O que deve ser verificado?" /></label>
              <label className="grid gap-1.5 text-[11px] font-medium text-text-secondary">Tipo<Select required value={firstItem.tipo} onChange={(next) => setFirstItem((item) => ({ ...item, tipo: next }))} placeholder="Selecione o tipo" size="sm" options={checklistItemTypeChoices()} /></label>
              <label className="grid gap-1.5 text-[11px] font-medium text-text-secondary">Unidade<input maxLength={40} value={firstItem.unidade} onChange={(event) => setFirstItem((item) => ({ ...item, unidade: event.target.value }))} className={inputClass} placeholder="Opcional" /></label>
              <label className="flex min-h-8 items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={firstItem.obrigatorio} onChange={(event) => setFirstItem((item) => ({ ...item, obrigatorio: event.target.checked }))} className="size-4 accent-primary" />Item obrigatório</label>
            </fieldset>
            <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={() => setShowCreate(false)} disabled={createChecklist.isPending} className="h-8 rounded-md border border-border px-3 text-xs text-text-secondary">Cancelar</button><button type="submit" disabled={createChecklist.isPending} className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{createChecklist.isPending ? 'Criando…' : 'Criar checklist'}</button></div>
          </form>
        </div> : !currentChecklist ? <div className="grid min-h-64 place-items-center p-8 text-center"><div><ClipboardCheck aria-hidden="true" className="mx-auto text-text-muted" size={24} /><h2 className="mt-3 text-sm font-semibold text-text-primary">Selecione um checklist</h2><p className="mt-1 text-xs text-text-secondary">Os itens e suas configurações aparecerão aqui.</p></div></div> : <>
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4"><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-text-primary">{currentChecklist.nome}</h2><p className="mt-1 text-xs text-text-muted">{items.length} item(ns) · ordem usada no formulário da OT</p></div><span className={`rounded-md border px-2 py-1 text-[10px] font-medium ${currentChecklist.ativo === false ? 'border-border bg-bg text-text-muted' : 'border-primary/30 bg-primary/10 text-primary'}`}>{currentChecklist.ativo === false ? 'Inativo' : 'Ativo'}</span></header>
          <div className="grid gap-5 p-4 lg:grid-cols-[minmax(260px,1fr)_minmax(230px,0.8fr)] lg:p-5">
            <div className="min-w-0">
              <div className="mb-3 flex items-center justify-between gap-2"><h3 className="text-xs font-semibold text-text-primary">Itens do checklist</h3>{reorderItems.isPending && <span className="text-[10px] text-text-muted">Salvando ordem…</span>}</div>
              {itemsQuery.isLoading && <div aria-label="Carregando itens" aria-busy="true" className="space-y-2">{[1, 2, 3].map((row) => <div key={row} className="h-16 animate-pulse rounded-md bg-bg" />)}</div>}
              {itemsQuery.isError && <div role="alert" className="rounded-md border border-border p-4 text-xs text-text-secondary"><p>Não foi possível carregar os itens.</p><button type="button" onClick={() => void itemsQuery.refetch()} className="mt-2 text-primary underline">Tentar novamente</button></div>}
              {!itemsQuery.isLoading && !itemsQuery.isError && items.length === 0 && <p className="rounded-md border border-dashed border-border px-4 py-7 text-center text-xs text-text-muted">Este checklist ainda não possui itens.</p>}
              {!itemsQuery.isLoading && !itemsQuery.isError && items.length > 0 && <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}><SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}><ol className="space-y-2">{items.map((item, index) => <SortableChecklistItem key={item.id} item={item} index={index} total={items.length} selected={item.id === selectedItemId} disabled={reorderItems.isPending} onSelect={() => setSelectedItemId(item.id)} onMove={(direction) => moveItem(index, direction)} />)}</ol></SortableContext></DndContext>}
              <p aria-live="polite" className="sr-only">{announcement}</p>
              <button type="button" onClick={() => { setSelectedItemId(''); setDraft(initialItem) }} disabled={itemsQuery.isLoading || itemsQuery.isError} className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium text-text-primary hover:bg-bg disabled:opacity-50"><Plus aria-hidden="true" size={13} />Adicionar item</button>
            </div>
            <form onSubmit={(event) => void saveItem(event)} className="h-fit space-y-3 rounded-md border border-border bg-surface p-4">
              <div><h3 className="text-xs font-semibold text-text-primary">{selectedItem ? 'Configurar item' : 'Novo item'}</h3><p className="mt-1 text-[10px] text-text-muted">A ordem salva será refletida nas ordens de trabalho.</p></div>
              {itemsQuery.isError && <p className="text-xs text-text-muted">Carregue os itens antes de editar este checklist.</p>}
              <label className="grid gap-1.5 text-[11px] font-medium text-text-secondary">Descrição<input required maxLength={240} value={draft.descricao} onChange={(event) => setDraft((value) => ({ ...value, descricao: event.target.value }))} className={inputClass} placeholder="O que deve ser verificado?" /></label>
              <label className="grid gap-1.5 text-[11px] font-medium text-text-secondary">Tipo<Select required value={draft.tipo} onChange={(next) => setDraft((value) => ({ ...value, tipo: next }))} placeholder="Selecione o tipo" size="sm" options={checklistItemTypeChoices(selectedItem?.tipo)} /></label>
              <label className="grid gap-1.5 text-[11px] font-medium text-text-secondary">Unidade<input maxLength={40} value={draft.unidade} onChange={(event) => setDraft((value) => ({ ...value, unidade: event.target.value }))} className={inputClass} placeholder="Opcional" /></label>
              <label className="flex min-h-9 items-center gap-2 text-xs text-text-secondary"><input type="checkbox" checked={draft.obrigatorio} onChange={(event) => setDraft((value) => ({ ...value, obrigatorio: event.target.checked }))} className="size-4 accent-primary" />Item obrigatório</label>
              <div className="flex justify-end border-t border-border pt-3"><button type="submit" disabled={!selectedId || itemsQuery.isLoading || itemsQuery.isError || addItem.isPending || updateItem.isPending || reorderItems.isPending} className="h-8 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{addItem.isPending || updateItem.isPending ? 'Salvando…' : selectedItem ? 'Salvar item' : 'Adicionar item'}</button></div>
            </form>
          </div>
        </>}
      </section>
    </div>
  </AdminPageShell>
}

function SortableChecklistItem({ item, index, total, selected, disabled, onSelect, onMove }: { item: ChecklistItem; index: number; total: number; selected: boolean; disabled: boolean; onSelect: () => void; onMove: (direction: -1 | 1) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: item.id, disabled })
  return <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} aria-current={selected ? 'true' : undefined} className={`flex items-stretch gap-2 rounded-md border p-2 transition-colors ${selected ? 'row-selected' : 'row-idle'} ${isDragging ? 'z-10 opacity-60' : ''}`}>
    <button ref={setActivatorNodeRef} type="button" aria-label={`Mover ${item.descricao}; posição ${index + 1} de ${total}`} {...attributes} {...listeners} disabled={disabled} className="grid w-8 shrink-0 place-items-center rounded text-text-muted hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-40"><GripVertical aria-hidden="true" size={15} /></button>
    <button type="button" onClick={onSelect} className="min-w-0 flex-1 py-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="block truncate text-xs font-medium text-text-primary">{index + 1}. {item.descricao}</span><span className="mt-1 block truncate text-[10px] text-text-muted">{checklistItemTypeLabel(item.tipo)}{item.unidade ? ` · ${item.unidade}` : ''}{item.obrigatorio ? ' · Obrigatório' : ''}</span></button>
    <div className="flex shrink-0 flex-col justify-center"><button type="button" aria-label={`Mover ${item.descricao} para cima`} disabled={disabled || index === 0} onClick={() => onMove(-1)} className="grid size-6 place-items-center rounded text-text-muted hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30"><ArrowUp aria-hidden="true" size={13} /></button><button type="button" aria-label={`Mover ${item.descricao} para baixo`} disabled={disabled || index === total - 1} onClick={() => onMove(1)} className="grid size-6 place-items-center rounded text-text-muted hover:bg-surface hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-30"><ArrowDown aria-hidden="true" size={13} /></button></div>
  </li>
}
