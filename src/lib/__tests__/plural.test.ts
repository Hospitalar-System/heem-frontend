import { describe, expect, it } from 'vitest'
import { plural } from '../plural'

describe('plural', () => {
  it('concorda o substantivo com a quantidade', () => {
    expect(plural(0, 'ordem', 'ordens')).toBe('0 ordens')
    expect(plural(1, 'ordem', 'ordens')).toBe('1 ordem')
    expect(plural(4, 'ordem', 'ordens')).toBe('4 ordens')
  })
})
