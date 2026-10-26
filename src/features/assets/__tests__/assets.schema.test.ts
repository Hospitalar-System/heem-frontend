import { describe, expect, it } from 'vitest'
import { categorySchema, equipmentLabelSchema, equipmentSchema, hospitalSchema, setorSchema, toEquipmentInput } from '../schemas/assets.schema'

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

describe('equipmentSchema categoria', () => {
  const valid = {
    setorId: 'sector-1', codigo: 'EQ-1', nome: 'Bomba', categoriaId: 'cat-1', modelo: '', numeroSerie: '', marca: '', dadosGerais: [],
    classeRiscoAnvisa: 'I', statusCicloVida: 'ATIVO', criticidade: 'MEDIA', tipoProtecao: 'CLASSE_I', parteAplicada: 'TIPO_B',
    modoOperacao: 'CONTINUO', dataInstalacao: '', dataGarantiaFim: '',
  }

  it('requires a category and forwards it in the payload', () => {
    expect(equipmentSchema.safeParse(valid).success).toBe(true)
    expect(equipmentSchema.safeParse({ ...valid, categoriaId: '' }).success).toBe(false)
    const { categoriaId, ...withoutCategory } = valid
    void categoriaId
    expect(equipmentSchema.safeParse(withoutCategory).success).toBe(false)
    expect(toEquipmentInput(equipmentSchema.parse(valid), null).categoriaId).toBe('cat-1')
  })
})

describe('categorySchema', () => {
  it('trims and requires the name', () => {
    expect(categorySchema.parse({ nome: '  Bomba  ', checklistPadraoId: '', ativa: true }).nome).toBe('Bomba')
    expect(categorySchema.safeParse({ nome: '   ', checklistPadraoId: '', ativa: true }).success).toBe(false)
  })
})
