import { useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { z } from 'zod'
import { apiClient } from '@/lib/axios'
import type { BatchImportType } from '../types'

/** Estados devolvidos pelo backend (Story 11.1). `pendente` e `processando` ainda estão em andamento. */
export const importStatusValues = ['pendente', 'processando', 'concluido', 'falhou'] as const
export type ImportStatus = (typeof importStatusValues)[number]

const importRowErrorSchema = z.object({
  linha: z.number(),
  codigo: z.string().nullish(),
  code: z.string(),
  mensagem: z.string().nullish(),
})

export const importResultSchema = z.object({
  id: z.string(),
  tipo: z.string(),
  status: z.enum(importStatusValues),
  total: z.number(),
  processadas: z.number(),
  criados: z.number(),
  ignorados: z.number(),
  comErro: z.number(),
  erros: z.array(importRowErrorSchema).default([]),
  errosTruncados: z.boolean().default(false),
  criadoEm: z.string().nullish(),
  concluidoEm: z.string().nullish(),
})

export type ImportResult = z.infer<typeof importResultSchema>
export type ImportRowError = z.infer<typeof importRowErrorSchema>

export function isImportInProgress(status: ImportStatus | undefined) {
  return status === 'pendente' || status === 'processando'
}

interface SubmitImportInput {
  tipo: BatchImportType
  arquivo: File
  onUploadProgress?: (percent: number) => void
}

/** POST /importacoes: multipart com os campos `tipo` e `arquivo` (o navegador define o boundary). */
export function useSubmitImport() {
  return useMutation({
    mutationFn: async ({ tipo, arquivo, onUploadProgress }: SubmitImportInput) => {
      const form = new FormData()
      form.append('tipo', tipo)
      form.append('arquivo', arquivo, arquivo.name)
      const { data } = await apiClient.post<unknown>('/importacoes', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (event) => {
          if (event.total) onUploadProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)))
        },
      })
      return importResultSchema.parse(data)
    },
  })
}

const POLL_START_MS = 2000
const POLL_MAX_MS = 5000

/** Intervalo do polling: ~2 s, crescendo devagar até o teto de 5 s. */
export function pollInterval(updateCount: number) {
  return Math.min(POLL_START_MS + updateCount * 500, POLL_MAX_MS)
}

/** GET /importacoes/{id} com polling enquanto o lote estiver em andamento (pára em concluído/falhou). */
export function useImportStatus(id: string | null, initial?: ImportResult) {
  return useQuery({
    queryKey: ['import-status', id],
    queryFn: async () => importResultSchema.parse((await apiClient.get<unknown>(`/importacoes/${id}`)).data),
    enabled: Boolean(id),
    initialData: initial,
    staleTime: POLL_START_MS,
    retry: false,
    refetchOnWindowFocus: false,
    refetchInterval: (query) => {
      if (!isImportInProgress(query.state.data?.status)) return false
      const status = axios.isAxiosError(query.state.error) ? query.state.error.response?.status : undefined
      if (status && status >= 400 && status < 500) return false
      return pollInterval(query.state.dataUpdateCount)
    },
  })
}

const requestCodeMessages: Record<string, string> = {
  ARQUIVO_VAZIO: 'O arquivo está vazio. Preencha o modelo e selecione-o novamente.',
  CSV_INVALIDO: 'O arquivo CSV está malformado (aspas sem fechamento). Corrija e envie novamente.',
  IMPORTACAO_LINHAS_EXCEDIDAS: 'O arquivo excede o limite de linhas por importação. Divida-o em arquivos menores.',
  TIPO_IMPORTACAO_INVALIDO: 'Tipo de importação inválido. Escolha equipamentos, setores ou usuários.',
  ARQUIVO_MUITO_GRANDE: 'O arquivo excede o tamanho máximo permitido. Divida-o em arquivos menores.',
}

/** Mensagem pt-BR para falhas de envio/consulta. Nunca ecoa conteúdo do arquivo. */
export function getImportRequestErrorMessage(error: unknown): string {
  if (error instanceof z.ZodError) return 'Resposta inesperada do servidor. Tente novamente em instantes.'
  if (!axios.isAxiosError(error)) return 'Não foi possível concluir a operação. Tente novamente.'
  if (!error.response) return 'Sem conexão com o servidor. Verifique sua rede e tente novamente; o arquivo continua selecionado.'
  const { status, data } = error.response
  const body = (data ?? {}) as { code?: string; detail?: string }
  if (status === 400 && body.code === 'CABECALHO_INVALIDO') {
    return `${batchImportHeaderMessage} ${body.detail ?? ''}`.trim()
  }
  if (body.code && requestCodeMessages[body.code]) return requestCodeMessages[body.code]
  if (status === 400) return 'O arquivo não foi aceito. Confira o modelo e tente novamente.'
  if (status === 401) return 'Sua sessão expirou. Entre novamente para continuar.'
  if (status === 403) return 'Você não tem permissão para importar dados. Apenas administradores do cliente podem usar esta função.'
  if (status === 404) return 'Importação não encontrada.'
  if (status === 413) return requestCodeMessages.ARQUIVO_MUITO_GRANDE
  if (status === 429) return 'Muitas requisições em pouco tempo. Aguarde um instante e tente novamente.'
  if (status >= 500) return 'O servidor está indisponível no momento. Tente novamente em instantes; o arquivo continua selecionado.'
  return 'Não foi possível concluir a operação. Tente novamente.'
}

const batchImportHeaderMessage = 'O cabeçalho do arquivo não bate com o modelo.'
