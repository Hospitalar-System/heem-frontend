import { z } from 'zod'

export const hospitalSchema = z.object({ nome: z.string().trim().min(1, 'Informe o nome do hospital.'), cnpj: z.string().trim().min(1, 'Informe o CNPJ.') })
export const setorSchema = z.object({
  codigo: z.string().trim().min(1, 'Informe o código.'),
  nome: z.string().trim().min(1, 'Informe o nome do setor.'),
  andar: z.string().optional(),
  classificacaoRisco: z.enum(['CRITICO', 'SEMI_CRITICO', 'NAO_CRITICO']),
  grupoInstalacao: z.enum(['GRUPO_0', 'GRUPO_1', 'GRUPO_2']),
})
