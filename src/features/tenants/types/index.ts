export interface Tenant {
  id: string
  cnpj: string
  nome: string
  ativo: boolean
  createdAt: string
}

export interface CreateTenantInput {
  tipo: 'PF' | 'PJ'
  cnpj: string
  nome: string
  adminNome: string
  adminEmail: string
  adminCodigo: string
}

export interface CreatedTenant {
  tenantId: string
  cnpj: string
  nome: string
  createdAt: string
  adminInicialId: string
  adminInicialEmail: string
}
