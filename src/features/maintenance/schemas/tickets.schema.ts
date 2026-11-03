import { z } from 'zod'

export const newTicketSeverities = ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'] as const
export type NewTicketSeverity = (typeof newTicketSeverities)[number]

export const newTicketSeverityOptions: { value: NewTicketSeverity; label: string; help: string }[] = [
  { value: 'CRITICA', label: 'Crítica', help: 'Parado ou risco ao paciente' },
  { value: 'ALTA', label: 'Alta', help: 'Funciona, mas com falha relevante' },
  { value: 'MEDIA', label: 'Média', help: 'Falha intermitente, sem urgência' },
  { value: 'BAIXA', label: 'Baixa', help: 'Ajuste, ruído ou estética' },
]

export const newTicketSchema = z.object({
  hospitalId: z.string().min(1, 'Selecione o hospital.'),
  setorId: z.string(),
  equipamentoId: z.string().min(1, 'Selecione o equipamento.'),
  severidade: z.enum(newTicketSeverities, { message: 'Selecione a severidade.' }),
  descricao: z.string().trim().min(1, 'Descreva o problema.'),
  tecnicoResponsavelId: z.string(),
})

export type NewTicketFormValues = z.infer<typeof newTicketSchema>
