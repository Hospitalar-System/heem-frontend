import { z } from 'zod'
import { checklistItemTypes } from '../types'

export const checklistItemSchema = z.object({
  descricao: z.string().trim().min(1, 'Informe a descrição do item.').max(240, 'Use até 240 caracteres.'),
  tipo: z.enum(checklistItemTypes, { message: 'Selecione o tipo do item.' }),
  unidade: z.string().trim().max(40, 'Use até 40 caracteres.').optional(),
  obrigatorio: z.boolean(),
})

export const createChecklistSchema = z.object({
  codigo: z.string().trim().min(1, 'Informe o código do checklist.').max(40, 'Use até 40 caracteres.'),
  nome: z.string().trim().min(1, 'Informe o nome do checklist.').max(120, 'Use até 120 caracteres.'),
  itens: z.array(checklistItemSchema).min(1, 'Adicione pelo menos um item ao checklist.'),
})

export type CreateChecklistForm = z.infer<typeof createChecklistSchema>
export type ChecklistItemForm = z.infer<typeof checklistItemSchema>
