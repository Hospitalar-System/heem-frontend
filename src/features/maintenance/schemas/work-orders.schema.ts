import { z } from 'zod'

export const preventiveWorkOrderSchema = z.object({
  codigo: z.string().trim().min(1, 'Informe o código da OT.').max(40),
  equipamentoId: z.string().min(1, 'Selecione um equipamento.'),
  checklistId: z.string().min(1, 'Selecione um checklist.'),
  tecnicoId: z.string().min(1, 'Selecione um técnico.'),
  dataAgendada: z.string().min(1, 'Informe a data agendada.'),
})

export type PreventiveWorkOrderFormValues = z.infer<typeof preventiveWorkOrderSchema>
