import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Field, Modal } from '@/components/ui/Modal'
import { hospitalSchema } from '../schemas/assets.schema'
import type { Hospital, HospitalInput } from '../types'
import { useHospital, useSaveHospital } from '../api/assets'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export function HospitalForm({ hospital, onClose, onSaved }: { hospital?: Hospital; onClose: () => void; onSaved: () => void }) {
  const detail = useHospital(hospital?.id ?? '')
  const save = useSaveHospital()
  const form = useForm<HospitalInput>({ resolver: zodResolver(hospitalSchema), values: hospital ? { nome: detail.data?.nome ?? hospital.nome, cnpj: detail.data?.cnpj ?? hospital.cnpj } : undefined })
  const submit = form.handleSubmit(async (data) => { try { await save.mutateAsync({ id: hospital?.id, data }); toast.success(hospital ? 'Hospital atualizado.' : 'Hospital cadastrado.'); onSaved() } catch { toast.error('Não foi possível salvar o hospital.') } })
  return <Modal title={hospital ? 'Editar hospital' : 'Novo hospital'} description={hospital ? undefined : 'Os dados serão associados ao tenant da sua sessão.'} onClose={onClose} busy={save.isPending}>
    <form onSubmit={submit} className="space-y-4"><Field label="Nome do hospital" error={form.formState.errors.nome?.message}><input autoFocus className={inputClass} {...form.register('nome')} /></Field><Field label="CNPJ" error={form.formState.errors.cnpj?.message}><input className={inputClass} inputMode="numeric" {...form.register('cnpj')} /></Field>{detail.isError && <p role="alert" className="text-xs text-danger">Não foi possível obter os dados atualizados do hospital.</p>}<div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={save.isPending} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs">Cancelar</button><button type="submit" disabled={save.isPending || detail.isLoading || detail.isError} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{save.isPending ? 'Salvando…' : 'Salvar hospital'}</button></div></form>
  </Modal>
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatCnpj(value: string) { const digits = value.replace(/\D/g, ''); return digits.length === 14 ? digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : value }
