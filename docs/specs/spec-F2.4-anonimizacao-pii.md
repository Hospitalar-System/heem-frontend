# Spec F2.4 — Anonimização de PII sob solicitação

**Status:** fluxo de confirmação e consumo do endpoint implementados; exibição do campo CPF depende do DTO/resposta do backend.
**Story:** F2.4 — Anonimização de PII sob solicitação (`docs/epics.md`)
**Issue:** [#6 — Story F2.4: Anonimização de PII sob solicitação](https://github.com/Hospitalar-System/heem-frontend/issues/6)
**Documentos relacionados:** `AGENTS.md`, `docs/design.md`, `docs/experience.md`, `docs/epics.md`, `docs/specs/spec-F2.2-gestao-usuarios-tenant.md`, `docs/specs/spec-F2.3-usuarios-internos-plataforma.md`
**Personas:** Admin do Cliente (`admin_cliente`) e Super Admin (`super_admin`)
**Ponto de entrada proposto:** ação no usuário em `/users`; também disponível em eventual detalhe de usuário autorizado.

## Objetivo

Permitir que um Admin do Cliente solicite a anonimização do CPF de um usuário do próprio tenant, ou que um Super Admin execute a mesma operação conforme a autorização do backend. A ação é irreversível, exige confirmação explícita e deve refletir o dado atualizado sem recarregar a página.

Usuários internos da plataforma (`platform_user`) não fazem parte desse fluxo: a ação nunca deve aparecer para eles e nenhuma rota `/platform-users` deve ser chamada para anonimização.

## Escopo

- Ação “Anonimizar CPF” em usuário elegível.
- Diálogo de confirmação destrutiva com identificação da pessoa e confirmação digitada do nome, conforme padrão sugerido pela issue.
- Chamada da rota de anonimização e atualização de lista/detalhe após sucesso.
- Exibição do CPF anonimizado/mascarado somente se esse dado vier atualizado da API.
- Estados de carregamento, confirmação, processamento, sucesso e erro.
- Controle de acesso para Admin do Cliente e Super Admin, sem disponibilizar a ação a `platform_user`.

Fora de escopo: exclusão do usuário, desativação, alteração manual do CPF, anonimização de outros campos pessoais, envio de solicitação para revisão ou possibilidade de desfazer/reverter a anonimização.

## Interface e interação

- A ação fica no menu/coluna de ações da linha do usuário e, se houver tela de detalhe autorizada, também pode ser apresentada nela.
- Só exibir para usuário que não seja `platform_user` e cujo CPF ainda possa ser anonimizado, caso esse estado seja informado pelo backend.
- Ao acionar, abrir um diálogo acessível identificando nome e e-mail do usuário e avisando que a operação é irreversível.
- Exigir que o operador digite o nome exibido do usuário para habilitar a confirmação. A comparação deve ignorar espaços externos, mas não deve aceitar uma confirmação vazia.
- Botões: `Cancelar` e `Anonimizar CPF`. A ação destrutiva fica desabilitada até a confirmação exata e enquanto a requisição estiver em andamento.
- Após sucesso, fechar o diálogo, atualizar a linha/detalhe usando dados confirmados pela API e apresentar mensagem objetiva. Não alterar CPF localmente por estimativa nem remover o usuário da lista.
- Após erro, manter o diálogo aberto, preservar o texto digitado e mostrar `ProblemDetail.detail`/`code` quando disponíveis.

## Contrato de API

Todas as chamadas usam `apiClient`, bearer token da sessão e prefixo `/api/v1`.

| Operação | Endpoint | Contrato/observação |
|---|---|---|
| Consultar usuário atual | `GET /users/{id}` | Disponível no inventário do backend. Confirmar se a resposta inclui CPF ou um indicador de anonimização. |
| Anonimizar CPF | `POST /users/{id}/anonimizar-cpf` | Rota identificada no inventário do backend. Corpo da requisição e resposta ainda não estão documentados neste frontend. |

### Reconciliar o resultado

- A resposta de `POST` é a fonte preferencial se retornar o perfil já atualizado.
- Se o `POST` não retornar os dados atualizados, invalidar as queries de lista e detalhe e buscar novamente `GET /users/{id}`. Não exigir reload de página.
- Confirmar com o backend se sucesso é `200` com representação do usuário, `204` ou outra resposta; tratar `204` como sucesso e buscar novamente o perfil.
- O DTO usado pela lista de usuários atualmente conhecido no frontend não contém CPF. Não adicionar uma coluna CPF nem alegar que o campo foi mascarado sem contrato que o exponha.
- O formato anonimizado (por exemplo, `null`, máscara fixa ou valor substituto) deve ser apresentado como retornado pela API, sem regras locais de transformação.
- Não enviar CPF no corpo da requisição nem em query string, salvo se o contrato oficial vier a exigir explicitamente; a rota atual indica operação por `id`.

## Segurança e autorização

1. `admin_cliente` só pode solicitar anonimização de usuário pertencente ao tenant da sessão. O frontend não envia tenant arbitrário; o backend é a autoridade final para o escopo.
2. `super_admin` só pode usar a ação se o backend autorizar explicitamente esse papel para o endpoint. A interface não deve inferir acesso global a partir do papel.
3. A ação nunca é exibida para `platform_user`; não deve chamar `/platform-users/{id}/anonimizar-cpf` nem qualquer endpoint de gestão de usuário interno.
4. Ocultar a ação para estados já anonimizados apenas quando o backend fornecer sinal confiável desse estado.
5. Não persistir CPF, dados pessoais ou confirmação digitada em `localStorage`/`sessionStorage`, logs ou telemetria do frontend.
6. Confirmação visual reduz acionamento acidental, mas não substitui autorização e validação no backend.

## Estados e acessibilidade

- **Default:** ação disponível somente para usuário elegível e operador autorizado.
- **Confirm:** diálogo informa a irreversibilidade, identifica a conta e vincula a confirmação digitada ao usuário correto.
- **Pending:** botão mostra processamento e controles ficam desabilitados para evitar chamadas duplicadas.
- **Success:** perfil/lista atualizados a partir do backend; CPF só é mostrado se o DTO atualizado o incluir.
- **Error:** erro acessível sem fechar o diálogo; permitir nova tentativa quando seguro.
- O diálogo deve usar semântica modal, foco inicial previsível, foco contido e retorno de foco ao acionador. O campo digitado tem label associado e feedback sobre a divergência do nome.
- Estado destrutivo deve incluir texto explícito além de cor/ícone; usar tokens semânticos do design system e suportar temas Dark, Light e Auto.

## Critérios de aceite

- [ ] A ação de anonimizar CPF está disponível para usuário elegível a Admin do Cliente e Super Admin, conforme autorização real do backend.
- [x] Antes do request, o operador confirma a ação irreversível digitando o nome do usuário exibido.
- [x] A chamada usa `POST /api/v1/users/{id}/anonimizar-cpf`, sem payload de CPF presumido.
- [x] Após sucesso, lista e detalhe têm suas queries invalidadas/refetch sem reload de página.
- [ ] O CPF anonimizado só é mostrado se a resposta/consulta posterior da API expuser o dado atualizado.
- [x] Não há ação nem chamada de anonimização para `platform_user`.
- [x] Cancelamento não dispara request; duplo envio é impedido durante processamento.
- [x] Erros RFC 7807 são apresentados no diálogo e preservam a confirmação digitada.
- [x] Testes cobrem acesso por papel, confirmação exata, cancelamento, sucesso e erro.

## Plano de testes

- **Schema/confirm:** entrada vazia, espaços, nome divergente e nome correspondente; confirmar o comportamento esperado de normalização do nome.
- **API:** verificar `POST /users/{id}/anonimizar-cpf`, ausência de CPF no payload, tratamento de `200` e `204`, refetch/invalidação de dados e ausência de chamadas a `/platform-users`.
- **UI:** confirmação digitada, cancelamento, prevenção de duplo clique, erro RFC 7807 e atualização do usuário após sucesso.
- **RBAC:** ação visível para `admin_cliente` e para `super_admin` somente conforme contrato; ação indisponível para usuários internos da plataforma e papéis não autorizados.
- **Escopo de tenant:** confirmar com backend que Admin do Cliente não consegue anonimizar usuário de outro tenant, inclusive por request direto.
- **Acessibilidade:** teclado, foco e anúncio de erro/sucesso no diálogo.

## Pendências para concluir a integração

1. Consultar o OpenAPI/DTO do endpoint para confirmar status HTTP, resposta e se o CPF anonimizado é exposto por `GET /users/{id}`; o modelo frontend atual não possui esse campo.
2. Validar com o backend a autorização de `super_admin` e o isolamento de tenant de `admin_cliente` no endpoint.
3. Confirmar se o nome exibido é o identificador correto para a confirmação digitada.
4. Confirmar que `GET /users` não inclui `platform_user`; a UI ainda filtra a ação para os três papéis conhecidos de usuário de tenant.
