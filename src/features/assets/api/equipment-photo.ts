import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { prepareImage } from '@/lib/image-resize'
import { uploadPreparedPhoto, type PhotoUploadUrls } from '@/lib/photo-upload'

export type EquipmentPhotoVariant = 'miniatura' | 'original'

const photoKey = (equipmentId: string) => ['equipment-photo', equipmentId] as const
// A URL assinada de leitura expira; um cache curto evita rebaixar a cada render sem servir link vencido.
const SIGNED_URL_STALE_MS = 4 * 60 * 1000

/**
 * URL assinada de leitura da foto. `versao` (fotoVersao) entra na chave: trocar a foto muda a chave e rebusca.
 * 404 (sem foto) não é repetido.
 */
export function useEquipmentPhotoUrl(equipmentId: string, variant: EquipmentPhotoVariant, enabled: boolean, versao?: string | null) {
  return useQuery({
    queryKey: [...photoKey(equipmentId), variant, versao ?? null],
    queryFn: async () => (await apiClient.get<{ url: string }>(`/equipamentos/${equipmentId}/foto${variant === 'miniatura' ? '/miniatura' : ''}`)).data.url,
    enabled: Boolean(equipmentId) && enabled,
    retry: false,
    staleTime: SIGNED_URL_STALE_MS,
    gcTime: SIGNED_URL_STALE_MS,
  })
}

function useRefreshEquipmentPhoto() {
  const client = useQueryClient()
  return (equipmentId: string) => Promise.all([
    client.invalidateQueries({ queryKey: photoKey(equipmentId) }),
    client.invalidateQueries({ queryKey: ['equipment', equipmentId] }),
    client.invalidateQueries({ queryKey: ['equipments'] }),
  ])
}

/** Reduz/remove EXIF no cliente, envia às URLs assinadas e confirma a troca (PUT /foto). */
export function useSetEquipmentPhoto() {
  const refresh = useRefreshEquipmentPhoto()
  return useMutation({
    mutationFn: async ({ equipmentId, file }: { equipmentId: string; file: File }) => {
      const prepared = await prepareImage(file)
      const keys = await uploadPreparedPhoto(
        async (body) => (await apiClient.post<PhotoUploadUrls>(`/equipamentos/${equipmentId}/foto/upload-url`, body)).data,
        prepared,
      )
      return (await apiClient.put<{ fotoVersao: string }>(`/equipamentos/${equipmentId}/foto`, keys)).data
    },
    onSuccess: (_data, { equipmentId }) => refresh(equipmentId),
  })
}

export function useDeleteEquipmentPhoto(equipmentId: string) {
  const refresh = useRefreshEquipmentPhoto()
  return useMutation({
    mutationFn: async () => { await apiClient.delete(`/equipamentos/${equipmentId}/foto`) },
    onSuccess: () => refresh(equipmentId),
  })
}
