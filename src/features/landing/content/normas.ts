export interface Norma {
  id: string
  /** Texto do chip. */
  sigla: string
  orgao: string
  lead: string
  oQueE: string
  porQueImporta: string
  /** Frase de abertura do cartão "No <produto>". */
  noProduto: string
  itens: string[]
}

export const normas: Norma[] = [
  {
    id: 'rdc509',
    sigla: 'RDC 509/2021',
    orgao: 'ANVISA · 2021',
    lead: 'Gerenciamento de tecnologias em saúde.',
    oQueE: 'Resolução da ANVISA que define como os estabelecimentos de saúde devem gerenciar suas tecnologias, do recebimento do equipamento ao descarte, com manutenção, calibração e rastreabilidade documentadas.',
    porQueImporta: 'É a base regulatória da engenharia clínica no Brasil e costuma ser o ponto de partida de auditorias e vistorias sanitárias.',
    noProduto: 'Ficha única por equipamento, com histórico, documentos e OTs, e indicadores como disponibilidade e MTBF para acompanhar o parque.',
    itens: [
      'Ficha do equipamento com histórico e documentos',
      'OTs registradas por equipamento, com quem fez e quando',
      'Disponibilidade e MTBF, com exportação em PDF e Excel',
    ],
  },
  {
    id: '62353',
    sigla: 'NBR IEC 62353',
    orgao: 'ABNT · ensaios elétricos',
    lead: 'Ensaios recorrentes e após reparo.',
    oQueE: 'Norma que trata dos ensaios de segurança elétrica em equipamentos eletromédicos, feitos periodicamente e depois de reparos, com limites a respeitar e registro dos valores medidos.',
    porQueImporta: 'Sem comparar o valor medido com o limite e guardar o resultado, o ensaio não vira evidência.',
    noProduto: 'Checklists com itens numéricos e limites de conformidade: o valor medido é comparado ao limite e o parecer técnico fica registrado na OT.',
    itens: [
      'Itens numéricos com limite de conformidade',
      'Resultado calculado a cada medição, sem conta manual',
      'Parecer técnico registrado na própria OT',
    ],
  },
  {
    id: '60601',
    sigla: 'NBR IEC 60601-1',
    orgao: 'ABNT · segurança do equipamento',
    lead: 'Segurança básica e desempenho essencial.',
    oQueE: 'Norma de requisitos gerais de segurança de equipamentos eletromédicos. Define, entre outros pontos, a classe e o tipo de proteção contra choque elétrico de cada equipamento.',
    porQueImporta: 'A classificação do equipamento orienta quais ensaios e limites se aplicam a ele.',
    noProduto: 'Classe de risco e tipo de proteção elétrica entram na ficha do equipamento, na hora do cadastro.',
    itens: [
      'Classe de risco na ficha do equipamento',
      'Tipo de proteção elétrica cadastrado',
      'Dados prontos para montar checklists adequados a cada equipamento',
    ],
  },
  {
    id: '14971',
    sigla: 'ISO 14971',
    orgao: 'ISO · gestão de risco',
    lead: 'Gerenciamento de riscos de produtos para a saúde.',
    oQueE: 'Norma internacional de gestão de riscos de produtos para a saúde: identificar perigos, estimar a gravidade e a probabilidade, e controlar o que for inaceitável.',
    porQueImporta: 'Ajuda a decidir onde o esforço da manutenção rende mais segurança, em vez de tratar todos os equipamentos igual.',
    noProduto: 'Uma matriz de risco ajuda a priorizar onde a manutenção precisa de mais atenção.',
    itens: [
      'Matriz de risco para apoiar a decisão de prioridade',
      'Criticidade do setor considerada',
      'Chamados em quatro níveis de severidade, do ajuste simples ao equipamento parado',
    ],
  },
  {
    id: 'rdc50',
    sigla: 'RDC 50/2002',
    orgao: 'ANVISA · 2002',
    lead: 'Projeto físico de estabelecimentos de saúde.',
    oQueE: 'Regulamento técnico para planejar, programar, elaborar e avaliar projetos físicos de estabelecimentos assistenciais de saúde, com a classificação dos ambientes por tipo de atividade.',
    porQueImporta: 'A forma como o setor é classificado influencia as exigências sobre os equipamentos que funcionam nele.',
    noProduto: 'Hospitais, setores e equipamentos são estruturados em hierarquia, e a criticidade do setor entra na ficha do equipamento.',
    itens: [
      'Hospitais, setores e equipamentos organizados em hierarquia',
      'Criticidade do setor na ficha do equipamento',
      'Administrador estrutura o parque sem depender de planilhas',
    ],
  },
  {
    id: '13534',
    sigla: 'NBR 13534',
    orgao: 'ABNT · instalações elétricas',
    lead: 'Instalações elétricas em estabelecimentos de saúde.',
    oQueE: 'Norma de requisitos para instalações elétricas em estabelecimentos assistenciais de saúde, que separa os locais por grupo de acordo com o risco que a falha elétrica representa para o paciente.',
    porQueImporta: 'O grupo do ambiente é uma referência para definir o rigor e a periodicidade dos ensaios.',
    noProduto: 'A classificação do setor fica registrada junto à ficha do equipamento, como contexto para o planejamento das OTs.',
    itens: [
      'Classificação do setor registrada junto ao equipamento',
      'Contexto para planejar as OTs de ensaio',
      'Medições registradas na OT, com histórico',
    ],
  },
  {
    id: 'lgpd',
    sigla: 'LGPD',
    orgao: 'Lei 13.709/2018',
    lead: 'Proteção de dados pessoais.',
    oQueE: 'Lei geral de proteção de dados pessoais, que define como dados de pessoas podem ser coletados, usados e guardados, e quais são as responsabilidades de quem os trata.',
    porQueImporta: 'Um sistema de manutenção não precisa de dados de paciente, e o ideal é que eles nunca entrem nele.',
    noProduto: 'Dados separados por cliente, acesso por perfil, registro das ações e um lembrete no chamado para não informar dados de paciente.',
    itens: [
      'Dados separados por cliente',
      'Acesso por perfil e registro das ações',
      'Lembrete no chamado para não informar dados de paciente',
    ],
  },
]

export const trilhaNormativa = [
  { etapa: 'No cadastro', titulo: 'Classificação normativa', texto: 'Classe de risco, tipo de proteção elétrica e criticidade do setor entram na ficha do equipamento.' },
  { etapa: 'Na medição', titulo: 'Resultado automático', texto: 'O valor medido é comparado ao limite do checklist e o parecer técnico fica registrado na OT.' },
  { etapa: 'Na gestão', titulo: 'Prioridade por risco', texto: 'Uma matriz de risco ajuda a decidir onde a manutenção precisa de mais atenção.' },
]

export function notaConformidade(produto: string) {
  return `${produto} apoia o cumprimento das normas, mas não substitui o responsável técnico nem a avaliação regulatória da instituição.`
}
