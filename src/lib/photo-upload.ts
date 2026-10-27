import axios from 'axios'
import type { PreparedPhoto, PhotoType } from '@/lib/image-resize'

export interface SignedPut { url: string; chave: string; expiraEm: string; contentType: string }
export interface PhotoUploadUrls { original: SignedPut; miniatura: SignedPut }
export interface PhotoKeys { chaveOriginal: string; chaveMiniatura: string }

/**
 * Pede as URLs assinadas, envia original e miniatura por PUT em axios limpo (sem Authorization, com o mesmo
 * Content-Type pedido, que é assinado) e devolve as chaves para a confirmação. URLs `demo://` são puladas.
 */
export async function uploadPreparedPhoto(requestUrls: (body: { tipoOriginal: PhotoType; tipoMiniatura: PhotoType }) => Promise<PhotoUploadUrls>, photo: PreparedPhoto): Promise<PhotoKeys> {
  const urls = await requestUrls({ tipoOriginal: photo.tipo, tipoMiniatura: photo.tipo })
  const put = async (target: SignedPut, blob: Blob) => {
    if (target.url.startsWith('demo://')) return
    await axios.put(target.url, blob, { headers: { 'Content-Type': photo.tipo } })
  }
  await Promise.all([put(urls.original, photo.original), put(urls.miniatura, photo.miniatura)])
  return { chaveOriginal: urls.original.chave, chaveMiniatura: urls.miniatura.chave }
}

const messages: Record<string, string> = {
  FOTO_INVALIDA: 'A foto não foi aceita. Use JPEG, PNG ou WebP e tente enviar novamente.',
  LIMITE_FOTOS_OT: 'Esta OT já tem 5 fotos. Remova uma para anexar outra.',
  OT_NAO_PREVENTIVA: 'Somente OTs preventivas aceitam fotos.',
  OT_STATUS_NAO_PERMITE_FOTO: 'Fotos só podem ser anexadas ou removidas com a OT em execução ou concluída.',
}

/** Mensagem pt-BR para erros de foto (PhotoError local, `code` do backend ou falha de rede/armazenamento). */
export function getPhotoErrorMessage(error: unknown): string {
  if (error instanceof Error && error.name === 'PhotoError') return error.message
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { status?: number; data?: { code?: string } } }).response
    const code = response?.data?.code
    if (code && messages[code]) return messages[code]
    if (response?.status === 403) return 'Seu perfil não pode alterar fotos.'
    if (response?.status === 404) return 'Não encontramos este registro. Atualize a página e tente novamente.'
  }
  return 'Não foi possível enviar a foto. Verifique a conexão e tente novamente.'
}
