import { useEffect, useState, type FormEvent } from 'react'
import { AdminPageShell } from '@/components/layout/AdminPageShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useTenantUsers } from '@/features/tenants-users/api/users'
import { SettingsNav } from '../components/SettingsNav'
import { clientConfigErrorMessage, JANELA_MAX, JANELA_MIN, JANELA_PADRAO, useClientConfig, useSaveClientConfig } from '../api/client-config'

const dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
const inputClass = 'h-9 w-24 rounded-md border bg-bg px-2.5 text-xs tabular-nums text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20'

/** Story 23.2: janela (em dias) da qualidade da análise do técnico. Só admin do cliente. */
export function QualityWindowPage() {
  const config = useClientConfig()
  const save = useSaveClientConfig()
  const users = useTenantUsers()
  const [value, setValue] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => { if (config.data) setValue(String(config.data.janelaQualidadeAnaliseDias)) }, [config.data])

  const parsed = Number(value)
  const valid = value.trim() !== '' && Number.isInteger(parsed) && parsed >= JANELA_MIN && parsed <= JANELA_MAX
  const dirty = config.data ? parsed !== config.data.janelaQualidadeAnaliseDias : false
  const author = config.data?.atualizadoPor ? users.data?.find((user) => user.id === config.data?.atualizadoPor)?.nome : null
  const updatedAt = config.data?.atualizadoEm ? dateFormat.format(new Date(config.data.atualizadoEm)) : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    setNotice('')
    save.mutate(parsed, { onSuccess: () => setNotice('Janela salva. Ela vale para os cálculos feitos a partir de agora; relatórios já emitidos não mudam.') })
  }

  return <AdminPageShell tabs={<SettingsNav />} title="Qualidade da análise" subtitle="Janela usada para avaliar a análise do técnico">
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-lg border border-border bg-surface p-4 md:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-text-primary">Janela da qualidade da análise</h2>
          <p className="mt-1 text-xs leading-5 text-text-secondary">Quantos dias depois de um equipamento ser deixado como Apto um novo chamado no mesmo equipamento conta contra a análise do técnico.</p>
        </div>

        {config.isPending ? <div aria-label="Carregando configuração" aria-busy="true" className="h-16 animate-pulse rounded-md bg-bg" /> : null}
        {config.isError ? <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-4"><p className="text-xs text-text-primary">Não foi possível carregar a configuração.</p><button type="button" onClick={() => void config.refetch()} className="mt-2 rounded text-xs font-medium text-primary underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">Tentar novamente</button></div> : null}

        {config.data ? <form onSubmit={submit} noValidate>
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Janela (dias)
              <input type="number" inputMode="numeric" min={JANELA_MIN} max={JANELA_MAX} step={1} value={value} aria-invalid={!valid || undefined} aria-describedby="quality-window-help" onChange={(event) => { setValue(event.target.value); setNotice(''); save.reset() }} className={`${inputClass} ${valid ? 'border-border' : 'border-danger'}`} />
            </label>
            <StatusBadge tone={config.data.padrao ? 'neutral' : 'success'}>{config.data.padrao ? 'Padrão do sistema' : 'Personalizado'}</StatusBadge>
          </div>
          <p id="quality-window-help" className={`mt-2 text-[11px] ${valid ? 'text-text-muted' : 'text-danger'}`}>{valid ? `Entre ${JANELA_MIN} e ${JANELA_MAX} dias. Padrão: ${JANELA_PADRAO}.` : `Informe um número inteiro entre ${JANELA_MIN} e ${JANELA_MAX}.`}</p>
          {!config.data.padrao && updatedAt ? <p className="mt-1 text-[11px] text-text-muted">Alterado em {updatedAt}{author ? ` por ${author}` : ''}.</p> : null}

          {save.isError ? <p role="alert" className="mt-4 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">{clientConfigErrorMessage(save.error)}</p> : null}
          {notice ? <p role="status" className="mt-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs leading-5 text-text-primary">{notice}</p> : null}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="max-w-xl text-[11px] leading-5 text-text-muted">A mudança vale só para os próximos cálculos; os relatórios registram a janela que usaram.</p>
            <button type="submit" disabled={!dirty || !valid || save.isPending} className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-xs font-semibold text-bg-brand outline-none hover:bg-primary-hover focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">{save.isPending ? 'Salvando…' : 'Salvar janela'}</button>
          </div>
        </form> : null}
      </section>
    </div>
  </AdminPageShell>
}
