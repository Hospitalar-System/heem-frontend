import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { prepareImage } from '@/lib/image-resize'
import { getPhotoErrorMessage, uploadPreparedPhoto, type PhotoUploadUrls } from '@/lib/photo-upload'
import { workOrdersKey } from './work-orders'

export const MAX_WORK_ORDER_PHOTOS = 5

export interface WorkOrderPhoto { id: string; criadoEm: string; urlOriginal: string; urlMiniatura: string }

const photosKey = (orderId: string) => [...workOrdersKey, 'photos', orderId] as const

export function useWorkOrderPhotos(orderId: string, enabled = true) {
  return useQuery({
    queryKey: photosKey(orderId),
    queryFn: async () => (await apiClient.get<WorkOrderPhoto[]>(`/ordens-de-trabalho/${orderId}/fotos`)).data,
    enabled: Boolean(orderId) && enabled,
    retry: false,
    // URLs assinadas expiram; cache curto.
    staleTime: 4 * 60 * 1000,
  })
}

function useRefreshPhotos(orderId: string) {
  const client = useQueryClient()
  return () => Promise.all([
    client.invalidateQueries({ queryKey: photosKey(orderId) }),
    client.invalidateQueries({ queryKey: [...workOrdersKey, 'detail', orderId] }),
  ])
}

export function useAttachWorkOrderPhoto(orderId: string) {
  const refresh = useRefreshPhotos(orderId)
  return useMutation({
    mutationFn: async (file: File) => {
      const prepared = await prepareImage(file)
      const keys = await uploadPreparedPhoto(
        async (body) => (await apiClient.post<PhotoUploadUrls>(`/ordens-de-trabalho/${orderId}/fotos/upload-url`, body)).data,
        prepared,
      )
      return (await apiClient.post<{ id: string; criadoEm: string }>(`/ordens-de-trabalho/${orderId}/fotos`, keys)).data
    },
    onSuccess: refresh,
  })
}

export function useRemoveWorkOrderPhoto(orderId: string) {
  const refresh = useRefreshPhotos(orderId)
  return useMutation({
    mutationFn: async (photoId: string) => { await apiClient.delete(`/ordens-de-trabalho/${orderId}/fotos/${photoId}`) },
    onSuccess: refresh,
  })
}

/**
 * Regra de escrita (backend): técnico responsável ou admin_cliente; OT em execução ou concluída; só preventiva.
 * Não comparamos ids no cliente (sub do Keycloak x id do banco): para técnico o backend decide (404 se não for o responsável).
 */
export function canEditWorkOrderPhotos(order: { tipo: string; status: string }, user: { roles: string[] } | null | undefined) {
  if (!user) return false
  const tipo = order.tipo.toUpperCase()
  const status = order.status.toUpperCase().replaceAll('Ç', 'C').replaceAll('Ã', 'A')
  if (tipo !== 'PREVENTIVA') return false
  if (status !== 'EM_EXECUCAO' && status !== 'CONCLUIDA' && status !== 'CONCLUIDO') return false
  return user.roles.includes('admin_cliente') || user.roles.includes('tecnico')
}

export const NOT_RESPONSIBLE_MESSAGE = 'Somente o técnico responsável pela OT ou o administrador pode alterar as fotos.'

export function getWorkOrderPhotoErrorMessage(error: unknown) {
  const status = typeof error === 'object' && error !== null && 'response' in error ? (error as { response?: { status?: number } }).response?.status : undefined
  return status === 404 ? NOT_RESPONSIBLE_MESSAGE : getPhotoErrorMessage(error)
}
