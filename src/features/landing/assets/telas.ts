/**
 * Mapa das telas do aplicativo mostradas na vitrine. Cada chave aponta para uma captura WebP desta pasta
 * (ver README.md); uma chave sem `src` cai no placeholder gerado em código.
 */
export type ChaveTela = 'novoChamado' | 'inicio' | 'fichaEquipamento' | 'minhasOts' | 'chamados' | 'offlineSessao'

/** Proporção das capturas: 1080 x 2280 do original (sem barra de status e de navegação), a 472 px de largura. */
export const TELA_LARGURA = 472
export const TELA_ALTURA = 996

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
  /** Sem `src`, a vitrine usa o placeholder. */
  src?: string
  alt: string
}

export const telas: Record<ChaveTela, TelaInfo> = {
  novoChamado: {
    src: new URL('./novo-chamado.webp', import.meta.url).href,
    alt: 'Tela Novo chamado do aplicativo: equipamento escolhido, quatro níveis de severidade (crítica, alta, média e baixa) e campo de descrição',
  },
  inicio: {
    src: new URL('./inicio.webp', import.meta.url).href,
    alt: 'Tela inicial do aplicativo, com o atalho Abrir chamado de emergência, a fila do técnico (OTs agendadas, OTs atrasadas e chamados abertos) e a lista de hospitais',
  },
  fichaEquipamento: {
    src: new URL('./ficha-equipamento.webp', import.meta.url).href,
    alt: 'Ficha do equipamento no aplicativo, com atalhos para chamado, histórico, checklist e etiqueta, e os dados técnicos (modelo, fabricante, número de série e instalação)',
  },
  minhasOts: {
    src: new URL('./minhas-ots.webp', import.meta.url).href,
    alt: 'Lista de ordens de trabalho do aplicativo, com uma preventiva atrasada e o aviso de que a sessão expira em 1 dia',
  },
  chamados: {
    src: new URL('./chamados.webp', import.meta.url).href,
    alt: 'Lista de chamados do aplicativo, com severidade (alta, crítica e média) e status (aberto, em andamento e cancelado) em cada chamado',
  },
  offlineSessao: {
    src: new URL('./offline-sessao.webp', import.meta.url).href,
    alt: 'Perfil do aplicativo, com o estado online e sincronizado, última sincronização, pendências e a situação da sessão com o botão Renovar',
  },
}

/** Resolve a imagem de uma tela, com o placeholder como fallback quando a chave não tem captura. */
export function resolverTela(chave: ChaveTela): { src: string; alt: string } {
  const { src, alt } = telas[chave]
  return { src: src ?? placeholder, alt }
}
