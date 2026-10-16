import { z } from 'zod'

export const slaSeverities = ['CRITICA', 'ALTA', 'MEDIA', 'BAIXA'] as const
export const slaSeveritySchema = z.enum(slaSeverities)

export const slaPolicyUpdateEntrySchema = z.object({
  severidade: slaSeveritySchema,
  atendimentoMin: z.number().int().positive(),
  resolucaoMin: z.number().int().positive(),
}).refine((entry) => entry.resolucaoMin >= entry.atendimentoMin, {
  path: ['resolucaoMin'],
  message: 'O prazo de resolução deve ser igual ou maior que o de atendimento.',
})

export const slaPolicyEntrySchema = slaPolicyUpdateEntrySchema.extend({ padrao: z.boolean() })

function addDuplicateSeverityIssues(rows: Array<{ severidade: z.infer<typeof slaSeveritySchema> }>, ctx: z.RefinementCtx) {
  const seen = new Set<string>()
  rows.forEach((row, index) => {
    if (seen.has(row.severidade)) {
      ctx.addIssue({ code: 'custom', path: [index, 'severidade'], message: 'Severidade duplicada.' })
    }
    seen.add(row.severidade)
  })
}

export const slaPolicyResponseSchema = z.array(slaPolicyEntrySchema).length(4).superRefine((rows, ctx) => {
  addDuplicateSeverityIssues(rows, ctx)
  slaSeverities.forEach((severity) => {
    if (!rows.some((row) => row.severidade === severity)) {
      ctx.addIssue({ code: 'custom', message: `A política não retornou a severidade ${severity}.` })
    }
  })
})

export const slaPolicyUpdateSchema = z.array(slaPolicyUpdateEntrySchema).min(1).max(4).superRefine(addDuplicateSeverityIssues)

const durationInputSchema = z.object({
  valor: z.number().int().positive('Informe um prazo maior que zero.'),
  unidade: z.enum(['min', 'h']),
})

export const slaPolicyFormSchema = z.object({
  rows: z.array(z.object({
    severidade: slaSeveritySchema,
    atendimento: durationInputSchema,
    resolucao: durationInputSchema,
    padrao: z.boolean(),
  })).length(4),
}).superRefine(({ rows }, ctx) => {
  rows.forEach((row, index) => {
    const atendimentoMin = row.atendimento.valor * (row.atendimento.unidade === 'h' ? 60 : 1)
    const resolucaoMin = row.resolucao.valor * (row.resolucao.unidade === 'h' ? 60 : 1)
    if (resolucaoMin < atendimentoMin) {
      ctx.addIssue({
        code: 'custom',
        path: ['rows', index, 'resolucao', 'valor'],
        message: 'A resolução deve ser igual ou maior que o atendimento.',
      })
    }
  })
})

export type SlaSeverity = z.infer<typeof slaSeveritySchema>
export type SlaPolicyEntry = z.infer<typeof slaPolicyEntrySchema>
export type SlaPolicyUpdateEntry = z.infer<typeof slaPolicyUpdateEntrySchema>
export type SlaPolicyFormValues = z.infer<typeof slaPolicyFormSchema>

export function orderSlaPolicy(rows: SlaPolicyEntry[]): SlaPolicyEntry[] {
  return [...rows].sort((a, b) => slaSeverities.indexOf(a.severidade) - slaSeverities.indexOf(b.severidade))
}
