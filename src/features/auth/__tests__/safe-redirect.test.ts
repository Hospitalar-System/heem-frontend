import { describe, expect, it } from 'vitest'
import { safeInternalPath } from '../utils/safe-redirect'

describe('safeInternalPath', () => {
  it('aceita caminho interno com query e hash', () => {
    expect(safeInternalPath('/assets/123')).toBe('/assets/123')
    expect(safeInternalPath('/assets/123?aba=documentos#topo')).toBe('/assets/123?aba=documentos#topo')
  })

  it.each([
    'https://evil.example/assets/1',
    '//evil.example',
    '/\\evil.example',
    '/assets\\..\\evil',
    'javascript:alert(1)',
    'assets/1',
    '/assets/1\r\nSet-Cookie: x=1',
    '/login',
    '/login?x=1',
    '/esqueci-senha',
    '',
    undefined,
    null,
    42,
  ])('recusa %j', (value) => {
    expect(safeInternalPath(value)).toBeNull()
  })
})
