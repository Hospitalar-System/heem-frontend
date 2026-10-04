export type TenantRole = 'admin_cliente' | 'tecnico' | 'interno_hospital'
export interface TenantUser { id: string; codigo: string; nome: string; email: string; role: TenantRole; ativo: boolean }
export interface TenantUserInput { codigo: string; nome: string; email: string; role: TenantRole }
