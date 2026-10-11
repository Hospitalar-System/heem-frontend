import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import type { CreateEquipmentInput, Equipment, Hospital, HospitalInput, Setor, SetorInput, SignedUploadUrl, UpdateEquipmentInput, WorkOrderSummary } from '../types'

const hospitalKey = ['hospitals'] as const
export function useHospitals() { return useQuery({ queryKey: hospitalKey, queryFn: async () => (await apiClient.get<Hospital[]>('/hospitais')).data }) }
export function useHospital(id: string) { return useQuery({ queryKey: [...hospitalKey, id], queryFn: async () => (await apiClient.get<Hospital>(`/hospitais/${id}`)).data, enabled: Boolean(id) }) }
export function useSaveHospital() {
  const client = useQueryClient()
  return useMutation({ mutationFn: async ({ id, data }: { id?: string; data: HospitalInput }) => id ? (await apiClient.put<Hospital>(`/hospitais/${id}`, data)).data : (await apiClient.post<Hospital>('/hospitais', data)).data, onSuccess: () => client.invalidateQueries({ queryKey: hospitalKey }) })
}
export function useSectors(hospitalId: string) { return useQuery({ queryKey: ['sectors', hospitalId], queryFn: async () => (await apiClient.get<Setor[]>(`/hospitais/${hospitalId}/setores`)).data, enabled: Boolean(hospitalId) }) }
export function useSectorsForHospitals(hospitalIds: string[]) {
  return useQuery({
    queryKey: ['sectors', 'directory', hospitalIds],
    queryFn: async () => (await Promise.all(hospitalIds.map((id) => apiClient.get<Setor[]>(`/hospitais/${id}/setores`)))).flatMap(({ data }) => data),
    enabled: hospitalIds.length > 0,
  })
}
export function useSector(id: string) { return useQuery({ queryKey: ['sector', id], queryFn: async () => (await apiClient.get<Setor>(`/setores/${id}`)).data, enabled: Boolean(id) }) }
export function useSaveSector() {
  const client = useQueryClient()
  return useMutation({ mutationFn: async ({ id, hospitalId, data }: { id?: string; hospitalId: string; data: SetorInput }) => id ? (await apiClient.put<Setor>(`/setores/${id}`, data)).data : (await apiClient.post<Setor>(`/hospitais/${hospitalId}/setores`, data)).data, onSuccess: (_data, variables) => { client.invalidateQueries({ queryKey: ['sectors', variables.hospitalId] }); client.invalidateQueries({ queryKey: ['hospital-metrics'] }) } })
}

const equipmentKey = ['equipments'] as const
export function useEquipments(filters: { hospitalId?: string; setorId?: string } = {}) {
  return useQuery({
    queryKey: [...equipmentKey, filters],
    queryFn: async () => (await apiClient.get<Equipment[]>('/equipamentos', { params: filters })).data,
  })
}

export function useEquipment(id: string) {
  return useQuery({
    queryKey: ['equipment', id],
    queryFn: async () => (await apiClient.get<Equipment>(`/equipamentos/${id}`)).data,
    enabled: Boolean(id),
  })
}

export function useEquipmentPhoto(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['equipment-photo', id],
    queryFn: async () => (await apiClient.get<{ url: string }>(`/equipamentos/${id}/foto-url`)).data.url,
    enabled: Boolean(id) && enabled,
    retry: false,
  })
}

export function useEquipmentWorkOrders(id: string) {
  return useQuery({
    queryKey: ['equipment-work-orders', id],
    queryFn: async () => (await apiClient.get<WorkOrderSummary[]>('/ordens-de-trabalho', { params: { equipamentoId: id } })).data,
    enabled: Boolean(id),
  })
}

export function useSaveEquipment() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: CreateEquipmentInput | UpdateEquipmentInput }) => {
      if (id) {
        const { setorId, codigo, ...editable } = data as CreateEquipmentInput
        void setorId
        void codigo
        return (await apiClient.put<Equipment>(`/equipamentos/${id}`, editable)).data
      }
      if (!('setorId' in data) || !('codigo' in data)) throw new Error('Setor e código são obrigatórios para criar o equipamento.')
      return (await apiClient.post<Equipment>('/equipamentos', data)).data
    },
    onSuccess: (equipment) => {
      void client.invalidateQueries({ queryKey: equipmentKey })
      void client.invalidateQueries({ queryKey: ['equipment', equipment.id] })
      void client.invalidateQueries({ queryKey: ['hospital-metrics'] })
    },
  })
}

export function useUploadEquipmentPhoto() {
  return useMutation({
    mutationFn: async (file: File) => {
      const { data } = await apiClient.post<SignedUploadUrl>('/equipamentos/foto-upload-url', { nomeArquivo: file.name })
      const response = await fetch(data.url, { method: 'PUT', body: file })
      if (!response.ok) throw new Error('Não foi possível enviar a foto para o armazenamento.')
      return data.chave
    },
  })
}
