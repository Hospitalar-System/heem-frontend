import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '@/lib/axios'
import type { DocumentUrlResponse, EquipmentDocument, UploadEquipmentDocumentInput } from '../types'

const documentsKey = (equipmentId: string) => ['equipment-documents', equipmentId] as const

export function useEquipmentDocuments(equipmentId: string) {
  return useQuery({
    queryKey: documentsKey(equipmentId),
    queryFn: async () => (await apiClient.get<EquipmentDocument[]>(`/equipamentos/${equipmentId}/documentos`)).data,
    enabled: Boolean(equipmentId),
  })
}

/**
 * Fluxo em duas etapas: 1) upload-url pré-assinada, 2) PUT do arquivo direto no storage (cliente limpo,
 * sem Authorization), 3) POST registrando o documento com a chave devolvida.
 */
export function useUploadEquipmentDocument(equipmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, tipoDocumento, validadeAte, onProgress }: UploadEquipmentDocumentInput) => {
      const signed = (await apiClient.post<DocumentUrlResponse>(`/equipamentos/${equipmentId}/documentos/upload-url`, { nomeArquivo: file.name })).data
      // O modo demonstração devolve demo://, que não tem storage real para receber o PUT.
      if (!signed.url.startsWith('demo://')) {
        await axios.put(signed.url, file, {
          headers: { 'Content-Type': file.type || 'application/octet-stream' },
          onUploadProgress: (event) => { if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100)) },
        })
      }
      onProgress?.(100)
      return (await apiClient.post<EquipmentDocument>(`/equipamentos/${equipmentId}/documentos`, {
        tipoDocumento, nomeArquivo: file.name, chave: signed.chave, validadeAte,
      })).data
    },
    onSuccess: () => client.invalidateQueries({ queryKey: documentsKey(equipmentId) }),
  })
}

export function useUpdateDocumentValidity(equipmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ documentId, validadeAte }: { documentId: string; validadeAte: string | null }) =>
      (await apiClient.patch<EquipmentDocument>(`/equipamentos/${equipmentId}/documentos/${documentId}/validade`, { validadeAte })).data,
    onSuccess: () => client.invalidateQueries({ queryKey: documentsKey(equipmentId) }),
  })
}

export function useDeleteEquipmentDocument(equipmentId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (documentId: string) => apiClient.delete(`/equipamentos/${equipmentId}/documentos/${documentId}`),
    onSuccess: () => client.invalidateQueries({ queryKey: documentsKey(equipmentId) }),
  })
}

export async function fetchDocumentDownloadUrl(equipmentId: string, documentId: string) {
  return (await apiClient.get<DocumentUrlResponse>(`/equipamentos/${equipmentId}/documentos/${documentId}/download-url`)).data.url
}
