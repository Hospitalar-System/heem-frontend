import { describe, expect, it } from 'vitest'
import { userSchema } from '../schemas/user.schema'

const base = { codigo: 'USR-01', nome: 'Clara Mendes', email: 'clara@example.com' }

describe('CREA no cadastro de usuário', () => {
  it('aceita CREA opcional para técnico e rejeita para outros papéis ou acima de 30 caracteres', () => {
    expect(userSchema.safeParse({ ...base, role: 'tecnico', crea: 'CREA-RS 123456' }).success).toBe(true)
    expect(userSchema.safeParse({ ...base, role: 'tecnico' }).success).toBe(true)
    expect(userSchema.safeParse({ ...base, role: 'admin_cliente', crea: 'CREA-RS 1' }).success).toBe(false)
    expect(userSchema.safeParse({ ...base, role: 'tecnico', crea: 'x'.repeat(31) }).success).toBe(false)
  })
})
