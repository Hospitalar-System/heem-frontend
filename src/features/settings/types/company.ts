export const DEFAULT_BRAND_COLOR = '#3ED597'

export interface CompanyAddress {
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  cep: string | null
}

/** Perfil da empresa prestadora (GET /prestadora). Campos opcionais e tolerantes a ausência. */
export interface CompanyProfile {
  cadastrada: boolean
  razaoSocial: string | null
  cnpj: string | null
  endereco?: Partial<CompanyAddress> | null
  contatoTelefone?: string | null
  contatoEmail?: string | null
  responsavelTecnicoNome?: string | null
  responsavelTecnicoCrea?: string | null
  contratoNumero?: string | null
  corMarca?: string | null
  logoUrl?: string | null
  atualizadoEm?: string | null
}

/** Corpo do PUT /prestadora (sem cadastrada, corMarca, logoUrl e atualizadoEm). */
export interface CompanyProfileInput {
  razaoSocial: string
  cnpj: string
  endereco: CompanyAddress
  contatoTelefone: string | null
  contatoEmail: string | null
  responsavelTecnicoNome: string | null
  responsavelTecnicoCrea: string | null
  contratoNumero: string | null
}

export interface LogoUploadUrl { chave: string; uploadUrl: string; expiraEm: string }
