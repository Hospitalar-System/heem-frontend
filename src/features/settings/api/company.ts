import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { apiClient } from '@/lib/axios'
import type { CompanyProfile, CompanyProfileInput, LogoUploadUrl } from '../types/company'

export const LOGO_MAX_BYTES = 2 * 1024 * 1024
export const LOGO_TYPES = ['image/png', 'image/jpeg'] as const
const key = ['company-profile'] as const

export function useCompanyProfile() {
  return useQuery({ queryKey: key, queryFn: async () => (await apiClient.get<CompanyProfile>('/prestadora')).data })
}

function useCompanyMutation<TVars>(fn: (vars: TVars) => Promise<CompanyProfile | undefined>) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: (profile) => { if (profile) client.setQueryData(key, profile); else void client.invalidateQueries({ queryKey: key }) },
  })
}

export const useSaveCompanyProfile = () => useCompanyMutation(async (data: CompanyProfileInput) => (await apiClient.put<CompanyProfile>('/prestadora', data)).data)
/** `null` volta à cor padrão. Funciona antes do cadastro completo. */
export const useSaveBrandColor = () => useCompanyMutation(async (corMarca: string | null) => (await apiClient.put<CompanyProfile>('/prestadora/marca', { corMarca })).data)
export const useDeleteCompanyLogo = () => useCompanyMutation(async () => { await apiClient.delete('/prestadora/logo'); return undefined })

/** Upload em 3 passos: URL assinada, PUT do arquivo (axios limpo, sem Authorization) e confirmação da chave. */
export const useSetCompanyLogo = () => useCompanyMutation(async (file: File) => {
  const { chave, uploadUrl } = (await apiClient.post<LogoUploadUrl>('/prestadora/logo/upload-url', { contentType: file.type })).data
  if (!uploadUrl.startsWith('demo://')) await axios.put(uploadUrl, file, { headers: { 'Content-Type': file.type } })
  return (await apiClient.put<CompanyProfile>('/prestadora/logo', { chave })).data
})

const messages: Record<string, string> = {
  VALIDACAO_FALHOU: 'Os dados não foram aceitos. Revise os campos e tente novamente.',
  ACESSO_NEGADO: 'Seu perfil não pode alterar o perfil da empresa.',
}

/** Mensagem pt-BR por `code` do backend (ou status), com fallback. */
export function getCompanyErrorMessage(error: unknown, fallback: string): string {
  const response = typeof error === 'object' && error !== null && 'response' in error ? (error as { response?: { status?: number; data?: { code?: string } } }).response : undefined
  const code = response?.data?.code
  if (code && messages[code]) return messages[code]
  if (response?.status === 403) return messages.ACESSO_NEGADO
  return fallback
}
