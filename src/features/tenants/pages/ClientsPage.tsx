import { BriefcaseBusiness, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { PageAction } from '@/components/ui/PageAction'
import { Field, Modal } from '@/components/ui/Modal'
import { useCreateTenant, useTenants } from '../api/tenants'
import { createTenantSchema, normalizeCnpj } from '../schemas/tenant.schema'
import type { CreateTenantInput, Tenant } from '../types'
import { getTenantErrorMessage } from '../utils/tenant-error'
import { FormSelect } from '@/components/ui/FormSelect'
import { DataTable, type DataColumn } from '@/components/ui/DataTable'
import { StatusBadge } from '@/components/ui/StatusBadge'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export function ClientsPage() {
  const tenants = useTenants()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const createButtonRef = useRef<HTMLButtonElement>(null)
  const wasCreateOpen = useRef(false)
  useEffect(() => {
    if (wasCreateOpen.current && !createOpen) createButtonRef.current?.focus()
    wasCreateOpen.current = createOpen
  }, [createOpen])
  const filtered = useMemo(() => (tenants.data ?? []).filter((tenant) => `${tenant.nome} ${tenant.cnpj}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())), [tenants.data, search])

  return <AdminPageShell title="Clientes" subtitle="Super Admin · gestão de tenants" action={<PageAction buttonRef={createButtonRef} onClick={() => setCreateOpen(true)} collapseLabelOnMobile>Novo cliente</PageAction>}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-text-muted">Clientes e organizações cadastradas na plataforma</p>
    </div>
    <div className="mb-3 flex justify-end">
      <label className="relative block w-full sm:w-64"><Search aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={14} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Pesquisar clientes" placeholder="Pesquisar clientes" className={`${inputClass} pl-9`} /></label>
    </div>
    <DataTable
      label="Clientes"
      columns={tenantColumns}
      rows={filtered}
      getRowId={(tenant) => tenant.id}
      minWidth="680px"
      isLoading={tenants.isLoading}
      loadingLabel="Carregando clientes"
      error={tenants.isError ? { message: 'Não foi possível carregar os clientes.', onRetry: () => void tenants.refetch() } : null}
      empty={{
        icon: <BriefcaseBusiness />,
        title: search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado',
        description: search ? 'Ajuste a pesquisa e tente novamente.' : 'Cadastre um cliente para provisionar seu tenant.',
        action: search ? undefined : <PageAction onClick={() => setCreateOpen(true)} fullWidthMobile>Cadastrar cliente</PageAction>,
      }}
    />
    {createOpen && <CreateTenantModal onClose={() => setCreateOpen(false)} onCreated={() => setCreateOpen(false)} />}
  </AdminPageShell>
}

function CreateTenantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const create = useCreateTenant()
  const [serverError, setServerError] = useState<string | null>(null)
  const form = useForm<CreateTenantInput>({ resolver: zodResolver(createTenantSchema), defaultValues: { tipo: 'PJ', nome: '', cnpj: '', adminNome: '', adminEmail: '', adminCodigo: '' } })
  const submit = form.handleSubmit(async (input) => {
    setServerError(null)
    try {
      await create.mutateAsync({ ...input, cnpj: normalizeCnpj(input.cnpj) })
      toast.success('Cliente criado. O convite do Admin do Cliente foi enfileirado.')
      onCreated()
    } catch (error) {
      setServerError(getTenantErrorMessage(error))
    }
  })
  return <Modal title="Novo cliente" description="O tenant e seu Admin do Cliente inicial serão provisionados juntos." onClose={onClose} busy={create.isPending}>
    <form onSubmit={submit} className="space-y-4">
      {serverError && <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">{serverError}</p>}
      <Field label="Tipo do cliente" error={form.formState.errors.tipo?.message}><FormSelect control={form.control} name="tipo" options={[{ value: 'PF', label: 'Pessoa Física (PF)' }, { value: 'PJ', label: 'Pessoa Jurídica (PJ)' }]} /></Field>
      <Field label="Razão social" error={form.formState.errors.nome?.message}><input autoFocus className={inputClass} placeholder="Grupo Hospitalar…" {...form.register('nome')} /></Field>
      <Field label="CNPJ" error={form.formState.errors.cnpj?.message}><input inputMode="numeric" autoComplete="off" className={inputClass} placeholder="00.000.000/0001-00" {...form.register('cnpj')} /></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Nome do Admin do Cliente" error={form.formState.errors.adminNome?.message}><input className={inputClass} {...form.register('adminNome')} /></Field><Field label="Código do Admin" error={form.formState.errors.adminCodigo?.message}><input className={inputClass} {...form.register('adminCodigo')} /></Field></div>
      <Field label="E-mail do Admin do Cliente" error={form.formState.errors.adminEmail?.message}><input type="email" autoComplete="email" className={inputClass} placeholder="admin@cliente.br" {...form.register('adminEmail')} /></Field>
      <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={create.isPending} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs">Cancelar</button><button type="submit" disabled={create.isPending} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{create.isPending ? 'Criando…' : 'Criar cliente'}</button></div>
    </form>
  </Modal>
}

const tenantColumns: DataColumn<Tenant>[] = [
  { key: 'nome', header: 'Cliente', cell: (tenant) => <span className="text-sm text-text-primary">{tenant.nome}</span> },
  { key: 'cnpj', header: 'CNPJ', cell: (tenant) => <span className="text-[13px] text-text-secondary">{formatCnpj(tenant.cnpj)}</span> },
  { key: 'hospitais', header: 'Hospitais', cell: () => <span className="text-sm text-text-secondary" aria-label="Contagem de hospitais não disponível">—</span> },
  { key: 'status', header: 'Status', cell: (tenant) => <StatusBadge tone={tenant.ativo ? 'success' : 'neutral'}>{tenant.ativo ? 'Ativo' : 'Inativo'}</StatusBadge> },
]

function formatCnpj(value: string) { const digits = value.replace(/\D/g, ''); return digits.length === 14 ? digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : value }
