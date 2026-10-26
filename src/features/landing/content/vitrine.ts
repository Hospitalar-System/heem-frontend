import type { ChaveTela } from '../assets/telas'

/** Interesse que o visitante demonstrou; a L3 usa para pré-selecionar o formulário. */
export type Interesse = 'chamado' | 'equipamento' | 'ordens' | 'indicadores'

export interface PainelVitrine {
  id: Interesse
  /** Texto do chip. */
  chip: string
  /** Pergunta exibida na barra "ask" quando o chip está ativo. */
  pergunta: string
  titulo: string
  paragrafos: string[]
  nota: string
  /** Telas do app mostradas à direita; vazio = janela web de indicadores. */
  telas: ChaveTela[]
}

export const paineis: PainelVitrine[] = [
  {
    id: 'chamado',
    chip: 'Abrir um chamado',
    pergunta: 'Quero abrir um chamado para um equipamento',
    titulo: 'Um chamado em menos de um minuto.',
    paragrafos: [
      'Leia a etiqueta do equipamento ou escolha na lista, indique a gravidade e descreva o problema. Cada nível de severidade vem explicado na tela.',
      'Para emergências, a tela inicial tem um atalho direto. O formulário também lembra a equipe de não informar dados de paciente.',
    ],
    nota: 'Telas do aplicativo, reproduzidas com dados de exemplo.',
    telas: ['novoChamado', 'inicio'],
  },
  {
    id: 'equipamento',
    chip: 'Consultar um equipamento',
    pergunta: 'Preciso consultar os dados de um equipamento',
    titulo: 'A ficha do equipamento na palma da mão.',
    paragrafos: [
      'Modelo, fabricante, número de série, data de instalação, hospital e setor, com atalhos para abrir um chamado, ver o histórico, o checklist e a etiqueta.',
      'Dá para vincular a etiqueta com QR code ao equipamento e encontrá-lo depois em segundos.',
    ],
    nota: 'Tela do aplicativo, reproduzida com dados de exemplo.',
    telas: ['fichaEquipamento'],
  },
  {
    id: 'ordens',
    chip: 'Ver ordens atrasadas',
    pergunta: 'Quais ordens de serviço estão atrasadas?',
    titulo: 'A fila de trabalho já organizada.',
    paragrafos: [
      'Ordens agendadas, em andamento e atrasadas, com o tipo de manutenção, o equipamento, o setor e há quantos dias o prazo passou.',
      'Ao lado, a lista de chamados mostra severidade, status e local de cada ocorrência. O aplicativo também avisa quando a sessão está perto de expirar.',
    ],
    nota: 'Tela do aplicativo, reproduzida com dados de exemplo.',
    telas: ['minhasOts', 'chamados'],
  },
  {
    id: 'indicadores',
    chip: 'Acompanhar indicadores',
    pergunta: 'Como está a disponibilidade do parque este mês?',
    titulo: 'Os números que a gestão pede, prontos.',
    paragrafos: [
      'MTBF, disponibilidade, tempo de atendimento e de resolução por hospital e setor, além da proporção entre manutenção preventiva e corretiva.',
      'Exporte em PDF ou Excel para reuniões e auditorias.',
    ],
    nota: 'Valores de exemplo.',
    telas: [],
  },
]
