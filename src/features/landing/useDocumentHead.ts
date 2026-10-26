import { useEffect } from 'react'

/** URL pública do site (sem barra final). Vazia = URLs relativas. Definida por VITE_SITE_URL no build. */
export const SITE_URL: string = String(import.meta.env.VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')

/** Imagem de compartilhamento PROVISÓRIA (ver assets/README.md). */
export const IMAGEM_OG = '/og-landing.png'

export interface DocumentHeadOptions {
  title: string
  description: string
  /** Caminho da rota (ex.: `/privacidade`); vira `og:url` e o canonical, prefixado por VITE_SITE_URL. */
  path: string
  /** Caminho da imagem OG; padrão: IMAGEM_OG. */
  image?: string
}

type Restore = () => void

function setMeta(attr: 'name' | 'property', key: string, content: string): Restore {
  const existing = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  const el = existing ?? document.createElement('meta')
  if (!existing) {
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  const previous = el.getAttribute('content')
  el.setAttribute('content', content)
  return () => {
    if (!existing) el.remove()
    else if (previous === null) el.removeAttribute('content')
    else el.setAttribute('content', previous)
  }
}

function setCanonical(href: string): Restore {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  const el = existing ?? document.createElement('link')
  if (!existing) {
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  const previous = el.getAttribute('href')
  el.setAttribute('href', href)
  return () => {
    if (!existing) el.remove()
    else if (previous === null) el.removeAttribute('href')
    else el.setAttribute('href', previous)
  }
}

/**
 * Define título e metas (description, Open Graph, Twitter Card) da rota no cliente, já que a SPA não tem
 * renderização no servidor, e restaura os valores anteriores ao desmontar para não vazar a landing no resto do sistema.
 */
export function useDocumentHead({ title, description, path, image = IMAGEM_OG }: DocumentHeadOptions) {
  useEffect(() => {
    const url = `${SITE_URL}${path}`
    const imagem = `${SITE_URL}${image}`
    const previousTitle = document.title
    document.title = title
    const restores: Restore[] = [
      setMeta('name', 'description', description),
      setMeta('property', 'og:type', 'website'),
      setMeta('property', 'og:locale', 'pt_BR'),
      setMeta('property', 'og:title', title),
      setMeta('property', 'og:description', description),
      setMeta('property', 'og:url', url),
      setMeta('property', 'og:image', imagem),
      setMeta('name', 'twitter:card', 'summary_large_image'),
      setMeta('name', 'twitter:title', title),
      setMeta('name', 'twitter:description', description),
      setMeta('name', 'twitter:image', imagem),
    ]
    if (SITE_URL) restores.push(setCanonical(url))
    return () => {
      document.title = previousTitle
      for (const restore of restores.reverse()) restore()
    }
  }, [title, description, path, image])
}
