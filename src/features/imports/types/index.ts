/** Tamanho máximo padrão do backend (importacao.tamanho-maximo-bytes = 5 MB); o servidor valida de novo (413). */
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024

export const batchImportTypes = [
  {
    id: 'equipamentos',
    label: 'Equipamentos',
    description: 'Cadastros do parque de equipamentos do tenant.',
    requiredNote: 'Obrigatórias: codigo, nome, setor (código do setor já cadastrado), categoria, classe_risco_anvisa, criticidade, tipo_protecao, parte_aplicada e modo_operacao. A coluna categoria é obrigatória e deve trazer o nome de uma categoria ativa já cadastrada em Categorias (a importação não cria categorias). Datas em aaaa-mm-dd ou dd/mm/aaaa; etiqueta e etiqueta_tipo são opcionais.',
    headers: ['setor', 'codigo', 'nome', 'categoria', 'modelo', 'numero_serie', 'marca', 'classe_risco_anvisa', 'status_ciclo_vida', 'criticidade', 'tipo_protecao', 'parte_aplicada', 'modo_operacao', 'data_instalacao', 'data_garantia_fim', 'etiqueta', 'etiqueta_tipo'],
  },
  {
    id: 'setores',
    label: 'Setores',
    description: 'Estrutura hospitalar associada a um hospital existente.',
    requiredNote: 'Obrigatórias: hospital (CNPJ ou nome do hospital), codigo, nome, classificacao_risco e grupo_instalacao. A coluna andar é opcional.',
    headers: ['hospital', 'codigo', 'nome', 'andar', 'classificacao_risco', 'grupo_instalacao'],
  },
  {
    id: 'usuarios',
    label: 'Usuários',
    description: 'Usuários do tenant e seus papéis permitidos.',
    requiredNote: 'Obrigatórias: codigo, nome, email e papel (admin_cliente, tecnico ou interno_hospital). A coluna hospital (CNPJ ou nome) é opcional e só vale para tecnico e interno_hospital. Cada usuário criado recebe um convite por e-mail.',
    headers: ['codigo', 'nome', 'email', 'papel', 'hospital'],
  },
] as const

/** Mensagens pt-BR para os `code`s do retorno da importação (cabeçalho e erro de linha) — Story 11.1 do backend. */
export const batchImportErrorMessages: Record<string, string> = {
  CABECALHO_INVALIDO: 'O cabeçalho do arquivo está incompleto. Use o modelo atual: a coluna categoria é obrigatória na importação de equipamentos.',
  CATEGORIA_NAO_ENCONTRADA: 'Categoria não encontrada ou desativada. Cadastre ou ative a categoria em Categorias e use o nome exato na coluna categoria.',
}

const rowErrorMessages: Record<string, string> = {
  ...batchImportErrorMessages,
  CAMPO_OBRIGATORIO: 'Campo obrigatório não preenchido.',
  CAMPO_MUITO_LONGO: 'O valor excede o tamanho máximo do campo.',
  VALOR_INVALIDO: 'Valor inválido para o campo. Use um dos valores do modelo.',
  DATA_INVALIDA: 'Data inválida. Use aaaa-mm-dd ou dd/mm/aaaa.',
  SETOR_NAO_ENCONTRADO: 'Setor não encontrado. Cadastre o setor (ou importe setores antes) e use o código exato.',
  HOSPITAL_NAO_ENCONTRADO: 'Hospital não encontrado. Use o CNPJ ou o nome exato.',
  HOSPITAL_AMBIGUO: 'Mais de um hospital com esse nome. Use o CNPJ.',
  HOSPITAL_FORA_DO_ESCOPO: 'O hospital está fora do seu escopo de acesso.',
  EMAIL_INVALIDO: 'E-mail inválido.',
  PAPEL_NAO_ESCOPAVEL: 'Só tecnico ou interno_hospital podem ser vinculados a um hospital.',
  ETIQUETA_REPETIDA_NO_ARQUIVO: 'Etiqueta repetida no arquivo.',
  ETIQUETA_EM_USO: 'Etiqueta já vinculada a outro equipamento.',
  CODIGO_JA_CADASTRADO: 'Já existe um registro com este código.',
  RECURSO_NAO_ENCONTRADO: 'Registro relacionado não encontrado.',
  ERRO_NA_LINHA: 'Não foi possível processar a linha.',
}

export function describeBatchImportError(code: string) {
  return batchImportErrorMessages[code] ?? code
}

/** Motivo pt-BR de um erro de linha; sem `code` conhecido usa a mensagem fixa do backend (nunca ecoa células). */
export function describeRowError(code: string, fallback?: string | null) {
  return rowErrorMessages[code] ?? fallback ?? code
}

/** O backend informa a coluna dentro da mensagem ("Coluna 'categoria' obrigatoria."); extrai quando existir. */
export function extractRowErrorField(code: string, message?: string | null) {
  if (code === 'CATEGORIA_NAO_ENCONTRADA') return 'categoria'
  if (code === 'SETOR_NAO_ENCONTRADO') return 'setor'
  if (code.startsWith('HOSPITAL_')) return 'hospital'
  if (code === 'EMAIL_INVALIDO') return 'email'
  if (code.startsWith('ETIQUETA_')) return 'etiqueta'
  return message?.match(/'([a-z_]+)'/)?.[1] ?? ''
}

/** Valida o arquivo antes de enviar; devolve a mensagem de erro ou string vazia. */
export function validateImportFile(file: File) {
  if (!file.name.toLocaleLowerCase('pt-BR').endsWith('.csv')) return 'Selecione um arquivo com extensão .csv.'
  if (file.size === 0) return 'O arquivo está vazio. Preencha o modelo e selecione-o novamente.'
  if (file.size > MAX_IMPORT_FILE_BYTES) return `O arquivo tem ${formatFileSize(file.size)} e excede o limite de ${formatFileSize(MAX_IMPORT_FILE_BYTES)}. Divida-o em arquivos menores.`
  return ''
}

const CSV_BOM = String.fromCharCode(0xfeff)

function csvCell(value: string | number | null | undefined) {
  let text = String(value ?? '')
  // Evita injeção de fórmula ao abrir o relatório no Excel (o código vem do arquivo do usuário).
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Relatório de erros por linha: UTF-8 com BOM, separador ponto e vírgula. */
export function createImportErrorsCsv(errors: ReadonlyArray<{ linha: number; codigo?: string | null; code: string; mensagem?: string | null }>) {
  const rows = errors.map((error) => [error.linha, error.codigo ?? '', extractRowErrorField(error.code, error.mensagem), error.code, describeRowError(error.code, error.mensagem)].map(csvCell).join(';'))
  return `${CSV_BOM}${['linha', 'codigo', 'campo', 'erro', 'motivo'].join(';')}\r\n${rows.map((row) => `${row}\r\n`).join('')}`
}

export type BatchImportType = (typeof batchImportTypes)[number]['id']

export function getBatchImportType(type: BatchImportType) {
  return batchImportTypes.find((item) => item.id === type)!
}

export function createBatchImportTemplate(type: BatchImportType) {
  return `\uFEFF${getBatchImportType(type).headers.join(';')}\r\n`
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} KB`
  return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
}
