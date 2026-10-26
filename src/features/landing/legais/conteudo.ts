import { NOME_PRODUTO } from '../brand'

/**
 * Conteúdo PROVISÓRIO das páginas legais. Texto-base genérico, sem fatos jurídicos ou da empresa: tudo o que exige
 * decisão fica como `[PENDENTE: ...]` (destacado na tela e listado em PENDENCIAS.md). Para trocar pelo texto
 * definitivo, edite só este arquivo (e a versão abaixo, em sincronia com `heem.leads.politica-versao` no backend).
 */

/** Mesma identificação gravada no servidor junto ao consentimento (`heem.leads.politica-versao`). */
export const VERSAO_POLITICA = 'provisoria-1'

export const AVISO_PROVISORIO = `Texto provisório — aguardando a versão definitiva do responsável jurídico. Versão: ${VERSAO_POLITICA}.`

export interface SecaoLegal {
  id: string
  titulo: string
  paragrafos: string[]
  itens?: string[]
}

export interface DocumentoLegal {
  /** Caminho da rota pública. */
  path: string
  titulo: string
  descricao: string
  secoes: SecaoLegal[]
}

export const politicaPrivacidade: DocumentoLegal = {
  path: '/privacidade',
  titulo: 'Política de Privacidade',
  descricao: `Como os dados enviados pelo formulário de contato do ${NOME_PRODUTO} são tratados, conforme a LGPD (texto provisório).`,
  secoes: [
    {
      id: 'controlador',
      titulo: 'Quem é o controlador dos dados',
      paragrafos: [
        'O controlador é a pessoa jurídica responsável pelas decisões sobre o tratamento dos dados descritos nesta política.',
        'Razão social e CNPJ: [PENDENTE: razão social e CNPJ do controlador].',
      ],
    },
    {
      id: 'encarregado',
      titulo: 'Encarregado e canal de contato',
      paragrafos: [
        'Dúvidas e solicitações sobre esta política podem ser enviadas ao encarregado pelo tratamento de dados pessoais.',
        'Contato do encarregado: [PENDENTE: nome e e-mail do encarregado (DPO)].',
      ],
    },
    {
      id: 'dados-coletados',
      titulo: 'Quais dados coletamos',
      paragrafos: ['Pelo formulário "Agendar demonstração", coletamos somente o que você informa:'],
      itens: ['nome;', 'e-mail profissional;', 'organização;', 'cargo;', 'telefone (opcional);', 'interesse (o que você quer resolver).'],
    },
    {
      id: 'finalidade',
      titulo: 'Para que usamos os dados',
      paragrafos: [`Usamos esses dados para retornar o contato sobre o ${NOME_PRODUTO}, como o agendamento de uma demonstração. Não usamos para outras finalidades sem informar você.`],
    },
    {
      id: 'base-legal',
      titulo: 'Base legal',
      paragrafos: ['O tratamento se baseia no seu consentimento, conforme o art. 7º, inciso I, da Lei Geral de Proteção de Dados (Lei nº 13.709/2018, LGPD), dado ao marcar a caixa de concordância no formulário.'],
    },
    {
      id: 'compartilhamento',
      titulo: 'Compartilhamento',
      paragrafos: ['Compartilhamento com terceiros, operadores e suboperadores: [PENDENTE: descrever com quem os dados são compartilhados, se houver, e para qual fim].'],
    },
    {
      id: 'retencao',
      titulo: 'Por quanto tempo guardamos',
      paragrafos: ['Prazo de retenção dos dados do formulário: [PENDENTE: prazo e critério de eliminação].'],
    },
    {
      id: 'direitos',
      titulo: 'Seus direitos como titular',
      paragrafos: ['Conforme a LGPD, você pode solicitar, a qualquer momento e mediante requisição ao canal indicado acima:'],
      itens: [
        'confirmação da existência de tratamento e acesso aos dados;',
        'correção de dados incompletos, inexatos ou desatualizados;',
        'anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade;',
        'eliminação dos dados tratados com base no consentimento;',
        'informação sobre com quem os dados foram compartilhados;',
        'revogação do consentimento, sem prejuízo do tratamento já realizado.',
      ],
    },
    {
      id: 'seguranca',
      titulo: 'Segurança',
      paragrafos: [
        'Os dados do formulário trafegam por conexão HTTPS. O formulário não guarda o que você digita no navegador (nem em cookies nem em armazenamento local) e o envio tem limite de requisições para coibir abuso.',
        'Nenhuma medida elimina todo risco. Medidas adicionais no servidor: [PENDENTE: descrição validada pela área responsável].',
      ],
    },
    {
      id: 'cookies',
      titulo: 'Cookies e armazenamento local',
      paragrafos: [
        'A landing não usa cookies nem armazenamento local para o formulário e não carrega fontes, scripts de análise ou publicidade de terceiros.',
        'O único dado guardado no seu navegador é a preferência de tema (claro, escuro ou automático), que fica apenas no seu dispositivo.',
      ],
    },
    {
      id: 'alteracoes',
      titulo: 'Alterações desta política',
      paragrafos: ['Esta política pode ser atualizada. A versão em vigor é identificada no topo da página e registrada junto ao seu consentimento.'],
    },
    {
      id: 'atualizacao',
      titulo: 'Última atualização',
      paragrafos: ['Data da última atualização: [PENDENTE: data].'],
    },
  ],
}

export const termosDeUso: DocumentoLegal = {
  path: '/termos',
  titulo: 'Termos de Uso',
  descricao: `Condições gerais de uso do site e do ${NOME_PRODUTO} (texto provisório).`,
  secoes: [
    {
      id: 'objeto',
      titulo: 'Objeto',
      paragrafos: [`Estes termos regulam o uso do site e dos serviços do ${NOME_PRODUTO}. Prestador: [PENDENTE: razão social e CNPJ].`],
    },
    {
      id: 'acesso',
      titulo: 'Acesso e conta',
      paragrafos: ['O acesso ao sistema depende de cadastro feito pela organização contratante. Condições de contratação, planos e prazos: [PENDENTE: definir].'],
    },
    {
      id: 'uso-aceitavel',
      titulo: 'Uso aceitável',
      paragrafos: [
        'Você se compromete a usar o site e o sistema de forma lícita e de boa-fé, sem tentar acessar áreas ou dados sem autorização, sem comprometer a disponibilidade ou a segurança do serviço e sem enviar dados de terceiros sem base legal.',
        'Regras específicas de uso e consequências do descumprimento: [PENDENTE: revisão jurídica].',
      ],
    },
    {
      id: 'propriedade-intelectual',
      titulo: 'Propriedade intelectual',
      paragrafos: ['Marcas, textos, imagens e o software pertencem aos seus titulares e não podem ser copiados ou reutilizados sem autorização. Titularidade e licença de uso: [PENDENTE: definir].'],
    },
    {
      id: 'limitacao',
      titulo: 'Limitação de responsabilidade',
      paragrafos: ['Alcance e limites da responsabilidade do prestador: [PENDENTE: definição jurídica].'],
    },
    {
      id: 'privacidade',
      titulo: 'Privacidade',
      paragrafos: ['O tratamento de dados pessoais segue a Política de Privacidade, disponível em /privacidade.'],
    },
    {
      id: 'lei-aplicavel',
      titulo: 'Lei aplicável e foro',
      paragrafos: ['Legislação aplicável e foro competente: [PENDENTE: definir].'],
    },
    {
      id: 'atualizacao',
      titulo: 'Alterações e última atualização',
      paragrafos: ['Estes termos podem ser atualizados; a versão em vigor é identificada no topo da página. Data da última atualização: [PENDENTE: data].'],
    },
  ],
}
