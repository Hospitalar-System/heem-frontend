export interface PlatformUser {
  id: string
  codigo: string
  nome: string
  email: string
  role: string
  ativo: boolean
}

export interface PlatformUserInput {
  codigo: string
  nome: string
  email: string
  role: string
}
