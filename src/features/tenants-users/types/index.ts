export type TenantRole = 'admin_cliente' | 'tecnico' | 'interno_hospital'
export interface TenantUser { id: string; codigo: string; nome: string; email: string; role: TenantRole; ativo: boolean; crea?: string | null }
export interface TenantUserInput { codigo: string; nome: string; email: string; role: TenantRole; crea?: string }
