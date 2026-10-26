import { ChartLine, ClipboardCheck, Lock, QrCode, TriangleAlert, WifiOff, type LucideIcon } from 'lucide-react'

export interface Recurso {
  icone: LucideIcon
  titulo: string
  texto: string
}

export const recursos: Recurso[] = [
  { icone: QrCode, titulo: 'Ficha completa do equipamento', texto: 'Dados técnicos, histórico, documentos e etiqueta com QR code em um só lugar.' },
  { icone: WifiOff, titulo: 'App que funciona offline', texto: 'Registros guardados no aparelho e sincronizados quando a rede volta.' },
  { icone: ClipboardCheck, titulo: 'Checklists sob medida', texto: 'Monte modelos com itens numéricos, sim/não, seleção e texto, com limites de conformidade.' },
  { icone: TriangleAlert, titulo: 'Chamados com severidade', texto: 'Quatro níveis, do ajuste simples ao equipamento parado, e OT corretiva com um toque.' },
  { icone: ChartLine, titulo: 'Indicadores e relatórios', texto: 'MTBF, disponibilidade e tempos de atendimento, com exportação em PDF e Excel.' },
  { icone: Lock, titulo: 'Dados separados por cliente', texto: 'Acesso por perfil e registro das ações, em linha com a LGPD.' },
]

export interface Perfil {
  iniciais: string
  titulo: string
  texto: string
}

export const perfis: Perfil[] = [
  { iniciais: 'AD', titulo: 'Administrador', texto: 'Estrutura hospitais, setores, equipamentos, usuários e checklists. Acompanha os indicadores.' },
  { iniciais: 'TC', titulo: 'Técnico', texto: 'Recebe a fila de OTs, executa checklists e registra medições em campo, inclusive offline.' },
  { iniciais: 'IH', titulo: 'Equipe do hospital', texto: 'Abre chamados quando algo falha e acompanha o andamento sem precisar ligar.' },
  { iniciais: 'SA', titulo: 'Operação da plataforma', texto: 'Gerencia os clientes, com isolamento total de dados entre as instituições.' },
]

export const indicadoresExemplo = {
  kpis: [
    { rotulo: 'MTBF', valor: '286 h' },
    { rotulo: 'Atendimento', valor: '2,4 h' },
    { rotulo: 'Disponibilidade', valor: '97,4%' },
  ],
  descricaoGrafico: 'Disponibilidade mensal, de 95,1% em fevereiro a 97,4% em julho',
}

export function textoCtaFinal(produto: string) {
  return {
    titulo: `Veja o ${produto} com os equipamentos do seu hospital.`,
    texto: 'Mostramos o fluxo completo, do chamado ao relatório, e conversamos sobre como adaptar à rotina da sua engenharia clínica.',
  }
}
