# Spec F4.1 — Construtor de Checklist

**Status:** implementado no frontend; confirmação do formato do payload de ordenação ainda depende do backend.  
**Story:** F4.1 — Construtor de checklist (`docs/epics.md`)  
**Referência de produto:** UX-DR6 (`docs/experience.md`) e critérios da Story F4.1 (`docs/epics.md`)  
**Rota frontend:** `/checklists`  
**Navegação:** item “Checklists” da sidenav.

## Objetivo e escopo

Permitir ao Admin do Cliente consultar, criar e editar checklists reutilizáveis para padronizar verificações em ordens de trabalho preventivas. O construtor organiza os itens em uma lista ordenável e configura cada item em um painel de edição. A ordem salva deve ser a mesma apresentada ao executar a OT.

Implementar a listagem e o fluxo de criação/edição na mesma rota, com navegação clara entre lista e construtor. Não incluir execução de checklist, registro de medições ou conclusão de OT: esses fluxos pertencem às telas de manutenção.

## Integração

Todas as rotas são relativas a `/api/v1` e devem usar o `apiClient` autenticado.

| Ação | Endpoint | Observações |
|---|---|---|
| Listar checklists | `GET /checklists` | Reutilizar o endpoint já consumido pelo agendamento de OTs. Confirmar formato, filtros/paginação e campos de tenant/ativo. |
| Criar checklist | `POST /checklists` | Body exige `codigo` não vazio e `itens` com ao menos um item. O cadastro inicial envia nome e primeiro item na mesma requisição. |
| Listar itens | `GET /checklists/{id}/itens` | Confirmar campos retornados e ordem canônica. |
| Adicionar item | `POST /checklists/{id}/itens` | Confirmar DTO e enumerações aceitas para tipo, unidade e obrigatoriedade. |
| Editar item | `PUT /checklists/itens/{itemId}` | Confirmar se descrição, tipo, unidade, obrigatório e ordem podem ser alterados. |
| Persistir ordenação | `PUT /checklists/{id}/itens/ordem` | Confirmar estrutura do payload e regra para itens omitidos/duplicados. |

As rotas acima estão disponíveis no inventário de backend fornecido para o projeto. Antes de integrar cada mutação, validar os DTOs de request/response no OpenAPI/backend; não inferir nomes de propriedades nem enums apenas pelo texto do issue. Não há rota de exclusão de checklist ou item no inventário atual: não oferecer remoção persistente até o contrato existir. Se o backend permitir apenas inativação, preferir essa operação somente após confirmar seu contrato.

## Requisitos funcionais

1. O item “Checklists” da sidenav navega para `/checklists`, que deve renderizar esta funcionalidade em vez da página genérica de rota não implementada. A rota exige papel `admin_cliente`.
2. A listagem consulta checklists reais e mostra nome, estado e quantidade de itens somente quando esses dados forem retornados por contratos confirmados. Incluir busca/filtros apenas sobre campos efetivamente disponíveis.
3. A criação envia `codigo` e pelo menos um item em `itens` no `POST /checklists`; checklist vazio não pode ser enviado. O primeiro item é preenchido no próprio formulário de criação. Validar os campos obrigatórios e preservar valores em falhas RFC 7807.
4. Permitir editar os itens de checklist existente. Não oferecer renomear o checklist até haver endpoint/contrato de edição do cabeçalho.
5. No construtor, adicionar itens com descrição e configurações de tipo, unidade e obrigatório conforme os valores aceitos pelo backend. Não inventar tipos ou unidades não definidos pelo contrato.
6. Permitir selecionar um item para editar suas propriedades num painel adjacente, seguindo o padrão “lista reordenável + painel de configuração” de `docs/experience.md`.
7. Permitir reordenar itens por arrastar e soltar com `@dnd-kit`, seguindo a restrição técnica do projeto. A mesma operação deve ser possível por teclado (sensores/controles acessíveis do `@dnd-kit`, com instrução anunciada por live region e foco preservado).
8. Persistir a ordem explicitamente usando `PUT /checklists/{id}/itens/ordem`; não considerar a ordem local salva até a API confirmar sucesso. Em falha, informar o erro e restaurar/refazer a ordem a partir do estado confirmado pelo servidor.
9. Após criar ou editar checklist/item, invalidar as queries relacionadas (`checklists`, detalhe/lista de itens e dados usados pelo agendamento de OT). Evitar duplicidade de envio enquanto uma mutação estiver pendente.
10. A ordem retornada pela API deve alimentar as opções de checklist e os itens exibidos na execução/detalhe de OT; não manter ordenações divergentes em memória em telas diferentes.
11. Não exibir registros fictícios do Figma como conteúdo operacional. Dados de demonstração só podem existir em fixtures de teste.

## Estados e acessibilidade

- Listagem: skeleton, erro com retry, empty state com CTA para criar e estado carregado.
- Construtor: carregamento de checklist/itens, vazio sem itens, erro de consulta, salvamento de item/ordem e falha de mutação com recuperação.
- Respeitar tema Dark/Light e tokens semânticos de `docs/design.md`; manter densidade operacional e responsividade sem ocultar ações essenciais.
- Campos com label persistente, mensagens de validação associadas, foco visível e estados de salvamento anunciados.
- Reordenação acessível por teclado, com alternativa que não dependa exclusivamente do gesto de arrastar; anunciar posição atual e nova posição sem interromper leitura do restante do formulário.
- Não representar obrigatório, tipo ou ordem somente por cor/ícone.

## Critérios de aceite

- [x] A sidenav abre `/checklists` e a rota é protegida para `admin_cliente`.
- [x] A lista e os itens usam dados reais da API, com loading, erro recuperável e empty state.
- [x] É possível criar checklist enviando `codigo` e pelo menos um item junto no POST; itens adicionais podem ser adicionados/editados depois.
- [x] Itens podem ser reordenados por drag-and-drop e por controles acessíveis por teclado.
- [ ] A ordem é enviada ao endpoint de ordenação; o formato do payload precisa ser confirmado no contrato do backend antes de validar a persistência ponta a ponta.
- [ ] Os campos de item (descrição, tipo, unidade, obrigatório) precisam ser conferidos contra os DTOs reais da API.
- [x] O mesmo endpoint de leitura dos itens alimenta as telas de detalhe/OT; nenhuma ordenação paralela ou fixture operacional foi adicionada.
- [x] Falhas das mutations mantêm o usuário no contexto e não mostram alterações locais como salvas.
- [x] Testes cobrem carregamento, criação, edição de item e solicitação de reordenação pelo teclado.

## Dependências e questões a confirmar

- DTOs exatos de checklist e item, incluindo identificadores, campos opcionais, tipos/unidades permitidos e formato das datas/estado ativo.
- Formato do payload de `PUT /checklists/{id}/itens/ordem` e se a ordenação usa lista de IDs ou valores numéricos de posição.
- O erro RFC 7807 observado confirma que o POST rejeita `codigo` em branco e `itens` vazio. Conferir o DTO completo e os campos aceitos em cada item no OpenAPI/backend.
- Se a API oferece edição do cabeçalho do checklist; não há rota `PUT /checklists/{id}` no inventário de endpoints usado neste spec.
- Regras de edição concorrente, limite de itens, duplicidade de descrições e política de exclusão/inativação.
- Escopo tenant aplicado pelo backend e permissões para consulta e mutação.
