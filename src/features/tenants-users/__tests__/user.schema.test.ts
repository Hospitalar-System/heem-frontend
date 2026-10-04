import { describe, expect, it } from 'vitest'
import { userSchema } from '../schemas/user.schema'

describe('userSchema', () => {
  it('validates create data and limits tenant roles', () => {
    const valid = { codigo: 'USR-01', nome: 'Clara Mendes', email: 'clara@example.com', role: 'admin_cliente' }
    expect(userSchema.safeParse(valid).success).toBe(true)
    expect(userSchema.safeParse({ ...valid, email: 'not-an-email' }).success).toBe(false)
    expect(userSchema.safeParse({ ...valid, role: 'super_admin' }).success).toBe(false)
  })
})
