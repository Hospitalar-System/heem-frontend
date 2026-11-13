import { describe, expect, it } from 'vitest'
import { isValidCnpj, maskCep, maskCnpj } from '../br-documents'

describe('documentos brasileiros', () => {
  it('valida CNPJ pelos dígitos verificadores', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
    expect(isValidCnpj('00000000000191')).toBe(true)
    expect(isValidCnpj('11.222.333/0001-80')).toBe(false)
    expect(isValidCnpj('11111111111111')).toBe(false)
    expect(isValidCnpj('123')).toBe(false)
  })

  it('aplica máscaras progressivas', () => {
    expect(maskCnpj('11222333000181')).toBe('11.222.333/0001-81')
    expect(maskCnpj('1122')).toBe('11.22')
    expect(maskCep('90010123')).toBe('90010-123')
    expect(maskCep('9001')).toBe('9001')
  })
})
