import { AlertTriangle, Check, ChevronDown, Pencil, Plus, PowerOff, Search, ShieldOff, UserRound, X } from 'lucide-react'
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { SettingsNav } from '@/features/settings/components/SettingsNav'
import { PageAction } from '@/components/ui/PageAction'
import { Field, Modal } from '@/components/ui/Modal'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { useAnonymizeUserCpf, useDeactivateUser, useHospitalChoices, useSaveTenantUser, useSetUserHospitals, useTenantUser, useTenantUsers, useUserHospitalLinks, useUserHospitals } from '../api/users'
import { userSchema } from '../schemas/user.schema'
import type { TenantRole, TenantUser, TenantUserInput } from '../types'
import { FormSelect } from '@/components/ui/FormSelect'
import { RowActionsMenu, type RowAction } from '@/components/ui/RowActionsMenu'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'
const roles: Record<TenantRole, string> = { admin_cliente: 'Admin do Cliente', tecnico: 'Técnico', interno_hospital: 'Interno do Hospital' }

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; code?: string } } }).response
    return response?.data?.detail ?? response?.data?.code ?? fallback
  }
  return fallback
}

export function UsersPage() {
  const users = useTenantUsers()
  const hospitals = useHospitalChoices()
  const linkQueries = useUserHospitalLinks(users.data ?? [])
  const [query, setQuery] = useState('')
  const [modal, setModal] = useState<'create' | TenantUser | null>(null)
  const [anonymizeTarget, setAnonymizeTarget] = useState<TenantUser | null>(null)
  const [anonymizeError, setAnonymizeError] = useState<string | null>(null)
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const canAnonymize = auth.user?.roles.some((role) => role === 'admin_cliente' || role === 'super_admin') ?? false
  const anonymizeCpf = useAnonymizeUserCpf()
  const deactivate = useDeactivateUser()
  const allReady = linkQueries.every((item) => !item.isLoading)
  const filtered = useMemo(() => (users.data ?? []).filter((user) => `${user.nome} ${user.email} ${roles[user.role]}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [users.data, query])

  async function deactivateUser(user: TenantUser) {
    try { await deactivate.mutateAsync(user.id); toast.success('Usuário desativado.') } catch (error) { toast.error(getApiErrorMessage(error, 'Não foi possível desativar o usuário.')) }
  }

  function userActions(user: TenantUser): RowAction[] {
    const actions: RowAction[] = [{ label: 'Editar', icon: <Pencil size={14} />, onSelect: () => setModal(user) }]
    if (user.ativo) actions.push({ label: 'Desativar', icon: <PowerOff size={14} />, destructive: true, disabled: deactivate.isPending, onSelect: () => deactivateUser(user), confirm: { title: 'Desativar usuário?', description: `Desativar ${user.nome}? A pessoa perderá acesso ao HEMM.`, confirmLabel: 'Desativar' } })
    if (canAnonymize && isTenantUserRole(user.role)) actions.push({ label: 'Anonimizar CPF', icon: <ShieldOff size={14} />, destructive: true, onSelect: () => setAnonymizeTarget(user) })
    return actions
  }

  async function anonymizeUserCpf(user: TenantUser) {
    setAnonymizeError(null)
    try {
      await anonymizeCpf.mutateAsync(user.id)
      toast.success('CPF anonimizado. Os dados do usuário foram atualizados.')
      setAnonymizeTarget(null)
    } catch (error) {
      setAnonymizeError(getApiErrorMessage(error, 'Não foi possível anonimizar o CPF.'))
    }
  }

  return <AdminPageShell tabs={<SettingsNav />} title="Usuários & Papéis" subtitle="Acessos do tenant" action={<PageAction onClick={() => setModal('create')} collapseLabelOnMobile>Convidar usuário</PageAction>}>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-text-secondary">{users.data?.length ?? 0} usuários</p><label className="relative block w-full sm:w-64"><Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} /><input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Pesquisar usuários" placeholder="Pesquisar usuários" className={`${inputClass} pl-9`} /></label></div>
    {users.isLoading ? <div aria-label="Carregando usuários" aria-busy="true" className="h-64 animate-pulse rounded-lg border border-border bg-surface" /> : null}
    {users.isError ? <section role="alert" className="rounded-lg border border-border bg-surface p-6"><p>Não foi possível carregar os usuários.</p><button type="button" onClick={() => void users.refetch()} className="mt-3 text-sm text-primary underline">Tentar novamente</button></section> : null}
    {!users.isLoading && !users.isError && filtered.length === 0 ? <section className="grid min-h-64 place-items-center rounded-lg border border-dashed border-border bg-surface p-8 text-center"><div><UserRound className="mx-auto text-text-muted" /><h2 className="mt-3 font-semibold">{query ? 'Nenhum resultado' : 'Nenhum usuário cadastrado'}</h2><p className="mt-1 text-sm text-text-secondary">{query ? 'Ajuste a pesquisa e tente novamente.' : 'Crie um registro de usuário para configurar o acesso ao tenant.'}</p>{!query && <div className="mt-4 flex justify-center"><PageAction onClick={() => setModal('create')} fullWidthMobile>Convidar usuário</PageAction></div>}</div></section> : null}
    {!users.isLoading && !users.isError && filtered.length > 0 ? <div className="overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full min-w-[780px] border-collapse text-left"><thead><tr className="table-head text-[11px] uppercase">{['Nome', 'E-mail', 'Papel', 'Hospitais', 'Status', 'Ações'].map((heading) => <th key={heading} className="px-4 py-3 font-medium">{heading}</th>)}</tr></thead><tbody>{filtered.map((user) => {
      const index = (users.data ?? []).findIndex((item) => item.id === user.id)
      const ids = linkQueries[index]?.data ?? []
      const names = ids.map((id) => hospitals.data?.find((hospital) => hospital.id === id)?.nome).filter(Boolean)
      return <tr key={user.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3"><div className="font-medium text-sm">{user.nome}</div><div className="mt-0.5 text-[11px] text-text-muted">{user.codigo}</div></td><td className="px-4 py-3 text-sm text-text-secondary">{user.email}</td><td className="px-4 py-3 text-sm">{roles[user.role] ?? user.role}</td><td className="max-w-[240px] px-4 py-3 text-sm text-text-secondary">{linkQueries[index]?.isLoading ? 'Carregando…' : names.length ? names.join(', ') : '—'}</td><td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 text-xs ${user.ativo ? 'text-primary' : 'text-text-muted'}`}><span className={`size-1.5 rounded-full ${user.ativo ? 'bg-primary' : 'bg-text-muted'}`} />{user.ativo ? 'Ativo' : 'Inativo'}</span></td><td className="px-4 py-3"><RowActionsMenu label={user.nome} actions={userActions(user)} /></td></tr>
    })}</tbody></table></div> : null}
    {modal && <UserForm user={modal === 'create' ? undefined : modal} hospitals={hospitals.data ?? []} hospitalsLoading={hospitals.isLoading} onClose={() => setModal(null)} onSaved={() => setModal(null)} />}
    {anonymizeTarget && <AnonymizeCpfModal user={anonymizeTarget} busy={anonymizeCpf.isPending} error={anonymizeError} onClose={() => setAnonymizeTarget(null)} onConfirm={() => void anonymizeUserCpf(anonymizeTarget)} />}
    {!allReady && users.data?.length ? <span className="sr-only" aria-live="polite">Carregando vínculos de hospitais</span> : null}
  </AdminPageShell>
}

function AnonymizeCpfModal({ user, busy, error, onClose, onConfirm }: { user: TenantUser; busy: boolean; error: string | null; onClose: () => void; onConfirm: () => void }) {
  const [confirmation, setConfirmation] = useState('')
  const matchesName = confirmation.trim() === user.nome.trim()

  return <Modal title="Anonimizar CPF" description="Esta ação é irreversível e não pode ser desfeita." onClose={onClose} busy={busy}>
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>}
      <div className="flex gap-3 rounded-md border border-danger/30 bg-danger/10 p-3 text-sm"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" /><p className="text-text-primary">O CPF de <strong>{user.nome}</strong> ({user.email}) será anonimizado permanentemente.</p></div>
      <label className="block space-y-1.5 text-xs font-medium text-text-secondary"><span>Digite o nome do usuário para confirmar: <strong className="text-text-primary">{user.nome}</strong></span><input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" className="h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" aria-label="Confirmação do nome do usuário" /></label>
      {confirmation.length > 0 && !matchesName && <p role="status" className="text-xs text-danger">O nome digitado não corresponde ao usuário.</p>}
      <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={busy} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs">Cancelar</button><button type="button" disabled={!matchesName || busy} onClick={onConfirm} className="h-9 rounded-md bg-danger px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{busy ? 'Anonimizando…' : 'Anonimizar CPF'}</button></div>
    </div>
  </Modal>
}

function isTenantUserRole(role: string): role is TenantRole {
  return role === 'admin_cliente' || role === 'tecnico' || role === 'interno_hospital'
}

function UserForm({ user, hospitals, hospitalsLoading, onClose, onSaved }: { user?: TenantUser; hospitals: { id: string; nome: string }[]; hospitalsLoading: boolean; onClose: () => void; onSaved: () => void }) {
  const [createdUser, setCreatedUser] = useState<TenantUser>()
  const [serverError, setServerError] = useState<string | null>(null)
  const activeUser = user ?? createdUser
  const detail = useTenantUser(activeUser?.id ?? '')
  const existingLinks = useUserHospitals(activeUser?.id ?? '')
  const save = useSaveTenantUser()
  const linkMutation = useSetUserHospitals()
  const [selected, setSelected] = useState<string[]>([])
  const form = useForm<TenantUserInput>({ resolver: zodResolver(userSchema), values: activeUser ? { codigo: detail.data?.codigo ?? activeUser.codigo, nome: detail.data?.nome ?? activeUser.nome, email: detail.data?.email ?? activeUser.email, role: detail.data?.role ?? activeUser.role } : { codigo: '', nome: '', email: '', role: 'tecnico' } })
  useEffect(() => { if (user && existingLinks.data) setSelected(existingLinks.data) }, [user, existingLinks.data])

  function toggle(hospitalId: string) { setSelected((current) => current.includes(hospitalId) ? current.filter((id) => id !== hospitalId) : [...current, hospitalId]) }
  const submit = form.handleSubmit(async (data) => {
    setServerError(null)
    try {
      const saved = activeUser ?? await save.mutateAsync({ data })
      if (!user && !createdUser) setCreatedUser(saved)
      const userId = saved.id
      const before = existingLinks.data ?? []
      const operations = activeUser ? [
        ...selected.filter((id) => !before.includes(id)).map((hospitalId) => ({ hospitalId, attach: true })),
        ...before.filter((id) => !selected.includes(id)).map((hospitalId) => ({ hospitalId, attach: false })),
      ] : selected.map((hospitalId) => ({ hospitalId, attach: true }))
      const results = await Promise.allSettled(operations.map((operation) => linkMutation.mutateAsync({ userId, ...operation })))
      const failures = results.filter((result) => result.status === 'rejected').length
      if (failures) {
        const message = `Usuário salvo, mas ${failures} vínculo(s) de hospital não foram atualizados. Revise a seleção e tente novamente.`
        setServerError(message)
        toast.error(message)
        return
      }
      toast.success(user ? 'Usuário atualizado.' : 'Registro de usuário criado. O envio do convite pelo provedor ainda não está disponível.')
      onSaved()
    } catch (error) {
      const message = getApiErrorMessage(error, 'Não foi possível salvar o usuário.')
      setServerError(message)
      toast.error(message)
    }
  })

  const busy = save.isPending || linkMutation.isPending
  const isExistingUser = Boolean(activeUser)
  return <Modal title={user ? 'Editar usuário' : createdUser ? 'Concluir vínculos do usuário' : 'Convidar usuário'} description={user ? 'Atualize o perfil e os hospitais vinculados.' : 'O registro será criado. O convite por e-mail depende da integração com o provedor de identidade.'} onClose={onClose} busy={busy}>
    <form onSubmit={submit} className="space-y-4">
      {serverError && <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{serverError}</p>}
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Código" error={form.formState.errors.codigo?.message}><input autoFocus={!user} className={inputClass} disabled={isExistingUser} {...form.register('codigo')} /></Field><Field label="Nome" error={form.formState.errors.nome?.message}><input autoFocus={Boolean(user)} className={inputClass} disabled={Boolean(createdUser)} {...form.register('nome')} /></Field></div>
      <Field label="E-mail" error={form.formState.errors.email?.message}><input type="email" autoComplete="email" className={inputClass} disabled={Boolean(createdUser)} {...form.register('email')} /></Field>
      <Field label="Papel"><FormSelect control={form.control} name="role" disabled={Boolean(createdUser)} options={Object.entries(roles).map(([value, label]) => ({ value, label }))} /></Field>
      <div className="space-y-2"><span className="block text-xs font-medium text-text-secondary">Hospitais vinculados</span>{selected.length > 0 ? <ul className="flex flex-wrap gap-2">{selected.map((id) => { const hospital = hospitals.find((item) => item.id === id); return <li key={id} className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-1 text-xs">{hospital?.nome ?? 'Hospital'}<button type="button" aria-label={`Remover vínculo ${hospital?.nome ?? 'hospital'}`} onClick={() => toggle(id)} className="text-text-muted hover:text-danger"><X size={13} /></button></li> })}</ul> : <p className="text-xs text-text-muted">Nenhum hospital selecionado.</p>}
        <details className="group relative"><summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-border px-3 text-xs text-text-secondary hover:bg-bg"><Plus size={14} /> Adicionar hospital <ChevronDown size={13} /></summary><div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-surface p-1 shadow-xl">{hospitalsLoading ? <p className="p-2 text-xs text-text-muted">Carregando hospitais…</p> : hospitals.length ? hospitals.map((hospital) => <button key={hospital.id} type="button" disabled={selected.includes(hospital.id)} onClick={() => toggle(hospital.id)} className="flex w-full items-center justify-between rounded px-2 py-2 text-left text-xs hover:bg-bg disabled:opacity-50">{hospital.nome}{selected.includes(hospital.id) && <Check size={14} className="text-primary" />}</button>) : <p className="p-2 text-xs text-text-muted">Nenhum hospital disponível.</p>}</div></details></div>
      {detail.isError && <p role="alert" className="text-xs text-danger">Não foi possível obter os dados atualizados do usuário.</p>}{existingLinks.isError && <p role="alert" className="text-xs text-danger">Não foi possível obter os hospitais vinculados. Não altere os vínculos antes de tentar novamente.</p>}
      <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={busy} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs">Cancelar</button><button type="submit" disabled={busy || detail.isLoading || detail.isError || (isExistingUser && (existingLinks.isLoading || existingLinks.isError)) || hospitalsLoading} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{busy ? 'Salvando…' : user ? 'Salvar alterações' : createdUser ? 'Tentar vínculos novamente' : 'Criar usuário'}</button></div>
    </form>
  </Modal>
}
