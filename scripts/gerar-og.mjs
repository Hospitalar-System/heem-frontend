import { Buffer } from 'node:buffer'
// Gera public/og-landing.png (1200x630) PROVISÓRIA a partir da marca em src/features/landing/brand.ts.
// A identidade visual vai mudar antes do lançamento: troque brand.ts, rode de novo (ou substitua o PNG).
// `sharp` NÃO é dependência do projeto. Instale fora do repositório e aponte o caminho:
//   npm i sharp --prefix <pasta-temporaria>
//   SHARP_PATH=<pasta-temporaria>/node_modules/sharp/dist/index.cjs node scripts/gerar-og.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath, pathToFileURL, URL } from 'node:url'

const brand = readFileSync(fileURLToPath(new URL('../src/features/landing/brand.ts', import.meta.url)), 'utf8')
const valor = (nome) => brand.match(new RegExp(`${nome} = '([^']*)'`))?.[1] ?? ''
const nome = valor('NOME_PRODUTO')
const sigla = valor('SIGLA')
const tagline = valor('TAGLINE')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#1f1f1f"/>
  <rect x="0" y="0" width="1200" height="630" fill="url(#g)"/>
  <defs><radialGradient id="g" cx="50%" cy="0%" r="70%"><stop offset="0" stop-color="#3ed597" stop-opacity="0.22"/><stop offset="1" stop-color="#3ed597" stop-opacity="0"/></radialGradient></defs>
  <rect x="96" y="150" width="120" height="120" rx="32" fill="#3ed597"/>
  <text x="156" y="236" font-family="Arial, Helvetica, sans-serif" font-size="80" text-anchor="middle" fill="#0b2a1e">${sigla}</text>
  <text x="248" y="236" font-family="Arial, Helvetica, sans-serif" font-size="84" fill="#f5f5f5">${nome}</text>
  <text x="96" y="400" font-family="Arial, Helvetica, sans-serif" font-size="64" fill="#f5f5f5">${tagline}</text>
  <text x="96" y="470" font-family="Arial, Helvetica, sans-serif" font-size="34" fill="#c2c2c2">Equipamentos, chamados, ordens de serviço e conformidade.</text>
</svg>`

const { default: sharp } = await import(process.env.SHARP_PATH ? pathToFileURL(process.env.SHARP_PATH).href : 'sharp')
const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: true }).toBuffer()
writeFileSync(fileURLToPath(new URL('../public/og-landing.png', import.meta.url)), png)
process.stdout.write(`og-landing.png gerada (${png.length} bytes)\n`)
