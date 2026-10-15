# Spec F4.4 — Lista e agendamento de Ordens de Trabalho

**Status:** especificação para implementação independente.  
**Story:** F4.4 — Lista e agendamento de Ordens de Trabalho (`docs/epics.md`)  
**Referência visual:** [Figma, seção Manutenção](https://www.figma.com/design/EDy6hci8DTe0hniabXwsqi/HEMM?node-id=2411-7)  
**Frame:** `W13-OT/Lista` (`2404:13666`)  
**Rota frontend:** `/work-orders`  
**Navegação:** item “Ordens de Trabalho” da sidenav.

## Objetivo e escopo

Permitir ao Admin do Cliente consultar, filtrar e abrir OTs, além de iniciar o agendamento de uma nova OT preventiva. Esta entrega cobre somente a listagem e o fluxo de criação preventiva; a consulta detalhada pertence ao [spec F4.5 — Detalhe da OT](spec-F4.5-detalhe-ordem-trabalho.md).

O frame apresenta filtros de status, tipo, técnico e período, ação `+ Nova OT` e tabela com OT, tipo, equipamento, técnico, setor, vencimento e status. Dados ilustrativos do Figma não podem ser tratados como registros reais.

## Integração

Todas as chamadas usam o `apiClient`, Bearer token e prefixo `/api/v1`. Tenant e permissões são determinados pelo backend.

| Ação | Endpoint | Observações |
|---|---|---|
| Listar OTs | `GET /ordens-de-trabalho` | Consultar parâmetros de filtro, paginação, ordenação e DTO existentes antes de integrar; enviar apenas parâmetros aceitos. |
| Listar OTs atrasadas | `GET /ordens-de-trabalho?atrasadas=true` | Adendo aprovado no issue #14 em 2026-10-14; filtro remoto do backend. |
| Criar preventiva | `POST /ordens-de-trabalho/preventivas` | Payload deve seguir o DTO real. Estado inicial esperado: `agendada`. |
| Equipamentos | `GET /equipamentos` | Fonte para selecionar equipamento no agendamento; setor/hospital devem vir de dados válidos. |
| Checklists | `GET /checklists` | Fonte para o checklist preventivo, conforme contrato atual. |
| Técnicos | `GET /users` | Reutilizar consulta de usuários e filtrar papéis/vínculos conforme contrato, nunca inventar vínculos locais. |

## Requisitos funcionais

1. Acessar `/work-orders` pelo item “Ordens de Trabalho” da sidenav e carregar registros da API.
2. Exibir filtros de status, tipo, técnico e período. Filtros não suportados no servidor podem ser aplicados localmente somente sobre o conjunto efetivamente carregado; não alegar paginação ou busca remota inexistente.
3. Exibir tabela com identificador, tipo, equipamento, técnico, setor, vencimento e status textual/badge. Campos ausentes são `—`; status não depende somente de cor.
4. Abrir `/work-orders/:id` ao selecionar uma OT. A tela de destino está especificada separadamente.
5. `+ Nova OT` inicia criação preventiva usando equipamento, checklist e técnico disponíveis. A lista de técnicos deve respeitar o hospital do equipamento segundo vínculos reais fornecidos pelo backend.
6. Após criação confirmada, atualizar a query de listagem sem reload e mostrar estado `agendada`.
7. Erros de validação exibem `ProblemDetail` junto ao formulário/campo quando possível; preservar valores para nova tentativa.
8. Marcar OTs atrasadas e identificar OTs geradas a partir de plano preventivo (adendo aprovado no issue #14 em 2026-10-14). A associação ao plano depende do campo exposto pelo DTO do backend.

## Estados e acessibilidade

Implementar Dark/Light com tokens semânticos, skeleton de tabela/filtros, vazio com CTA autorizado, erro recuperável com retry e estado de envio no formulário. Filtros devem ter labels; linhas navegáveis por teclado; modal/formulário com foco gerenciado; tabela pode rolar horizontalmente em viewport estreita sem esconder OT e status.

## Critérios de aceite

- [ ] A sidenav “Ordens de Trabalho” navega para `/work-orders`, sem cair em Dashboard/404.
- [ ] Lista e filtros exibem dados da API e não fixtures do Figma.
- [ ] A seleção de uma linha navega à OT correspondente.
- [ ] O formulário cria somente OT preventiva com contrato real, equipamento, checklist e técnico válidos.
- [ ] Técnico disponível corresponde ao hospital do equipamento conforme dados reais.
- [ ] A criação atualiza a lista após sucesso; erros não descartam os valores digitados.
- [ ] Loading, empty, error, Dark e Light são cobertos por testes; RBAC restringe a criação ao papel autorizado.

## Limites e dependências

Validar o OpenAPI/DTO do backend para filtros, paginação, payload da preventiva e representação de associação técnico-hospital. Se o contrato não retornar uma dessas dimensões, não inventar valores, filtros remotos ou relações. A rota de detalhe é responsabilidade do spec F4.5.
