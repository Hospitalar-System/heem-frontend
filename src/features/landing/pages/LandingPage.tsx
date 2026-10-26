import { ChamadaFinal } from '../components/ChamadaFinal'
import { HeroProduto } from '../components/HeroProduto'
import { LandingLayout } from '../components/LandingLayout'
import { Normas } from '../components/Normas'
import { ParaQuem } from '../components/ParaQuem'
import { Recursos } from '../components/Recursos'
import type { Interesse } from '../content/vitrine'
import { rolarParaContato } from '../rolar-para-contato'

interface LandingPageProps {
  /** Gancho da L3: abre o formulário com o interesse do visitante. Por ora rola até #contato. */
  onAgendar?: (interesse?: Interesse) => void
}

export function LandingPage({ onAgendar = () => rolarParaContato() }: LandingPageProps) {
  return (
    <LandingLayout>
      <div id="topo" />
      <HeroProduto onAgendar={onAgendar} />
      <Recursos />
      <Normas />
      <ParaQuem />
      <ChamadaFinal onAgendar={onAgendar} />
    </LandingLayout>
  )
}
