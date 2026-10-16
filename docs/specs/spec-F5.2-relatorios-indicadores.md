# Spec F5.2 — Relatórios & Indicadores

**Status:** implementação em andamento conforme os contratos disponíveis; agregações por hospital/setor e séries temporais não são fornecidas pelos endpoints atuais.  
**Story:** F5.2 — Relatórios & Indicadores (`docs/epics.md`)  
**Issue:** [#17 — Story F5.2: Relatórios & Indicadores](https://github.com/Hospitalar-System/heem-frontend/issues/17)
**Referência visual:** [Figma, seção Relatórios](https://www.figma.com/design/EDy6hci8DTe0hniabXwsqi/HEMM?node-id=2411-8)  
**Frame:** `W17-Relatorios/Default` (`2404:14074`)

## Objetivo e escopo

Permitir ao Admin do Cliente consultar indicadores do período, filtrar por hospital/setor, visualizar conformidade por nível de risco e solicitar exportações assíncronas. A rota da tela é `/reports`; o tenant é sempre inferido pelo backend a partir da sessão autenticada.

O layout segue o frame W17: filtros no topo, KPIs, painéis analíticos e detalhamento. Os números presentes no protótipo são ilustrativos e não devem aparecer como dados operacionais. Dark/Light, loading, empty, error e exportação em processamento/concluída/com falha são estados necessários.

## Integração confirmada

Todas as rotas são relativas a `/api/v1`, usam Bearer token e RFC 7807 para erros.

| Ação | Endpoint e contrato | Uso na tela |
|---|---|---|
| Indicadores | `GET /relatorios/indicadores?desde=<ISO-8601>&ate=<ISO-8601>&hospitalId?&setorId?` | `mtbfHoras`, `tempoMedioAtendimentoHoras`, `tempoMedioResolucaoHoras`, `disponibilidadePercentual`, `qtdOtsPreventivas`, `qtdOtsCorretivas`. Requer `admin_cliente`. |
| Conformidade | `GET /relatorios/conformidade` com os mesmos parâmetros | Array de `{ nivelRisco, percentualConforme, totalMedicoes }`; requer `admin_cliente`. |
| Solicitar exportação | `POST /relatorios/exportacoes` | Body `{ hospitalId?, setorId?, desde, ate, conteudo?, formato? }`; retorna 202 e `{ id, status, urlDownload }`. |
| Consultar exportação | `GET /relatorios/exportacoes/{id}` | Consultar status e URL temporária; baixar somente quando `status=concluido`. |

Formatos aceitos: `csv`, `xlsx`, `pdf`. Conteúdos: `chamados`, `ordens_trabalho`, `medicoes` (padrões do backend: `chamados` e `csv`). A tela oferece Excel (`xlsx`) e PDF, e permite escolher o conteúdo antes de exportar. A exportação é assíncrona e não deve bloquear a tela.

Hospitais e setores são carregados pelas rotas existentes de ativos (`GET /hospitais` e `GET /hospitais/{hospitalId}/setores`). Trocar hospital limpa setor incompatível. Períodos são enviados como timestamps ISO-8601, cobrindo o dia inicial e o dia final selecionados.

## Limites do contrato frente ao Figma

O DTO de indicadores entrega apenas valores agregados para os filtros selecionados. Não há dimensões temporais nem campos agrupados por hospital/setor para alimentar `Disponibilidade por hospital`, `MTBF por setor` ou a tabela de detalhamento por setor. A UI não deve reconstruir essas séries com médias locais, OTs ou dados de conformidade. Nesses painéis, informar que o backend ainda não fornece a agregação.

O endpoint de conformidade oferece uma agregação real por nível de risco, que pode ser exibida separadamente e não deve ser rotulada como disponibilidade.

## Requisitos funcionais

1. Ao abrir `/reports`, consultar indicadores e conformidade com período padrão recente, filtros selecionados e sem tenantId vindo do cliente.
2. Alterar período, hospital ou setor atualiza as consultas; evitar datas inválidas e `desde > ate`.
3. Exibir MTBF, tempo médio de atendimento, tempo médio de resolução, disponibilidade e quantidades de OT preventivas/corretivas conforme DTO, com `—` para `null`.
4. Exibir conformidade por risco com percentual e total de medições; tratar array vazio como estado vazio válido.
5. Solicitar exportação com os filtros e conteúdo selecionados, acompanhar `pendente` até estado terminal e oferecer download via URL recebida quando concluída.
6. Erro recuperável mantém filtros e oferece retry. Não exibir valores do mockup como fallback.
7. Somente `admin_cliente` acessa a tela; a API continua sendo a autoridade de autorização e escopo.

## Critérios de aceite

- [ ] `/reports` apresenta layout alinhado ao W17, com shell compartilhado e responsividade sem sobreposição.
- [ ] Filtros de período/hospital/setor chamam endpoints com parâmetros ISO e resetam setor ao trocar hospital.
- [ ] KPIs correspondem ao DTO de indicadores e não são calculados no navegador.
- [ ] Conformidade usa somente o endpoint próprio e diferencia ausência de dados de falha.
- [ ] Gráficos/tabela que dependem de agrupamentos ausentes não usam fixtures nem inferências locais.
- [ ] Exportações Excel/PDF enviam conteúdo e filtros, acompanham o job e só habilitam download quando concluído.
- [ ] Loading, empty, error e export states são claros; Dark e Light usam tokens semânticos.
- [ ] Apenas Admin do Cliente tem acesso; teste cobre filtros, chamadas, exportação e autorização.

## Decisões pendentes no backend

- Adicionar DTO agregado por hospital e série temporal de disponibilidade para o primeiro gráfico do Figma.
- Adicionar MTBF agrupado por setor, intervalos temporais e resposta detalhada por setor.
- Esclarecer timezone/calendário usado na agregação e retenção/expiração da URL de exportação.
- Issue #18 não pôde ser consultado nesta execução (404); confirmar seu texto/aceite quando houver acesso.
