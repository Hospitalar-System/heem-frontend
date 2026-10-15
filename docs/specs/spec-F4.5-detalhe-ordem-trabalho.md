# Spec F4.5 — Detalhe da Ordem de Trabalho

**Status:** especificação para implementação independente.  
**Story:** F4.5 — OT Detalhe e execução (visão Admin) (`docs/epics.md`)  
**Referência visual:** [Figma, seção Manutenção](https://www.figma.com/design/EDy6hci8DTe0hniabXwsqi/HEMM?node-id=2411-7)  
**Frame:** `W14-OT/Detalhe` (`2404:13810`)  
**Rota frontend:** `/work-orders/:id`  
**Navegação:** detalhe aberto a partir da lista “Ordens de Trabalho” da sidenav.

## Objetivo e escopo

Dar ao Admin do Cliente visibilidade da OT, equipamento, checklist, medições disponíveis, progresso, responsável e estado. Permitir reatribuir técnico sem alterar o estado da OT. A lista e o agendamento inicial estão no [spec F4.4](spec-F4.4-lista-ordens-trabalho.md).

O frame mostra OT-2041, dados do equipamento, medições, progresso do checklist, timeline e ações `Concluir OT` e `Reatribuir técnico`. Os valores de exemplo são apenas referência visual. Não implementar execução ou conclusão se o contrato e as regras de papel não permitirem essa ação para Admin.

## Integração

| Ação | Endpoint | Observações |
|---|---|---|
| Consultar OT | `GET /ordens-de-trabalho/{id}` | Fonte de verdade para dados e estado do detalhe. |
| Reatribuir/atualizar OT | `PUT /ordens-de-trabalho/{id}` | Usar somente os campos alteráveis do DTO; confirmar contrato para troca de técnico. |
| Atualizar status | `PUT /ordens-de-trabalho/{id}/status` | Não expor conclusão até validar transições e autorização. |
| Cancelar OT | `POST /ordens-de-trabalho/{id}/cancelar` | Fora do escopo visual inicial, salvo necessidade validada pelo contrato. |
| Obter itens do checklist | `GET /checklists/{id}/itens` | Exibir apenas quando houver checklist associado e identificador disponível. |
| Medições / timeline | — | As rotas listadas não confirmam leitura de medições associadas nem histórico da OT. Não fabricar dados a partir de outros endpoints. |

## Requisitos funcionais

1. Carregar OT pelo `id` da rota; estado inexistente/inacessível apresenta erro/404 recuperável e ação de retorno à lista.
2. Exibir identificador, tipo, status, equipamento, hospital/setor, técnico e datas conforme dados presentes no DTO.
3. Exibir progresso e itens do checklist somente se a relação for retornada/consultável. A OT corretiva sem checklist deve indicar a ausência ou checklist ad-hoc real, nunca simular um item.
4. Exibir medições e timeline somente com endpoints/dados reais confirmados; se indisponíveis, comunicar que o backend ainda não disponibiliza esses dados.
5. Reatribuir técnico com seleção limitada aos técnicos válidos para o hospital da OT, seguindo contratos reais. A mutação deve preservar estado da OT e invalidar as queries de detalhe/lista.
6. Bloquear concluir uma OT com item obrigatório pendente somente se o backend expuser os itens e a regra aplicável; API continua sendo autoridade final.
7. A ação `Concluir OT` só é apresentada se a autorização e transição forem confirmadas no backend. Não converter clique em chamada improvisada.

## Estados e acessibilidade

Dark/Light, skeleton do detalhe, erro com retry e estados de mutação. Áreas de conteúdo sem endpoint usam estado indisponível, não skeleton infinito ou empty enganoso. Status tem rótulo textual; timeline, quando disponível, é somente leitura. Modal de reatribuição mantém foco e permite operação por teclado.

## Critérios de aceite

- [ ] `/work-orders/:id` mostra a OT correspondente consultada pela API.
- [ ] Sidenav e lista mantêm navegação distinta: o item lateral abre `/work-orders`; a linha abre o detalhe.
- [ ] Reatribuição usa contrato real, técnico do hospital correto e preserva estado.
- [ ] Checklist, medições e timeline nunca são preenchidos com dados de exemplo ou inferidos.
- [ ] Conclusão respeita as transições e autorizações confirmadas no servidor.
- [ ] Loading, erro, ausência de dados, Dark/Light e mutação são testados.

## Limites e dependências

Antes da implementação, confirmar DTO de detalhe, endpoint de técnico, chave de associação do checklist, leitura de medições/histórico e transições autorizadas. Itens não expostos ficam claramente indisponíveis até existir contrato. A lista permanece no spec F4.4.
