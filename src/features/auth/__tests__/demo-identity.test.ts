import { describe, expect, it } from 'vitest'
import { getCurrentUser, getDevelopmentToken } from '../api/identity'

describe('identidade local da demonstração', () => {
  it('autentica como Admin do Cliente sem solicitar token ao backend', async () => {
    const token = await getDevelopmentToken()
    const user = await getCurrentUser(token)

    expect(token).toBe('heem-demo-admin-cliente-token')
    expect(user).toMatchObject({
      id: 'user-demo-1',
      name: 'Clara Mendes',
      roles: ['admin_cliente'],
      tenantId: 'tenant-demo-1',
    })
  })
})
