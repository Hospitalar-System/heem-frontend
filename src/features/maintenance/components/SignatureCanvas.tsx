import SignaturePad from 'signature_pad'
import { Eraser } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export interface SignatureCanvasHandle {
  isEmpty: () => boolean
  clear: () => void
  /** PNG com fundo transparente; nulo se nada foi desenhado. */
  toBlob: () => Promise<Blob | null>
}

/**
 * Área de desenho da assinatura (signature_pad). O fundo fica branco nos dois temas, como papel, e o traço escuro,
 * para a imagem sair igual no PDF. A tela se redimensiona com a largura do contêiner (390 px até desktop).
 */
export const SignatureCanvas = forwardRef<SignatureCanvasHandle, { label: string; onChange?: (empty: boolean) => void; disabled?: boolean }>(
  function SignatureCanvas({ label, onChange, disabled = false }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const padRef = useRef<SignaturePad | null>(null)
    const changeRef = useRef(onChange)
    changeRef.current = onChange
    const [empty, setEmpty] = useState(true)

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const pad = new SignaturePad(canvas, { penColor: '#0f172a', minWidth: 0.8, maxWidth: 2.4 })
      padRef.current = pad
      const update = () => { const next = pad.isEmpty(); setEmpty(next); changeRef.current?.(next) }
      pad.addEventListener('endStroke', update)
      const resize = () => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1)
        const data = pad.toData()
        canvas.width = canvas.offsetWidth * ratio
        canvas.height = canvas.offsetHeight * ratio
        canvas.getContext('2d')?.scale(ratio, ratio)
        pad.clear()
        pad.fromData(data)
      }
      resize()
      const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
      observer?.observe(canvas)
      return () => { observer?.disconnect(); pad.removeEventListener('endStroke', update); pad.off(); padRef.current = null }
    }, [])

    useEffect(() => {
      const pad = padRef.current
      if (!pad) return
      if (disabled) pad.off()
      else pad.on()
    }, [disabled])

    function clear() {
      padRef.current?.clear()
      setEmpty(true)
      changeRef.current?.(true)
    }

    useImperativeHandle(ref, () => ({
      isEmpty: () => padRef.current?.isEmpty() ?? true,
      clear,
      toBlob: async () => {
        const pad = padRef.current
        if (!pad || pad.isEmpty()) return null
        const response = await fetch(pad.toDataURL('image/png'))
        return response.blob()
      },
    }))

    return <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-text-secondary">{label}</span>
        <button type="button" onClick={clear} disabled={disabled || empty} className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-text-secondary hover:bg-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"><Eraser aria-hidden="true" size={14} />Limpar</button>
      </div>
      <div className="relative overflow-hidden rounded-md border border-border bg-white">
        <canvas ref={canvasRef} role="img" aria-label={`${label}: área para desenhar com o mouse, a caneta ou o dedo`} className="block h-44 w-full touch-none cursor-crosshair" />
        <span aria-hidden="true" className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-slate-300" />
        {empty && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] text-slate-500">Assine acima da linha</span>}
      </div>
    </div>
  },
)
