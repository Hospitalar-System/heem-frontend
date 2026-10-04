# Spec F2.2 / F3.1 — Hospitais, Setores e Usuários

**Status:** implementado conforme OpenAPI local; integração de convite Auth0 ainda pendente
**Stories:** F2.2 — Gestão de usuários do tenant; F3.1 — Hospitais e setores (`docs/epics.md`)  
**Referência visual:** [HEMM no Figma, nó 2411:4](https://www.figma.com/design/EDy6hci8DTe0hniabXwsqi/HEMM?node-id=2411-4)  
**Documentos relacionados:** `AGENTS.md`, `docs/design.md`, `docs/experience.md`, `docs/epics.md`

## Objetivo

Especificar as telas de Hospitais, Setores e Usuários & Papéis do painel do Admin do Cliente, incluindo listagem, criação/edição conforme suportado pela API e o modal de convite ilustrado no Figma.

O nó de referência reúne três telas desktop. Nomes, contagens, e-mails e registros visíveis são conteúdo de exemplo, não dados iniciais da aplicação.

## Escopo

- Listar e criar/editar hospitais do tenant autenticado.
- Abrir os setores de um hospital e listar/criar/editar setores.
- Listar, convidar, editar e desativar usuários do tenant.
- Consultar e alterar os vínculos de usuários com hospitais.
- Estados de loading, empty e error para cada consulta assíncrona.
- Manter o shell compartilhado do painel, navegação, tenant e perfil autenticado.

Fora do escopo: gestão de clientes/tenants, usuários internos da plataforma, cadastro de equipamentos, exclusão de hospitais/setores/usuários e envio de convite pelo provedor de identidade. O backend não informou rotas de exclusão para essas entidades; a integração de convite ao Auth0 ainda está pendente.

## Referência visual e estrutura

O frame `2411:4` apresenta três exemplos em desktop, com o shell escuro do HEMM:

1. **Hospitais:** título e contexto do tenant no topo; ação `+ Novo hospital`; grade de cards por hospital. Cada card mostra nome, cidade/UF, quantidade de setores, equipamentos e OTs devidas. O card abre a visão de setores do hospital. O menu de reticências aparece no mockup, mas sua lista de ações não está especificada.
2. **Setores:** título `Setores`, ação `+ Novo setor` e tabela do hospital selecionado. Colunas: Código, Nome, Andar e Equipamentos. O exemplo contém códigos ST-01 a ST-06; são dados ilustrativos.
3. **Usuários & Papéis:** tabela com Nome, E-mail, Papel, Hospitais e Status; ação `+ Convidar usuário`. A tabela permanece ao fundo quando o modal está aberto.

O shell mantém sidebar fixa de aproximadamente 248 px, navegação do produto e cabeçalho global do painel. A referência usa fundo escuro, superfícies elevadas, bordas discretas e ação primária verde. Aplicar os tokens semânticos de `docs/design.md`; não copiar os valores visuais do frame como cores hardcoded.

## Fluxos e regras funcionais

### Hospitais

- Ao abrir `/hospitals`, consultar os hospitais permitidos para o tenant da sessão.
- `+ Novo hospital` abre formulário em modal. Os campos e validações devem seguir o DTO/OpenAPI do backend; não inferir campos a partir dos cards de exemplo.
- Selecionar um card abre Setores com o hospital selecionado como contexto.
- Se a API fornecer contagens agregadas, exibir setores, equipamentos e OTs devidas no card. Não calcular ou fabricar essas contagens no frontend.
- A edição usa `GET /api/v1/hospitais/{id}` e `PUT /api/v1/hospitais/{id}`. Não oferecer exclusão: não há rota de exclusão na lista fornecida.

### Setores

- A tela exige um hospital selecionado; ao acessá-la sem contexto, pedir que o usuário escolha um hospital antes de consultar/criar setores.
- A ação `+ Novo setor` abre formulário associado ao hospital selecionado. A associação não pode ser escolhida por um tenantId arbitrário enviado pelo cliente.
- Linhas mostram código, nome, andar e quantidade de equipamentos quando esses dados forem retornados pelo backend.
- A edição usa `GET /api/v1/setores/{id}` e `PUT /api/v1/setores/{id}`. Não oferecer exclusão: não há rota de exclusão na lista fornecida.

### Usuários & Papéis

- A tabela consulta usuários do tenant e mostra nome, e-mail, papel, hospitais vinculados e status retornados pela API.
- `+ Convidar usuário` abre o modal centralizado mostrado no Figma: e-mail, papel, vínculo de um ou mais hospitais como chips removíveis, `Cancelar` e `Enviar convite`.
- O seletor de papel apresenta somente `admin_cliente`, `tecnico` e `interno_hospital`; nunca permitir `super_admin` nesta área.
- A lista de hospitais para vínculo vem do tenant atual. Deve ser possível adicionar e remover vínculos antes do envio.
- Enviar o formulário chama `POST /api/v1/users`. O usuário criado aparece na lista quando a API confirmar o resultado. Não afirmar que um e-mail foi enviado pelo Auth0: essa integração ainda não está disponível.
- Editar usa `GET`/`PUT /api/v1/users/{id}`; consultar vínculos usa `GET /api/v1/users/{id}/hospitais`; alterar vínculo usa `POST` ou `DELETE /api/v1/users/{id}/hospitais/{hospitalId}`.
- Desativar usa `POST /api/v1/users/{id}/desativar` e exige confirmação. Atualizar o status após sucesso; não remover o usuário da tabela sem resposta da API.
- Não oferecer ação de exclusão permanente. A anonimização de CPF é fluxo separado de F2.4.

## Rotas do backend

Todas as chamadas usam o cliente Axios compartilhado, `Authorization: Bearer <token>` e base `/api/v1`:

| Recurso | Consulta | Mutação | Observações |
| --- | --- | --- | --- |
| Hospitais | `GET /hospitais`, `GET /hospitais/{id}` | `POST /hospitais`, `PUT /hospitais/{id}` | Sem exclusão informada |
| Setores | `GET /hospitais/{hospitalId}/setores`, `GET /setores/{id}` | `POST /hospitais/{hospitalId}/setores`, `PUT /setores/{id}` | Hospital é obrigatório para listar/criar |
| Usuários do tenant | `GET /users`, `GET /users/{id}` | `POST /users`, `PUT /users/{id}`, `POST /users/{id}/desativar` | Não confundir com `/platform-users` |
| Vínculos usuário-hospital | `GET /users/{id}/hospitais` | `POST`/`DELETE /users/{id}/hospitais/{hospitalId}` | O tenant/hospital autorizado é validado pelo backend |

Usar React Query para cache e invalidação das listas/detalhes após mutações bem-sucedidas. Não duplicar uma chamada `/me`: usar a identidade em memória da sessão para apresentar o usuário atual e limitar os dados ao escopo já determinado pelo backend.

## Contratos confirmados

DTOs conferidos no OpenAPI servido pelo backend local em `/v3/api-docs`:

- `HospitalResponse`: `id`, `nome`, `cnpj`; criação/edição usa `nome` e `cnpj`.
- `SetorResponse`: `id`, `hospitalId`, `codigo`, `nome`, `andar`, `classificacaoRisco`, `grupoInstalacao`.
- `UsuarioResponse`: `id`, `codigo`, `nome`, `email`, `role`, `ativo`; criação exige `codigo`, `nome`, `email` e um papel entre `admin_cliente`, `tecnico` ou `interno_hospital`.
- Listagens retornam arrays; hospitais aceitam `pagina`/`tamanho`; usuários aceitam filtros `role`, `ativo`, `pagina` e `tamanho`.
- A resposta de hospitais não contém as contagens ilustradas no Figma; o frontend agrega setores e equipamentos pelas rotas próprias e nunca usa números de exemplo.
- Os cards agregam contagem de setores pela lista de setores e equipamentos pela lista filtrada por `hospitalId`; para Admin do Cliente, as OTs devidas são OTs `AGENDADA`/`EM_EXECUCAO` com data agendada vencida, associadas via `equipamentoId`. O endpoint de OTs limita técnicos à fila atribuída; por isso a contagem de OTs por hospital aparece indisponível para esses perfis, em vez de apresentar um total parcial como agregado.
- Os vínculos de hospitais são consultados como lista de IDs em `GET /users/{id}/hospitais`.
- A criação de usuário não envia e-mail de convite: a integração com o provedor de identidade segue pendente.

Pendente: envio do convite Auth0. A tela informa que o registro foi criado, sem prometer envio de e-mail. O backend é a autoridade para isolamento de tenant e validação de acesso.

Não inventar payloads, estados, campos técnicos ou valores de enum até essa confirmação.

## Estados de interface

- **Default:** cards/tabela preenchidos com dados da API.
- **Loading:** skeletons mantendo o shell e a geometria das listas; desabilitar submissões duplicadas nos modais.
- **Empty:** mensagem específica por recurso e ação disponível, por exemplo `Cadastrar hospital`, `Criar setor` ou `Convidar usuário`, respeitando as permissões.
- **Error:** mensagem objetiva usando `ProblemDetail.detail`/`code`, opção de tentar novamente e preservação dos dados já digitados no modal quando seguro.
- **Mutation:** confirmação visual após sucesso; fechar o modal e atualizar a lista sem reload completo.

## Acessibilidade, segurança e responsividade

- Usar labels associados, foco visível, nomes acessíveis, ordem de tabulação previsível e Enter para confirmar formulários válidos.
- Modais prendem o foco, fecham com Escape quando não há submissão pendente e devolvem o foco ao botão que os abriu.
- Chips de hospitais têm ação de remoção com nome acessível; oferecer seleção por teclado.
- Erros de campo apontam para o campo correspondente; erros globais usam região `role="alert"`.
- Respeitar RBAC e isolamento de tenant. A UI reduz ações indisponíveis, mas o backend continua autoridade final.
- Não persistir tokens nem PII em `localStorage`/`sessionStorage`; usar a sessão autenticada e cache em memória.
- Em viewport estreita, empilhar cards, permitir tabela com rolagem horizontal controlada e manter o modal dentro da viewport. A referência visual é desktop-first e não define um layout mobile específico.

## Critérios de aceite

- [ ] Hospitais, setores e usuários vêm das respectivas rotas; nenhum registro de demonstração aparece como dado real.
- [ ] Cards de hospital exibem contagens apenas quando fornecidas pela API e levam à lista de setores do hospital correto.
- [ ] Setor não pode ser criado sem hospital selecionado.
- [ ] Modal de convite corresponde à hierarquia visual do Figma e envia somente papel permitido e vínculos selecionados.
- [ ] Convite não é apresentado como e-mail enviado enquanto a integração com Auth0 estiver pendente.
- [ ] Editar e desativar refletem apenas respostas confirmadas pelo backend.
- [ ] Loading, empty, error e success têm estados distintos e acessíveis.
- [ ] Cache/listas são atualizados após mutações sem recarregar a página.
- [ ] Build, lint e testes dos fluxos de formulário/listagem passam.

## Decisões pendentes

1. DTOs, paginação, filtros e campos de contagem retornados pelas rotas.
2. Rota escolhida para setores com hospital em contexto e comportamento do item Setores da sidebar.
3. Integração do envio de convite ao Auth0 e estado exato do usuário antes da aceitação.
4. Ações do menu de reticências dos cards de hospital.
