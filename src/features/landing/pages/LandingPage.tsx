import { useState } from 'react'
import { ChamadaFinal } from '../components/ChamadaFinal'
import { DialogoAgendar } from '../components/DialogoAgendar'
import { HeroProduto } from '../components/HeroProduto'
import { LandingLayout } from '../components/LandingLayout'
import { Normas } from '../components/Normas'
import { ParaQuem } from '../components/ParaQuem'
import { Recursos } from '../components/Recursos'
import type { Interesse } from '../content/vitrine'

interface LandingPageProps {
  /** Substitui o comportamento padrão (abrir o formulário "Agendar demonstração"); usado em testes. */
  onAgendar?: (interesse?: Interesse) => void
}

export function LandingPage({ onAgendar }: LandingPageProps) {
  const [dialogo, setDialogo] = useState<{ interesse?: Interesse } | null>(null)
  const agendar = onAgendar ?? ((interesse?: Interesse) => setDialogo({ interesse }))

  return (
    <LandingLayout onAgendar={agendar}>
      <div id="topo" />
      <HeroProduto onAgendar={agendar} />
      <Recursos />
      <Normas />
      <ParaQuem />
      <ChamadaFinal onAgendar={agendar} />
      {dialogo && <DialogoAgendar interesse={dialogo.interesse} onFechar={() => setDialogo(null)} />}
    </LandingLayout>
  )
}
