import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const raiz = path.resolve(import.meta.dirname, '../../../..')
const ler = (arquivo: string) => readFileSync(path.join(raiz, arquivo), 'utf8')

describe('arquivos de SEO', () => {
  const html = ler('index.html')

  it('index.html tem lang, ícone, theme-color, Open Graph e Twitter Card neutros de produto', () => {
    expect(html).toContain('<html lang="pt-BR">')
    expect(html).toContain('rel="icon" type="image/svg+xml" href="/favicon.svg"')
    expect(html).toContain('name="theme-color"')
    for (const meta of ['og:title', 'og:description', 'og:type" content="website', 'og:locale" content="pt_BR', 'og:url', 'og:image']) {
      expect(html).toContain(`property="${meta}`)
    }
    expect(html).toContain('name="twitter:card" content="summary_large_image"')
    expect(html).toMatch(/og:image" content="__SITE_URL__\/og-landing\.png"/)
    expect(html).not.toMatch(/HEMM|HEEM/)
    expect(html).not.toContain('Painel de gestão operacional')
  })

  it('favicon e imagem OG existem; a imagem é PNG 1200x630', () => {
    expect(existsSync(path.join(raiz, 'public/favicon.svg'))).toBe(true)
    const png = readFileSync(path.join(raiz, 'public/og-landing.png'))
    expect(png.subarray(1, 4).toString()).toBe('PNG')
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1200, 630])
  })

  it('robots.txt libera landing e páginas legais e bloqueia as rotas autenticadas', () => {
    const robots = ler('public/robots.txt')
    for (const regra of ['Allow: /$', 'Allow: /privacidade', 'Allow: /termos', 'Disallow: /dashboard', 'Disallow: /tickets', 'Disallow: /work-orders', 'Disallow: /platform']) {
      expect(robots).toContain(regra)
    }
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m)
    expect(robots).not.toMatch(/^Disallow:\s*\/assets\s*$/m)
    expect(robots).not.toMatch(/^Disallow:\s*\/(privacidade|termos)/m)
  })

  it('a Vercel devolve index.html para as rotas da SPA (inclui /privacidade e /termos)', () => {
    const { rewrites } = JSON.parse(ler('vercel.json')) as { rewrites: { source: string; destination: string }[] }
    expect(rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' })
  })

  it('o sitemap só é gerado com VITE_SITE_URL e lista apenas as três rotas públicas', () => {
    const config = ler('vite.config.ts')
    expect(config).toContain("const rotasPublicas = ['/', '/privacidade', '/termos']")
    expect(config).toMatch(/if \(!siteUrl\) return/)
    expect(existsSync(path.join(raiz, 'public/sitemap.xml'))).toBe(false)
  })
})
