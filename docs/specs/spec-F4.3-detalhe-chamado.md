# Spec F4.3 — Detalhe do Chamado de Emergência

**Status:** detalhe e histórico implementados; atribuição de técnico pendente de suporte no backend.  
**Story:** F4.3 — Chamado Detalhe (`docs/epics.md`)  
**Referência visual:** [Figma, seção Manutenção](https://www.figma.com/design/EDy6hci8DTe0hniabXwsqi/HEMM?node-id=2411-7)  
**Frame:** `W16-Chamados/Detalhe` (`2404:14004`)  
**Rota frontend:** `/tickets/:id`  
**Navegação:** detalhe acessado pela lista “Chamados de Emergência” da sidenav.

## Objetivo e escopo

Permitir ao Admin do Cliente ou Técnico consultar o contexto e histórico do chamado, atribuir técnico e gerar OT corretiva quando o estado permitir. A listagem está isolada no [spec F4.2](spec-F4.2-lista-chamados-emergencia.md).

O frame inclui código, estado, severidade, descrição, anexos, hospital/setor, autor/abertura, ações `Gerar OT corretiva` e `Atribuir técnico`. Dados do protótipo são referência de hierarquia visual, não valores padrão.

## Integração

| Ação | Endpoint | Observações |
|---|---|---|
| Consultar chamado | `GET /chamados/{id}` | Fonte de verdade do cabeçalho, descrição e dados de contexto. |
| Consultar histórico | `GET /chamados/{id}/historico` | Timeline somente leitura; usar campos realmente retornados. |
| Atualizar estado | `PUT /chamados/{id}/status` | Body `{ novoStatus }`; não recebe `tecnicoId`, portanto não implementa atribuição. |
| Gerar OT corretiva | `POST /ordens-de-trabalho/corretivas` | Body conforme DTO real e associação com o chamado. |
| Listar técnicos | `GET /users` | Restringir ao hospital do chamado apenas com dados de vínculo confirmados. |

## Requisitos funcionais

1. Buscar o chamado pelo `id` da rota; tratar inexistente ou sem acesso como erro/404 com retorno para `/tickets`.
2. Mostrar código, descrição, status, severidade, equipamento, hospital/setor, responsável/autor, data de abertura e anexos conforme DTO.
3. Consultar e apresentar histórico em timeline somente leitura, em ordem definida pelos timestamps reais. Ausência de eventos é estado vazio, não erro.
4. A atribuição fica indisponível e explica a lacuna enquanto não existir endpoint que receba o técnico. Não chamar `PUT /status` como substituto. Quando suportada, listar apenas técnicos vinculados ao hospital e aplicar a transição prevista pelo backend.
5. `Gerar OT corretiva` aparece somente em `aberto` ou `aguardando_peça`, envia o DTO real e previne duplicidade durante o envio.
6. Após sucesso, atualizar os dados afetados e fornecer navegação para a OT criada somente se a resposta do endpoint fornecer seu identificador.
7. Não simular anexos, autor, técnico, transições ou histórico ausentes. Manter descrição/conteúdo legível em erro parcial de histórico.

## Estados e acessibilidade

Dark/Light, skeleton do detalhe e da timeline, erro com retry e feedback de mutação. Severidade e status têm rótulo textual. Timeline usa semântica de lista; anexos são links/botões com nomes acessíveis. Modais de atribuição gerenciam foco e informam validação.

## Critérios de aceite

- [x] `/tickets/:id` consulta e mostra o chamado correto, com link de retorno à lista.
- [x] Timeline usa `GET /chamados/{id}/historico` e é somente leitura.
- [ ] Atribuição aguarda contrato de backend; a limitação é comunicada e nenhuma transição é simulada.
- [x] Geração de OT corretiva só é permitida nos estados previstos e usa contrato real.
- [x] Não há conteúdo fictício para anexos, histórico ou dados de usuário.
- [x] Loading, erro, histórico vazio, Dark/Light e mutação são cobertos por testes.

## Limites e dependências

DTOs de detalhe/histórico, payload corretivo e vínculo de técnico foram confirmados. O contrato de anexos continua ausente. É necessário adicionar rota/payload de atribuição explícita (técnico e transição) antes de habilitar essa ação. A lista está no spec F4.2.
