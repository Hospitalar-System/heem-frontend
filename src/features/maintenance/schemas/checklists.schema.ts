import { z } from 'zod'

export const createChecklistSchema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do checklist.').max(120, 'Use até 120 caracteres.'),
})

export const checklistItemSchema = z.object({
  descricao: z.string().trim().min(1, 'Informe a descrição do item.').max(240, 'Use até 240 caracteres.'),
  tipo: z.string().trim().min(1, 'Informe o tipo do item.').max(60, 'Use até 60 caracteres.'),
  unidade: z.string().trim().max(40, 'Use até 40 caracteres.').optional(),
  obrigatorio: z.boolean(),
})

export type CreateChecklistForm = z.infer<typeof createChecklistSchema>
export type ChecklistItemForm = z.infer<typeof checklistItemSchema>
