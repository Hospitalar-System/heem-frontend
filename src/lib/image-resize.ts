/**
 * Prepara fotos para envio: reduz e re-codifica via canvas. Como a saída vem sempre do canvas, EXIF/GPS e demais
 * metadados do arquivo original nunca são repassados. O arquivo original do usuário não é enviado nem guardado.
 */
export type PhotoType = 'image/jpeg' | 'image/png' | 'image/webp'

export const ACCEPTED_PHOTO_TYPES: readonly PhotoType[] = ['image/jpeg', 'image/png', 'image/webp']
export const PHOTO_LIMITS = {
  originalMaxSide: 1600,
  thumbMaxSide: 320,
  originalMaxBytes: 5 * 1024 * 1024,
  thumbMaxBytes: 200 * 1024,
  /** Arquivo de entrada acima disso nem é decodificado (proteção de memória). */
  inputMaxBytes: 30 * 1024 * 1024,
} as const

export interface PreparedPhoto {
  original: Blob
  miniatura: Blob
  tipo: PhotoType
}

export class PhotoError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PhotoError'
  }
}

export const photoAcceptAttr = ACCEPTED_PHOTO_TYPES.join(',')

/** Validação rápida (tipo e tamanho de entrada), usada já na seleção do arquivo. */
export function validateImageFile(file: File): void {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type as PhotoType)) throw new PhotoError('Formato não suportado. Use uma imagem JPEG, PNG ou WebP.')
  if (file.size > PHOTO_LIMITS.inputMaxBytes) throw new PhotoError('A imagem é grande demais. Escolha um arquivo de até 30 MB.')
}

export async function prepareImage(file: File): Promise<PreparedPhoto> {
  validateImageFile(file)
  const tipo = file.type as PhotoType
  const bitmap = await decode(file)
  try {
    if (!bitmap.width || !bitmap.height) throw new PhotoError('Não foi possível ler a imagem. O arquivo pode estar corrompido.')
    const original = await encode(bitmap, tipo, PHOTO_LIMITS.originalMaxSide, PHOTO_LIMITS.originalMaxBytes)
    const miniatura = await encode(bitmap, tipo, PHOTO_LIMITS.thumbMaxSide, PHOTO_LIMITS.thumbMaxBytes)
    return { original, miniatura, tipo }
  } finally {
    bitmap.close?.()
  }
}

type Decoded = { width: number; height: number; close?: () => void }

async function decode(file: File): Promise<Decoded> {
  try {
    if (typeof createImageBitmap === 'function') {
      // 'from-image' aplica a orientação EXIF aos pixels antes de descartarmos os metadados.
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    }
    return await decodeWithImageElement(file)
  } catch {
    throw new PhotoError('Não foi possível ler a imagem. O arquivo pode estar corrompido.')
  }
}

function decodeWithImageElement(file: File): Promise<Decoded> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => { URL.revokeObjectURL(url); resolve(Object.assign(image, { close: undefined })) }
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode')) }
    image.src = url
  })
}

function fit(width: number, height: number, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

async function encode(source: Decoded, tipo: PhotoType, maxSide: number, maxBytes: number): Promise<Blob> {
  let side = maxSide
  let quality = 0.85
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const size = fit(source.width, source.height, side)
    const blob = await render(source, size.width, size.height, tipo, quality)
    if (blob.size <= maxBytes) return blob
    quality = Math.max(0.4, quality - 0.15)
    // PNG não usa qualidade; nos demais, só reduz dimensão depois de esgotar a qualidade.
    if (tipo === 'image/png' || quality <= 0.4) side = Math.round(side * 0.8)
  }
  throw new PhotoError('Não foi possível reduzir a imagem ao tamanho permitido. Escolha uma foto menor.')
}

function render(source: Decoded, width: number, height: number, tipo: PhotoType, quality: number): Promise<Blob> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) return Promise.reject(new PhotoError('Seu navegador não consegue processar imagens.'))
  if (tipo === 'image/jpeg') { context.fillStyle = '#ffffff'; context.fillRect(0, 0, width, height) }
  context.drawImage(source as CanvasImageSource, 0, 0, width, height)
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new PhotoError('Não foi possível processar a imagem.'))), tipo, quality)
  })
}
