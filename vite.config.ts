import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv, type Plugin, type UserConfig } from 'vite'

/** Rotas públicas indexáveis (landing e páginas legais). */
const rotasPublicas = ['/', '/privacidade', '/termos']

/**
 * SEO sem renderização no servidor (Story L4): troca __SITE_URL__ no index.html por VITE_SITE_URL (sem barra final;
 * vazio = URLs relativas) e, só quando ela existe, emite sitemap.xml (URLs relativas não são válidas em sitemap).
 */
function siteUrlPlugin(): Plugin {
  let siteUrl = ''
  return {
    name: 'heem-site-url',
    config(_, { mode }) {
      siteUrl = (loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL ?? '').trim().replace(/\/+$/, '')
    },
    transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
    generateBundle() {
      if (!siteUrl) return
      const urls = rotasPublicas.map((rota) => `  <url><loc>${siteUrl}${rota}</loc></url>`).join('\n')
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), siteUrlPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
} as UserConfig & {
  test: {
    environment: 'happy-dom'
    globals: boolean
    setupFiles: string
  }
})
