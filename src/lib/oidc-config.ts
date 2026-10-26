// Leitura centralizada da configuração OIDC (Keycloak). Nada aqui é segredo:
// o client heem-frontend é público e só usa o login direto (Direct Access Grants).
const authority = import.meta.env.VITE_OIDC_AUTHORITY ?? 'http://localhost:8180/realms/heem'

export const oidcConfig = {
  authority: authority.replace(/\/+$/, ''),
  clientId: import.meta.env.VITE_OIDC_CLIENT_ID || 'heem-frontend',
}
