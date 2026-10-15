# Spec F1.1 — Login do painel Web

**Status:** fluxo local de desenvolvimento implementado; integração Auth0 pendente
**Story:** F1.1 — Autenticação & Sessão (`docs/epics.md`)  
**Referência visual:** [Frame Login no Figma](https://www.figma.com/design/xyPzQydXlRphxz2V58D2ZE/Untitled?node-id=102-21)  
**Documentos relacionados:** `AGENTS.md`, `docs/design.md`, `docs/experience.md`, `docs/epics.md`

## Objetivo

Permitir que usuários acessem o painel pelo provedor de identidade. No desenvolvimento local, o frontend obtém um token de perfil de teste e consulta a identidade autenticada no backend.

## Escopo

- Tela de entrada para desktop e telas estreitas.
- Em desenvolvimento local, chamada a `GET /dev/token/admin-cliente` em `http://localhost:8080`, seguida por `GET /api/v1/me` com bearer token.
- Armazenamento do access token somente em memória.
- Integração futura com Auth0 Universal Login; o frontend não coleta senha nem chama uma rota de login do backend.
- Redirecionamento por papel a destinos definidos centralmente.
- Seletor de tema Dark, Light e Auto (preferência do sistema).
- Testes unitários/de integração do formulário e do fluxo de submissão.

Fora do escopo: recuperação de senha (o link aparece no frame, mas a story não define endpoint/fluxo), cadastro de conta, renovação automática de token e telas dos dashboards. Renovação/logout pertencem à Story F1.2. As rotas de destino poderão receber suas telas nos épicos correspondentes.

## Referência visual e layout

O frame Figma `102:21` tem duas colunas de largura semelhante dentro de uma superfície de fundo escuro com contorno fino e cantos arredondados:

- **Painel de marca:** fundo mais escuro, marca HEMM (monograma “H” verde e nome), título “Gestão de manutenção de equipamentos hospitalares” e resumo do produto.
- **Painel de acesso:** formulário centrado, largura visual aproximada de 360 px, título “Entrar”, subtítulo “Acesse o painel administrativo”, campos de E-mail e Senha e ação primária verde.
- **Responsividade:** preservar a ordem marca → formulário; reduzir paddings e empilhar os painéis em viewport estreita sem rolagem horizontal.
- O frame usa Inter, fundos próximos a `#1F1F1F`/`#1A1A1C`, superfícies de campo `#232326`, borda `#3A3A3E`, texto `#F5F5F5`/`#C2C2C2` e verde `#3ED597`. Na implementação, esses valores devem vir dos tokens semânticos do sistema.

Elementos de produto solicitados além do frame: checkbox “Lembrar-me”, seletor de tema Dark/Light/Auto no cabeçalho do painel de acesso e rodapé com identificação da plataforma/versão. O link visual “Esqueci a senha” não será uma ação ativa até existir especificação e endpoint de recuperação.

## Requisitos funcionais e regras de negócio

1. No modo local atual, o botão solicita sempre o token do perfil `admin-cliente` em `GET /dev/token/admin-cliente`.
2. O frontend consulta `GET /api/v1/me` usando `Authorization: Bearer <token>`.
3. Em sucesso, guardar o access token e a identidade apenas em memória e navegar para `/dashboard` para qualquer papel reconhecido.
4. Papéis aceitos: `super_admin`, `admin_cliente`, `tecnico` e `interno_hospital`. O dashboard exige uma sessão autenticada, mas não restringe a visualização pelo papel.
7. Uma resposta com mais de um papel deve selecionar o primeiro destino disponível segundo a prioridade definida na função de roteamento; se não houver papel reconhecido, manter a sessão sem elevar privilégios e exibir erro de acesso.
5. Em produção, o SDK Auth0 será responsável pelo Universal Login, renovação de token e logout. O token obtido será usado nas chamadas ao backend.

## Contrato de API e suposições

O token local pode ser retornado como texto ou objeto com `access_token`, `accessToken` ou `token`. `/api/v1/me` atualmente retorna `subject`, `papeis` (por exemplo, `ROLE_TECNICO`, `FACTOR_BEARER`) e `tenantId`; o frontend usa `subject` como identificador, remove o prefixo `ROLE_` e ignora autoridades que não são papéis da aplicação. O contrato Auth0 futuro também poderá fornecer os claims namespaced `https://heem.app/roles` e `https://heem.app/tenant_id`, além do e-mail.

O cliente usa `VITE_API_BASE_URL` quando definido; o padrão local é `http://localhost:8080/api/v1`. O perfil do login de desenvolvimento é fixo em `admin-cliente`. O access token nunca é gravado em `localStorage` ou `sessionStorage`.

## Erros RFC 7807

Interpretar a resposta como `ProblemDetail`, incluindo extensões `code` e `traceId`:

```ts
interface ProblemDetail {
  type?: string
  title?: string
  status?: number
  detail?: string
  instance?: string
  code?: string
  traceId?: string
}
```

- Falha na emissão do token ou na consulta de `/api/v1/me`: exibir `detail` ou `code` retornado pelo backend quando disponível.
- Usuário sem papel reconhecido: exibir erro de acesso sem conceder privilégios.
- Erro de rede/inesperado: exibir mensagem de indisponibilidade que não revele detalhes internos; incluir `traceId` quando presente.
- Apresentar o erro em região acessível (`role="alert"`) e notificação Sonner, evitando duplicação de mensagens.

## Requisitos de UI, temas e acessibilidade

- Usar classes semânticas `bg-bg`, `bg-surface`, `border-border`, `text-text-primary`, `text-text-secondary`, `bg-primary`, `bg-danger` e tokens definidos em `tailwind.config.js`.
- Suportar Dark (padrão), Light e Auto (preferência do sistema), aplicando `.dark`/`.light` no elemento raiz. Persistir somente a preferência de tema, nunca credenciais ou tokens.
- O botão de acesso tem nome acessível e foco visível; o estado de carregamento impede solicitações duplicadas.
- O botão de submit comunica carregamento, fica desabilitado durante a mutation e mantém foco visível.
- Estados: Default, Loading no botão, Error em alerta/toast; mensagens de validação junto aos campos.
- Seguir o contraste e tipografia definidos em `docs/design.md`; respeitar `prefers-reduced-motion` nas transições.

## Critérios de aceite

- [ ] A tela reflete a composição de duas colunas do frame Figma e se adapta a telas estreitas.
- [x] O modo de desenvolvimento solicita token do perfil `admin-cliente`, consulta `/api/v1/me` com bearer e bloqueia cliques repetidos durante o carregamento.
- [ ] Sucesso armazena access token apenas em memória e navega conforme roles reconhecidas.
- [ ] Falhas exibem erro útil, preferindo `detail`/`code` de RFC 7807.
- [ ] Dark, Light e Auto alteram os tokens visuais e o tema não afeta a sessão.
- [ ] Navegação por teclado e nomes acessíveis funcionam nos controles principais.
- [ ] Os cinco testes pedidos para a Story passam; `npm run lint` e `npm run build` passam.

## Decisões a confirmar com o backend

1. Integração e configuração do tenant Auth0, incluindo audience, claims e rotação de refresh token.
2. Contrato final de `/api/v1/me` e perfis disponíveis em `GET /dev/token`.
