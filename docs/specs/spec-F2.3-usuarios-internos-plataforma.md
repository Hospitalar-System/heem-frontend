# Spec F2.3 — Usuários internos da plataforma (Super Admin)

**Status:** fluxo de interface e integração implementados; DTO de `platform-users` precisa ser validado com o backend.
**Story:** F2.3 — Usuários internos da plataforma (`docs/epics.md`)
**Issue:** [#5 — Story F2.3: Usuários internos da plataforma (Super Admin)](https://github.com/Hospitalar-System/heem-frontend/issues/5)
**Documentos relacionados:** `AGENTS.md`, `docs/design.md`, `docs/experience.md`, `docs/epics.md`, `docs/specs/spec-F2.2-gestao-usuarios-tenant.md`
**Persona:** Super Admin (`super_admin`)
**Rota proposta:** `/platform/users`

## Objetivo

Permitir que um Super Admin consulte, cadastre, edite e desative usuários internos da plataforma. Todas as operações devem usar exclusivamente `/api/v1/platform-users`; essa tela não reutiliza endpoints de usuários do tenant (`/api/v1/users`) nem fica disponível para `admin_cliente`.

## Escopo

- Listagem de usuários internos com os dados retornados pela API.
- Criação e edição conforme campos aceitos pelos DTOs do backend.
- Desativação com confirmação explícita e atualização dos dados após sucesso.
- Estados de carregamento, erro recuperável, lista vazia, validação, processamento e sucesso.
- Acesso e navegação restritos a `super_admin`.

Fora de escopo: gestão de usuários de clientes/tenants, convites ou autenticação no provedor de identidade, redefinição de senha, exclusão física, anonimização de PII e reativação (não há operações correspondentes confirmadas nesta especificação).

## Interface e navegação

- Reutilizar o shell do painel e o padrão de tabela UX-DR3 já empregado em Usuários & Papéis, conforme a suposição da issue.
- Adicionar a opção “Usuários da Plataforma” à área de administração da plataforma, junto às opções exclusivas do Super Admin.
- Proteger a rota `/platform/users` para `super_admin`; usuários sem essa permissão não devem ver o link e devem ser redirecionados para uma rota autorizada ao tentar acesso direto.
- A tabela deve apresentar somente atributos fornecidos pelo DTO confirmado. Nome, e-mail, papel, estado e ações são candidatos de interface, não contrato presumido.
- Disponibilizar ações de criar, editar e desativar conforme permissões e estado retornados pela API.
- Em viewport estreita, preservar leitura e acesso às ações por rolagem horizontal ou adaptação responsiva consistente com as tabelas existentes.

## Rotas e contratos de API

As rotas abaixo fazem parte do inventário de endpoints informado para o backend. Todas devem ser chamadas via `apiClient`, com o bearer token da sessão e prefixo `/api/v1`.

| Operação | Endpoint | Uso |
|---|---|---|
| Listar usuários internos | `GET /platform-users` | Popular a tabela; filtros/paginação dependem do contrato publicado. |
| Criar usuário interno | `POST /platform-users` | Enviar somente campos e enumerações aceitos pelo DTO de criação. |
| Consultar usuário | `GET /platform-users/{id}` | Carregar dados atuais para edição, se necessário ao fluxo. |
| Editar usuário | `PUT /platform-users/{id}` | Enviar os campos mutáveis aceitos pelo DTO de atualização. |
| Desativar usuário | `POST /platform-users/{id}/desativar` | Desativar sem exclusão física e refletir o estado confirmado pela resposta/API. |

### Contrato pendente de confirmação

Antes de implementar formulários, colunas ou validações, confirmar no OpenAPI/backend:

- Estrutura da resposta de listagem e detalhe, incluindo identificador e representação do estado ativo/inativo.
- Campos obrigatórios, opcionais e mutáveis de criação e atualização, além de formatos e limites.
- Valores permitidos para papéis de plataforma e se o papel `super_admin` pode ser atribuído pela interface.
- Respostas dos endpoints, comportamento de paginação/filtros e códigos de erro relevantes.
- Regras de autorização específicas para listar, criar, editar e desativar usuários internos.

Não copiar o DTO de `/users` nem enviar `tenantId`. A implementação inicial usa `codigo`, `nome`, `email` e papel fixo `super_admin`, por analogia com o cadastro de identidades disponível no frontend; esse payload é provisório, não confirmado pelo backend, e deve ser reconciliado com o DTO de `/platform-users` antes de considerar a integração concluída.

## Regras funcionais e de segurança

1. O frontend usa apenas as rotas `/platform-users` para este fluxo; nenhuma chamada pode cair em `/users` ou em rotas de tenant.
2. O acesso é restrito a `super_admin` tanto na rota quanto na navegação e nas ações. A autorização do backend permanece a autoridade final.
3. Não inferir permissões nem permitir atribuição de papéis sem enumeração explícita do contrato.
4. Desativar exige confirmação que identifique claramente a conta afetada. A ação não deve ser oferecida novamente para conta já inativa, se esse estado existir no DTO.
5. Não oferecer exclusão física, reativação ou convite enquanto não houver endpoints/fluxos documentados.
6. Após criar, editar ou desativar com sucesso, invalidar queries de lista e detalhe relevantes; não simular sucesso local antes da resposta.
7. Exibir erros RFC 7807 (`detail`/`code`) de forma acessível e preservar os dados do formulário após falha.
8. Não persistir tokens ou dados pessoais em `localStorage`/`sessionStorage`; usar a sessão existente e cache em memória do React Query.

## Estados e acessibilidade

- **Loading:** skeleton da tabela e bloqueio de ações dependentes dos dados.
- **Empty:** estado vazio claro e CTA de criação apenas para `super_admin` autorizado.
- **Error:** mensagem recuperável com ação para tentar novamente; não confundir falha com lista vazia.
- **Mutation:** desabilitar submissões duplicadas, indicar processamento e manter o modal aberto se houver erro.
- **Success:** atualizar a lista a partir da API e comunicar somente a operação confirmada.
- Associar labels aos campos, manter foco visível, ordem de tabulação previsível e gerenciamento de foco nos diálogos. A confirmação de desativação deve anunciar qual conta será afetada.
- Usar tokens semânticos de `docs/design.md`, com suporte aos temas escuro, claro e automático e aos estados de loading/empty definidos pelo sistema.

## Critérios de aceite

- [x] `super_admin` consulta usuários internos usando `GET /api/v1/platform-users`.
- [x] `super_admin` cria e edita registros usando `POST /api/v1/platform-users` e `PUT /api/v1/platform-users/{id}`; payload provisório aguardando confirmação do DTO.
- [x] O formulário consulta `GET /api/v1/platform-users/{id}` para carregar dados atuais na edição.
- [x] A desativação usa `POST /api/v1/platform-users/{id}/desativar` e invalida a lista após sucesso.
- [x] Nenhuma operação desta tela usa `/api/v1/users` ou outra rota de tenant.
- [x] `admin_cliente` não vê o item de navegação e é redirecionado ao tentar a rota protegida.
- [x] Estados loading, empty, error, validação, sucesso e confirmação de desativação estão implementados.
- [x] Testes cobrem listagem, detalhe/edição, criação, desativação, erro de carregamento e controle de acesso por papel.

## Plano de testes

- Testes de API/UI verificam listagem, detalhe, criação, edição, desativação, payloads provisórios e atualização das queries após mutações.
- Testes de componentes cobrem tabela, loading, vazio, erro recuperável, validação, criação, edição e confirmação/desativação.
- Testes de autorização confirmam acesso para `super_admin` e ausência/bloqueio para `admin_cliente` e demais papéis.
- Testes de regressão garantem que as mutações da tela não chamam `/users`.
- Validar visualmente as variantes Dark/Light e o comportamento responsivo da tabela.

## Pendências para iniciar a implementação

1. Obter ou consultar o OpenAPI/DTOs de `platform-users` para validar/corrigir campos, enum, validações e respostas reais.
2. Confirmar que os endpoints estão protegidos para `super_admin` e se o backend permite criar outro usuário com papel `super_admin`.
3. Confirmar com produto os rótulos/colunas caso os atributos do DTO difiram do padrão de tabela implementado.
