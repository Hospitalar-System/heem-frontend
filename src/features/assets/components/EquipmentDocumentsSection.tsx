import { zodResolver } from '@hookform/resolvers/zod'
import { Download, FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { DatePicker } from '@/components/ui/DatePicker'
import { FormDatePicker } from '@/components/ui/FormDatePicker'
import { FormSelect } from '@/components/ui/FormSelect'
import { Modal } from '@/components/ui/Modal'
import { documentFormSchema, validateDocumentFile, type DocumentFormValues } from '../schemas/assets.schema'
import { fetchDocumentDownloadUrl, useDeleteEquipmentDocument, useEquipmentDocuments, useUpdateDocumentValidity, useUploadEquipmentDocument } from '../api/equipment-documents'
import type { DocumentType, EquipmentDocument } from '../types'

const documentTypeNames: Record<DocumentType, string> = {
  MANUAL: 'Manual', CERTIFICADO_CALIBRACAO: 'Certificado de calibração', LAUDO_SEGURANCA: 'Laudo de segurança', NOTA_FISCAL: 'Nota fiscal', OUTRO: 'Outro',
}
const typeOptions = (Object.keys(documentTypeNames) as DocumentType[]).map((value) => ({ value, label: documentTypeNames[value] }))
const fieldLabel = 'grid gap-1.5 text-xs font-medium text-text-secondary'
const outlineButton = 'h-9 rounded-md border border-border px-3 text-xs text-text-secondary disabled:opacity-50'
const primaryButton = 'h-9 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand disabled:opacity-50'

/** canWrite: enviar (admin_cliente e tecnico); canManage: alterar validade e excluir (somente admin_cliente). */
export function EquipmentDocumentsSection({ equipmentId, canWrite, canManage }: { equipmentId: string; canWrite: boolean; canManage: boolean }) {
  const documents = useEquipmentDocuments(equipmentId)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [validityTarget, setValidityTarget] = useState<EquipmentDocument | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EquipmentDocument | null>(null)
  const remove = useDeleteEquipmentDocument(equipmentId)

  async function download(document: EquipmentDocument) {
    try {
      const url = await fetchDocumentDownloadUrl(equipmentId, document.id)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toast.error(problemMessage(error, 'Não foi possível gerar o link de download.'))
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await remove.mutateAsync(deleteTarget.id)
      toast.success('Documento excluído.')
      setDeleteTarget(null)
    } catch (error) {
      toast.error(problemMessage(error, 'Não foi possível excluir o documento.'))
    }
  }

  const list = documents.data ?? []
  return <section aria-labelledby="equipment-documents-title" className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h3 id="equipment-documents-title" className="text-sm font-semibold text-text-primary">Documentos</h3><p className="mt-1 text-xs text-text-secondary">Manuais, laudos e certificados com controle de validade.</p></div>
      {canWrite ? <button type="button" onClick={() => setUploadOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-bg-brand hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Plus aria-hidden="true" size={14} />Enviar documento</button> : null}
    </div>

    {documents.isLoading ? <div aria-label="Carregando documentos" aria-busy="true" className="space-y-2">{[0, 1].map((item) => <div key={item} className="h-16 animate-pulse rounded-md border border-border bg-surface" />)}</div> : null}
    {documents.isError ? <div role="alert" className="rounded-md border border-danger/30 bg-surface p-4 text-xs text-text-secondary"><p>Não foi possível carregar os documentos.</p><button type="button" onClick={() => void documents.refetch()} className="mt-2 text-primary underline">Tentar novamente</button></div> : null}
    {!documents.isLoading && !documents.isError && list.length === 0 ? <div className="grid min-h-36 place-items-center rounded-md border border-dashed border-border bg-surface p-5 text-center"><div><FileText aria-hidden="true" className="mx-auto text-text-muted" size={20} /><p className="mt-2 text-xs font-medium text-text-primary">Nenhum documento anexado</p><p className="mt-1 text-[11px] text-text-secondary">{canWrite ? 'Envie manuais, laudos ou certificados deste equipamento.' : 'Ainda não há documentos para este equipamento.'}</p></div></div> : null}
    {!documents.isLoading && !documents.isError && list.length > 0 ? <div className="overflow-x-auto rounded-lg border border-border bg-surface"><table className="w-full min-w-[720px] border-collapse text-left">
      <thead><tr className="table-head h-11 text-[11px]"><th scope="col" className="px-4">Documento</th><th scope="col" className="px-4">Tipo</th><th scope="col" className="px-4">Enviado em</th><th scope="col" className="px-4">Validade</th><th scope="col" className="px-4">Situação</th><th scope="col" className="px-4 text-right">Ações</th></tr></thead>
      <tbody>{list.map((document) => <tr key={document.id} className="row-idle h-12 border-b text-xs last:border-0">
        <td className="break-all px-4 font-medium">{document.nomeArquivo}</td>
        <td className="px-4 text-text-secondary">{documentTypeNames[document.tipoDocumento] ?? document.tipoDocumento}</td>
        <td className="px-4 text-text-secondary">{formatTimestamp(document.uploadedEm)}</td>
        <td className="px-4 text-text-secondary">{formatCivilDate(document.validadeAte)}</td>
        <td className="px-4"><ValidityBadge document={document} /></td>
        <td className="px-4"><div className="flex justify-end gap-1">
          <IconButton label={`Baixar ${document.nomeArquivo}`} onClick={() => void download(document)}><Download aria-hidden="true" size={15} /></IconButton>
          {canManage ? <IconButton label={`Editar validade de ${document.nomeArquivo}`} onClick={() => setValidityTarget(document)}><Pencil aria-hidden="true" size={15} /></IconButton> : null}
          {canManage ? <IconButton label={`Excluir ${document.nomeArquivo}`} danger onClick={() => { remove.reset(); setDeleteTarget(document) }}><Trash2 aria-hidden="true" size={15} /></IconButton> : null}
        </div></td>
      </tr>)}</tbody></table></div> : null}

    {uploadOpen ? <UploadModal equipmentId={equipmentId} onClose={() => setUploadOpen(false)} /> : null}
    {validityTarget ? <ValidityModal equipmentId={equipmentId} document={validityTarget} onClose={() => setValidityTarget(null)} /> : null}
    {deleteTarget ? <Modal title="Excluir documento?" description={`O documento ${deleteTarget.nomeArquivo} deixará de aparecer neste equipamento.`} busy={remove.isPending} onClose={() => setDeleteTarget(null)}>
      <div className="flex justify-end gap-2"><button type="button" autoFocus disabled={remove.isPending} onClick={() => setDeleteTarget(null)} className={outlineButton}>Cancelar</button><button type="button" disabled={remove.isPending} onClick={() => void confirmDelete()} className="h-9 rounded-md border border-danger/40 px-3 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-50">{remove.isPending ? 'Excluindo…' : 'Excluir'}</button></div>
    </Modal> : null}
  </section>
}

function UploadModal({ equipmentId, onClose }: { equipmentId: string; onClose: () => void }) {
  const upload = useUploadEquipmentDocument(equipmentId)
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [progress, setProgress] = useState(0)
  const form = useForm<DocumentFormValues>({ resolver: zodResolver(documentFormSchema), defaultValues: { tipoDocumento: undefined, validadeAte: '' } })

  const submit = form.handleSubmit(async (values) => {
    const problem = validateDocumentFile(file)
    setFileError(problem ?? '')
    setSubmitError('')
    if (problem || !file) return
    setProgress(0)
    try {
      await upload.mutateAsync({ file, tipoDocumento: values.tipoDocumento, validadeAte: values.validadeAte || null, onProgress: setProgress })
      toast.success('Documento enviado.')
      onClose()
    } catch (error) {
      setSubmitError(problemMessage(error, 'Não foi possível enviar o documento. Tente novamente.'))
    }
  })

  return <Modal title="Enviar documento" description="O arquivo é enviado ao armazenamento seguro e depois registrado neste equipamento." busy={upload.isPending} onClose={onClose}>
    <form className="space-y-4" onSubmit={(event) => void submit(event)} noValidate>
      <label className={fieldLabel}>Arquivo<input type="file" disabled={upload.isPending} onChange={(event) => { const next = event.target.files?.[0] ?? null; setFile(next); setFileError(next ? validateDocumentFile(next) ?? '' : '') }} aria-invalid={Boolean(fileError)} className="block w-full text-xs text-text-primary file:mr-3 file:h-9 file:rounded-md file:border file:border-border file:bg-surface file:px-3 file:text-xs" /></label>
      {fileError ? <p role="alert" className="text-xs text-danger">{fileError}</p> : <p className="text-[11px] text-text-muted">Tamanho máximo de 20 MB.</p>}
      <div className={fieldLabel}><span id="document-type-label">Tipo do documento</span><FormSelect control={form.control} name="tipoDocumento" options={typeOptions} placeholder="Selecione o tipo" disabled={upload.isPending} aria-labelledby="document-type-label" aria-invalid={Boolean(form.formState.errors.tipoDocumento)} /></div>
      {form.formState.errors.tipoDocumento ? <p role="alert" className="text-xs text-danger">{form.formState.errors.tipoDocumento.message}</p> : null}
      <div className={fieldLabel}><span id="document-validity-label">Validade (opcional)</span><FormDatePicker control={form.control} name="validadeAte" disabled={upload.isPending} aria-labelledby="document-validity-label" /></div>
      {upload.isPending ? <div role="progressbar" aria-label="Progresso do envio" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-2 overflow-hidden rounded-full bg-bg"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div> : null}
      {submitError ? <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">{submitError}</div> : null}
      <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={upload.isPending} onClick={onClose} className={outlineButton}>Cancelar</button><button type="submit" disabled={upload.isPending} className={primaryButton}>{upload.isPending ? `Enviando… ${progress}%` : 'Enviar'}</button></div>
    </form>
  </Modal>
}

function ValidityModal({ equipmentId, document, onClose }: { equipmentId: string; document: EquipmentDocument; onClose: () => void }) {
  const update = useUpdateDocumentValidity(equipmentId)
  const [value, setValue] = useState(document.validadeAte ?? '')
  const [error, setError] = useState('')

  async function save() {
    setError('')
    try {
      await update.mutateAsync({ documentId: document.id, validadeAte: value || null })
      toast.success(value ? 'Validade atualizada.' : 'Validade removida.')
      onClose()
    } catch (err) {
      setError(problemMessage(err, 'Não foi possível atualizar a validade.'))
    }
  }

  return <Modal title="Editar validade" description={`Documento ${document.nomeArquivo}. Deixe em branco para remover a validade.`} busy={update.isPending} onClose={onClose}>
    <div className="space-y-4">
      <div className={fieldLabel}><span id="document-new-validity-label">Validade</span><DatePicker value={value} onChange={setValue} aria-labelledby="document-new-validity-label" disabled={update.isPending} /></div>
      {error ? <div role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">{error}</div> : null}
      <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" disabled={update.isPending} onClick={onClose} className={outlineButton}>Cancelar</button><button type="button" disabled={update.isPending} onClick={() => void save()} className={primaryButton}>{update.isPending ? 'Salvando…' : 'Salvar validade'}</button></div>
    </div>
  </Modal>
}

/** Selo com texto (não só cor): Vencido, Vencendo (até 30 dias), Válido ou Sem validade. */
export function ValidityBadge({ document }: { document: Pick<EquipmentDocument, 'validadeAte' | 'vencido' | 'vencendo'> }) {
  if (document.vencido) return <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[11px] font-medium text-danger">Vencido</span>
  if (document.vencendo) return <span className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning">Vencendo</span>
  if (document.validadeAte) return <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">Válido</span>
  return <span className="rounded-full bg-bg px-2.5 py-1 text-[11px] font-medium text-text-secondary">Sem validade</span>
}

function IconButton({ label, onClick, danger = false, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return <button type="button" aria-label={label} title={label} onClick={onClick} className={`grid size-9 shrink-0 place-items-center rounded-md text-text-secondary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${danger ? 'hover:text-danger' : 'hover:text-text-primary'}`}>{children}</button>
}

function formatCivilDate(value: string | null) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '—'
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date)
}

function problemMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const data = (error as { response?: { data?: { detail?: string; code?: string } } }).response?.data
    return data?.detail ?? data?.code ?? fallback
  }
  return fallback
}
