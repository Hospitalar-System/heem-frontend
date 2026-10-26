/**
 * Mapa das telas do aplicativo mostradas na vitrine. Hoje todas apontam para um placeholder gerado em código;
 * quando as capturas existirem (ver README.md desta pasta), troque o `src` de cada chave
 * (por exemplo `new URL('./novo-chamado.webp', import.meta.url).href`) sem mexer nos componentes.
 */
export type ChaveTela = 'novoChamado' | 'inicio' | 'fichaEquipamento' | 'minhasOts' | 'chamados'

export const TELA_LARGURA = 472
export const TELA_ALTURA = 968

/**
 * Placeholder honesto: linhas esquemáticas neutras e o aviso "em breve", sem texto de interface inventado.
 * Cores em rgba() porque a imagem não enxerga as variáveis de tema; a moldura do celular é sempre escura.
 */
export function placeholderTela(): string {
  const linhas = [150, 214, 278, 342, 406, 470, 534, 598]
    .map((y, i) => `<rect x="40" y="${y}" width="${i % 3 === 2 ? 250 : 392}" height="26" rx="13" fill="rgba(255,255,255,0.08)"/>`)
    .join('')
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TELA_LARGURA}" height="${TELA_ALTURA}" viewBox="0 0 ${TELA_LARGURA} ${TELA_ALTURA}">` +
    `<rect width="${TELA_LARGURA}" height="${TELA_ALTURA}" fill="rgb(31,31,31)"/>` +
    '<rect x="40" y="56" width="140" height="30" rx="15" fill="rgba(255,255,255,0.14)"/>' +
    linhas +
    '<text x="236" y="830" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="26" fill="rgba(255,255,255,0.7)">Tela do aplicativo — em breve</text>' +
    '</svg>'
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

const placeholder = placeholderTela()

export interface TelaInfo {
  src: string
  alt: string
}

export const telas: Record<ChaveTela, TelaInfo> = {
  novoChamado: { src: placeholder, alt: 'Tela Novo chamado do aplicativo, com equipamento, severidade e descrição' },
  inicio: { src: placeholder, alt: 'Tela inicial do aplicativo, com atalho de chamado de emergência e fila do técnico' },
  fichaEquipamento: { src: placeholder, alt: 'Ficha do equipamento no aplicativo, com dados técnicos e atalhos' },
  minhasOts: { src: placeholder, alt: 'Lista de ordens de trabalho do aplicativo, com uma preventiva atrasada' },
  chamados: { src: placeholder, alt: 'Lista de chamados do aplicativo, com severidade e status' },
}
