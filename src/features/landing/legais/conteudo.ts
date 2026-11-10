/**
 * Textos das páginas legais, a partir do texto aprovado pelo Pedro em 09/11/2026
 * (_bmad-output/implementation-artifacts/textos-legais-2026-11-09.md). Os textos mantêm o nome "HEMM" como está na fonte:
 * o nome oficial do produto ainda não foi decidido. A REVISÃO JURÍDICA segue pendente (ver PENDENCIAS.md), por isso o
 * aviso abaixo continua aparecendo. Para trocar o texto, edite só este arquivo (e a versão, em sincronia com
 * `heem.leads.politica-versao` no backend).
 */

/** Mesma identificação gravada no servidor junto ao consentimento (`heem.leads.politica-versao`). */
export const VERSAO_POLITICA = 'provisoria-1'

export const AVISO_PROVISORIO = `Texto provisório — aguardando revisão jurídica. Versão: ${VERSAO_POLITICA}.`

export const DATA_ATUALIZACAO = '09/11/2026'
const RESPONSAVEL = 'Pedro Widholzer'
const CONTATO = 'pedrocostaw222@gmail.com'

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
  descricao: 'Como o HEMM trata dados pessoais de quem visita o site e de quem usa a plataforma e o aplicativo, conforme a LGPD.',
  secoes: [
    {
      id: 'introducao',
      titulo: 'Sobre esta política',
      paragrafos: [
        `Última atualização: ${DATA_ATUALIZACAO}.`,
        'Esta política explica como o HEMM trata dados pessoais de quem visita o site e de quem usa a plataforma e o aplicativo.',
      ],
    },
    {
      id: 'quem-somos',
      titulo: 'Quem somos e qual é o nosso papel',
      paragrafos: [
        'O HEMM é uma plataforma de gestão de engenharia clínica e manutenção hospitalar, com painel web e aplicativo móvel.',
        `Responsável e encarregado pelo tratamento de dados: ${RESPONSAVEL}. Contato: ${CONTATO}.`,
        'Nosso papel muda conforme o dado. Somos controladores dos dados de visitantes do site e dos dados de conta dos usuários da plataforma, como nome, e-mail e perfil de acesso. Somos operadores dos dados que o hospital ou a empresa contratante, o Cliente, registra sobre seus equipamentos e sua operação. Nesse caso, o Cliente decide as finalidades e nós tratamos os dados conforme suas instruções.',
      ],
    },
    {
      id: 'dados-coletados',
      titulo: 'Quais dados coletamos',
      paragrafos: [
        'Visitantes do site. No formulário de solicitação de demonstração, coletamos o que você fornece voluntariamente: nome, e-mail profissional, organização, cargo, telefone opcional e descrição do seu interesse.',
        'Usuários da plataforma:',
      ],
      itens: [
        'dados de conta: nome, e-mail, perfil de acesso e hospitais vinculados; a senha é gerenciada pelo provedor de autenticação e não é visível para nós;',
        'dados de operação inseridos pelo usuário: chamados, ordens de trabalho, checklists, medições, pareceres, fotos e documentos dos equipamentos;',
        'registros de uso e de auditoria, com quem fez o quê e quando, para garantir rastreabilidade;',
        'dados técnicos do aplicativo, como a versão instalada.',
      ],
    },
    {
      id: 'dados-de-pacientes',
      titulo: 'Dados de pacientes',
      paragrafos: [
        'A plataforma foi feita para a manutenção de equipamentos e não deve receber dados de pacientes. Orientamos o Cliente a não inserir nomes, prontuários ou outros dados de pacientes em campos livres, observações ou fotos.',
      ],
    },
    {
      id: 'finalidade-base-legal',
      titulo: 'Para que usamos os dados e com que base legal',
      paragrafos: ['Finalidade e base legal, conforme o art. 7º da LGPD:'],
      itens: [
        'responder solicitações, agendar demonstrações e apresentar o produto: consentimento ou procedimentos preliminares a contrato;',
        'criar e manter contas, autenticar usuários e operar a plataforma: execução de contrato;',
        'enviar avisos do sistema, como convites e recuperação de senha: execução de contrato;',
        'manter registros de auditoria e rastreabilidade: obrigação legal e exercício regular de direitos;',
        'segurança e prevenção a fraude e a abuso: legítimo interesse.',
      ],
    },
    {
      id: 'nao-vendemos',
      titulo: 'Venda e publicidade',
      paragrafos: ['Não vendemos dados pessoais nem os usamos para publicidade.'],
    },
    {
      id: 'compartilhamento',
      titulo: 'Com quem compartilhamos',
      paragrafos: ['Usamos prestadores que tratam dados em nosso nome, apenas para operar o serviço:'],
      itens: [
        'hospedagem do servidor e do site: Render e Vercel;',
        'banco de dados, autenticação e armazenamento de arquivos: Supabase;',
        'envio de e-mails do sistema: Resend.',
      ],
    },
    {
      id: 'transferencia-internacional',
      titulo: 'Transferência internacional e outros compartilhamentos',
      paragrafos: [
        'Esses prestadores mantêm servidores fora do Brasil, em especial nos Estados Unidos, e adotamos as salvaguardas previstas na LGPD para essa transferência.',
        'Também podemos compartilhar dados por obrigação legal ou ordem de autoridade. Dentro do Cliente, cada usuário vê apenas o que seu perfil permite.',
      ],
    },
    {
      id: 'seguranca',
      titulo: 'Armazenamento e segurança',
      paragrafos: [
        'Adotamos, entre outras medidas, conexão segura por HTTPS, separação lógica dos dados de cada Cliente, controle de acesso por perfil, registro de auditoria que não pode ser alterado e proteção contra envios abusivos no formulário.',
        'No aplicativo, os dados necessários para trabalhar sem internet ficam no aparelho até serem sincronizados. Recomendamos manter o bloqueio de tela ativo.',
        'Se ocorrer um incidente de segurança com risco relevante, comunicaremos a ANPD e os titulares afetados, nos termos da LGPD.',
      ],
    },
    {
      id: 'retencao',
      titulo: 'Por quanto tempo guardamos',
      paragrafos: ['Prazos de guarda:'],
      itens: [
        'dados do formulário: 60 dias;',
        'dados de conta: removidos ou anonimizados em até 7 dias após o encerramento do contrato do Cliente, por procedimento operacional;',
        'dados operacionais: conforme o contrato com o Cliente, que decide sobre retenção e exclusão;',
        'registros de auditoria: pelo tempo necessário à rastreabilidade e a obrigações legais; quando houver pedido de exclusão válido, os dados pessoais desses registros são anonimizados.',
      ],
    },
    {
      id: 'direitos',
      titulo: 'Seus direitos',
      paragrafos: [
        `Pela LGPD, você pode pedir acesso, correção, anonimização, bloqueio ou eliminação de dados, portabilidade, informações sobre compartilhamento e revogação do consentimento. Para dados de conta e do formulário, escreva para ${CONTATO}. Se você usa a plataforma por meio de um hospital, pode pedir também ao Cliente, que é o controlador dos dados operacionais, e nós o ajudaremos a atender seu pedido. Você também pode reclamar à ANPD.`,
      ],
    },
    {
      id: 'cookies',
      titulo: 'Cookies e armazenamento local',
      paragrafos: [
        'O site não usa cookies de rastreamento nem ferramentas de publicidade. A plataforma e o app usam armazenamento local no navegador ou no aparelho para manter sua sessão, lembrar preferências, como o tema claro ou escuro, e permitir o uso offline.',
      ],
    },
    {
      id: 'alteracoes',
      titulo: 'Alterações nesta política',
      paragrafos: ['Podemos atualizar esta política. A versão mais recente estará sempre nesta página, com a data de atualização.'],
    },
  ],
}

export const termosDeUso: DocumentoLegal = {
  path: '/termos',
  titulo: 'Termos de Uso',
  descricao: 'Condições para acessar e usar o site, a plataforma e o aplicativo do HEMM.',
  secoes: [
    {
      id: 'introducao',
      titulo: 'Bem-vindo ao HEMM',
      paragrafos: [
        `Última atualização: ${DATA_ATUALIZACAO}.`,
        'Estes Termos de Uso estabelecem as condições para acessar e utilizar nosso site, nossa plataforma e nosso aplicativo. Ao acessar ou utilizar nossos serviços, você concorda com as condições abaixo.',
      ],
    },
    {
      id: 'sobre',
      titulo: 'Sobre o HEMM',
      paragrafos: [
        'O HEMM é uma plataforma de gestão de engenharia clínica e manutenção hospitalar. Ela ajuda hospitais e empresas a organizar, acompanhar e controlar seus equipamentos e processos de manutenção, por meio de um painel web e de um aplicativo móvel.',
      ],
    },
    {
      id: 'acesso',
      titulo: 'Acesso e conta',
      paragrafos: [
        'O acesso depende de cadastro e de autorização da organização responsável pela contratação ou utilização do sistema, o Cliente. O administrador do Cliente define quem pode usar a plataforma e com qual perfil de acesso.',
        'Cada usuário deve usar apenas suas próprias credenciais, manter a senha em sigilo e avisar imediatamente o Cliente e o HEMM sobre qualquer suspeita de acesso não autorizado. As condições comerciais, os planos e as modalidades de contratação são estabelecidos diretamente entre as partes.',
      ],
    },
    {
      id: 'uso-adequado',
      titulo: 'Uso adequado',
      paragrafos: ['Ao utilizar o HEMM, você concorda em:'],
      itens: [
        'usar a plataforma de forma legal e responsável;',
        'fornecer informações verdadeiras e atualizadas, inclusive nas medições, nos checklists e nos pareceres;',
        'não tentar acessar informações ou funcionalidades sem autorização;',
        'não comprometer a segurança ou o funcionamento da plataforma;',
        'não usar o sistema para atividades ilegais ou prejudiciais a terceiros;',
        'não inserir dados de pacientes, como nomes ou prontuários, em campos livres, observações ou fotos;',
        'respeitar os direitos de propriedade intelectual.',
      ],
    },
    {
      id: 'descumprimento',
      titulo: 'Consequências do descumprimento',
      paragrafos: ['O descumprimento dessas condições pode levar à suspensão ou restrição do acesso, conforme a gravidade.'],
    },
    {
      id: 'responsabilidades',
      titulo: 'Responsabilidades do Cliente e dos usuários',
      paragrafos: [
        'O Cliente é responsável pelos usuários que cadastra, pelos perfis que atribui e pelo conteúdo registrado na plataforma. Cada usuário responde pelo que registra com suas credenciais.',
        'O Cliente deve manter o aplicativo atualizado e permitir a sincronização dos dados sempre que houver conexão.',
      ],
    },
    {
      id: 'aplicativo-offline',
      titulo: 'Aplicativo e uso offline',
      paragrafos: [
        'O aplicativo permite registrar dados sem conexão. Esses dados ficam no aparelho e são enviados quando a conexão volta. Enquanto não forem sincronizados, eles podem não aparecer no painel e podem ser perdidos se o aparelho for danificado, perdido ou restaurado. Por isso, recomendamos sincronizar assim que possível.',
      ],
    },
    {
      id: 'propriedade-intelectual',
      titulo: 'Propriedade intelectual e dos dados',
      paragrafos: [
        'O HEMM, incluindo software, identidade visual, marcas, textos, elementos gráficos e demais conteúdos, é protegido pelas leis de propriedade intelectual. Nenhum conteúdo ou funcionalidade pode ser copiado, reproduzido, distribuído ou usado comercialmente sem autorização dos titulares, salvo nos casos permitidos por lei.',
        'Os dados que o Cliente registra na plataforma continuam sendo do Cliente. O HEMM os usa somente para prestar o serviço contratado.',
      ],
    },
    {
      id: 'disponibilidade',
      titulo: 'Disponibilidade e limitações',
      paragrafos: [
        'Buscamos manter o HEMM disponível e funcionando adequadamente. Podem ocorrer interrupções temporárias por manutenção, atualizações, falhas técnicas ou situações fora do nosso controle. Níveis de disponibilidade específicos, quando houver, constarão do contrato com o Cliente.',
        'O HEMM é uma ferramenta de apoio à gestão. Ele não substitui a avaliação técnica, a responsabilidade profissional ou as decisões dos profissionais responsáveis pela engenharia clínica e pela manutenção dos equipamentos.',
      ],
    },
    {
      id: 'suspensao',
      titulo: 'Suspensão e encerramento',
      paragrafos: [
        'Podemos suspender ou encerrar o acesso de um usuário que descumpra estes termos ou que ameace a segurança da plataforma. O Cliente pode encerrar o uso conforme o contrato. Após o encerramento, o tratamento dos dados segue a Política de Privacidade.',
      ],
    },
    {
      id: 'privacidade',
      titulo: 'Privacidade e proteção de dados',
      paragrafos: ['O tratamento de dados pessoais segue a Lei Geral de Proteção de Dados e a nossa Política de Privacidade, disponível em /privacidade.'],
    },
    {
      id: 'alteracoes',
      titulo: 'Alterações nos termos',
      paragrafos: [
        'Estes termos podem ser atualizados sempre que necessário, especialmente por mudanças nas funcionalidades ou nas condições de uso. A versão mais recente estará sempre nesta página.',
      ],
    },
    {
      id: 'lei-aplicavel',
      titulo: 'Legislação aplicável',
      paragrafos: [
        'Estes termos são regidos pelas leis da República Federativa do Brasil, em especial o Código Civil, o Código de Defesa do Consumidor, quando cabível, e a legislação de proteção de dados. Eventuais conflitos serão resolvidos conforme as regras legais de competência.',
      ],
    },
    {
      id: 'contato',
      titulo: 'Contato',
      paragrafos: [`Dúvidas sobre estes termos: ${RESPONSAVEL}, ${CONTATO}.`],
    },
  ],
}
