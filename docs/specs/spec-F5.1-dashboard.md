# Spec F5.1 — Dashboard operacional

**Status:** integração frontend e agregados implementados contra o contrato proposto abaixo; homologação com o DTO real do backend ainda pendente.
**Story:** F5.1 — Dashboard (`docs/epics.md`)  
**Issue:** [#16 — Story F5.1: Dashboard](https://github.com/Hospitalar-System/heem-frontend/issues/16)
**Emenda aprovada:** [Comentário de 14/10/2026](https://github.com/Hospitalar-System/heem-frontend/issues/16#issuecomment-6178477086)
**Persona:** Admin do Cliente  
**Referência visual:** [Seção Dashboard no Figma](https://www.figma.com/design/EDy6hci8DTe0hniabXwsqi/HEMM?node-id=2411-5)  
**Frames:** `W06-Dashboard/Default` (`2404:12899`), `W07-Dashboard/Alt` (`2404:13049`), `W08-Dashboard/Loading/Dark` (`2404:14950`) e `W09-Dashboard/Empty/Dark` (`2404:15021`)  
**Documentos relacionados:** `AGENTS.md`, `docs/design.md`, `docs/epics.md`, `docs/experience.md`

## Objetivo

Apresentar ao Admin do Cliente um resumo da saúde operacional do tenant ao entrar no sistema, destacando equipamentos, ordens de trabalho, emergências e disponibilidade, com acesso direto às filas que exigem atenção.

## Escopo

- Rota de dashboard para o papel `admin_cliente`.
- Shell do painel Web com sidebar, perfil do usuário autenticado em memória, contexto do tenant e cabeçalho global conforme o frame.
- Quatro indicadores operacionais, gráfico de OTs por status, tendência de MTBF por setor e tabela de chamados recentes.
- Resumo operacional ampliado: equipamentos ativos, chamados por severidade, SLAs vencidos, disponibilidade, preventivas atrasadas e documentos próximos do vencimento.
- Estados Default, Light, Loading e Empty mostrados na seção do Figma, além de erro recuperável exigido para dados assíncronos.
- Busca global e acessos de navegação presentes no cabeçalho e menu.

Fora de escopo: CRUD de equipamentos/OTs/chamados, detalhes das entidades, gestão/marcação de notificações, regras de permissão além do acesso ao dashboard e a tela de Relatórios. O backend listado não expõe rota de notificações; o popover deve mostrar estado indisponível até existir contrato. Os fluxos de `Nova OT` e pesquisa dependem das stories/rotas próprias quando não especificados aqui.

## Referência visual e estrutura

A seção Figma agrupa quatro frames desktop de **1440×900**. A tela assume desktop-first, conforme `docs/experience.md`.

### Shell

- Janela principal com borda discreta e raio externo de aproximadamente 16 px.
- Sidebar fixa de aproximadamente 248 px, com marca HEMM, seção “Operação”, navegação e perfil do usuário no rodapé.
- O perfil do rodapé usa os dados recebidos de `/api/v1/me` na sessão em memória; nunca usar nome/avatar de fixture como identidade autenticada nem persistir PII em armazenamento do navegador.
- Itens: Dashboard (ativo), Equipamentos, Ordens de Trabalho, Chamados de Emergência, Checklists, Hospitais, Setores, Relatórios e Usuários & Papéis.
- Cabeçalho de aproximadamente 68 px: título “Dashboard”, tenant e número de hospitais; campo “Buscar equipamento, OT, chamado…”, atalho de notificações com contador e ação “+ Nova OT”.
- Conteúdo com espaçamento de 32 px, usando tokens semânticos do Design System; o frame escuro usa o tema Dark e `W07` representa o tema Light.

### Conteúdo Default

1. **Linha de KPIs:** cards em grade responsiva:
   - Equipamentos ativos, valor e variação percentual vs. mês anterior.
   - OT em aberto, quantidade e novas hoje.
   - Chamados de emergência, com distribuição por severidade e quantas críticas estão em aberto.
   - Disponibilidade, percentual e variação em pontos percentuais na semana.
   - SLAs vencidos, preventivas atrasadas e documentos próximos do vencimento, destacados como contadores operacionais de atenção.
2. **Gráficos, lado a lado:**
   - “OT por status”: barras para Aberto, Em andamento, Concluído e Atrasado; período indicado como “Últimos 30 dias”.
   - “MTBF por setor”: linha/tendência em horas com setores no eixo horizontal.
3. **Chamados recentes:** tabela com “Chamado”, “Equipamento”, “Hospital / Setor”, “Severidade” e “Abertura”, ação “Ver todos” e linhas clicáveis.
4. **Resumo ampliado:** incluir contagem/distribuição dos chamados por severidade, total de chamados com SLA vencido, preventivas atrasadas e documentos vencendo. A apresentação pode usar KPI cards ou uma faixa de alertas compacta, mantendo hierarquia e legibilidade do dashboard existente; os valores devem vir do agregado oficial.

Os números e nomes visíveis no Figma (por exemplo, `1.284`, `47`, `3` e `97,4%`) são dados ilustrativos do mockup, não valores fixos da aplicação.

### Estado Empty no Figma

Mantém o shell e centraliza ícone de estado vazio, título “Ainda não há dados para exibir”, texto explicativo e duas ações: “+ Cadastrar hospital” e “Importar planilha”. Para esta implementação, os CTAs seguem a aceitação de F5.1: “Cadastrar equipamento” e “Exportar relatório”; os destinos seguem para as respectivas áreas do painel.

### Estado Loading

Mantém sidebar e cabeçalho funcionais e representa os quatro KPIs, dois gráficos e a tabela com skeletons de dimensões semelhantes ao conteúdo final. Não mostrar valores antigos como se fossem resposta atual quando ainda não houver dados carregados.

## Requisitos funcionais e regras

1. Ao acessar `/dashboard`, o sistema carrega os agregados do tenant associado à sessão do Admin do Cliente. O cliente nunca envia um tenantId arbitrário para ampliar o escopo; o backend permanece autoridade de isolamento multi-tenant.
2. O dashboard disponibiliza métricas dos KPIs e séries dos gráficos consistentes com FR-16/FR-16b. As regras de cálculo oficiais vêm do backend.
3. O dashboard também apresenta os agregados da emenda aprovada na issue #16: chamados por severidade, SLAs vencidos, preventivas atrasadas e documentos vencendo. O backend deve fornecer os totais e as janelas temporais; o frontend não deve recalcular essas métricas varrendo listas parciais.
4. “Chamados recentes” ordena por abertura mais recente, salvo regra confirmada do endpoint. Cada linha abre o detalhe do chamado correspondente; “Ver todos” abre a listagem do Epic F4.
5. A pesquisa do cabeçalho aceita equipamentos, OTs e chamados e leva à entidade correspondente quando a busca for selecionada. O formato do autocomplete, os filtros e o endpoint ainda precisam ser confirmados.
6. “+ Nova OT” inicia o fluxo de criação de OT quando disponível. O destino/fluxo não está definido nesta Story e não deve ser simulado como concluído.
7. O sino abre um popover ancorado com as notificações do usuário quando houver endpoint. Até lá, não mostrar contagem ou dados de fixture como reais e apresentar um estado indisponível. Não inferir marcação de leitura ou mutações a partir do mockup.
8. Erros de API preservam o shell, apresentam mensagem objetiva e permitem tentar novamente. Uma resposta vazia válida não deve ser apresentada como erro.
9. O seletor de tema no cabeçalho oferece Claro, Escuro e Automático, com ícones; Automático segue `prefers-color-scheme`.

## Indicadores, séries e semântica dos dados

O frame sugere os seguintes campos; valores e fórmulas devem vir de agregados documentados do backend ou ser acordados com ele, sem cálculo concorrente no browser:

| Visual | Dados necessários | Ponto a confirmar |
| --- | --- | --- |
| Equipamentos ativos | total, variação vs. mês anterior | Estados considerados ativos e janela/calendário da comparação |
| OT em aberto | total, novas hoje | Quais estados contam como abertas e timezone para “hoje” |
| Emergências hoje | total, críticas em aberto | Definição de abertura do dia e severidade crítica |
| Disponibilidade | percentual, delta semanal em p.p. | Fórmula FR-16b, janela e precisão |
| OT por status | contagem de Aberto, Em andamento, Concluído e Atrasado | Mapeamento dos estados reais para as quatro séries e janela de 30 dias |
| MTBF por setor | pontos da série, setor, horas | Fórmula FR-16b, período e tratamento de setor sem amostra |
| Chamados recentes | id, equipamento, hospital/setor, severidade, abertura | Ordenação, paginação e quantidade inicial |
| Chamados por severidade | total por severidade e total de críticas abertas | Enumeração e regras de inclusão de estados |
| SLA vencido | quantidade e, se aplicável, idade do vencimento | Definição do SLA, timezone e quais estados deixam de contar |
| Preventivas atrasadas | quantidade de OTs preventivas vencidas e não concluídas | Status que contam, data de referência e timezone |
| Documentos vencendo | quantidade e janela de vencimento; opcionalmente itens para navegação | Tipos de documento, janela de alerta e autorização de acesso |

Não derivar MTBF, disponibilidade, atraso, variações ou contagens a partir dos poucos pontos desenhados no Figma. O gráfico deve tratar ausências e zeros conforme o contrato da API.

## Contrato de dados e integrações

O inventário de rotas disponível inclui `GET /api/v1/relatorios/dashboard`. A rota é conhecida, mas este repositório ainda não contém o DTO OpenAPI confirmado para o resumo original nem para os agregados ampliados. O shape abaixo é uma necessidade de interface, não um DTO confirmado:

```ts
interface DashboardSummaryResponse {
  tenant: { name: string; hospitalCount: number }
  kpis: {
    activeEquipment: { value: number; changePercent: number }
    openWorkOrders: { value: number; newToday: number }
    emergencies: { value: number; criticalOpen: number }
    availability: { percent: number; weeklyChangePp: number }
    overdueSla: { count: number }
    overduePreventiveWorkOrders: { count: number }
    expiringDocuments: { count: number; withinDays?: number }
  }
  emergenciesBySeverity: Array<{ severity: string; count: number }>
  workOrdersByStatus: Array<{ status: string; count: number }>
  mtbfBySector: Array<{ sector: string; hours: number }>
  recentTickets: Array<{
    id: string
    equipmentName: string
    hospitalName: string
    sectorName: string
    severity: string
    openedAt: string
  }>
}
```

O front-end consome `GET /api/v1/relatorios/dashboard` pelo hook React Query do feature e valida a resposta em runtime antes de normalizá-la. O shape TypeScript/Zod em `src/features/dashboard/types/index.ts` formaliza o contrato de consumo proposto neste spec, mas ainda não foi confirmado contra o DTO OpenAPI real do servidor. Respostas divergentes são tratadas como erro recuperável; nenhum dado de fixture do Figma é exibido como operacional. Confirmar propriedades, filtros, atualização/refetch, datas/timezone, precisão, códigos de erro e formato dos valores com o backend. Respeitar RFC 7807 (`ProblemDetail`) já estabelecido para erros REST. A emenda da issue depende das stories correspondentes do `heem-backend` estarem em `dev`; os IDs dessas stories não estão indicados no comentário e não devem ser presumidos.

Não consultar todos os equipamentos, OTs, chamados e documentos em chamadas N+1 para reconstruir os agregados. Em particular, a contagem de documentos vencendo exige dado agregado/autorizado do backend; os endpoints atuais de documentos por equipamento não são suficientes para uma consulta global confiável.

## Estados de interface

- **Default:** renderiza shell, contexto do tenant, KPIs, ambos os gráficos e chamados recentes.
- **Default ampliado:** inclui distribuição por severidade e indicadores de SLA vencido, preventiva atrasada e documento vencendo, sem substituir os gráficos e aceites originais.
- **Light:** mesmos dados e hierarquia do Default com tokens Light.
- **Loading:** skeletons para as áreas em carregamento, sem travar navegação global.
- **Empty:** mensagem útil e CTAs acordadas, preservando sidebar/cabeçalho.
- **Error:** mensagem objetiva, opção de retry e shell preservado; distinguir falha global de falha parcial de widget, se as fontes de dados forem independentes.

## Acessibilidade e comportamento

- Navegação de sidebar, pesquisa, notificações, “Nova OT”, gráficos e tabela acessíveis por teclado e com nomes acessíveis.
- Indicadores e severidades têm texto além da cor. Em gráficos, expor rótulo, série e valores em alternativa textual/tabela acessível; cores nunca são a única codificação.
- Cabeçalhos de coluna semânticos, foco visível e linhas acionáveis também por teclado.
- Skeletons devem ser anunciados como região ocupada sem leitura repetitiva dos placeholders.
- Respeitar `prefers-reduced-motion` para animações de gráfico/skeleton.

## Responsividade

Figma e `docs/experience.md` priorizam o painel Web desktop. A composição para tablet/mobile não está mockada. Manter o desktop próximo da grade de 4 KPIs, 2 gráficos e tabela; documentar comportamento de breakpoint, recolhimento da sidebar e tabela horizontal antes de assumir um layout responsivo final.

## Critérios de aceite

- [ ] `/dashboard` exibe shell e conteúdo do tenant correto para Admin do Cliente.
- [ ] KPIs, gráficos e agregados ampliados exibem dados de FR-16/FR-16b e da emenda da issue #16 sem fórmulas duplicadas no front-end.
- [ ] Chamados são agrupados por severidade e os totais de SLA vencido, preventivas atrasadas e documentos vencendo vêm do agregado autorizado do backend.
- [ ] “Chamados recentes” é navegável para detalhe e “Ver todos” para a lista de chamados.
- [ ] A busca e “Nova OT” têm destinos/contratos definidos; notificações mostram dados do endpoint quando disponível ou o estado indisponível sem dados fictícios.
- [ ] O seletor no cabeçalho alterna Claro, Escuro e Automático com ícones.
- [x] O front-end consulta `GET /api/v1/relatorios/dashboard`, valida o agregado e não exibe valores demonstrativos como reais.
- [x] Loading, Empty e Error são derivados da consulta; o erro permite retry sem recarregar a página.
- [x] Empty usa os CTAs acordados e navega a destinos funcionais.
- [ ] Default Dark, Light, Loading, Empty e Error ficam visual e funcionalmente distintos.
- [ ] Gráficos, severidades, tabela e navegação atendem os requisitos de teclado e leitor de tela.
- [ ] O layout preserva a hierarquia desktop do Figma; comportamento em viewports menores é acordado/documentado.

## Dependências e decisões pendentes

1. DTO expandido do `GET /api/v1/relatorios/dashboard` e stories correspondentes do backend em `dev`, conforme dependência apontada no comentário da issue.
2. Contratos e fórmulas de cada KPI/gráfico/agregado, incluindo períodos e timezone.
3. Definição e quantidade dos “Chamados recentes”, ordem e paginação.
4. Destinos definitivos das ações “Nova OT”, pesquisa global, contador de notificações e “Ver todos”.
5. Comportamento responsivo, tratamento de falha parcial e permissões específicas para os agregados de documentos.
