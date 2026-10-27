import { Pencil, PowerOff, Search, UserRoundCog } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { PageAction } from '@/components/ui/PageAction'
import { Field, Modal } from '@/components/ui/Modal'
import { useDeactivatePlatformUser, usePlatformUser, usePlatformUsers, useSavePlatformUser } from '../api/platform-users'
import { platformUserSchema } from '../schemas/platform-user.schema'
import type { PlatformUser, PlatformUserInput } from '../types'
import { type RowAction } from '@/components/ui/RowActionsMenu'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; code?: string } } }).response
    return response?.data?.detail ?? response?.data?.code ?? fallback
  }
  return fallback
}

const platformUserColumns: DataColumn<PlatformUser>[] = [
  { key: 'nome', header: 'Nome', cell: (user) => <><div className="text-sm font-medium text-text-primary">{user.nome}</div><div className="mt-0.5 text-[11px] text-text-muted">{user.codigo}</div></> },
  { key: 'email', header: 'E-mail', cell: (user) => <span className="text-sm text-text-secondary">{user.email}</span> },
  { key: 'papel', header: 'Papel', cell: (user) => <span className="text-sm text-text-secondary">{user.role}</span> },
  { key: 'status', header: 'Status', cell: (user) => <StatusBadge tone={user.ativo ? 'success' : 'neutral'}>{user.ativo ? 'Ativo' : 'Inativo'}</StatusBadge> },
]
export function PlatformUsersPage() {
  const users = usePlatformUsers()
  const deactivate = useDeactivatePlatformUser()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<'create' | PlatformUser | null>(null)
  const filtered = useMemo(() => (users.data ?? []).filter((user) => `${user.nome} ${user.email} ${user.codigo} ${user.role}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [users.data, query])

  function userActions(user: PlatformUser): RowAction[] {
    const actions: RowAction[] = [{ label: 'Editar', icon: <Pencil size={14} />, onSelect: () => setSelected(user) }]
    if (user.ativo) actions.push({ label: 'Desativar', icon: <PowerOff size={14} />, destructive: true, disabled: deactivate.isPending, onSelect: () => deactivateUser(user), confirm: { title: 'Desativar usuário?', description: `Desativar ${user.nome}? A pessoa perderá acesso à plataforma.`, confirmLabel: 'Desativar' } })
    return actions
  }

  async function deactivateUser(user: PlatformUser) {
    try {
      await deactivate.mutateAsync(user.id)
      toast.success('Usuário da plataforma desativado.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Não foi possível desativar o usuário.'))
    }
  }

  return <AdminPageShell title="Usuários da Plataforma" subtitle="Super Admin · acessos internos" action={<PageAction onClick={() => setSelected('create')} collapseLabelOnMobile>Novo usuário</PageAction>}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-text-secondary">{users.data?.length ?? 0} usuários internos</p><label className="relative block w-full sm:w-64"><Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Pesquisar usuários da plataforma" placeholder="Pesquisar usuários" className={`${inputClass} pl-9`} /></label></div>
    <DataTable
      label="Usuários da plataforma"
      columns={platformUserColumns}
      rows={filtered}
      getRowId={(user) => user.id}
      rowActions={userActions}
      rowLabel={(user) => user.nome}
      minWidth="700px"
      isLoading={users.isLoading}
      loadingLabel="Carregando usuários da plataforma"
      error={users.isError ? { message: 'Não foi possível carregar os usuários da plataforma.', onRetry: () => void users.refetch() } : null}
      empty={{
        icon: <UserRoundCog />,
        title: query ? 'Nenhum resultado' : 'Nenhum usuário interno cadastrado',
        description: query ? 'Ajuste a pesquisa e tente novamente.' : 'Cadastre um usuário para compartilhar a administração da plataforma.',
        action: query ? undefined : <PageAction onClick={() => setSelected('create')} fullWidthMobile>Novo usuário</PageAction>,
      }}
    />
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
