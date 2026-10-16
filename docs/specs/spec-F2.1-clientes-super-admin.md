# Spec F2.1 — Clientes (Super Admin)

**Status:** implementado no frontend; compatibilidade do campo `tipo` com o backend ainda precisa ser verificada em ambiente integrado.
**Story:** F2.1 — Provisionamento de tenant (`docs/epics.md`)
**Issue:** [#3 — Story F2.1: Provisionamento de tenant (Super Admin)](https://github.com/Hospitalar-System/heem-frontend/issues/3)
**Referência visual:** [HEMM no Figma, nó 2425:2](https://www.figma.com/design/EDy6hci8DTe0hniabXwsqi/HEMM?node-id=2425-2)
**Documentos relacionados:** `AGENTS.md`, `docs/design.md`, `docs/experience.md`, `docs/epics.md`

## Objetivo

Permitir que `super_admin` consulte os tenants e provisione um novo cliente junto com seu Admin do Cliente inicial. A tela mantém o shell do HEMM e a tabela/modal do frame W02. A criação deve atender ao critério da issue #3, incluindo razão social, CNPJ, tipo e e-mail do admin, sem divergir do contrato real da API.

## Estrutura visual e comportamento

- Rota `/platform/clients`, acessível apenas a `super_admin`.
- Cabeçalho global `Clientes`, com navegação, busca global, notificações e tema herdados do shell do painel.
- Área de conteúdo com subtítulo `Super Admin · tenants ativos`, ação `+ Novo cliente` e tabela de clientes.
- Colunas: Cliente, CNPJ, Hospitais e Status. Status mapeia `ativo` para `Ativo` ou `Inativo`.
- A tabela é responsiva por rolagem horizontal e apresenta estados de loading, erro com retry e lista vazia.
- `+ Novo cliente` abre modal. Fechar, cancelar e sucesso devolvem o foco ao acionador; erros de validação aparecem junto aos campos.

## Rotas e contratos confirmados

O backend local foi inspecionado nos controllers/DTOs de identidade:

| Operação | Endpoint | Contrato | Acesso |
| --- | --- | --- | --- |
| Listar clientes | `GET /api/v1/tenants` | `TenantResponse[]` com `id`, `cnpj`, `nome`, `ativo`, `createdAt` | `SUPER_ADMIN` |
| Criar cliente | `POST /api/v1/tenants` | Retorna `NovoTenanteResponse`: `tenantId`, `cnpj`, `nome`, `createdAt`, `adminInicialId`, `adminInicialEmail` | `SUPER_ADMIN` |
| Consultar cliente | `GET /api/v1/tenants/{id}` | `TenantResponse` | `SUPER_ADMIN` |

Payload obrigatório de criação:

```json
{
  "tipo": "PJ",
  "cnpj": "12345678000190",
  "nome": "Grupo Hospitalar Exemplo",
  "adminNome": "Nome do administrador",
  "adminEmail": "admin@cliente.br",
  "adminCodigo": "ADM-001"
}
```

O CNPJ deve ser enviado com 14 dígitos numéricos; o frontend pode formatar a exibição, mas remove pontuação antes do request. A criação usa React Query e invalida a lista após confirmação. Erros RFC 7807, incluindo CNPJ duplicado, são apresentados sem ocultar o `detail` retornado quando disponível.

### Campo `tipo` exigido pela issue #3

O formulário oferece `PF` (Pessoa Física) e `PJ` (Pessoa Jurídica), e envia `tipo` no payload de `POST /tenants`. Essa enumeração segue a distinção PF/PJ usada nas demandas do produto. O contrato de backend previamente documentado não inclui esse campo, e o serviço local não está disponível para validação; portanto, a aceitação do campo e dos valores ainda precisa ser confirmada antes de considerar a integração concluída.

Confirmar com o backend:

- Valores permitidos e codificação exata de `tipo` no DTO.
- Se CNPJ continua obrigatório para ambos os tipos ou se PF deve usar outro identificador.
- Se o cadastro do Admin inicial e a validação da razão social variam conforme o tipo.

Até essa confirmação, um `400`/erro de contrato deve permanecer visível no modal via `ProblemDetail`; não afirmar que o tipo foi persistido somente porque a seleção foi enviada.

## Diferenças entre Figma e backend

- O frame inclui coluna `Hospitais`, mas `TenantResponse` não fornece essa contagem e não existe rota de resumo por tenant. A tabela mantém a coluna e exibe `—` até o backend expor um agregado; não consultar `/hospitais` com identidade de plataforma nem inferir contagens.
- O modal mostra `Plano` e valor de exemplo `Enterprise`, mas `CriarTenanteRequest` não aceita plano. O frontend não exibe um seletor enganoso nem inclui plano no payload; planos exigem decisão e contrato de backend.
- O modal do Figma só mostra o e-mail do administrador, enquanto a API exige também `adminNome` e `adminCodigo`. O modal inclui esses campos adicionais para tornar o payload válido, explicando a divergência no design.
- `POST /tenants` cria cliente e usuário admin inicial e enfileira o envio do convite. O backend ainda não cria o usuário no IdP/Auth0; não afirmar que a conta do provedor foi ativada.

## Segurança e regras

- Proteger rota e navegação com `super_admin`; o backend continua autoridade final e aplica `@PreAuthorize`.
- Não armazenar token nem dados de clientes em `localStorage`/`sessionStorage`; React Query mantém cache em memória.
- Não usar dados de exemplo do frame como registros reais.
- Não permitir editar, desativar ou excluir clientes nesta tela: não há rotas correspondentes expostas para esse fluxo.

## Critérios de aceite

- [x] Lista carregada de `GET /tenants`, sem fixtures como dados operacionais.
- [x] Modal envia o DTO atualmente aceito para `POST /tenants` e a lista atualiza após sucesso.
- [x] Formulário coleta e envia `tipo` (`PF` ou `PJ`) no payload; compatibilidade do enum com o DTO do backend ainda pendente de verificação integrada.
- [x] CNPJ é validado como 14 dígitos e duplicidade mostra mensagem do backend.
- [x] Só `super_admin` acessa a rota e vê o item de navegação Clientes.
- [x] Coluna Hospitais sem agregado exibe `—`; Plano não é apresentado como configurável até existir contrato.
- [x] Loading, erro, empty, validação e sucesso são distintos e acessíveis.

## Verificação

- Testes de UI cobrem listagem, ausência de contagem de hospitais/plano, validação, submissão com CNPJ normalizado, atualização da lista, foco após fechar, detalhe de erro do backend e estado de erro recuperável.
- Testes de acesso cobrem a rota e o item de navegação para `super_admin`, além do redirecionamento/ocultação para `admin_cliente`.
- `npm test`, `npm run lint` e `npm run build` passaram na implementação atual.

## Pendência para concluir a issue #3

A interface e o payload do frontend agora incluem `tipo` (`PF`/`PJ`). A issue só pode ser considerada totalmente concluída após confirmar que o backend aceita esse campo e seus valores e validar a regra de documento para PF/PJ. Os critérios de CNPJ inválido/duplicado e atualização da lista permanecem cobertos pela implementação.
