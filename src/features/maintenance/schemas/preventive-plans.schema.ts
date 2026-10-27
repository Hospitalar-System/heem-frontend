import { z } from 'zod'

const base = {
  tecnicoPadraoId: z.string().min(1, 'Selecione o técnico padrão.'),
  intervaloDias: z.string().trim().min(1, 'Informe o intervalo em dias.')
    .regex(/^\d{1,5}$/, 'Use apenas números inteiros, com até 5 dígitos.')
    .refine((value) => Number(value) >= 1, 'O intervalo mínimo é de 1 dia.'),
  dataAncora: z.string().min(1, 'Informe a data âncora.'),
}

export const createPreventivePlanSchema = z.object({
  equipamentoId: z.string().min(1, 'Selecione um equipamento.'),
  checklistId: z.string().min(1, 'Selecione um checklist.'),
  ...base,
})

/** Na edição o equipamento e o checklist são fixos (o contrato só aceita técnico, intervalo e âncora). */
export const editPreventivePlanSchema = z.object({
  equipamentoId: z.string(),
  checklistId: z.string(),
  ...base,
})

export type PreventivePlanFormValues = z.infer<typeof createPreventivePlanSchema>
