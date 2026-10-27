import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Field, Modal } from '@/components/ui/Modal'
import { FormSelect } from '@/components/ui/FormSelect'
import { useSaveSector, useSector } from '../api/assets'
import { setorSchema } from '../schemas/assets.schema'
import type { Setor, SetorInput } from '../types'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

export function SectorForm({ hospitalId, sector, onClose, onSaved }: { hospitalId: string; sector?: Setor; onClose: () => void; onSaved: () => void }) {
  const detail = useSector(sector?.id ?? '')
  const save = useSaveSector()
  const form = useForm<SetorInput>({ resolver: zodResolver(setorSchema), values: sector ? { codigo: detail.data?.codigo ?? sector.codigo, nome: detail.data?.nome ?? sector.nome, andar: detail.data?.andar ?? sector.andar ?? '', classificacaoRisco: detail.data?.classificacaoRisco ?? sector.classificacaoRisco, grupoInstalacao: detail.data?.grupoInstalacao ?? sector.grupoInstalacao } : { codigo: '', nome: '', andar: '', classificacaoRisco: 'NAO_CRITICO', grupoInstalacao: 'GRUPO_0' } })
  const submit = form.handleSubmit(async (data) => { try { await save.mutateAsync({ id: sector?.id, hospitalId, data }); toast.success(sector ? 'Setor atualizado.' : 'Setor cadastrado.'); onSaved() } catch { toast.error('Não foi possível salvar o setor.') } })
  return <Modal title={sector ? 'Editar setor' : 'Novo setor'} description="O setor será associado ao hospital selecionado." onClose={onClose} busy={save.isPending}><form onSubmit={submit} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Código" error={form.formState.errors.codigo?.message}><input autoFocus className={inputClass} {...form.register('codigo')} /></Field><Field label="Nome" error={form.formState.errors.nome?.message}><input className={inputClass} {...form.register('nome')} /></Field></div>
    <Field label="Andar"><input className={inputClass} {...form.register('andar')} /></Field>
    <div className="grid gap-4 sm:grid-cols-2"><Field label="Classificação de risco"><FormSelect control={form.control} name="classificacaoRisco" options={[{ value: 'CRITICO', label: 'Crítico' }, { value: 'SEMI_CRITICO', label: 'Semicrítico' }, { value: 'NAO_CRITICO', label: 'Não crítico' }]} /></Field><Field label="Grupo de instalação"><FormSelect control={form.control} name="grupoInstalacao" options={[{ value: 'GRUPO_0', label: 'Grupo 0' }, { value: 'GRUPO_1', label: 'Grupo 1' }, { value: 'GRUPO_2', label: 'Grupo 2' }]} /></Field></div>
    {detail.isError && <p role="alert" className="text-xs text-danger">Não foi possível obter os dados atualizados do setor.</p>}<div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={save.isPending} onClick={onClose} className="h-9 rounded-md border border-border px-3 text-xs">Cancelar</button><button type="submit" disabled={save.isPending || detail.isLoading || detail.isError} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{save.isPending ? 'Salvando…' : 'Salvar setor'}</button></div>
  </form></Modal>
}
