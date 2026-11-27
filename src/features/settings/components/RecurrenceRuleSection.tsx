import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  REINCIDENCIA_CHAMADOS_MAX, REINCIDENCIA_CHAMADOS_MIN, REINCIDENCIA_CHAMADOS_PADRAO, REINCIDENCIA_DIAS_MAX, REINCIDENCIA_DIAS_MIN, REINCIDENCIA_DIAS_PADRAO,
  recurrenceRuleErrorMessage, useSaveRecurrenceRule, type ClientConfig,
} from '../api/client-config'

const inputClass = 'h-9 w-24 rounded-md border bg-bg px-2.5 text-xs tabular-nums text-text-primary outline-none focus:ring-2'
const inputOk = 'border-border focus:border-primary focus:ring-primary/20'
const inputErro = 'border-danger focus:border-danger focus:ring-danger/20'
const inRange = (value: string, min: number, max: number) => { const n = Number(value); return value.trim() !== '' && Number.isInteger(n) && n >= min && n <= max }

/** Story 23.8: regra do selo de reincidência por cliente (N chamados de falha em D dias). Só admin. */
export function RecurrenceRuleSection({ config }: { config: ClientConfig }) {
  const save = useSaveRecurrenceRule()
  const [count, setCount] = useState('')
  const [days, setDays] = useState('')
  useEffect(() => {
    setCount(String(config.reincidenciaChamados ?? REINCIDENCIA_CHAMADOS_PADRAO))
    setDays(String(config.reincidenciaDias ?? REINCIDENCIA_DIAS_PADRAO))
  }, [config.reincidenciaChamados, config.reincidenciaDias])
  const countOk = inRange(count, REINCIDENCIA_CHAMADOS_MIN, REINCIDENCIA_CHAMADOS_MAX)
  const daysOk = inRange(days, REINCIDENCIA_DIAS_MIN, REINCIDENCIA_DIAS_MAX)
  const dirty = Number(count) !== (config.reincidenciaChamados ?? REINCIDENCIA_CHAMADOS_PADRAO) || Number(days) !== (config.reincidenciaDias ?? REINCIDENCIA_DIAS_PADRAO)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!countOk || !daysOk) return
    save.mutate({ reincidenciaChamados: Number(count), reincidenciaDias: Number(days) }, { onSuccess: () => toast.success('Regra de reincidência salva.') })
  }

  return <section aria-labelledby="recurrence-rule-title" className="rounded-lg border border-border bg-surface p-4 md:p-5">
    <div className="mb-4">
      <h2 id="recurrence-rule-title" className="text-sm font-semibold text-text-primary">Selo de reincidência</h2>
      <p className="mt-1 text-xs leading-5 text-text-secondary">O equipamento ganha o selo "Reincidente" quando tem esta quantidade de chamados de falha (ou sem tipo) no período. Instalação, peça de reposição e chamados cancelados não contam.</p>
    </div>
    <form onSubmit={submit} noValidate>
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Chamados (N)
          <input type="number" inputMode="numeric" min={REINCIDENCIA_CHAMADOS_MIN} max={REINCIDENCIA_CHAMADOS_MAX} step={1} value={count} aria-invalid={!countOk || undefined} aria-describedby="recurrence-count-help" onChange={(event) => { setCount(event.target.value); save.reset() }} className={`${inputClass} ${countOk ? inputOk : inputErro}`} />
        </label>
        <span className="flex h-9 items-center text-xs text-text-secondary">em</span>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Dias (D)
          <input type="number" inputMode="numeric" min={REINCIDENCIA_DIAS_MIN} max={REINCIDENCIA_DIAS_MAX} step={1} value={days} aria-invalid={!daysOk || undefined} aria-describedby="recurrence-days-help" onChange={(event) => { setDays(event.target.value); save.reset() }} className={`${inputClass} ${daysOk ? inputOk : inputErro}`} />
        </label>
      </div>
      <p id="recurrence-count-help" className={`mt-2 text-[11px] ${countOk ? 'text-text-muted' : 'text-danger'}`}>{countOk ? `Chamados: de ${REINCIDENCIA_CHAMADOS_MIN} a ${REINCIDENCIA_CHAMADOS_MAX}. Padrão: ${REINCIDENCIA_CHAMADOS_PADRAO}.` : `Chamados: informe um número inteiro de ${REINCIDENCIA_CHAMADOS_MIN} a ${REINCIDENCIA_CHAMADOS_MAX}.`}</p>
      <p id="recurrence-days-help" className={`text-[11px] ${daysOk ? 'text-text-muted' : 'text-danger'}`}>{daysOk ? `Dias: de ${REINCIDENCIA_DIAS_MIN} a ${REINCIDENCIA_DIAS_MAX}. Padrão: ${REINCIDENCIA_DIAS_PADRAO}.` : `Dias: informe um número inteiro de ${REINCIDENCIA_DIAS_MIN} a ${REINCIDENCIA_DIAS_MAX}.`}</p>
      {save.isError ? <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{recurrenceRuleErrorMessage(save.error)}</p> : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p className="max-w-xl text-[11px] leading-5 text-text-muted">O selo é recalculado a cada consulta: muda sem o equipamento mudar.</p>
        <button type="submit" disabled={!dirty || !countOk || !daysOk || save.isPending} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold text-bg-brand outline-none hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">{save.isPending ? 'Salvando…' : 'Salvar regra'}</button>
      </div>
    </form>
  </section>
}
