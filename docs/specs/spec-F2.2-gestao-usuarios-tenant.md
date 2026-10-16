# Spec F2.2 — Gestão de usuários do tenant

**Status:** fluxo de cadastro, vínculo e desativação implementado; envio de convite e estado “Convidado” dependem de contrato do backend.
**Story:** F2.2 — Gestão de usuários do tenant (`docs/epics.md`)
**Issue:** [#4 — Story F2.2: Gestão de usuários do tenant](https://github.com/Hospitalar-System/heem-frontend/issues/4)
**Spec relacionado:** [Hospitais, Setores e Usuários](spec-F2.2-F3.1-hospitais-setores-usuarios.md)
**Persona:** Admin do Cliente (`admin_cliente`)
**Rota:** `/users`

## Objetivo

Permitir ao Admin do Cliente consultar os usuários de seu tenant, criar registros de usuário com papel e hospitais vinculados e desativar acessos. A tela não deve afirmar que um convite foi enviado enquanto não houver integração confirmada com o provedor de identidade.

## Escopo

- Tabela de usuários com nome, e-mail, papel, hospitais vinculados, estado e ações permitidas.
- Modal “Convidar usuário” com dados necessários para criar o registro, papel limitado aos papéis do tenant e seleção de hospitais em chips removíveis.
- Criação de usuário e atualização dos vínculos usando as rotas disponíveis.
- Desativação com confirmação e atualização da lista após resposta bem-sucedida.
- Estados de carregamento, lista vazia, erro, validação, mutação e sucesso.

Fora de escopo: provisionar usuários internos da plataforma, conceder `super_admin`, redefinir senha, aceitar convite, enviar e-mail pelo IdP, reativar usuário ou excluir/anonymizar usuário (F2.4 cobre anonimização).

## Interface e navegação

- Acessível pelo item “Usuários & Papéis” da sidenav e pela rota `/users`.
- Exibir ação `Convidar usuário`, pesquisa, tabela e estados vazios/carregamento/erro.
- O modal apresenta campos obrigatórios do contrato e a seleção de hospitais como chips removíveis, com remoção acessível por teclado e nome descritivo.
- A tabela mostra estado textual, sem depender apenas de cor. A ação de desativar aparece apenas para usuários ativos.
- Reutilizar o shell e tokens semânticos de `docs/design.md`; manter suporte Dark/Light e comportamento legível em viewport estreita.

## Contratos de API

Todas as chamadas usam `apiClient`, bearer token da sessão e base `/api/v1`. O backend valida tenant e autorização.

| Ação | Endpoint | Contrato/observação |
|---|---|---|
| Listar usuários | `GET /users` | `UsuarioResponse[]`; contrato conhecido: `id`, `codigo`, `nome`, `email`, `role`, `ativo`. |
| Criar registro | `POST /users` | O backend exige `codigo`, `nome`, `email` e `role`; papéis permitidos: `admin_cliente`, `tecnico`, `interno_hospital`. |
| Consultar usuário | `GET /users/{id}` | Fonte para carregar os dados atuais antes de editar. |
| Editar usuário | `PUT /users/{id}` | Atualizar apenas campos mutáveis aceitos pelo DTO; vínculos de hospital são operações separadas. |
| Consultar hospitais vinculados | `GET /users/{id}/hospitais` | Retorna os IDs de hospital associados. |
| Consultar hospitais disponíveis | `GET /hospitais` | Lista restrita pelo backend ao tenant autenticado. |
| Criar vínculo | `POST /users/{id}/hospitais/{hospitalId}` | Executar para vínculos novos após a criação/edição do registro. |
| Remover vínculo | `DELETE /users/{id}/hospitais/{hospitalId}` | Executar apenas para associações removidas pelo Admin. |
| Desativar usuário | `POST /users/{id}/desativar` | Após sucesso, invalidar a lista/detalhe e refletir o estado retornado pela API. |

### Limite de convite e estado

A issue descreve o envio de convite e a apresentação do usuário com estado `Convidado`. O contrato atualmente documentado não fornece rota específica de convite nem estado de convite; `POST /users` cria um registro e a resposta expõe `ativo` boolean. A integração Auth0 também está pendente.

Assim:

- A UI pode usar “Convidar usuário” como nome da ação de onboarding, mas deve explicar que, no contrato atual, cria o registro e não envia e-mail.
- Não derivar `Convidado` de `ativo: true`, nem criar esse estado localmente.
- Para concluir esse critério da issue, o backend deve confirmar endpoint/fluxo de convite, resposta, estado pendente e comportamento após aceitação/expiração.
- A mensagem de sucesso deve descrever somente o que a API confirmou: registro criado e vínculos processados; nunca “convite enviado” sem confirmação.

## Regras funcionais

1. Acesso à rota e às ações é restrito a `admin_cliente`; a API continua autoridade final de autorização e isolamento de tenant.
2. O seletor de papel contém exatamente `admin_cliente`, `tecnico` e `interno_hospital`. `super_admin` nunca é opção nem pode ser enviado por manipulação da interface.
3. Criar exige os campos do DTO real: código, nome, e-mail válido e papel. O issue lista e-mail/papel/hospitais, mas os campos adicionais exigidos pelo backend não podem ser omitidos nem fabricados.
4. Os hospitais disponíveis vêm do tenant da sessão. O Admin pode adicionar/remover múltiplos vínculos como chips antes de salvar.
5. Como registro e vínculos usam chamadas separadas, mostrar claramente sucesso parcial: se o usuário for criado mas algum vínculo falhar, preservar o registro, informar quais vínculos não foram concluídos e atualizar os dados a partir da API; não reportar operação inteiramente bem-sucedida.
6. Após criar/editar/desativar, invalidar as queries afetadas e atualizar a tabela sem reload completo.
7. Desativar exige confirmação explícita. Em sucesso, refletir `ativo: false` sem retirar o usuário da lista; não permitir nova desativação para usuário inativo.
8. Erros de API devem preservar `ProblemDetail.detail`/`code` em mensagem inline/toast acessível quando disponível.
9. Não persistir tokens ou dados pessoais em `localStorage`/`sessionStorage`; usar sessão e cache em memória.

## Estados e acessibilidade

- **Loading:** manter shell e apresentar skeleton; desabilitar ações dependentes de dados que ainda carregam.
- **Empty:** mensagem de lista vazia e CTA para iniciar cadastro quando autorizado.
- **Error:** mensagem recuperável e botão para tentar novamente; erros de hospitais/vínculos não podem ser interpretados como lista vazia.
- **Mutation:** impedir duplo envio, sinalizar processamento e não fechar o formulário antes de reconciliar resultados.
- **Sucesso:** toast/mensagem compatível com o que foi realmente confirmado pela API.
- Labels associados a campos, foco visível, ordem de tabulação previsível e modal com foco gerenciado. Chips precisam de botões de remoção com `aria-label` específico.

## Critérios de aceite

- [x] Admin do Cliente consulta usuários do tenant pela API.
- [x] O modal permite preencher e-mail, papel e hospitais vinculados; também inclui campos adicionais obrigatórios do DTO atual.
- [x] O seletor oferece apenas `admin_cliente`, `tecnico` e `interno_hospital`.
- [x] Vínculos são enviados por rotas próprias e falhas parciais são informadas sem fingir sucesso completo.
- [x] Desativação confirma a ação e atualiza a lista sem reload após sucesso.
- [ ] Um convite real é enviado e o usuário aparece como “Convidado”; depende de rota/estado de convite do backend e integração com o IdP.
- [x] Loading, empty, error, opções de papel, criação, falha parcial de vínculos e desativação são cobertos por testes.
- [ ] Validar visualmente as variantes Light/Dark da tela.

## Plano de testes

- Testes de schema para código, nome, e-mail e papéis permitidos; rejeitar `super_admin`.
- Testes de UI para opções do seletor, criação, chips removíveis, erros, sucesso parcial, confirmação de desativação e estado vazio/loading.
- Testes de API/hooks para rotas, payloads, invalidação de cache e atualização dos vínculos.
- Testes de acesso garantindo que `admin_cliente` entra em `/users` e outros papéis não veem a ação nem acessam a rota.
- Quando o backend publicar o fluxo de convite, acrescentar testes de envio, estado `Convidado` e transição/aceitação conforme o novo contrato.

## Pendências para concluir a issue #4

1. Publicar contrato de convite do provedor (endpoint ou evento de provisionamento), payload e resposta.
2. Definir como o estado `Convidado` é representado, filtrado e transicionado para ativo após aceitação.
3. Confirmar código do usuário e demais campos obrigatórios no UX final do convite.
4. Acrescentar testes específicos do novo fluxo após integração.
