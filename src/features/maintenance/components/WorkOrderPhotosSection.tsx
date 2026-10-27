import { Camera, ImageOff, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { photoAcceptAttr, validateImageFile } from '@/lib/image-resize'
import { canEditWorkOrderPhotos, getWorkOrderPhotoErrorMessage, MAX_WORK_ORDER_PHOTOS, useAttachWorkOrderPhoto, useRemoveWorkOrderPhoto, useWorkOrderPhotos, type WorkOrderPhoto } from '../api/work-order-photos'
import type { WorkOrderDetail } from '../types'

interface Props { order: WorkOrderDetail; user: { id: string; roles: string[] } | null | undefined }

export function WorkOrderPhotosSection({ order, user }: Props) {
  const photos = useWorkOrderPhotos(order.id)
  const attach = useAttachWorkOrderPhoto(order.id)
  const remove = useRemoveWorkOrderPhoto(order.id)
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState<WorkOrderPhoto | null>(null)
  const [removing, setRemoving] = useState<WorkOrderPhoto | null>(null)
  const canEdit = canEditWorkOrderPhotos(order, user)
  const list = photos.data ?? []
  const count = photos.data ? list.length : order.fotosCount ?? 0
  const atLimit = count >= MAX_WORK_ORDER_PHOTOS

  async function onFile(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      validateImageFile(file)
      await attach.mutateAsync(file)
      toast.success('Foto anexada.')
    } catch (failure) {
      setError(getWorkOrderPhotoErrorMessage(failure))
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function onRemove() {
    if (!removing) return
    setError('')
    try {
      await remove.mutateAsync(removing.id)
      toast.success('Foto removida.')
    } catch (failure) {
      setError(getWorkOrderPhotoErrorMessage(failure))
    } finally {
      setRemoving(null)
    }
  }

  return <section aria-labelledby="photos-title" className="rounded-lg border border-border bg-surface p-5 xl:col-span-2">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 id="photos-title" className="flex items-center gap-2 text-sm font-semibold text-text-primary"><Camera aria-hidden="true" size={16} />Fotos<span className="text-xs font-medium text-text-secondary" aria-label={`${count} de ${MAX_WORK_ORDER_PHOTOS} fotos`}>{count}/{MAX_WORK_ORDER_PHOTOS}</span></h3>
      {canEdit ? <>
        <input ref={inputRef} type="file" accept={photoAcceptAttr} aria-label="Selecionar arquivo da foto" className="sr-only" tabIndex={-1} onChange={(event) => void onFile(event.target.files?.[0])} />
        <button type="button" disabled={atLimit || attach.isPending} onClick={() => inputRef.current?.click()} className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"><Camera aria-hidden="true" size={14} />{attach.isPending ? 'Enviando…' : 'Anexar foto'}</button>
      </> : null}
    </div>
    {canEdit && atLimit ? <p className="mt-2 text-[11px] text-text-muted">Limite de {MAX_WORK_ORDER_PHOTOS} fotos atingido. Remova uma para anexar outra.</p> : null}
    {!canEdit ? <p className="mt-2 text-[11px] text-text-muted">Fotos só podem ser anexadas pelo técnico responsável ou pelo administrador, com a OT em execução ou concluída.</p> : null}
    {photos.isLoading ? <div aria-label="Carregando fotos" aria-busy="true" className="mt-4 h-24 animate-pulse rounded-md bg-bg" />
      : photos.isError ? <div role="alert" className="mt-4 rounded-md border border-border p-4 text-xs text-text-secondary">Não foi possível carregar as fotos.<button type="button" onClick={() => void photos.refetch()} className="ml-2 text-primary underline">Tentar novamente</button></div>
        : list.length === 0 ? <div className="mt-4 grid min-h-24 place-items-center rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-text-muted"><div><ImageOff aria-hidden="true" size={20} className="mx-auto" /><p className="mt-2">Nenhuma foto anexada a esta OT.</p></div></div>
          : <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{list.map((photo, index) => <li key={photo.id} className="relative">
            <button type="button" onClick={() => setViewing(photo)} aria-label={`Abrir foto ${index + 1}`} className="block w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><img src={photo.urlMiniatura} alt={`Foto ${index + 1} da OT ${order.codigo}`} loading="lazy" className="aspect-square w-full rounded-md border border-border object-cover" /></button>
            {canEdit ? <button type="button" aria-label={`Remover foto ${index + 1}`} disabled={remove.isPending} onClick={() => setRemoving(photo)} className="absolute right-1 top-1 grid size-7 place-items-center rounded-md border border-border bg-surface text-danger hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><Trash2 aria-hidden="true" size={14} /></button> : null}
          </li>)}</ul>}
    {error ? <p role="alert" className="mt-3 text-xs text-danger">{error}</p> : null}

    {viewing ? <Modal title={`Foto da OT ${order.codigo}`} onClose={() => setViewing(null)}><img src={viewing.urlOriginal} alt={`Foto ampliada da OT ${order.codigo}`} className="max-h-[70vh] w-full rounded-md object-contain" /></Modal> : null}
    {removing ? <Modal title="Remover foto" description="A foto será removida desta OT. Esta ação não pode ser desfeita." busy={remove.isPending} onClose={() => setRemoving(null)}>
      <div className="flex justify-end gap-2"><button type="button" disabled={remove.isPending} onClick={() => setRemoving(null)} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg">Cancelar</button><button type="button" disabled={remove.isPending} onClick={() => void onRemove()} className="h-9 rounded-md bg-danger px-3 text-xs font-semibold text-white disabled:opacity-50">{remove.isPending ? 'Removendo…' : 'Remover'}</button></div>
    </Modal> : null}
  </section>
}
