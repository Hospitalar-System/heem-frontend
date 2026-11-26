import axios from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { campaignsKey } from './preventive-campaigns'
import { ticketsKey } from './tickets'
import { workOrdersKey } from './work-orders'
import type { CampaignFinalization, SignatureRole, SignatureTarget } from '../types/signatures'

/** Limite do backend (Story 22.1): PNG até 200 KB. */
export const MAX_SIGNATURE_BYTES = 200 * 1024

interface SignatureUploadUrl { url: string; chave: string; expiraEm: string }

export interface RegisterSignatureInput {
  papel: SignatureRole
  imagem: Blob
  /** UUID gerado uma vez por assinatura: o reenvio com o mesmo valor não duplica (idempotente no backend). */
  clientId: string
  assinadoEm: string
  nome?: string
  cargo?: string
}

export class SignatureImageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SignatureImageError'
  }
}

export function newClientId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // Navegadores sem randomUUID (contexto não seguro): UUID v4 a partir de getRandomValues.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function targetKeys(target: SignatureTarget) {
  if (target.tipo === 'ot') return [workOrdersKey]
  if (target.tipo === 'chamado') return [ticketsKey]
  return [campaignsKey]
}

/**
 * Story 22.1: envia a imagem pela URL assinada (PUT em axios limpo, sem Authorization, Content-Type image/png) e
 * registra a assinatura. URLs `demo://` são puladas no modo demonstração.
 */
export function useRegisterSignature(target: SignatureTarget) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (input: RegisterSignatureInput) => {
      if (input.imagem.size > MAX_SIGNATURE_BYTES) throw new SignatureImageError('A imagem da assinatura ficou grande demais. Limpe e assine de novo, com traços mais simples.')
      const upload = (await apiClient.post<SignatureUploadUrl>('/assinaturas/upload-url')).data
      if (!upload.url.startsWith('demo://')) await axios.put(upload.url, input.imagem, { headers: { 'Content-Type': 'image/png' } })
      return (await apiClient.post('/assinaturas', {
        alvoTipo: target.tipo,
        alvoId: target.id,
        papel: input.papel,
        clientId: input.clientId,
        assinadoEm: input.assinadoEm,
        chaveArquivo: upload.chave,
        ...(input.papel === 'responsavel_hospital' ? { nome: input.nome?.trim(), cargo: input.cargo?.trim() } : {}),
        dispositivo: 'Painel web',
      })).data
    },
    onSuccess: () => Promise.all(targetKeys(target).map((queryKey) => client.invalidateQueries({ queryKey }))),
  })
}

const finalizationsKey = (campaignId: string) => [...campaignsKey, 'finalizations', campaignId] as const

/** Story 22.3: finalizações da campanha (o painel web só lista, para o Admin). */
export function useCampaignFinalizations(campaignId: string, enabled: boolean) {
  return useQuery({
    queryKey: [...finalizationsKey(campaignId), 'list'],
    queryFn: async () => (await apiClient.get<CampaignFinalization[]>(`/campanhas-preventivas/${campaignId}/finalizacoes`)).data,
    enabled: Boolean(campaignId) && enabled,
    retry: false,
  })
}

const signatureErrorMessages: Record<string, string> = {
  ASSINATURA_INVALIDA: 'A assinatura não foi aceita. Confira o nome e o cargo do responsável e assine de novo.',
  ALVO_INVALIDO: 'Este registro não aceita assinatura.',
  PAPEL_INVALIDO: 'Papel de assinatura inválido.',
  ALVO_NAO_FINALIZADO: 'Só é possível assinar depois de concluir a OT ou resolver o chamado.',
  ASSINATURA_TECNICO_AUSENTE: 'O técnico precisa assinar antes do responsável do hospital.',
  CLIENT_ID_EM_USO: 'Não foi possível registrar esta assinatura. Feche e assine de novo.',
}

/** Mensagem pt-BR para erros de assinatura (code do ProblemDetail, status ou falha de rede). */
export function signatureErrorMessage(error: unknown) {
  if (error instanceof SignatureImageError) return error.message
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { code?: string } } }).response
    const code = response?.data?.code
    if (code && signatureErrorMessages[code]) return signatureErrorMessages[code]
    if (response?.status === 403) return 'Seu perfil não pode registrar assinaturas.'
    if (response?.status === 404) return 'Registro não encontrado ou fora dos seus hospitais.'
  }
  return 'Não foi possível enviar a assinatura. Verifique a conexão e tente novamente; o desenho foi mantido.'
}
