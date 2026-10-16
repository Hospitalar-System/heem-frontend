import { useState, type FormEvent } from 'react'
import { Barcode, Link2, Plus, QrCode, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { equipmentLabelSchema } from '../schemas/assets.schema'
import { useEquipmentLabels, useLinkEquipmentLabel, useUnlinkEquipmentLabel } from '../api/equipment-labels'
import type { EquipmentLabel, EquipmentLabelType } from '../types'

const inputClass = 'h-10 w-full rounded-md border border-border bg-bg px-3 text-sm text-text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60'
const labelTypeNames: Record<EquipmentLabelType, string> = { qr: 'QR', barras: 'Código de barras', outro: 'Outro' }

export function EquipmentLabelsSection({ equipmentId }: { equipmentId: string }) {
  const labels = useEquipmentLabels(equipmentId)
  const linkLabel = useLinkEquipmentLabel(equipmentId)
  const unlinkLabel = useUnlinkEquipmentLabel(equipmentId)
  const [isLinkOpen, setIsLinkOpen] = useState(false)
  const [unlinkTarget, setUnlinkTarget] = useState<EquipmentLabel | null>(null)
  const [value, setValue] = useState('')
  const [type, setType] = useState<EquipmentLabelType>('qr')
  const [validationError, setValidationError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isLabelConflict, setIsLabelConflict] = useState(false)

  async function submitLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setValidationError('')
    setSubmitError('')
    setIsLabelConflict(false)
    const parsed = equipmentLabelSchema.safeParse({ valor: value, tipo: type })
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Confira o valor da etiqueta.')
      return
    }

    try {
      const result = await linkLabel.mutateAsync({ valor: parsed.data.valor ?? value.trim(), tipo: parsed.data.tipo })
      toast.success(result.status === 200 ? 'Esta etiqueta já estava vinculada a este equipamento.' : 'Etiqueta vinculada.')
      setValue('')
      setType('qr')
      setIsLinkOpen(false)
    } catch (error) {
      const problem = getProblem(error)
      setIsLabelConflict(problem.code === 'ETIQUETA_EM_USO')
      setSubmitError(problem.code === 'ETIQUETA_EM_USO'
        ? `ETIQUETA_EM_USO: ${problem.detail ?? 'Esta etiqueta já está ativa em outro equipamento.'}`
        : problem.detail ?? problem.code ?? 'Não foi possível vincular a etiqueta. Tente novamente.')
    }
  }

  async function confirmUnlink() {
    if (!unlinkTarget) return
    try {
      await unlinkLabel.mutateAsync(unlinkTarget.id)
      toast.success('Etiqueta desvinculada.')
      setUnlinkTarget(null)
    } catch (error) {
      toast.error(getProblem(error).detail ?? getProblem(error).code ?? 'Não foi possível desvincular a etiqueta.')
    }
  }

  return <section aria-labelledby="equipment-labels-title" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 id="equipment-labels-title" className="text-sm font-semibold text-text-primary">Etiquetas</h3><p className="mt-1 text-xs text-text-secondary">Identificadores ativos vinculados a este equipamento.</p></div>
      <button type="button" onClick={() => { setSubmitError(''); setValidationError(''); setIsLabelConflict(false); setIsLinkOpen(true) }} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Plus aria-hidden="true" size={14} />Vincular etiqueta</button>
    </div>

    {labels.isLoading ? <div aria-label="Carregando etiquetas" aria-busy="true" className="space-y-2">{[0, 1].map((item) => <div key={item} className="h-20 animate-pulse rounded-md border border-border bg-surface" />)}</div> : null}
    {labels.isError ? <div role="alert" className="rounded-md border border-danger/30 bg-surface p-4 text-xs text-text-secondary"><p>Não foi possível carregar as etiquetas.</p><button type="button" onClick={() => void labels.refetch()} className="mt-2 text-primary underline">Tentar novamente</button></div> : null}
    {!labels.isLoading && !labels.isError && (labels.data?.length ?? 0) === 0 ? <div className="grid min-h-36 place-items-center rounded-md border border-dashed border-border bg-surface p-5 text-center"><div><Tag aria-hidden="true" className="mx-auto text-text-muted" size={20} /><p className="mt-2 text-xs font-medium text-text-primary">Nenhuma etiqueta ativa</p><p className="mt-1 text-[11px] text-text-secondary">Vincule um QR code, código de barras ou outro identificador.</p></div></div> : null}
    {!labels.isLoading && !labels.isError && (labels.data?.length ?? 0) > 0 ? <ul aria-label="Etiquetas ativas" className="divide-y divide-border rounded-md border border-border bg-surface">{labels.data?.map((label) => <li key={label.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-bg text-primary">{label.tipo === 'qr' ? <QrCode aria-hidden="true" size={17} /> : label.tipo === 'barras' ? <Barcode aria-hidden="true" size={17} /> : <Tag aria-hidden="true" size={17} />}</span><div className="min-w-0"><p className="break-all text-sm font-medium text-text-primary">{label.valor}</p><p className="mt-1 text-[11px] text-text-secondary">{labelTypeNames[label.tipo] ?? label.tipo}</p><p className="mt-1 text-[10px] text-text-muted">Vinculada por {label.vinculadoPor} · {formatDate(label.vinculadoEm)}</p></div></div><button type="button" aria-label={`Desvincular etiqueta ${label.valor}`} onClick={() => { unlinkLabel.reset(); setUnlinkTarget(label) }} className="grid size-9 shrink-0 place-items-center rounded-md text-text-secondary hover:bg-bg hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Trash2 aria-hidden="true" size={15} /></button></li>)}</ul> : null}

    {isLinkOpen ? <Modal title="Vincular etiqueta" description="O valor pode ser digitado, colado ou lido por um leitor USB de código de barras." busy={linkLabel.isPending} onClose={() => setIsLinkOpen(false)}>
      <form className="space-y-4" onSubmit={(event) => void submitLink(event)}>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Valor da etiqueta<input autoFocus required maxLength={200} value={value} onChange={(event) => { setValue(event.target.value); setValidationError(''); setSubmitError(''); setIsLabelConflict(false) }} aria-invalid={Boolean(validationError || submitError)} aria-describedby={validationError || submitError ? 'equipment-label-error' : undefined} className={inputClass} placeholder="Digite ou leia a etiqueta" /></label>
        <label className="grid gap-1.5 text-xs font-medium text-text-secondary">Tipo<select value={type} onChange={(event) => setType(event.target.value as EquipmentLabelType)} className={inputClass}><option value="qr">QR</option><option value="barras">Código de barras</option><option value="outro">Outro</option></select></label>
        {(validationError || submitError) && <div id="equipment-label-error" role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">{validationError || submitError}</div>}
        {isLabelConflict ? <p className="flex items-start gap-2 text-[11px] text-text-secondary"><Link2 aria-hidden="true" size={13} className="mt-0.5 shrink-0" />O contrato não fornece o ID do equipamento atual; não é possível criar um link seguro para ele.</p> : null}
        <p aria-live="polite" className="text-right text-[10px] text-text-muted">{value.length}/200 caracteres</p>
        <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={linkLabel.isPending} onClick={() => setIsLinkOpen(false)} className="h-9 rounded-md border border-border px-3 text-xs text-text-secondary disabled:opacity-50">Cancelar</button><button type="submit" disabled={linkLabel.isPending} className="h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50">{linkLabel.isPending ? 'Vinculando…' : 'Confirmar vínculo'}</button></div>
      </form>
    </Modal> : null}

    {unlinkTarget ? <Modal title="Desvincular etiqueta?" description={`A etiqueta ${unlinkTarget.valor} deixará de estar ativa neste equipamento. O backend manterá o registro histórico.`} busy={unlinkLabel.isPending} onClose={() => setUnlinkTarget(null)}>
      {unlinkLabel.isError && <p role="alert" className="mb-4 rounded-md border border-danger/30 p-3 text-xs text-danger">{getProblem(unlinkLabel.error).detail ?? getProblem(unlinkLabel.error).code ?? 'Não foi possível desvincular a etiqueta.'}</p>}
      <div className="flex justify-end gap-2"><button type="button" autoFocus disabled={unlinkLabel.isPending} onClick={() => setUnlinkTarget(null)} className="h-9 rounded-md border border-border px-3 text-xs text-text-secondary">Cancelar</button><button type="button" disabled={unlinkLabel.isPending} onClick={() => void confirmUnlink()} className="h-9 rounded-md border border-danger/40 px-3 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50">{unlinkLabel.isPending ? 'Desvinculando…' : 'Desvincular'}</button></div>
    </Modal> : null}
  </section>
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

function getProblem(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; code?: string } } }).response
    return { detail: response?.data?.detail, code: response?.data?.code }
  }
  return { detail: error instanceof Error ? error.message : undefined, code: undefined }
}
