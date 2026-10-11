import { describe, expect, it } from 'vitest'
import { reportFiltersSchema } from '../schemas/report-filters.schema'

describe('reportFiltersSchema', () => {
  it('accepts a valid date range', () => {
    expect(reportFiltersSchema.safeParse({ startDate: '2026-10-01', endDate: '2026-10-11', hospitalId: '', setorId: '' }).success).toBe(true)
  })

  it('rejects a range where the start is after the end', () => {
    expect(reportFiltersSchema.safeParse({ startDate: '2026-10-12', endDate: '2026-10-11', hospitalId: '', setorId: '' }).success).toBe(false)
  })
})
