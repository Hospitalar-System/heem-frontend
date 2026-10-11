import { useQuery } from '@tanstack/react-query'
import { useSyncExternalStore } from 'react'
import { getAuthState, subscribeAuthState } from '@/features/auth/session'
import { apiClient } from '@/lib/axios'
import type { EquipamentoResumo, Hospital, HospitalMetrics, OrdemResumo, Setor } from '../types'

const pageSize = 200

export function useHospitalMetrics(hospitals: Hospital[]) {
  const auth = useSyncExternalStore(subscribeAuthState, getAuthState, getAuthState)
  const canSeeTenantOrders = auth.user?.roles.includes('admin_cliente') ?? false
  const ids = hospitals.map(({ id }) => id).sort()
  return useQuery({
    queryKey: ['hospital-metrics', ids, canSeeTenantOrders],
    enabled: ids.length > 0,
    staleTime: 30_000,
    queryFn: async () => {
      const perHospital = await Promise.all(hospitals.map(async (hospital) => {
        const [sectors, equipment] = await Promise.all([
          apiClient.get<Setor[]>(`/hospitais/${hospital.id}/setores`),
          apiClient.get<EquipamentoResumo[]>('/equipamentos', { params: { hospitalId: hospital.id } }),
        ])
        return { hospitalId: hospital.id, setores: sectors.data.length, equipamentos: equipment.data.length, equipamentosLista: equipment.data }
      }))

      const hospitalByEquipment = new Map(perHospital.flatMap(({ hospitalId, equipamentosLista }) => equipamentosLista.map(({ id }) => [id, hospitalId] as const)))
      const counts = new Map<string, number>(perHospital.map(({ hospitalId }) => [hospitalId, 0]))
      let ordersAvailable = canSeeTenantOrders

      if (canSeeTenantOrders) {
        try {
          const orders = await Promise.all([fetchAllOrders('AGENDADA'), fetchAllOrders('EM_EXECUCAO')])
          const now = Date.now()
          for (const order of orders.flat()) {
            const hospitalId = hospitalByEquipment.get(order.equipamentoId)
            if (hospitalId && Date.parse(order.dataAgendada) <= now) counts.set(hospitalId, (counts.get(hospitalId) ?? 0) + 1)
          }
        } catch {
          ordersAvailable = false
        }
      }

      return Object.fromEntries(perHospital.map(({ hospitalId, setores, equipamentos }) => [hospitalId, {
        setores,
        equipamentos,
        ordensDevidas: ordersAvailable ? counts.get(hospitalId) ?? 0 : null,
      } satisfies HospitalMetrics])) as Record<string, HospitalMetrics>
    },
  })
}

async function fetchAllOrders(status: 'AGENDADA' | 'EM_EXECUCAO') {
  const first = await apiClient.get<OrdemResumo[]>('/ordens-de-trabalho', { params: { status, pagina: 0, tamanho: pageSize } })
  const orders = [...first.data]
  const total = Number(first.headers['x-total-count'])
  if (!Number.isFinite(total)) return orders

  const pageCount = Math.ceil(total / pageSize)
  for (let pagina = 1; pagina < pageCount; pagina += 1) {
    const next = await apiClient.get<OrdemResumo[]>('/ordens-de-trabalho', { params: { status, pagina, tamanho: pageSize } })
    orders.push(...next.data)
  }
  return orders
}
