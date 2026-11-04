// Leitura centralizada da configuração do provedor de autenticação.
// VITE_SUPABASE_ANON_KEY é a chave pública (anon); a service role NUNCA vai ao front.
const trim = (value: string | undefined) => (value ?? '').trim()

export const authConfig = {
  provider: trim(import.meta.env.VITE_AUTH_PROVIDER).toLowerCase(),
  supabaseUrl: trim(import.meta.env.VITE_SUPABASE_URL).replace(/\/+$/, ''),
  supabaseAnonKey: trim(import.meta.env.VITE_SUPABASE_ANON_KEY),
}
