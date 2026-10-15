# Spec F4.2 — Lista de Chamados de Emergência

**Status:** implementado; integração usa a lista completa de chamados e os contratos de criação confirmados.  
**Story:** F4.2 — Lista de chamados de emergência (`docs/epics.md`)  
**Referência visual:** [Figma, seção Manutenção](https://www.figma.com/design/EDy6hci8DTe0hniabXwsqi/HEMM?node-id=2411-7)  
**Frame:** `W15-Chamados/Lista` (`2404:13922`)  
**Rota frontend:** `/tickets`  
**Navegação:** item “Chamados de Emergência” da sidenav.

## Objetivo e escopo

Permitir ao Admin do Cliente acompanhar chamados, priorizados por severidade e tempo, abrir detalhes e gerar OT corretiva diretamente em chamados elegíveis. O detalhe fica especificado separadamente em [F4.3 — Detalhe do Chamado](spec-F4.3-detalhe-chamado.md).

O frame apresenta banner de chamados críticos, lista de chamados agrupados/destacados por severidade, identificação do equipamento e do hospital/setor, descrição, tempo decorrido e ação `Gerar OT corretiva`. Conteúdo demonstrativo do Figma não representa dados reais.

## Integração

Todas as rotas são relativas a `/api/v1`, pelo `apiClient` autenticado.

| Ação | Endpoint | Observações |
|---|---|---|
| Listar chamados | `GET /chamados` | Confirmar parâmetros de status, severidade, paginação e ordenação; usar apenas os suportados. |
| Criar OT corretiva | `POST /ordens-de-trabalho/corretivas` | Body conforme DTO do backend; validar vínculo ao chamado. |
| Consultar detalhe após seleção | `GET /chamados/{id}` | Consumido pela página separada F4.3. |

## Requisitos funcionais

1. O item “Chamados de Emergência” da sidenav navega para `/tickets` e esta rota renderiza a listagem, não Dashboard nem 404.
2. Consultar chamados reais e ordenar por severidade/tempo somente segundo campos retornados e regras confirmadas. Não estimar SLA nem severidade ausente.
3. Exibir banner agregado somente quando a contagem de chamados críticos/altos elegíveis puder ser calculada a partir do conjunto completo disponibilizado pela API; caso paginação impeça total confiável, não apresentar contagem como total global.
4. Destacar criticidade com texto e token semântico, sem depender apenas de cor.
5. Exibir equipamento, hospital/setor, descrição resumida, tempo/abertura e estado conforme DTO; campos ausentes usam `—`.
6. Abrir `/tickets/:id` ao selecionar um chamado. Gerar OT corretiva sem abrir detalhe apenas quando status for `aberto` ou `aguardando_peça`.
7. Ao criar OT, prevenir envio duplicado, informar sucesso e invalidar lista/detalhe relacionados. Erros RFC 7807 mantêm o usuário na tela.

## Estados e acessibilidade

Dark/Light, skeleton de lista, empty com CTA coerente, erro com retry e estado de mutação. A ordenação/prioridade é identificável por texto. Ações possuem nomes acessíveis e não ficam aninhadas em link/linha clicável. Em viewport estreita, conservar acesso a identificador, prioridade e ação.

## Critérios de aceite

- [x] Sidenav leva à listagem `/tickets`; selecionar linha abre `/tickets/:id`.
- [x] Dados e estados vêm do backend; nenhum chamado do protótipo é mostrado como registro real.
- [x] Banner usa o conjunto completo retornado pela API e desaparece quando não há chamados críticos/altos elegíveis.
- [x] `Gerar OT corretiva` aparece apenas para `aberto`/`aguardando_peça`.
- [x] A criação usa `codigo`, `chamadoId` e `tecnicoId`, evita duplo envio e invalida a lista após sucesso.
- [x] Loading, empty, error, filtros, navegação, criação e estado pós-mutação são cobertos por testes; tema usa tokens Dark/Light existentes.

## Limites e dependências

Confirmar DTO e parâmetros de listagem, paginação, ordenação e campos de prioridade/abertura. O backend deve fornecer informação suficiente para contagem global do banner e ordenação consistente. Se não fornecer, não apresentar um número parcial como total. Detalhe e atribuição inicial pertencem ao spec F4.3.
