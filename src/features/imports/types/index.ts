export const batchImportTypes = [
  {
    id: 'equipamentos',
    label: 'Equipamentos',
    description: 'Cadastros do parque de equipamentos do tenant.',
    requiredNote: 'A coluna categoria é obrigatória e deve trazer o nome de uma categoria ativa já cadastrada em Categorias (a importação não cria categorias).',
    headers: ['setorId', 'codigo', 'nome', 'categoria', 'modelo', 'numeroSerie', 'marca', 'classeRiscoAnvisa', 'statusCicloVida', 'criticidade', 'tipoProtecao', 'parteAplicada', 'modoOperacao', 'dataInstalacao', 'dataGarantiaFim', 'dadosGerais'],
  },
  {
    id: 'setores',
    label: 'Setores',
    description: 'Estrutura hospitalar associada a um hospital existente.',
    headers: ['hospitalId', 'codigo', 'nome', 'andar', 'classificacaoRisco', 'grupoInstalacao'],
  },
  {
    id: 'usuarios',
    label: 'Usuários',
    description: 'Usuários do tenant e seus papéis permitidos.',
    headers: ['codigo', 'nome', 'email', 'role'],
  },
] as const

/** Mensagens pt-BR para os códigos de erro do retorno da importação (cabeçalho e linha). */
export const batchImportErrorMessages: Record<string, string> = {
  CABECALHO_INVALIDO: 'O cabeçalho do arquivo está incompleto. Use o modelo atual: a coluna categoria é obrigatória na importação de equipamentos.',
  CATEGORIA_NAO_ENCONTRADA: 'Categoria não encontrada ou desativada. Cadastre ou ative a categoria em Categorias e use o nome exato na coluna categoria.',
}

export function describeBatchImportError(code: string) {
  return batchImportErrorMessages[code] ?? code
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
