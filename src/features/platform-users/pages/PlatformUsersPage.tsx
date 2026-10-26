import { Pencil, Plus, Search, UserRoundCog } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { Field, Modal } from '@/components/ui/Modal'
import { useDeactivatePlatformUser, usePlatformUser, usePlatformUsers, useSavePlatformUser } from '../api/platform-users'
import { platformUserSchema } from '../schemas/platform-user.schema'
import type { PlatformUser, PlatformUserInput } from '../types'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; code?: string } } }).response
    return response?.data?.detail ?? response?.data?.code ?? fallback
  }
  return fallback
}

export function PlatformUsersPage() {
  const users = usePlatformUsers()
  const deactivate = useDeactivatePlatformUser()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<'create' | PlatformUser | null>(null)
  const filtered = useMemo(() => (users.data ?? []).filter((user) => `${user.nome} ${user.email} ${user.codigo} ${user.role}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [users.data, query])

  async function deactivateUser(user: PlatformUser) {
    if (!window.confirm(`Desativar ${user.nome}? A pessoa perderá acesso à plataforma.`)) return
    try {
      await deactivate.mutateAsync(user.id)
      toast.success('Usuário da plataforma desativado.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível desativar o usuário.'))
    }
  }

  return <AdminPageShell title="Usuários da Plataforma" subtitle="Super Admin · acessos internos" action={<button type="button" onClick={() => setSelected('create')} className="inline-flex h-[38px] items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand"><Plus size={15} /> Novo usuário</button>}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-text-secondary">{users.data?.length ?? 0} usuários internos</p><label className="relative block w-full sm:w-64"><Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Pesquisar usuários da plataforma" placeholder="Pesquisar usuários" className={`${inputClass} pl-9`} /></label></div>
    {users.isLoading && <div aria-label="Carregando usuários da plataforma" aria-busy="true" className="h-64 animate-pulse rounded-lg border border-border bg-surface" />}
    {users.isError && <section role="alert" className="rounded-lg border border-border bg-surface p-6"><p>Não foi possível carregar os usuários da plataforma.</p><button type="button" onClick={() => void users.refetch()} className="mt-3 text-sm text-primary underline">Tentar novamente</button></section>}
    {!users.isLoading && !users.isError && filtered.length === 0 && <section className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"><div><UserRoundCog className="mx-auto text-text-muted" /><h2 className="mt-3 font-semibold">{query ? 'Nenhum resultado' : 'Nenhum usuário interno cadastrado'}</h2><p className="mt-1 text-sm text-text-secondary">{query ? 'Ajuste a pesquisa e tente novamente.' : 'Cadastre um usuário para compartilhar a administração da plataforma.'}</p>{!query && <button type="button" onClick={() => setSelected('create')} className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-bg-brand"><Plus size={14} /> Novo usuário</button>}</div></section>}
    {!users.isLoading && !users.isError && filtered.length > 0 && <div className="overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full min-w-[700px] border-collapse text-left"><thead><tr className="table-head text-[11px] uppercase">{['Nome', 'E-mail', 'Papel', 'Status', 'Ações'].map((heading) => <th key={heading} scope="col" className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>{filtered.map((user) => <tr key={user.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3"><div className="text-sm font-medium text-text-primary">{user.nome}</div><div className="mt-0.5 text-[11px] text-text-muted">{user.codigo}</div></td><td className="px-4 py-3 text-sm text-text-secondary">{user.email}</td><td className="px-4 py-3 text-sm text-text-secondary">{user.role}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-xs ${user.ativo ? 'text-primary' : 'text-text-muted'}`}><span className={`size-1.5 rounded-full ${user.ativo ? 'bg-primary' : 'bg-text-muted'}`} />{user.ativo ? 'Ativo' : 'Inativo'}</span></td><td className="px-4 py-3"><div className="flex items-center gap-3"><button type="button" onClick={() => setSelected(user)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><Pencil size={12} /> Editar</button>{user.ativo && <button type="button" disabled={deactivate.isPending} onClick={() => void deactivateUser(user)} className="text-xs text-danger hover:underline disabled:opacity-50">Desativar</button>}</div></td></tr>)}</tbody></table></div>}
    {selected && <PlatformUserForm user={selected === 'create' ? undefined : selected} onClose={() => setSelected(null)} onSaved={() => setSelected(null)} />}
  </AdminPageShell>
}

function PlatformUserForm({ user, onClose, onSaved }: { user?: PlatformUser; onClose: () => void; onSaved: () => void }) {
  const save = useSavePlatformUser()
  const detail = usePlatformUser(user?.id ?? '')
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<PlatformUserInput>({ resolver: zodResolver(platformUserSchema), values: user ? { codigo: detail.data?.codigo ?? user.codigo, nome: detail.data?.nome ?? user.nome, email: detail.data?.email ?? user.email, role: detail.data?.role ?? user.role } : { codigo: '', nome: '', email: '', role: 'super_admin' } })
  const submit = form.handleSubmit(async (data) => {
    setServerError(null)
    try {
      await save.mutateAsync({ id: user?.id, data })
      toast.success(user ? 'Usuário da plataforma atualizado.' : 'Usuário da plataforma criado.')
      onSaved()
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível salvar o usuário.')
      setServerError(message)
      toast.error(message)
    }
  })

  return <Modal title={user ? 'Editar usuário da plataforma' : 'Novo usuário da plataforma'} description="Conta interna de administração da plataforma." onClose={onClose} busy={save.isPending}>
    <form onSubmit={submit} className="space-y-4">
      {serverError && <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{serverError}</p>}
      <Field label="Código" error={form.formState.errors.codigo?.message}><input autoFocus={!user} className={inputClass} {...form.register('codigo')} /></Field>
      <Field label="Nome" error={form.formState.errors.nome?.message}><input autoFocus={Boolean(user)} className={inputClass} {...form.register('nome')} /></Field>
      <Field label="E-mail" error={form.formState.errors.email?.message}><input type="email" autoComplete="email" className={inputClass} {...form.register('email')} /></Field>
      <Field label="Papel" error={form.formState.errors.role?.message}><input className={inputClass} readOnly {...form.register('role')} /></Field>
      <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={save.isPending} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs">Cancelar</button><button type="submit" disabled={save.isPending} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{save.isPending ? 'Salvando…' : user ? 'Salvar alterações' : 'Criar usuário'}</button></div>
    </form>
  </Modal>
}
