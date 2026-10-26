import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Interesse } from '../content/vitrine'
import { interesseParaBackend } from '../schemas/lead-schema'
import { focusRing } from './button-classes'
import { FormularioLead } from './FormularioLead'

interface DialogoAgendarProps {
  interesse?: Interesse
  onFechar: () => void
}

const FOCAVEIS = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'

/** Diálogo "Quero conhecer o HEEM". Montado só quando aberto: ao fechar, tudo (campos e mensagens) é descartado. */
export function DialogoAgendar({ interesse, onFechar }: DialogoAgendarProps) {
  const dialogo = useRef<HTMLDivElement>(null)
  const [enviando, setEnviando] = useState(false)
  const bloqueado = useRef(false)
  const fechar = useRef(onFechar)
  bloqueado.current = enviando
  fechar.current = onFechar

  useEffect(() => {
    const origem = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const overflowAnterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogo.current?.querySelector<HTMLElement>('input, select')?.focus()

    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        if (!bloqueado.current) fechar.current()
        return
      }
      if (evento.key !== 'Tab') return
      const itens = dialogo.current?.querySelectorAll<HTMLElement>(FOCAVEIS)
      if (!itens?.length) return
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      const dentro = dialogo.current?.contains(document.activeElement)
      if (evento.shiftKey && (document.activeElement === primeiro || !dentro)) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && (document.activeElement === ultimo || !dentro)) {
        evento.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      document.body.style.overflow = overflowAnterior
      origem?.focus()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/55 p-3 backdrop-blur-sm"
      onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !enviando) onFechar() }}
    >
      <div className="grid min-h-full place-items-center" onMouseDown={(evento) => { if (evento.target === evento.currentTarget && !enviando) onFechar() }}>
        <div
          ref={dialogo}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dlg-agendar-titulo"
          aria-describedby="dlg-agendar-lede"
          className="relative w-full max-w-[520px] rounded-[28px] border border-border bg-surface px-5 pb-6 pt-8 text-text-primary shadow-[0_40px_100px_var(--shadow)] sm:px-8 sm:pb-8 sm:pt-9"
        >
          <button
            type="button"
            aria-label="Fechar"
            disabled={enviando}
            onClick={onFechar}
            className={`absolute right-3 top-3 grid size-11 place-items-center rounded-full bg-[var(--surface-hi)] text-text-secondary hover:text-text-primary disabled:opacity-50 ${focusRing}`}
          >
            <X className="size-5" aria-hidden="true" />
          </button>
          <h2 id="dlg-agendar-titulo" className="mb-2 pr-10 text-[28px] font-bold leading-[1.12] tracking-[-0.03em]">Quero conhecer o HEEM</h2>
          <p id="dlg-agendar-lede" className="mb-6 text-[15.5px] text-text-secondary">Deixe seus dados e entramos em contato para mostrar o sistema na prática.</p>
          <FormularioLead interesseInicial={interesse ? interesseParaBackend[interesse] : undefined} onConcluir={onFechar} onEnviando={setEnviando} />
        </div>
      </div>
    </div>
  )
}
