import { useCallback, useMemo, useState } from 'react'

export interface ToggleableColumn {
  key: string
  label: string
  /** Colunas essenciais (código/nome, ações) ficam sempre visíveis e não aparecem no menu. */
  essential?: boolean
  /** Escondida até a pessoa ligar. */
  defaultHidden?: boolean
}

const PREFIX = 'heem:colunas:'

function readHidden(storageKey: string): string[] | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + storageKey)
    if (raw === null) return null
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.every((item) => typeof item === 'string') ? parsed : null
  } catch {
    return null
  }
}

function writeHidden(storageKey: string, hidden: string[] | null) {
  try {
    if (hidden === null) window.localStorage.removeItem(PREFIX + storageKey)
    else window.localStorage.setItem(PREFIX + storageKey, JSON.stringify(hidden))
  } catch {
    // sem armazenamento (modo privado, bloqueado): a escolha vale só nesta sessão da tela
  }
}

/** Colunas escondidas da tabela; a escolha é lembrada por `storageKey` no navegador (e funciona sem ele). */
export function useColumnVisibility(storageKey: string | undefined, columns: ToggleableColumn[]) {
  const defaults = useMemo(() => columns.filter((column) => column.defaultHidden && !column.essential).map((column) => column.key), [columns])
  const [stored, setStored] = useState<string[] | null>(() => (storageKey ? readHidden(storageKey) : null))
  const known = useMemo(() => new Set(columns.filter((column) => !column.essential).map((column) => column.key)), [columns])
  // chaves desconhecidas (coluna removida em versão nova) e essenciais nunca escondem nada
  const hidden = useMemo(() => new Set((stored ?? defaults).filter((key) => known.has(key))), [stored, defaults, known])

  const toggle = useCallback((key: string) => {
    setStored((current) => {
      const base = new Set((current ?? defaults).filter((item) => known.has(item)))
      if (base.has(key)) base.delete(key)
      else base.add(key)
      const next = [...base]
      if (storageKey) writeHidden(storageKey, next)
      return next
    })
  }, [defaults, known, storageKey])

  const reset = useCallback(() => {
    if (storageKey) writeHidden(storageKey, null)
    setStored(null)
  }, [storageKey])

  const isDefault = stored === null || (stored.length === defaults.length && defaults.every((key) => stored.includes(key)))
  return { hidden, toggle, reset, isDefault }
}
