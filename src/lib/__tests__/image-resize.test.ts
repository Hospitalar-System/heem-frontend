import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PHOTO_LIMITS, PhotoError, prepareImage, validateImageFile } from '../image-resize'

interface Draw { width: number; height: number; type: string; quality: number | undefined }

let draws: Draw[]
let drawnSources: unknown[]
let blobSize: (draw: Draw) => number

function stubCanvas() {
  draws = []
  drawnSources = []
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (this: HTMLCanvasElement) {
    return { fillRect: vi.fn(), drawImage: (source: unknown) => { drawnSources.push(source) }, fillStyle: '' } as unknown as CanvasRenderingContext2D
  } as never)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (this: HTMLCanvasElement, callback: BlobCallback, type?: string, quality?: unknown) {
    const draw = { width: this.width, height: this.height, type: type ?? '', quality: quality as number | undefined }
    draws.push(draw)
    callback(new Blob([new Uint8Array(blobSize(draw))], { type: draw.type }))
  } as never)
}

function stubBitmap(width: number, height: number) {
  vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width, height, close: vi.fn() })))
}

const file = (type = 'image/jpeg', size = 4) => new File([new Uint8Array(size)], 'foto.jpg', { type })

describe('prepareImage', () => {
  beforeEach(() => { blobSize = () => 1000; stubCanvas(); stubBitmap(4000, 3000) })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it('reduces the original to 1600 px and the thumbnail to 320 px keeping the aspect ratio', async () => {
    const result = await prepareImage(file())
    expect(draws[0]).toMatchObject({ width: 1600, height: 1200, type: 'image/jpeg' })
    expect(draws[1]).toMatchObject({ width: 320, height: 240, type: 'image/jpeg' })
    expect(result.tipo).toBe('image/jpeg')
  })

  it('never upscales small images and handles portrait orientation', async () => {
    stubBitmap(200, 100)
    await prepareImage(file())
    expect(draws[0]).toMatchObject({ width: 200, height: 100 })
    stubBitmap(1000, 3000)
    await prepareImage(file())
    expect(draws[2]).toMatchObject({ width: 533, height: 1600 })
  })

  it('outputs blobs rendered by the canvas, never the original file (EXIF/GPS dropped)', async () => {
    const input = file('image/jpeg', 99)
    const result = await prepareImage(input)
    expect(result.original).not.toBe(input)
    expect(result.miniatura).not.toBe(input)
    expect(result.original.size).toBe(1000)
    expect(result.original).toBeInstanceOf(Blob)
    expect(drawnSources.length).toBe(2)
    expect(createImageBitmap).toHaveBeenCalledWith(input, { imageOrientation: 'from-image' })
  })

  it('keeps png and webp types and accepts only jpeg, png and webp', async () => {
    expect((await prepareImage(file('image/png'))).tipo).toBe('image/png')
    expect((await prepareImage(file('image/webp'))).tipo).toBe('image/webp')
    await expect(prepareImage(file('image/gif'))).rejects.toThrow('Formato não suportado')
    await expect(prepareImage(file('application/pdf'))).rejects.toBeInstanceOf(PhotoError)
    expect(() => validateImageFile(file('image/heic'))).toThrow(PhotoError)
  })

  it('lowers quality and then dimensions until original <= 5 MB and thumbnail <= 200 KB', async () => {
    blobSize = (draw) => Math.round(draw.width * draw.height * (draw.quality ?? 1) * 4)
    const result = await prepareImage(file())
    expect(result.original.size).toBeLessThanOrEqual(PHOTO_LIMITS.originalMaxBytes)
    expect(result.miniatura.size).toBeLessThanOrEqual(PHOTO_LIMITS.thumbMaxBytes)
    expect(draws.length).toBeGreaterThan(2)
  })

  it('fails with a clear message when the limit cannot be reached', async () => {
    blobSize = () => PHOTO_LIMITS.originalMaxBytes + 1
    await expect(prepareImage(file())).rejects.toThrow('Não foi possível reduzir a imagem')
  })

  it('fails with a clear message for corrupted images', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('decode') }))
    await expect(prepareImage(file())).rejects.toThrow('Não foi possível ler a imagem')
  })
})
