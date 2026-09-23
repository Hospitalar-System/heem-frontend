# Spec F1.1 — Login do painel Web

**Status:** aprovada para implementação nesta tarefa  
**Story:** F1.1 — Autenticação & Sessão (`docs/epics.md`)  
**Referência visual:** [Frame Login no Figma](https://www.figma.com/design/xyPzQydXlRphxz2V58D2ZE/Untitled?node-id=102-21)  
**Documentos relacionados:** `AGENTS.md`, `docs/design.md`, `docs/experience.md`, `docs/epics.md`

## Objetivo

Permitir que usuários do HEMM acessem o painel Web com e-mail e senha, recebam mensagens de erro acionáveis e sigam para a área inicial correspondente ao seu papel.

## Escopo

- Tela e formulário de login para desktop e telas estreitas.
- Validação local de credenciais, chamada à API, captura de `ProblemDetail` e feedback de carregamento/erro.
- Armazenamento do access token somente em memória e suporte à cookie de refresh `HttpOnly` enviada pelo backend.
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

1. O formulário apresenta e-mail, senha, “Lembrar-me” e botão “Entrar”.
2. E-mail é obrigatório e deve ter formato válido. Não há lista aprovada de domínios corporativos; o cliente não deve inventar uma allowlist. A autorização final é do backend.
3. Senha é obrigatória e deve conter ao menos 6 caracteres.
4. Submeter dados válidos executa `POST /api/v1/auth/login` com JSON de credenciais. O estado de carregamento impede submissões duplicadas.
5. Em sucesso, guardar o access token em memória, guardar o perfil na sessão da aplicação e navegar para a rota inicial do papel.
6. Papéis aceitos: `super_admin`, `admin_cliente`, `tecnico` e `interno_hospital`. O roteamento é uma convenção inicial e deve ser centralizado:
   - `super_admin` → `/platform/clients`
   - `admin_cliente` → `/dashboard`
   - `tecnico` → `/field`
   - `interno_hospital` → `/hospital/requests`
7. Uma resposta com mais de um papel deve selecionar o primeiro destino disponível segundo a prioridade definida na função de roteamento; se não houver papel reconhecido, manter a sessão sem elevar privilégios e exibir erro de acesso.
8. “Lembrar-me” será enviado como campo opcional no request. Seu efeito de duração depende de suporte do backend na política da cookie de refresh; o front-end nunca altera a duração de uma cookie `HttpOnly`.

## Contrato de API e suposições

O repositório não contém a especificação OpenAPI do backend. Até confirmar o contrato real, a implementação adota esta forma provisória:

**Request**

```json
{
  "email": "usuario@empresa.com",
  "password": "********",
  "rememberMe": false
}
```

`rememberMe` é opcional e precisa ser confirmado com o backend; removê-lo do JSON se o DTO da API não o aceitar.

**Response esperada pelo front-end**

```json
{
  "accessToken": "<token de curta duração>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "id": "<id>",
    "name": "<nome>",
    "email": "usuario@empresa.com",
    "roles": ["admin_cliente"],
    "tenantId": "<tenant opcional>"
  }
}
```

O backend deve emitir o refresh token por cookie `HttpOnly`, `Secure` em HTTPS e `SameSite` apropriado. O Axios usa `withCredentials`; o cliente não lê nem persiste o refresh token. O access token permanece apenas em memória e é removido ao encerrar a sessão. Nunca gravar tokens em `localStorage` ou `sessionStorage`.

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

- Credencial inválida: exibir `detail` ou `code` retornado pelo backend; não substituir por erro genérico fixo.
- Usuário inativo e tenant bloqueado: exibir mensagem segura retornada pela API e preservar o formulário para nova tentativa.
- Erro de rede/inesperado: exibir mensagem de indisponibilidade que não revele detalhes internos; incluir `traceId` quando presente.
- Apresentar o erro em região acessível (`role="alert"`) e notificação Sonner, evitando duplicação de mensagens.

## Requisitos de UI, temas e acessibilidade

- Usar classes semânticas `bg-bg`, `bg-surface`, `border-border`, `text-text-primary`, `text-text-secondary`, `bg-primary`, `bg-danger` e tokens definidos em `tailwind.config.js`.
- Suportar Dark (padrão), Light e Auto (preferência do sistema), aplicando `.dark`/`.light` no elemento raiz. Persistir somente a preferência de tema, nunca credenciais ou tokens.
- Todos os controles têm label associado; usar `type="email"`, `autoComplete="username"`, `autoComplete="current-password"` e `aria-invalid`/`aria-describedby` para erros de campo.
- Tab percorre os campos e ações em ordem visual; Enter submete o formulário quando válido.
- Botão de visibilidade da senha tem `type="button"`, nome acessível que alterna entre “Mostrar senha” e “Ocultar senha” e não altera o valor.
- O botão de submit comunica carregamento, fica desabilitado durante a mutation e mantém foco visível.
- Estados: Default, Loading no botão, Error em alerta/toast; mensagens de validação junto aos campos.
- Seguir o contraste e tipografia definidos em `docs/design.md`; respeitar `prefers-reduced-motion` nas transições.

## Critérios de aceite

- [ ] A tela reflete a composição de duas colunas do frame Figma e se adapta a telas estreitas.
- [ ] Campos vazios, e-mail malformado e senha menor que 6 caracteres são impedidos pelo schema Zod e mostram erro acessível.
- [ ] E-mail/senha válidos enviam request à rota especificada; o botão mostra carregamento e bloqueia cliques repetidos.
- [ ] Sucesso armazena access token apenas em memória e navega conforme roles reconhecidas.
- [ ] Erro RFC 7807 exibe `detail`/`code` apropriado e não perde o valor do e-mail.
- [ ] Toggle mostra/oculta a senha sem perder o valor.
- [ ] Dark, Light e Auto alteram os tokens visuais e o tema não afeta a sessão.
- [ ] Navegação por teclado e nomes acessíveis funcionam nos controles principais.
- [ ] Os cinco testes pedidos para a Story passam; `npm run lint` e `npm run build` passam.

## Decisões a confirmar com o backend

1. Forma exata do request/response e capitalização dos campos.
2. Se `rememberMe` é aceito e como altera expiração da cookie de refresh.
3. Nome, atributos e comportamento de refresh da cookie `HttpOnly`.
4. Valores oficiais de `ProblemDetail.code` para credenciais, conta inativa e tenant bloqueado.
5. Claims/estrutura de roles e rotas de landing definitivas para cada perfil.
