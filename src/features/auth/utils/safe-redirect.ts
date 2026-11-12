const BACKSLASH = String.fromCharCode(92)

function hasControlChar(value: string) {
  for (const char of value) {
    const code = char.charCodeAt(0)
    if (code <= 0x1f || code === 0x7f) return true
  }
  return false
}

/**
 * Aceita só caminho interno do app (ex.: "/assets/123?aba=docs"). Recusa URL externa, "//host",
 * barra invertida, esquemas (javascript:, https:) e caracteres de controle, para evitar open redirect.
 */
export function safeInternalPath(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (!value.startsWith('/') || value.startsWith('//')) return null
  if (value.includes(BACKSLASH) || hasControlChar(value)) return null
  const path = value.split(/[?#]/)[0]
  if (path === '/login' || path === '/esqueci-senha' || path === '/redefinir-senha') return null
  return value
}
