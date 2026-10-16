# Spec F4.6 — Planos preventivos

**Status:** aguardando contrato de API; Story 9.1/9.2 do backend bloqueiam o fluxo de gestão dos planos.  
**Issue:** [#29 — Story F4.6: Planos preventivos](https://github.com/Hospitalar-System/heem-frontend/issues/29)  
**Referências:** `docs/design.md`, `docs/experience.md`, `docs/epics.md` e a issue #29.

## Objetivo

Como Admin do Cliente, cadastrar planos recorrentes de manutenção preventiva para gerar OTs automaticamente, acompanhar a próxima execução, resolver pendências de técnico, desativar planos sem perder o histórico e navegar às OTs geradas.

## Escopo funcional após liberação do backend

- Tela dedicada acessível pelo item “Planos preventivos” da navegação, exclusiva para `admin_cliente`.
- Criação com equipamento, checklist, técnico padrão, intervalo em dias e data âncora.
- Consulta de planos ativos/inativos, próxima data prevista, pendências e histórico de OTs geradas.
- Técnico listado somente se estiver ativo e vinculado ao hospital do equipamento.
- Selo de pendência quando o técnico se tornar inativo ou perder o vínculo; ação para corrigir a atribuição.
- Desativação do plano sem excluir OTs ou histórico existentes.
- Link da OT gerada para o detalhe existente `/work-orders/:id`.

## Contrato e bloqueio

A issue indica dependência das Stories 9.1 e 9.2 do backend. No contrato de API disponível neste repositório há `POST /ordens-de-trabalho/preventivas` para agendar uma OT individual, mas não há rotas para criar/listar/editar/desativar planos, consultar próximas execuções ou acessar histórico por plano. O campo opcional `planoPreventivoId` em uma OT não substitui a API de gestão de planos.

Não usar a rota de OT avulsa para simular um plano recorrente. Antes de habilitar as operações, confirmar endpoints e DTOs de plano, regras de idempotência/geração, semântica de pendência e formato do histórico. A tela atual comunica o bloqueio e mantém o caminho de consulta às OTs existentes.

## Acesso e dados

- Rota de frontend: `/preventive-plans`.
- Papel permitido: `admin_cliente` apenas, incluindo negação explícita a `super_admin`.
- A UI oculta o item de menu para os demais papéis; a proteção do backend continua obrigatória.
- Nenhum dado de plano é criado ou inferido localmente.

## Critérios de aceite

- [x] Rota e entrada de navegação são exclusivas para Admin do Cliente.
- [x] A tela explica a dependência das Stories de backend e não apresenta fixtures como planos reais.
- [x] A tela oferece navegação para consultar OTs existentes sem chamar essas OTs de plano recorrente.
- [ ] Criar plano com equipamento, checklist, técnico, intervalo e data âncora; apresentar próxima data retornada pela API.
- [ ] Filtrar técnicos por vínculo ao hospital do equipamento e tratar técnico inválido/desvinculado.
- [ ] Mostrar e corrigir pendências de técnico.
- [ ] Desativar plano sem apagar o histórico.
- [ ] Listar OTs geradas pelo plano e abrir o detalhe F4.5.

## Estados

- **Dependência pendente (atual):** aviso explícito, ações de gestão indisponíveis e link para OTs existentes.
- **Futuros estados:** Default, Loading (skeleton), Empty, Error recuperável, criação/salvamento, desativação confirmada e lista de histórico.
- Dark e Light usam os tokens semânticos de `docs/design.md`.

## Arquivos

- `src/features/maintenance/pages/PreventivePlansPage.tsx`
- `src/features/maintenance/__tests__/PreventivePlansPage.test.tsx`
- `src/app/router.tsx`
- `src/features/dashboard/components/DashboardSidebar.tsx`
