import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { useSaveSlaPolicy, useSlaPolicy } from '../api/sla-policy'
import { slaPolicyFormSchema } from '../types'
import type { SlaPolicyEntry, SlaPolicyFormValues, SlaPolicyUpdateEntry } from '../types'
import { FormSelect } from '@/components/ui/FormSelect'

const severityLabels: Record<SlaPolicyEntry['severidade'], string> = {
  CRITICA: 'Crítica',
  ALTA: 'Alta',
  MEDIA: 'Média',
  BAIXA: 'Baixa',
}

const inputClass = 'h-9 rounded-md border border-border bg-bg px-2.5 text-xs text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

function fromMinutes(minutes: number) {
  return minutes >= 60 && minutes % 60 === 0
    ? { valor: minutes / 60, unidade: 'h' as const }
    : { valor: minutes, unidade: 'min' as const }
}

function toFormValues(policy: SlaPolicyEntry[]): SlaPolicyFormValues {
  return {
    rows: policy.map((row) => ({
      severidade: row.severidade,
      atendimento: fromMinutes(row.atendimentoMin),
      resolucao: fromMinutes(row.resolucaoMin),
      padrao: row.padrao,
    })),
  }
}

function toRequest(values: SlaPolicyFormValues): SlaPolicyUpdateEntry[] {
  return values.rows.map((row) => ({
    severidade: row.severidade,
    atendimentoMin: row.atendimento.valor * (row.atendimento.unidade === 'h' ? 60 : 1),
    resolucaoMin: row.resolucao.valor * (row.resolucao.unidade === 'h' ? 60 : 1),
  }))
}

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const data = (error as { response?: { data?: { detail?: string; code?: string } } }).response?.data
    return data?.detail ?? data?.code ?? 'Não foi possível salvar a política de SLA.'
  }
  if (error instanceof Error && error.message) return error.message
  return 'Não foi possível salvar a política de SLA.'
}

export function SlaPolicyPage() {
  const policy = useSlaPolicy()
  const savePolicy = useSaveSlaPolicy()
  const [saveNotice, setSaveNotice] = useState('')
  const form = useForm<SlaPolicyFormValues>({
    resolver: zodResolver(slaPolicyFormSchema),
    defaultValues: { rows: [] },
    mode: 'onChange',
  })
  const { reset } = form

  useEffect(() => {
    if (policy.data) reset(toFormValues(policy.data))
  }, [policy.data, reset])

  async function submit(values: SlaPolicyFormValues) {
    setSaveNotice('')
    try {
      const saved = await savePolicy.mutateAsync(toRequest(values))
      reset(toFormValues(saved))
      setSaveNotice('Política salva. A mudança vale apenas para chamados abertos a partir de agora; chamados existentes mantêm os prazos definidos na abertura.')
    } catch {
      // Keep the edited values in place so the operator can retry.
    }
  }

  return <AdminPageShell title="Política de SLA" subtitle="Prazos de atendimento e resolução por severidade">
    <div className="mx-auto max-w-5xl space-y-4">
      <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Prazos por severidade</h2>
          <p className="mt-1 text-xs leading-5 text-text-secondary">Defina o limite para a primeira resposta e para a resolução do chamado. O relógio corre continuamente, inclusive enquanto aguarda peça.</p>
        </div>

        {policy.isPending ? <div aria-label="Carregando política de SLA" aria-busy="true" className="space-y-2"><span className="sr-only">Carregando a política de SLA.</span>{[0, 1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-md bg-bg" />)}</div> : null}
        {policy.isError ? <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-4"><p className="text-xs text-text-primary">Não foi possível carregar a política de SLA.</p><button type="button" onClick={() => void policy.refetch()} className="mt-2 rounded text-xs font-medium text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Tentar novamente</button></div> : null}

        {policy.data && <form onSubmit={form.handleSubmit(submit)}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <thead><tr className="table-head text-[10px]">
                <th scope="col" className="px-3 py-3">Severidade</th>
                <th scope="col" className="px-3 py-3">Prazo de atendimento</th>
                <th scope="col" className="px-3 py-3">Prazo de resolução</th>
                <th scope="col" className="px-3 py-3">Origem</th>
              </tr></thead>
              <tbody>{policy.data.map((item, index) => {
                const rowError = form.formState.errors.rows?.[index]
                const label = severityLabels[item.severidade]
                const rowPath = `rows.${index}` as const
                return <tr key={item.severidade} className="border-b border-border/70 last:border-0">
                  <th scope="row" className="px-3 py-3 text-xs font-semibold text-text-primary">{label}</th>
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-2">
                      <div className="flex gap-1.5">
                        <input type="number" min="1" step="1" aria-label={`Prazo de atendimento, ${label}`} aria-invalid={Boolean(rowError?.atendimento?.valor)} className={`${inputClass} w-24`} {...form.register(`${rowPath}.atendimento.valor`, { valueAsNumber: true })} onChange={(event) => { form.register(`${rowPath}.atendimento.valor`, { valueAsNumber: true }).onChange(event); setSaveNotice('') }} />
                        <FormSelect size="sm" control={form.control} name={`${rowPath}.atendimento.unidade`} aria-label={`Unidade do atendimento, ${label}`} className="w-[96px]" onValueChange={() => setSaveNotice('')} options={[{ value: 'min', label: 'min' }, { value: 'h', label: 'horas' }]} />
                      </div>
                      {rowError?.atendimento?.valor?.message && <p role="alert" className="max-w-32 text-[10px] text-danger">{rowError.atendimento.valor.message}</p>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-start gap-2">
                      <div className="flex gap-1.5">
                        <input type="number" min="1" step="1" aria-label={`Prazo de resolução, ${label}`} aria-invalid={Boolean(rowError?.resolucao?.valor)} className={`${inputClass} w-24`} {...form.register(`${rowPath}.resolucao.valor`, { valueAsNumber: true })} onChange={(event) => { form.register(`${rowPath}.resolucao.valor`, { valueAsNumber: true }).onChange(event); setSaveNotice('') }} />
                        <FormSelect size="sm" control={form.control} name={`${rowPath}.resolucao.unidade`} aria-label={`Unidade da resolução, ${label}`} className="w-[96px]" onValueChange={() => setSaveNotice('')} options={[{ value: 'min', label: 'min' }, { value: 'h', label: 'horas' }]} />
                      </div>
                      {rowError?.resolucao?.valor?.message && <p role="alert" className="max-w-36 text-[10px] text-danger">{rowError.resolucao.valor.message}</p>}
                    </div>
                  </td>
                  <td className="px-3 py-3"><span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-1 text-[10px] font-medium ${item.padrao ? 'border-border bg-bg text-text-secondary' : 'border-primary/30 bg-primary/10 text-primary'}`}>{item.padrao ? 'Padrão do sistema' : 'Personalizado'}</span></td>
                </tr>
              })}</tbody>
            </table>
          </div>

          {savePolicy.isError && <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{errorMessage(savePolicy.error)}</p>}
          {saveNotice && <p role="status" className="mt-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs leading-5 text-text-primary">{saveNotice}</p>}
          {form.formState.errors.rows?.root?.message && <p role="alert" className="mt-3 text-xs text-danger">{form.formState.errors.rows.root.message}</p>}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="max-w-xl text-[11px] leading-5 text-text-muted">Prazos alterados não modificam chamados existentes. Os valores padrão são definidos pelo sistema.</p>
            <button type="submit" disabled={!form.formState.isDirty || !form.formState.isValid || savePolicy.isPending} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold text-bg-brand outline-none hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">
              {savePolicy.isPending ? 'Salvando…' : 'Salvar política'}
            </button>
          </div>
        </form>}
      </section>
    </div>
  </AdminPageShell>
}
