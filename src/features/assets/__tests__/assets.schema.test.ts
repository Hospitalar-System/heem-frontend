import { describe, expect, it } from 'vitest'
import { equipmentLabelSchema, hospitalSchema, setorSchema } from '../schemas/assets.schema'

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

describe('equipmentLabelSchema', () => {
  it('trims the value and accepts only supported label types', () => {
    expect(equipmentLabelSchema.parse({ valor: '  EQ-01  ', tipo: 'barras' })).toEqual({ valor: 'EQ-01', tipo: 'barras' })
    expect(equipmentLabelSchema.safeParse({ valor: 'EQ-01', tipo: 'nfc' }).success).toBe(false)
  })

  it('rejects empty, oversized, and control-character values', () => {
    expect(equipmentLabelSchema.safeParse({ valor: '  ', tipo: 'qr' }).success).toBe(false)
    expect(equipmentLabelSchema.safeParse({ valor: 'a'.repeat(201), tipo: 'qr' }).success).toBe(false)
    expect(equipmentLabelSchema.safeParse({ valor: 'EQ-\n01', tipo: 'qr' }).success).toBe(false)
  })
})
