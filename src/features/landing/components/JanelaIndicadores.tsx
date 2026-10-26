import { indicadoresExemplo } from '../content/textos'
import { useRevelar } from '../hooks/useRevelar'

/**
 * Janela web com KPIs e gráfico de linha de exemplo, em SVG próprio (cores por variáveis do tema).
 * A linha só é desenhada (1,6 s) quando a janela entra na tela, como `.show.in .gline` da referência.
 */
export function JanelaIndicadores() {
  const [ref, fase] = useRevelar<HTMLDivElement>()
  return (
    <div ref={ref} data-draw={fase === 'off' ? undefined : fase} className="landing-chart w-full max-w-[520px] overflow-hidden rounded-[22px] border border-border bg-surface shadow-[0_30px_70px_var(--shadow)]">
      <div aria-hidden="true" className="flex gap-1.5 border-b border-border bg-[var(--bg-deep)] px-3.5 py-3">
        <i className="size-[9px] rounded-full bg-border" />
        <i className="size-[9px] rounded-full bg-border" />
        <i className="size-[9px] rounded-full bg-border" />
      </div>
      <div className="grid gap-3.5 p-5">
        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {indicadoresExemplo.kpis.map((kpi, i) => (
            <div key={kpi.rotulo} className={`rounded-xl border border-border bg-bg p-3 ${i === 2 ? 'max-sm:hidden' : ''}`}>
              <dt className="text-[11px] text-text-muted">{kpi.rotulo}</dt>
              <dd className="text-[22px] font-semibold tracking-tight">{kpi.valor}</dd>
            </div>
          ))}
        </dl>
        <svg viewBox="0 0 440 190" role="img" aria-label={indicadoresExemplo.descricaoGrafico} className="block h-auto w-full">
          <g className="landing-chart-grid">
            <line x1="44" y1="20" x2="430" y2="20" />
            <line x1="44" y1="62" x2="430" y2="62" />
            <line x1="44" y1="104" x2="430" y2="104" />
            <line x1="44" y1="146" x2="430" y2="146" />
          </g>
          <g className="landing-chart-text" fontSize="10" textAnchor="end">
            <text x="36" y="24">98%</text>
            <text x="36" y="66">97%</text>
            <text x="36" y="108">96%</text>
            <text x="36" y="150">95%</text>
          </g>
          <path className="landing-chart-area" d="M60 128 L135 100 L210 112 L285 70 L360 54 L420 40 L420 146 L60 146 Z" />
          <path className="landing-chart-line" d="M60 128 L135 100 L210 112 L285 70 L360 54 L420 40" />
          <g className="landing-chart-point">
            <circle cx="60" cy="128" r="3.5" />
            <circle cx="135" cy="100" r="3.5" />
            <circle cx="210" cy="112" r="3.5" />
            <circle cx="285" cy="70" r="3.5" />
            <circle cx="360" cy="54" r="3.5" />
          </g>
          <circle className="landing-chart-dot" cx="420" cy="40" r="5.5" />
          <text className="landing-chart-value" x="414" y="30" fontSize="11" textAnchor="end">97,4%</text>
          <g className="landing-chart-text" fontSize="10" textAnchor="middle">
            <text x="60" y="166">Fev</text>
            <text x="135" y="166">Mar</text>
            <text x="210" y="166">Abr</text>
            <text x="285" y="166">Mai</text>
            <text x="360" y="166">Jun</text>
            <text x="420" y="166">Jul</text>
          </g>
        </svg>
      </div>
    </div>
  )
}
