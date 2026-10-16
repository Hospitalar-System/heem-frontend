import { describe, expect, it } from 'vitest'
import { createTenantSchema, normalizeCnpj } from '../schemas/tenant.schema'

describe('createTenantSchema', () => {
  it('normalizes formatted CNPJ and validates required administrator fields', () => {
    const parsed = createTenantSchema.safeParse({
      tipo: 'PJ',
      nome: ' Grupo Hospitalar ',
      cnpj: '12.345.678/0001-90',
      adminNome: 'Clara Mendes',
      adminEmail: 'clara@example.com',
      adminCodigo: 'ADM-001',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(normalizeCnpj(parsed.data.cnpj)).toBe('12345678000190')
  })

  it('rejects invalid CNPJ and administrator email', () => {
    const values = { tipo: 'PJ', nome: 'Grupo', cnpj: '123', adminNome: 'Clara', adminEmail: 'invalid', adminCodigo: 'ADM-1' }
    expect(createTenantSchema.safeParse(values).success).toBe(false)
  })
})
