# Spec F3.2–F3.4 — Equipamentos

**Status:** implementado parcialmente; lista, cadastro/edição e detalhe integrados aos contratos confirmados. Histórico de medições, checklists associados, indicadores por equipamento e última manutenção dependem de contratos de leitura ainda ausentes.  
**Stories:** F3.2 — Listagem de equipamentos; F3.3 — Cadastro de equipamento; F3.4 — Equipamento Detalhe (`docs/epics.md`)  
**Issues:** [#8](https://github.com/Hospitalar-System/heem-frontend/issues/8), [#9](https://github.com/Hospitalar-System/heem-frontend/issues/9), [#10](https://github.com/Hospitalar-System/heem-frontend/issues/10)  
**Referência visual:** [Seção Equipamentos no Figma, nó 2411:6](https://www.figma.com/design/EDy6hci8DTe0hniabXwsqi/HEMM?node-id=2411-6)  
**Frames:** `W10-Equipamentos/Lista` (`2404:13322`) e `W11-Equipamentos/Detalhe` (`2404:13455`)  
**Documentos relacionados:** `AGENTS.md`, `docs/design.md`, `docs/experience.md`, `docs/epics.md`

## Objetivo

Permitir que o Admin do Cliente encontre e cadastre equipamentos do seu tenant e que Admin do Cliente e Técnico consultem os dados e o contexto de manutenção de um equipamento. A API é a fonte de verdade para registros, permissões e estado operacional.

## Escopo

- Listagem em `/assets`, com busca e filtros por hospital, setor e status.
- Cadastro e edição do equipamento, incluindo `dados_gerais` flexíveis e foto quando os campos e regras forem confirmados no DTO do backend.
- Detalhe em `/assets/:id`, com abas Dados, Histórico de medições, Checklists e OTs.
- Indicadores por equipamento (MTBF, disponibilidade e OTs no ano) e acesso à ação de agendar OT preventiva.
- Estados Default, Light, Loading, Empty e Error; acesso com RBAC para `admin_cliente` e `tecnico` no detalhe.

Fora de escopo: construtor de checklist (`W12`, Story F4.1), execução de checklist, criação/execução de OT, fluxo de chamados, cadastro de hospitais/setores e fórmulas próprias de indicadores no navegador. Exclusão de equipamento não será exposta nesta entrega até que regras de negócio, dependências e confirmação destrutiva sejam validadas.

## Referência visual

A seção do Figma é desktop-first e agrupa telas distintas. A listagem (`W10`) apresenta shell compartilhado, filtros, botão `+ Novo equipamento` e tabela. O detalhe (`W11`) apresenta breadcrumb, nome e status do ativo, abas e conteúdo da aba Dados. O frame de checklist que aparece na mesma seção é outro fluxo e não deve ser implementado como parte destas stories.

### Listagem

- Manter o shell do produto: sidebar, cabeçalho global, busca global, notificações e seletor de tema.
- Título `Equipamentos` e contexto do tenant/hospitais, sem valores demonstrativos tratados como dados reais.
- Filtros de hospital, setor e status; setor deve ser limitado aos hospitais acessíveis e reinicializado quando o hospital mudar.
- Busca por código ou nome do equipamento, com atualização da lista e indicação clara de busca/filtros ativos.
- Tabela com colunas Código, Nome, Modelo, Nº série, Setor, Últ. manut. e Status.
- O status aparece como texto e badge, nunca apenas por cor. Os exemplos `OK`, `Devida`, `Emergência` e `Inativo` são rótulos visuais; mapear somente os estados efetivamente retornados pela API.
- Selecionar uma linha abre o detalhe do equipamento. A ação `+ Novo equipamento` inicia o cadastro.

### Cadastro e edição

- O formulário deve suportar, no mínimo, os campos requeridos pelo contrato confirmado: código, nome, modelo, número de série, hospital e setor quando aplicável, fabricante, datas de aquisição/garantia, dados gerais e foto.
- A lista de campos, obrigatoriedade, validações, enumerações e formato de `dados_gerais` devem espelhar o OpenAPI/DTO real. Não enviar campos vazios ou extras por conveniência visual.
- `dados_gerais` é um conjunto dinâmico chave/valor (Story F3.3), não um formulário fixo; validar tamanho, chaves permitidas e serialização conforme contrato do backend.
- Se a foto for incluída, pedir URL assinada ao backend e enviar o binário diretamente ao storage; nunca encaminhar o arquivo binário pelo endpoint da API HEMM.
- Após salvar, navegar para o detalhe ou retornar à lista conforme fluxo confirmado; invalidar os caches relevantes sem recarregar a aplicação.

### Detalhe

- Cabeçalho mostra código, hospital/setor, nome do equipamento e status real recebido da API.
- Abas: Dados, Histórico de medições, Checklists e OTs. A aba selecionada deve ser navegável por teclado e ter estado ativo perceptível.
- Aba Dados apresenta identificação e atributos técnicos retornados pelo equipamento; valores ausentes usam `—`, não dados do Figma.
- Indicadores exibem MTBF, disponibilidade e total de OTs no ano quando o endpoint e seu contrato fornecerem os valores para o equipamento. Não calcular esses indicadores no frontend.
- A área de próxima manutenção pode exibir prazo, checklist e responsável apenas se vierem de dados de OT relacionados. `Agendar OT preventiva` encaminha ao fluxo de F4 com o equipamento pré-selecionado; a criação continua submetida ao contrato de F4.
- Técnico pode consultar somente equipamento de hospital ao qual está vinculado; o backend continua sendo a autoridade de autorização e escopo.

## Regras funcionais

1. A lista e o detalhe usam o tenant e os hospitais da sessão autenticada. Não aceitar `tenantId` arbitrário como forma de ampliar escopo.
2. Filtros e busca são combináveis. Alterar hospital limpa um setor que não pertença ao novo hospital; limpar filtros restaura a consulta padrão.
3. A lista mostra estados distintos para carregamento, resultado vazio sem filtros, nenhum resultado para filtros ativos, erro recuperável e dados carregados.
4. Cadastro/edição bloqueiam envio duplicado, exibem validação junto ao campo e preservam os dados preenchidos em erro recuperável.
5. Mutação só é considerada bem-sucedida após resposta da API. Atualizar/inutilizar queries de listagem, detalhe e métricas afetadas com React Query.
6. A leitura de abas sem endpoint confirmado deve apresentar indisponibilidade/estado vazio claramente, sem fixture nem requisições improvisadas. Falha de uma aba não deve apagar o conteúdo válido das demais.
7. Erros REST seguem RFC 7807 (`ProblemDetail`), usando `detail`/`code` para mensagem acionável e preservando o shell.

## Rotas e integração

Todas as rotas abaixo são relativas a `/api/v1`, usam `apiClient` compartilhado e Bearer token da sessão. O backend valida tenant, hospital e papel.

| Operação | Endpoint | Situação/observação |
| --- | --- | --- |
| Listar equipamentos | `GET /equipamentos` | Confirmado; `hospitalId` e `setorId` são enviados à API. Busca/status são filtros locais pois não existem parâmetros correspondentes no contrato atual. |
| Criar equipamento | `POST /equipamentos` | Confirmado; payload segue DTO real, inclusive serialização de `dadosGerais`. |
| Consultar detalhe | `GET /equipamentos/{id}` | Confirmado; usar para carregar e validar acesso ao detalhe. |
| Atualizar equipamento | `PUT /equipamentos/{id}` | Confirmado; `codigo` e `setorId` não são enviados na atualização pois não podem ser alterados. |
| Excluir equipamento | `DELETE /equipamentos/{id}` | Existe, mas fora do escopo até validar regra de exclusão e dependências. |
| Solicitar URL para foto | `POST /equipamentos/foto-upload-url` | Confirmado; recebe `nomeArquivo` e retorna URL assinada e chave. O binário é enviado diretamente ao storage. |
| Consultar URL de foto | `GET /equipamentos/{id}/foto-url` | Confirmado; URL temporária consultada sob demanda. |
| Listar documentos | `GET /equipamentos/{equipamentoId}/documentos` | Confirmado; incluir apenas se documentos fizerem parte do contrato visual/issue desta entrega. |
| Solicitar upload de documento | `POST /equipamentos/{equipamentoId}/documentos/upload-url` | Confirmado; upload direto ao storage. |
| Baixar documento | `GET /equipamentos/{equipamentoId}/documentos/{documentoId}/download-url` | Confirmado; URL temporária. |
| Excluir documento | `DELETE /equipamentos/{equipamentoId}/documentos/{documentoId}` | Confirmado; requer ação explícita e confirmação. |
| Indicadores | `GET /relatorios/indicadores` | Rota disponível; filtro/contrato de agregação por equipamento e período precisam ser confirmados. |
| OTs do equipamento | `GET /ordens-de-trabalho` | Rota disponível; filtro por `equipamentoId`, paginação e ordenação precisam ser confirmados. |
| Checklists | `GET /checklists` e rotas de itens | Rotas gerais existem; vínculo ao equipamento e contrato da aba ainda precisam ser confirmados. |
| Histórico de medições | — | Nenhuma rota de leitura de medições por equipamento foi identificada na relação atual; `POST /sync/medicoes` é sincronização de escrita e não substitui um endpoint de consulta. |

`GET /equipamentos/{id}` deve ser a fonte de dados da aba Dados. Query keys sugeridas: `['equipamentos', filters]`, `['equipamentos', id]`, `['equipamento-foto', id]`, `['equipamento-indicadores', id, period]` e chaves próprias para abas que recebam endpoints confirmados. Não incluir token ou PII nas keys.

## Contratos confirmados e pendentes

Confirmados no backend e refletidos na integração: DTO de equipamento e enums; filtros de listagem por hospital/setor; atualização sem alterar código/setor; upload de foto assinado; listagem de OTs com filtro `equipamentoId`. Permanecem pendentes:

- Busca no servidor, filtro de status e metadados de paginação em `GET /equipamentos`.
- Como consultar medições históricas, checklists vinculados, OTs por equipamento e indicadores por equipamento/período.
- Campo de última manutenção e dados da próxima preventiva, se calculados pela API ou derivados de OTs retornadas.
- Regra de leitura para Técnico e Admin do Cliente, especialmente vínculo hospitalar e resposta de acesso negado.

Enquanto algum contrato estiver pendente, a implementação não deve inventar payloads, filtros, fórmulas nem conteúdo de resposta. A tela pode ser entregue por etapas com abas informativas e dados já confirmados.

## Estados de interface

- **Default:** lista/detalhe com dados reais da API no tema Dark; Light preserva a mesma hierarquia usando tokens.
- **Loading:** skeletons para filtros, linhas e áreas do detalhe; comunicar região ocupada sem anunciar cada placeholder.
- **Empty:** mensagem apropriada para nenhum equipamento cadastrado; CTA para cadastrar apenas para papéis autorizados. Filtros sem resultados têm ação para limpar filtros.
- **Error:** erro objetivo e ação de tentar novamente; manter filtros e conteúdo de formulário digitado.
- **Mutation:** estado de envio, sucesso após confirmação do servidor e tratamento inline de erros de validação.
- **Indisponível:** abas sem contrato de consulta não exibem dados ilustrativos nem parecem carregadas com sucesso.

## Acessibilidade, segurança e responsividade

- Aplicar tokens semânticos de `docs/design.md`; não usar cores hexadecimais nem copiar valores do código exportado pelo Figma como estilos finais.
- Filtros e campos têm labels associados; status inclui texto; foco visível e ordem de teclado previsível.
- Linhas são acionáveis por teclado com nome acessível; não colocar botões interativos aninhados em links de linha.
- Abas seguem padrão acessível de tabs, incluindo setas e relação entre `tab`/`tabpanel`.
- Erros globais usam região `role="alert"`; erros de formulário são associados aos campos.
- Respeitar RBAC na UI sem substituir autorização do backend. Não persistir token ou PII em `localStorage`/`sessionStorage`; URLs assinadas não são cacheadas por longo prazo.
- No desktop, manter densidade e colunas do Figma. Em viewports estreitas, permitir rolagem horizontal controlada da tabela ou layout responsivo sem esconder os identificadores principais; filtros podem quebrar em linhas.

## Critérios de aceite

- [ ] `/assets` lista equipamentos do escopo autenticado com busca e filtros hospital/setor/status usando parâmetros confirmados.
- [ ] A tabela contém código, nome, modelo, série, setor, última manutenção e status textual; linha abre o equipamento correto.
- [ ] Cadastro e edição usam DTO real, validação Zod alinhada ao backend e `dados_gerais` dinâmicos.
- [ ] Upload de foto usa URL assinada e envia o arquivo diretamente ao storage.
- [ ] `/assets/:id` mostra dados e estado do equipamento consultados da API, com quatro abas acessíveis.
- [ ] Histórico, checklists, OTs e indicadores só exibem dados reais de contratos confirmados; abas indisponíveis não usam fixtures.
- [ ] MTBF, disponibilidade e total anual de OTs não são calculados no browser.
- [x] Admin do Cliente pode abrir o fluxo F4 pelo botão de agendamento; o equipamento atual é pré-selecionado sem criar a OT automaticamente.
- [ ] Técnico não acessa equipamento fora dos hospitais autorizados; erros 403/404 têm tratamento claro.
- [ ] Dark, Light, Loading, Empty, Error e estados de mutação são distintos e acessíveis.
- [ ] Testes cobrem filtros, acesso ao detalhe, formulários, upload em nível de integração mockada, autorização e estados de API; lint e build passam.

## Decisões pendentes

1. Confirmar contrato OpenAPI para filtros, paginação, medições, indicadores por equipamento e relações equipamento-checklist/OT. O backend local não estava disponível durante a revisão.
3. Definir se o cadastro/edição abre página, modal ou drawer; a seção do Figma não contém frame de formulário de equipamento.
