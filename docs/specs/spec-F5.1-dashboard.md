# Spec F5.1 — Dashboard operacional

**Status:** implementado para `admin_cliente`; fixture demonstrativa até o contrato de dados do backend ser definido  
**Story:** F5.1 — Dashboard (`docs/epics.md`)  
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

1. **Linha de KPIs:** quatro cards em grade responsiva:
   - Equipamentos ativos, valor e variação percentual vs. mês anterior.
   - OT em aberto, quantidade e novas hoje.
   - Emergências hoje, quantidade e quantas críticas estão em aberto.
   - Disponibilidade, percentual e variação em pontos percentuais na semana.
2. **Gráficos, lado a lado:**
   - “OT por status”: barras para Aberto, Em andamento, Concluído e Atrasado; período indicado como “Últimos 30 dias”.
   - “MTBF por setor”: linha/tendência em horas com setores no eixo horizontal.
3. **Chamados recentes:** tabela com “Chamado”, “Equipamento”, “Hospital / Setor”, “Severidade” e “Abertura”, ação “Ver todos” e linhas clicáveis.

Os números e nomes visíveis no Figma (por exemplo, `1.284`, `47`, `3` e `97,4%`) são dados ilustrativos do mockup, não valores fixos da aplicação.

### Estado Empty no Figma

Mantém o shell e centraliza ícone de estado vazio, título “Ainda não há dados para exibir”, texto explicativo e duas ações: “+ Cadastrar hospital” e “Importar planilha”. Para esta implementação, os CTAs seguem a aceitação de F5.1: “Cadastrar equipamento” e “Exportar relatório”; os destinos seguem para as respectivas áreas do painel.

### Estado Loading

Mantém sidebar e cabeçalho funcionais e representa os quatro KPIs, dois gráficos e a tabela com skeletons de dimensões semelhantes ao conteúdo final. Não mostrar valores antigos como se fossem resposta atual quando ainda não houver dados carregados.

## Requisitos funcionais e regras

1. Ao acessar `/dashboard`, o sistema carrega os agregados do tenant associado à sessão do Admin do Cliente. O cliente nunca envia um tenantId arbitrário para ampliar o escopo; o backend permanece autoridade de isolamento multi-tenant.
2. O dashboard disponibiliza métricas dos KPIs e séries dos gráficos consistentes com FR-16/FR-16b. As regras de cálculo oficiais vêm do backend.
3. “Chamados recentes” ordena por abertura mais recente, salvo regra confirmada do endpoint. Cada linha abre o detalhe do chamado correspondente; “Ver todos” abre a listagem do Epic F4.
4. A pesquisa do cabeçalho aceita equipamentos, OTs e chamados e leva à entidade correspondente quando a busca for selecionada. O formato do autocomplete, os filtros e o endpoint ainda precisam ser confirmados.
5. “+ Nova OT” inicia o fluxo de criação de OT quando disponível. O destino/fluxo não está definido nesta Story e não deve ser simulado como concluído.
6. O sino abre um popover ancorado com as notificações do usuário quando houver endpoint. Até lá, não mostrar contagem ou dados de fixture como reais e apresentar um estado indisponível. Não inferir marcação de leitura ou mutações a partir do mockup.
7. Erros de API preservam o shell, apresentam mensagem objetiva e permitem tentar novamente. Uma resposta vazia válida não deve ser apresentada como erro.
8. O seletor de tema no cabeçalho oferece Claro, Escuro e Automático, com ícones; Automático segue `prefers-color-scheme`.

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

Não derivar MTBF, disponibilidade, atraso, variações ou contagens a partir dos poucos pontos desenhados no Figma. O gráfico deve tratar ausências e zeros conforme o contrato da API.

## Contrato de dados e integrações

Este repositório não contém contrato OpenAPI para os agregados do dashboard. O shape abaixo é uma necessidade de interface, não um DTO confirmado:

```ts
interface DashboardSummaryResponse {
  tenant: { name: string; hospitalCount: number }
  kpis: {
    activeEquipment: { value: number; changePercent: number }
    openWorkOrders: { value: number; newToday: number }
    emergencies: { value: number; criticalOpen: number }
    availability: { percent: number; weeklyChangePp: number }
  }
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

O `DashboardSummary` no front-end é um view model normalizado e atualmente preenchido pelo fixture do Figma em `src/features/dashboard/data/dashboard.demo.ts`. Não representa o DTO do servidor e não deve ser exibido como dado operacional em produção. Confirmar endpoint, query keys, paginação, atualização/refetch, datas/timezone, precisão, códigos de erro e formato dos valores com o backend antes de substituir o fixture. Respeitar RFC 7807 (`ProblemDetail`) já estabelecido para erros REST. Se APIs separadas forem necessárias, documentar sua consistência temporal.

## Estados de interface

- **Default:** renderiza shell, contexto do tenant, KPIs, ambos os gráficos e chamados recentes.
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
- [ ] KPIs e gráficos exibem dados de FR-16/FR-16b sem fórmulas duplicadas no front-end.
- [ ] “Chamados recentes” é navegável para detalhe e “Ver todos” para a lista de chamados.
- [ ] A busca e “Nova OT” têm destinos/contratos definidos; notificações mostram dados do endpoint quando disponível ou o estado indisponível sem dados fictícios.
- [ ] O seletor no cabeçalho alterna Claro, Escuro e Automático com ícones.
- [ ] Default Dark, Light, Loading, Empty e Error ficam visual e funcionalmente distintos.
- [ ] Empty usa os CTAs acordados e navega a destinos funcionais.
- [ ] Gráficos, severidades, tabela e navegação atendem os requisitos de teclado e leitor de tela.
- [ ] O layout preserva a hierarquia desktop do Figma; comportamento em viewports menores é acordado/documentado.

## Decisões pendentes antes da implementação

1. Contratos/endpoints e fórmulas de cada KPI/gráfico, incluindo períodos e timezone.
2. Definição e quantidade dos “Chamados recentes”, ordem e paginação.
3. Destinos definitivos das ações “Nova OT”, pesquisa global, contador de notificações e “Ver todos”.
4. Comportamento responsivo e tratamento de falha parcial entre widgets.
