import { z } from 'zod'

export const reportFiltersSchema = z.object({
  startDate: z.string().min(1, 'Informe a data inicial.'),
  endDate: z.string().min(1, 'Informe a data final.'),
  hospitalId: z.string(),
  setorId: z.string(),
}).refine(({ startDate, endDate }) => startDate <= endDate, {
  message: 'A data inicial deve ser anterior ou igual à data final.',
  path: ['endDate'],
})
