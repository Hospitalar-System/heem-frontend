import { useMemo, useState } from 'react'
import { GitMerge, Pencil, PowerOff, Search, Tags, CheckCheck } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { SettingsNav } from '@/features/settings/components/SettingsNav'
import { PageAction } from '@/components/ui/PageAction'
import { FilterBar, filterInputClass } from '@/components/ui/FilterBar'
import { Field, Modal } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { FormSelect } from '@/components/ui/FormSelect'
import { useChecklists } from '@/features/maintenance/api/work-orders'
import { getCategoryErrorMessage, useCategories, useDeactivateCategory, useMarkCategoryReviewed, useMergeCategory, useSaveCategory } from '../api/categories'
import { categorySchema, type CategoryFormValues } from '../schemas/assets.schema'
import type { EquipmentCategory } from '../types'
import { Checkbox } from '@/components/ui/Checkbox'
import { RowActionsMenu } from '@/components/ui/RowActionsMenu'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const statusOptions = [
  { value: '', label: 'Todas' },
  { value: 'ativas', label: 'Ativas' },
  { value: 'inativas', label: 'Inativas' },
]

export function CategoriesPage() {
  const [status, setStatus] = useState('')
  const [onlyReview, setOnlyReview] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<EquipmentCategory | null>(null)
  const [deactivating, setDeactivating] = useState<EquipmentCategory | null>(null)
  const [merging, setMerging] = useState<EquipmentCategory | null>(null)
  const categories = useCategories({ ativa: status === 'ativas' ? true : status === 'inativas' ? false : undefined, revisar: onlyReview })
  const checklists = useChecklists()
  const reviewed = useMarkCategoryReviewed()
  const checklistName = useMemo(() => new Map((checklists.data ?? []).map((item) => [item.id, item.nome])), [checklists.data])
  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR')
    return (categories.data ?? []).filter((item) => !term || item.nome.toLocaleLowerCase('pt-BR').includes(term))
  }, [categories.data, search])
  const hasFilters = Boolean(status || onlyReview || search.trim())

  async function markReviewed(category: EquipmentCategory) {
    try {
      await reviewed.mutateAsync(category.id)
      toast.success(`Categoria "${category.nome}" marcada como revisada.`)
    } catch (error) {
      toast.error(getCategoryErrorMessage(error) ?? 'Não foi possível marcar a categoria como revisada.')
    }
  }

  const clearFilters = () => { setStatus(''); setOnlyReview(false); setSearch('') }

  return <AdminPageShell tabs={<SettingsNav />} title="Categorias de equipamento" subtitle="Tipos de equipamento e checklist padrão" action={<PageAction onClick={() => setCreating(true)} collapseLabelOnMobile>Nova categoria</PageAction>}>
    <FilterBar label="Filtros de categorias" className="mb-4">
      <label className="min-w-0"><span className="sr-only">Filtrar por situação</span><Select size="sm" aria-label="Filtrar por situação" value={status} onChange={setStatus} options={statusOptions} /></label>
      <Checkbox label="A revisar" checked={onlyReview} onCheckedChange={setOnlyReview} containerClassName="h-9 justify-center rounded-md border border-border bg-bg px-3 text-xs text-text-primary" />
      <label className="relative min-w-0 sm:col-span-2"><span className="sr-only">Buscar categoria</span><Search aria-hidden="true" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" /><input aria-label="Buscar categoria" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome da categoria" className={`${filterInputClass} pl-8`} /></label>
    </FilterBar>

    {categories.isError ? <section role="alert" className="rounded-lg border border-danger/40 bg-surface p-5 text-sm"><p>Não foi possível carregar as categorias.</p><button type="button" className="mt-2 text-xs font-semibold text-primary underline" onClick={() => void categories.refetch()}>Tentar novamente</button></section> : null}
    {categories.isLoading ? <div aria-label="Carregando categorias" aria-busy="true" className="space-y-2 rounded-lg border border-border bg-surface p-4">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-10 animate-pulse rounded bg-bg" />)}</div> : null}
    {!categories.isLoading && !categories.isError && visible.length === 0 ? <section className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"><div><Tags className="mx-auto text-text-muted" /><h2 className="mt-3 font-semibold">{hasFilters ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}</h2><p className="mt-1 max-w-md text-sm text-text-secondary">{hasFilters ? 'Ajuste os filtros ou a busca para ver outras categorias.' : 'Cadastre a primeira categoria (tipo de equipamento, como Bomba ou Ventilador Pulmonar).'}</p>{hasFilters ? <button type="button" onClick={clearFilters} className="mt-4 text-xs font-semibold text-primary underline">Limpar filtros</button> : <div className="mt-4 flex justify-center"><PageAction onClick={() => setCreating(true)} fullWidthMobile>Criar categoria</PageAction></div>}</div></section> : null}
    {!categories.isLoading && !categories.isError && visible.length > 0 ? <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full min-w-[900px] border-collapse text-left">
        <thead><tr className="table-head h-12 text-[11px]">{['Nome', 'Checklist padrão', 'Origem', 'Equipamentos', 'Situação', ''].map((heading, index) => <th key={`${heading}${index}`} scope="col" className="px-4">{heading}</th>)}</tr></thead>
        <tbody>{visible.map((category) => {
          const needsReview = category.origem === 'carga' && !category.revisada
          return <tr key={category.id} className="row-idle h-12 border-b border-border/70 text-xs last:border-0">
            <td className="px-4 text-sm font-medium text-text-primary"><span className="inline-flex items-center gap-2">{category.nome}{needsReview ? <span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">Revisar</span> : null}</span></td>
            <td className="px-4 text-text-secondary">{category.checklistPadraoId ? checklistName.get(category.checklistPadraoId) ?? 'Checklist indisponível' : '—'}</td>
            <td className="px-4 text-text-secondary">{category.origem === 'carga' ? 'Carga inicial' : 'Manual'}</td>
            <td className="px-4 tabular-nums text-text-secondary">{category.quantidadeEquipamentos ?? '—'}</td>
            <td className="px-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${category.ativa ? 'bg-primary/10 text-primary' : 'bg-bg text-text-muted'}`}>{category.ativa ? 'Ativa' : 'Inativa'}</span></td>
            <td className="px-4"><div className="flex justify-end"><RowActionsMenu label={category.nome} actions={[
              ...(needsReview ? [{ label: 'Marcar como revisada', icon: <CheckCheck size={14} />, disabled: reviewed.isPending, onSelect: () => markReviewed(category) }] : []),
              { label: 'Editar', icon: <Pencil size={14} />, onSelect: () => setEditing(category) },
              ...(category.ativa ? [{ label: 'Mesclar outra categoria nesta', icon: <GitMerge size={14} />, onSelect: () => setMerging(category) }, { label: 'Desativar', icon: <PowerOff size={14} />, destructive: true, onSelect: () => setDeactivating(category) }] : []),
            ]} /></div></td>
          </tr>
        })}</tbody>
      </table>
    </div> : null}
    {checklists.isError ? <p role="alert" className="mt-3 text-xs text-text-muted">Não foi possível carregar os nomes dos checklists.</p> : null}

    {creating && <CategoryForm onClose={() => setCreating(false)} />}
    {editing && <CategoryForm category={editing} onClose={() => setEditing(null)} />}
    {deactivating && <DeactivateDialog category={deactivating} onClose={() => setDeactivating(null)} />}
    {merging && <MergeDialog target={merging} onClose={() => setMerging(null)} />}
  </AdminPageShell>
}

function CategoryForm({ category, onClose }: { category?: EquipmentCategory; onClose: () => void }) {
  const save = useSaveCategory()
  const checklists = useChecklists()
  const [submitError, setSubmitError] = useState('')
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { nome: category?.nome ?? '', checklistPadraoId: category?.checklistPadraoId ?? '', ativa: category?.ativa ?? true },
  })
  const options = [{ value: '', label: 'Sem checklist padrão' }, ...(checklists.data ?? []).filter((item) => item.ativo !== false || item.id === category?.checklistPadraoId).map((item) => ({ value: item.id, label: item.nome }))]
  const submit = form.handleSubmit(async (values) => {
    setSubmitError('')
    try {
      await save.mutateAsync({ id: category?.id, data: { nome: values.nome, ativa: values.ativa, checklistPadraoId: values.checklistPadraoId || null } })
      toast.success(category ? 'Categoria atualizada.' : 'Categoria cadastrada.')
      onClose()
    } catch (error) {
      const message = getCategoryErrorMessage(error) ?? 'Não foi possível salvar a categoria.'
      setSubmitError(message)
      toast.error(message)
    }
  })
  return <Modal title={category ? 'Editar categoria' : 'Nova categoria'} description="A categoria é o tipo do equipamento (ex.: Bomba de Infusão). O nome individual fica no cadastro do equipamento." onClose={onClose} busy={save.isPending}>
    <form onSubmit={submit} className="space-y-4">
      <Field label="Nome" error={form.formState.errors.nome?.message}><input autoFocus className={inputClass} {...form.register('nome')} /></Field>
      <Field label="Checklist padrão"><FormSelect control={form.control} name="checklistPadraoId" disabled={checklists.isLoading} options={options} /></Field>
      {checklists.isError ? <p role="alert" className="text-xs text-danger">Não foi possível carregar os checklists.</p> : null}
      <Checkbox label="Categoria ativa" containerClassName="text-xs text-text-primary" {...form.register('ativa')} />
      {submitError ? <p role="alert" className="rounded-md border border-danger/40 p-3 text-xs text-danger">{submitError}</p> : null}
      <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={save.isPending} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs">Cancelar</button><button type="submit" disabled={save.isPending} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{save.isPending ? 'Salvando…' : 'Salvar categoria'}</button></div>
    </form>
  </Modal>
}

function DeactivateDialog({ category, onClose }: { category: EquipmentCategory; onClose: () => void }) {
  const deactivate = useDeactivateCategory()
  async function confirm() {
    try {
      await deactivate.mutateAsync(category.id)
      toast.success(`Categoria "${category.nome}" desativada.`)
      onClose()
    } catch (error) {
      toast.error(getCategoryErrorMessage(error) ?? 'Não foi possível desativar a categoria.')
    }
  }
  return <Modal title="Desativar categoria" description={`Desativar "${category.nome}"? Ela deixa de aparecer na escolha de categoria de novos equipamentos; os equipamentos atuais continuam vinculados.`} onClose={onClose} busy={deactivate.isPending}>
    <div className="flex justify-end gap-2"><button type="button" disabled={deactivate.isPending} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs">Cancelar</button><button type="button" disabled={deactivate.isPending} onClick={() => void confirm()} className="h-9 rounded-md bg-danger px-3 text-xs font-semibold text-white disabled:opacity-50">{deactivate.isPending ? 'Desativando…' : 'Desativar categoria'}</button></div>
  </Modal>
}

function MergeDialog({ target, onClose }: { target: EquipmentCategory; onClose: () => void }) {
  const merge = useMergeCategory()
  const active = useCategories({ ativa: true })
  const [origemId, setOrigemId] = useState('')
  const [error, setError] = useState('')
  const origin = active.data?.find((item) => item.id === origemId)
  const options = (active.data ?? []).filter((item) => item.id !== target.id).map((item) => ({ value: item.id, label: item.nome }))
  async function confirm() {
    if (!origemId) { setError('Selecione a categoria de origem.'); return }
    try {
      await merge.mutateAsync({ destinoId: target.id, origemId })
      toast.success(`Categoria "${origin?.nome ?? 'de origem'}" mesclada em "${target.nome}".`)
      onClose()
    } catch (failure) {
      const message = getCategoryErrorMessage(failure) ?? 'Não foi possível mesclar as categorias.'
      setError(message)
      toast.error(message)
    }
  }
  return <Modal title={`Mesclar em "${target.nome}"`} description="Escolha a categoria de origem a ser mesclada nesta categoria de destino." onClose={onClose} busy={merge.isPending}>
    <div className="space-y-4">
      <Field label="Categoria de origem"><Select aria-label="Categoria de origem" value={origemId} onChange={(next) => { setOrigemId(next); setError('') }} disabled={active.isLoading} placeholder="Selecione a categoria de origem" options={options} /></Field>
      <p role="note" className="rounded-md border border-warning/40 bg-warning/5 p-3 text-xs leading-5 text-text-secondary">Todos os equipamentos de {origin ? `"${origin.nome}"` : 'origem'} serão movidos para "{target.nome}" e a categoria de origem será desativada. Se o destino não tiver checklist padrão, herdará o da origem. Esta ação não pode ser desfeita.</p>
      {active.isError ? <p role="alert" className="text-xs text-danger">Não foi possível carregar as categorias.</p> : null}
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
      <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={merge.isPending} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs">Cancelar</button><button type="button" disabled={merge.isPending || active.isLoading} onClick={() => void confirm()} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{merge.isPending ? 'Mesclando…' : 'Mesclar categorias'}</button></div>
    </div>
  </Modal>
}
