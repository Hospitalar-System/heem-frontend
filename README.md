# HEEM Front-end

Aplicação web de gestão do HEEM, um CMMS hospitalar multi-tenant para administração de clientes, ativos e rotinas de manutenção. O painel atende principalmente Super Admin e Admin do Cliente. O app de campo do Técnico está no repositório [`heem-mobile`](https://github.com/Hospitalar-System/heem-mobile).

> **Status:** a base de desenvolvimento está configurada. As telas e funcionalidades do produto ainda serão implementadas conforme as especificações em `docs/`.

## Requisitos

- Node.js 20 ou superior
- npm

## Começar

Na raiz do repositório, instale as dependências e inicie o servidor local:

```bash
npm install
npm run dev
```

O Vite exibirá o endereço local no terminal. Para gerar e servir uma versão de produção:

```bash
npm run build
npm run preview
```

## Comandos disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento com atualização automática. |
| `npm run build` | Verifica os tipos TypeScript e gera a aplicação em `dist/`. |
| `npm run preview` | Serve localmente o build de produção. |
| `npm run lint` | Executa o ESLint no projeto. |
| `npm test` | Executa os testes uma vez com Vitest. |
| `npm run test:watch` | Executa o Vitest em modo de observação. |

## Documentação do produto

Consulte as especificações antes de implementar funcionalidades ou componentes:

- [`docs/design.md`](docs/design.md) — modos de tema, tokens semânticos e regras visuais.
- [`docs/experience.md`](docs/experience.md) — arquitetura da informação, fluxos e padrões de interação.
- [`docs/epics.md`](docs/epics.md) — épicos, histórias, regras de negócio e critérios de aceite.
- [`AGENTS.md`](AGENTS.md) — instruções de desenvolvimento para agentes de IA.

## Stack

- React 19, TypeScript e Vite 5
- React Router DOM 6 para navegação
- TanStack React Query e Axios para dados e chamadas HTTP
- React Hook Form e Zod para formulários e validação
- Tailwind CSS 3 para estilos, com tokens semânticos configurados em [`tailwind.config.js`](tailwind.config.js)
- Vitest, happy-dom e Testing Library para testes
- Sonner para notificações, Lucide para ícones, Recharts para gráficos e dnd-kit para interações de arrastar e soltar

## Estrutura atual

```text
src/
├── app/
│   ├── providers.tsx  # React Query e notificações
│   └── router.tsx     # Rotas da aplicação
├── test/
│   └── setup.ts       # Configuração global da Testing Library
├── App.tsx            # Página inicial provisória
├── index.css          # Estilos e tokens base
└── main.tsx           # Ponto de entrada
```

As funcionalidades devem ser organizadas por domínio em `src/features/`, com páginas, componentes, hooks, schemas, tipos e acesso à API agrupados por feature. Componentes reutilizáveis e infraestrutura ficam em `src/components/`, `src/lib/`, `src/config/` e `src/types/`, conforme necessário.

## Integração com o backend

O front-end consome o contrato REST/OpenAPI do [`heem-backend`](https://github.com/Hospitalar-System/heem-backend), com endpoints sob `/api/v1/`.

Sem `VITE_API_BASE_URL`, a aplicação inicia em modo de demonstração: o login usa um perfil local e as telas recebem dados sintéticos mantidos em memória, sem chamadas ao backend. As alterações feitas nesse modo não são persistidas. Para conectar uma API, configure `VITE_API_BASE_URL` (por exemplo, `http://localhost:8080/api/v1`). `VITE_DEMO_MODE=true` força a demonstração mesmo com uma URL configurada; `VITE_DEMO_MODE=false` desativa o modo local.

### Variáveis de ambiente

Copie `.env.example` para `.env.local` e ajuste. Toda leitura de `VITE_OIDC_*` fica em `src/lib/oidc-config.ts` e a de `VITE_SUPABASE_*`/`VITE_AUTH_PROVIDER` em `src/lib/auth-config.ts`.

| Variável | Padrão | Uso |
| --- | --- | --- |
| `VITE_API_BASE_URL` | (vazio: modo demonstração) | URL base da API, por exemplo `http://localhost:8080/api/v1`. |
| `VITE_OIDC_AUTHORITY` | `http://localhost:8180/realms/heem` | Realm do Keycloak; o app chama `{authority}/protocol/openid-connect/token` e `/logout`. |
| `VITE_OIDC_CLIENT_ID` | `heem-frontend` | Client público do Keycloak com login direto (Direct Access Grants). |
| `VITE_AUTH_PROVIDER` | `supabase` se `VITE_SUPABASE_URL` existir, senão `keycloak` | Provedor de autenticação (`supabase` ou `keycloak`). Permite voltar ao Keycloak sem mudar código. |
| `VITE_SUPABASE_URL` | (vazio) | URL do projeto Supabase, por exemplo `https://<ref>.supabase.co`; o app chama `{url}/auth/v1/token`, `/logout`, `/recover` e `/user`. |
| `VITE_SUPABASE_ANON_KEY` | (vazio) | Chave pública (anon/publishable) do Supabase. É pública por desenho; a `service_role` NUNCA vai ao front. |
| `VITE_DEMO_MODE` | (vazio) | `true` força a demonstração; `false` a desativa. |

Com o Supabase, o fluxo "Esqueci minha senha" (`/esqueci-senha`) e a redefinição/convite (`/redefinir-senha`) ficam disponíveis; o link do e-mail chega com os tokens no fragmento da URL, que é lido no cliente e removido do histórico na hora. A URL `{origem}/redefinir-senha` precisa estar em *Redirect URLs* do projeto Supabase. Com o Keycloak esses fluxos ficam ocultos.

Sessão: o access token fica só em memória; o refresh token fica em `sessionStorage` (ou `localStorage` com "lembrar de mim") sob a chave `heem.auth.refresh` e é usado para restaurar a sessão ao abrir o app. Senha, access token e usuário nunca são persistidos.

### Deploy na Vercel

Configure no projeto da Vercel as variáveis abaixo (valores de staging). Para autenticar pelo Supabase, adicione também `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (a anon key é pública e pode ficar no build; a service role NUNCA entra em variável `VITE_*`):

| Variável | Valor (staging) |
| --- | --- |
| `VITE_API_BASE_URL` | `https://heem-backend.onrender.com/api/v1` |
| `VITE_OIDC_AUTHORITY` | `https://heem-keycloak.onrender.com/realms/heem` |
| `VITE_OIDC_CLIENT_ID` | `heem-frontend` |

- As variáveis `VITE_*` são embutidas só no build: alterar um valor exige um novo deploy (redeploy).
- A origem `https://heem-frontend.vercel.app` precisa estar em `webOrigins` do client `heem-frontend` no Keycloak e no CORS do backend, pois o navegador chama o endpoint de token diretamente.
- O access token é renovado automaticamente (em 401 e cerca de 60 s antes de expirar); a sessão total (até 7 dias) é definida pelo Keycloak.
