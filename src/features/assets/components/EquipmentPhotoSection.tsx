import { ImageOff, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/Modal'
import { photoAcceptAttr, validateImageFile } from '@/lib/image-resize'
import { getPhotoErrorMessage } from '@/lib/photo-upload'
import { useDeleteEquipmentPhoto, useEquipmentPhotoUrl, useSetEquipmentPhoto } from '../api/equipment-photo'

interface Props {
  equipmentId: string
  nome: string
  fotoVersao?: string | null
  /** Equipamento ainda com a foto legada (`fotoUrl`): só o original está disponível. */
  hasLegacyPhoto: boolean
  /** admin_cliente e tecnico enviam/trocam. */
  canWrite: boolean
  /** Somente admin_cliente remove. */
  canDelete: boolean
}

export function EquipmentPhotoSection({ equipmentId, nome, fotoVersao, hasLegacyPhoto, canWrite, canDelete }: Props) {
  const hasPhoto = Boolean(fotoVersao) || hasLegacyPhoto
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const thumb = useEquipmentPhotoUrl(equipmentId, fotoVersao ? 'miniatura' : 'original', hasPhoto, fotoVersao)
  const original = useEquipmentPhotoUrl(equipmentId, 'original', hasPhoto && preview, fotoVersao)
  const setPhoto = useSetEquipmentPhoto()
  const removePhoto = useDeleteEquipmentPhoto(equipmentId)

  async function onFile(file: File | undefined) {
    if (!file) return
    setError('')
    try {
      validateImageFile(file)
      await setPhoto.mutateAsync({ equipmentId, file })
      toast.success(hasPhoto ? 'Foto atualizada.' : 'Foto enviada.')
    } catch (failure) {
      setError(getPhotoErrorMessage(failure))
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function onDelete() {
    setError('')
    try {
      await removePhoto.mutateAsync()
      setConfirmDelete(false)
      toast.success('Foto removida.')
    } catch {
      setConfirmDelete(false)
      setError('Não foi possível remover a foto. Tente novamente.')
    }
  }

  const busy = setPhoto.isPending || removePhoto.isPending
  return <section aria-labelledby="equipment-photo-title" className="rounded-lg border border-border bg-surface p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 id="equipment-photo-title" className="text-sm font-semibold">Foto</h3>
      {canWrite || (canDelete && hasPhoto) ? <div className="flex flex-wrap gap-2">
        {canWrite ? <>
          <input ref={inputRef} type="file" accept={photoAcceptAttr} aria-label="Selecionar arquivo da foto" className="sr-only" tabIndex={-1} onChange={(event) => void onFile(event.target.files?.[0])} />
          <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><Upload aria-hidden="true" size={14} />{setPhoto.isPending ? 'Enviando…' : hasPhoto ? 'Trocar foto' : 'Enviar foto'}</button>
        </> : null}
        {canDelete && hasPhoto ? <button type="button" disabled={busy} onClick={() => setConfirmDelete(true)} className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium text-danger hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"><Trash2 aria-hidden="true" size={14} />Remover foto</button> : null}
      </div> : null}
    </div>
    {!hasPhoto ? <div className="mt-3 grid min-h-32 place-items-center rounded-md border border-dashed border-border bg-bg p-4 text-center"><div className="text-text-muted"><ImageOff aria-hidden="true" size={22} className="mx-auto" /><p className="mt-2 text-xs">Nenhuma foto cadastrada.</p>{canWrite ? <p className="mt-1 text-[11px]">Use Enviar foto para adicionar.</p> : null}</div></div>
      : thumb.isLoading ? <div aria-label="Carregando foto" aria-busy="true" className="mt-3 h-44 animate-pulse rounded-md bg-bg" />
        : thumb.isError || !thumb.data ? <p role="status" className="mt-3 text-xs text-text-muted">Foto não disponível no momento.<button type="button" onClick={() => void thumb.refetch()} className="ml-2 text-primary underline">Tentar novamente</button></p>
          : <button type="button" onClick={() => setPreview(true)} aria-label={`Ampliar foto de ${nome}`} className="mt-3 block w-full rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><img src={thumb.data} alt={`Foto de ${nome}`} className="max-h-64 w-full rounded-md border border-border object-contain" /></button>}
    {error ? <p role="alert" className="mt-3 text-xs text-danger">{error}</p> : null}

    {preview ? <Modal title={`Foto de ${nome}`} onClose={() => setPreview(false)}>
      {original.isLoading ? <div aria-label="Carregando foto" aria-busy="true" className="h-64 animate-pulse rounded-md bg-bg" />
        : original.data ? <img src={original.data} alt={`Foto de ${nome} ampliada`} className="max-h-[70vh] w-full rounded-md object-contain" />
          : <p role="alert" className="text-xs text-danger">Não foi possível carregar a foto original.</p>}
    </Modal> : null}
    {confirmDelete ? <Modal title="Remover foto" description="A foto deste equipamento será removida. Esta ação não pode ser desfeita." busy={removePhoto.isPending} onClose={() => setConfirmDelete(false)}>
      <div className="flex justify-end gap-2"><button type="button" disabled={removePhoto.isPending} onClick={() => setConfirmDelete(false)} className="h-9 rounded-md border border-border px-3 text-xs font-medium text-text-secondary hover:bg-bg">Cancelar</button><button type="button" disabled={removePhoto.isPending} onClick={() => void onDelete()} className="h-9 rounded-md bg-danger px-3 text-xs font-semibold text-white disabled:opacity-50">{removePhoto.isPending ? 'Removendo…' : 'Remover'}</button></div>
    </Modal> : null}
  </section>
}

/** Miniatura da lista: só baixa a URL assinada quando a linha entra na viewport (evita N+1 pesado). */
export function EquipmentThumb({ equipmentId, nome, fotoVersao }: { equipmentId: string; nome: string; fotoVersao?: string | null }) {
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined')
  const observed = useRef<IntersectionObserver | null>(null)
  const ref = (element: HTMLSpanElement | null) => {
    observed.current?.disconnect()
    if (element && typeof IntersectionObserver !== 'undefined') {
      observed.current = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) { setVisible(true); observed.current?.disconnect() }
      }, { rootMargin: '120px' })
      observed.current.observe(element)
    }
  }
  const query = useEquipmentPhotoUrl(equipmentId, 'miniatura', Boolean(fotoVersao) && visible, fotoVersao)
  return <span ref={ref} className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-bg text-text-muted">
    {fotoVersao && query.data ? <img src={query.data} alt={`Miniatura de ${nome}`} loading="lazy" className="size-full object-cover" /> : <ImageOff aria-hidden="true" size={14} />}
  </span>
}
