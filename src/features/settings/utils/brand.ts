import { HEX_COLOR } from '../schemas/company.schema'

export const isValidHex = (value: string) => HEX_COLOR.test(value.trim())

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrastRatio(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** Melhor cor de texto (branco ou quase preto) sobre a cor da marca e o contraste obtido (WCAG). */
export function readableTextOn(hex: string) {
  const white = contrastRatio(hex, '#FFFFFF')
  const dark = contrastRatio(hex, '#111111')
  return white >= dark ? { color: '#FFFFFF', ratio: white } : { color: '#111111', ratio: dark }
}
