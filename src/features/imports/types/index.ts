export const batchImportTypes = [
  {
    id: 'equipamentos',
    label: 'Equipamentos',
    description: 'Cadastros do parque de equipamentos do tenant.',
    headers: ['setorId', 'codigo', 'nome', 'modelo', 'numeroSerie', 'marca', 'classeRiscoAnvisa', 'statusCicloVida', 'criticidade', 'tipoProtecao', 'parteAplicada', 'modoOperacao', 'dataInstalacao', 'dataGarantiaFim', 'dadosGerais'],
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
