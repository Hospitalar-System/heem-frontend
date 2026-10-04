import { describe, expect, it } from 'vitest'
import { hospitalSchema, setorSchema } from '../schemas/assets.schema'

describe('hospitalSchema', () => {
  it('requires the fields defined by the backend request', () => {
    expect(hospitalSchema.safeParse({ nome: 'Hospital Central', cnpj: '12345678000190' }).success).toBe(true)
    expect(hospitalSchema.safeParse({ nome: '', cnpj: '' }).success).toBe(false)
  })
})

describe('setorSchema', () => {
  it('accepts only supported risk and installation group values', () => {
    const valid = { codigo: 'ST-01', nome: 'UTI', andar: '2', classificacaoRisco: 'CRITICO', grupoInstalacao: 'GRUPO_2' }
    expect(setorSchema.safeParse(valid).success).toBe(true)
    expect(setorSchema.safeParse({ ...valid, classificacaoRisco: 'BAIXO' }).success).toBe(false)
    expect(setorSchema.safeParse({ ...valid, codigo: ' ' }).success).toBe(false)
  })
})
