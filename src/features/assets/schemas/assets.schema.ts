import { z } from 'zod'
import type { CreateEquipmentInput } from '../types'

export const hospitalSchema = z.object({ nome: z.string().trim().min(1, 'Informe o nome do hospital.'), cnpj: z.string().trim().min(1, 'Informe o CNPJ.') })
export const setorSchema = z.object({
  codigo: z.string().trim().min(1, 'Informe o código.'),
  nome: z.string().trim().min(1, 'Informe o nome do setor.'),
  andar: z.string().optional(),
  classificacaoRisco: z.enum(['CRITICO', 'SEMI_CRITICO', 'NAO_CRITICO']),
  grupoInstalacao: z.enum(['GRUPO_0', 'GRUPO_1', 'GRUPO_2']),
})

export const equipmentSchema = z.object({
  setorId: z.string().min(1, 'Selecione um setor.'),
  codigo: z.string().trim().min(1, 'Informe o código.'),
  nome: z.string().trim().min(1, 'Informe o nome.'),
  modelo: z.string(),
  numeroSerie: z.string(),
  marca: z.string(),
  dadosGerais: z.array(z.object({ key: z.string(), value: z.string() })),
  classeRiscoAnvisa: z.enum(['I', 'II', 'III', 'IV']),
  statusCicloVida: z.enum(['ATIVO', 'EM_MANUTENCAO', 'INATIVO', 'DESATIVADO', 'DESCARTADO']),
  criticidade: z.enum(['ALTA', 'MEDIA', 'BAIXA']),
  tipoProtecao: z.enum(['CLASSE_I', 'CLASSE_II', 'ALIMENTACAO_INTERNA']),
  parteAplicada: z.enum(['TIPO_B', 'TIPO_BF', 'TIPO_CF']),
  modoOperacao: z.enum(['CONTINUO', 'INTERMITENTE', 'CURTA_DURACAO']),
  dataInstalacao: z.string(),
  dataGarantiaFim: z.string(),
})

export type EquipmentFormValues = z.infer<typeof equipmentSchema>

export function toEquipmentInput(values: EquipmentFormValues, fotoUrl: string | null): CreateEquipmentInput {
  const dadosGerais = Object.fromEntries(values.dadosGerais
    .filter(({ key }) => key.trim())
    .map(({ key, value }) => [key.trim(), value]))

  return {
    setorId: values.setorId,
    codigo: values.codigo,
    nome: values.nome,
    modelo: values.modelo || '',
    numeroSerie: values.numeroSerie || '',
    marca: values.marca || '',
    fotoUrl,
    dadosGerais,
    classeRiscoAnvisa: values.classeRiscoAnvisa,
    statusCicloVida: values.statusCicloVida,
    criticidade: values.criticidade,
    tipoProtecao: values.tipoProtecao,
    parteAplicada: values.parteAplicada,
    modoOperacao: values.modoOperacao,
    dataInstalacao: values.dataInstalacao || null,
    dataGarantiaFim: values.dataGarantiaFim || null,
  }
}
