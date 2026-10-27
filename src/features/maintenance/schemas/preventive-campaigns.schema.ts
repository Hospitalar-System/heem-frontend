import { z } from 'zod'
import { isoOf, todayCivil } from '@/components/ui/civil-date'

export const campaignFormSchema = z.object({
  hospitalId: z.string().min(1, 'Selecione o hospital.'),
  nome: z.string().trim().min(1, 'Informe o nome da campanha.').max(120, 'O nome pode ter no máximo 120 caracteres.'),
  setorIds: z.array(z.string()),
  categoriaIds: z.array(z.string()),
  dataInicio: z.string().min(1, 'Informe a data de início.'),
  dataFim: z.string(),
  recorrencia: z.enum(['avulsa', 'dias', 'meses']),
  intervalo: z.string().trim(),
  modoAtribuicao: z.enum(['tecnico', 'equilibrado', 'sem_responsavel']),
  tecnicoId: z.string(),
}).superRefine((values, ctx) => {
  const add = (path: keyof CampaignFormValues, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
  if (values.dataInicio && values.dataInicio < isoOf(todayCivil())) add('dataInicio', 'A data de início não pode estar no passado.')
  if (values.dataInicio && values.dataFim && values.dataFim < values.dataInicio) add('dataFim', 'A data final não pode ser anterior à data de início.')
  if (values.recorrencia !== 'avulsa') {
    if (!values.intervalo) add('intervalo', 'Informe o intervalo da recorrência.')
    else if (!/^\d{1,4}$/.test(values.intervalo) || Number(values.intervalo) < 1) add('intervalo', 'Use um número inteiro de 1 a 9999.')
  }
  if (values.modoAtribuicao === 'tecnico' && !values.tecnicoId) add('tecnicoId', 'Selecione o técnico responsável.')
})

export type CampaignFormValues = z.infer<typeof campaignFormSchema>
