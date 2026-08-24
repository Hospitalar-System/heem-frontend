---
name: HEMM
status: final
created: '2026-08-24'
updated: '2026-08-24'
sources:
  - imports/cadastros.pdf
  - imports/equipamentos.pdf
  - imports/chamados.pdf
  - imports/relatorios.pdf
  - imports/mobile.pdf
  - imports/guia de estilo.pdf
  - _bmad-output/planning-artifacts/prds/prd-HEEM-2026-08-24/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-HEEM-2026-08-24/ARCHITECTURE-SPINE.md
---

## Foundation

Multi-surface: **Web** (painel de gestão — Super Admin e Admin do Cliente, desktop-first, sidebar fixa) e **Mobile** (app de campo do Técnico — mobile nativo/PWA, single-column, bottom tabs, offline-first). Sem framework de UI declarado nos mockups — ver DESIGN.md para tokens visuais. Fronteira com o backend: contrato REST/OpenAPI (`/api/v1/...`) definido na Architecture Spine do HEMM Backend.

## Information Architecture

**Web — Admin do Cliente** (sidebar completa, vista nos mockups):
Login · Dashboard · Equipamentos · Ordens de Trabalho · Chamados de Emergência · Checklists · Hospitais · Setores · Relatórios (& Indicadores) · Usuários & Papéis

**Web — Super Admin**: Clientes (tenants) · Usuários internos da plataforma. `[ASSUMPTION]` só a tela "Clientes / Novo cliente" apareceu no mockup — resto da IA do Super Admin (ex. lista de usuários internos) não foi mockado; inferir estrutura análoga ao painel do Admin do Cliente quando implementar.

**Mobile — Técnico**: Login · Home (Meus hospitais) · Equipamentos (por hospital) · Equipamento Detalhe · Medições (Preenchimento / Salvo Offline) · Abrir Chamado de Emergência · Home Offline (estado degradado). `[ASSUMPTION]` bottom tab bar mockada com 4 ícones sem label textual legível — inferido "Home / Minhas OTs / Chamados / Perfil" pela posição; confirmar rótulos exatos ao implementar.

**Gap de IA (não mockado):** nenhuma tela pra **Interno do Hospital** (abrir/acompanhar chamado) apareceu nos PDFs — nem web nem mobile. FR-8/FR-9 do PRD cobrem essa persona; o mockup mobile parece ser só do Técnico ("Meus hospitais" + execução de OT). `[NOTE FOR UX]` decidir se Interno do Hospital usa uma view mobile simplificada, um portal web à parte, ou reaproveita alguma tela existente — não inventado aqui.

## Voice and Tone

Direto, operacional, sem tom de marketing — labels curtos em português (`Nova OT`, `Abrir chamado`, `Concluir OT`), mensagens de sistema objetivas ("Salvo localmente", "5 itens pendentes"). Estado de erro/offline é informativo, não alarmista, mas usa `{colors.danger}` pra chamar atenção quando a ação do usuário é bloqueada (ex. sem conexão pra sincronizar).

## Component Patterns

- **Tabela de listagem** (Equipamentos, OTs, Chamados, Setores) — filtros no header (dropdowns), busca global no topo, linha clicável → detalhe. Badge/tag de status na última coluna.
- **Tela de Detalhe em abas** (Equipamento Detalhe: Dados / Histórico de medições / Checklists / OTs) — reaproveitar esse padrão de abas pra qualquer entidade com sub-relações (ex. Hospital Detalhe poderia seguir o mesmo).
- **Modal de criação rápida** (Novo cliente, Convidar usuário) — formulário curto sobre overlay, nunca navega pra página cheia.
- **Construtor de Checklist** — lista reordenável (drag handle `⠿`) de itens, painel lateral de configuração do item selecionado (tipo/unidade/obrigatório). Padrão builder — reutilizável se outro tipo de template surgir no futuro.
- **KPI card row** — topo de Dashboard e Relatórios: 3-4 cards com número grande + delta. Mesmo componente nas duas telas.
- **Filtro de período/hospital/setor** — barra de filtros no topo de Relatórios (período com date-range, dropdowns de hospital/setor); mesmo padrão reaproveitável em qualquer listagem que precise de recorte temporal.
- **Multi-select de vínculo** — chips removíveis ("Vincular hospitais" no modal Convidar usuário) para associar N hospitais a um usuário; mesmo componente serve pra qualquer relação M:N exposta na UI.
- **Banner de alerta agregado** — linha de destaque no topo de uma listagem (ex. "3 chamados críticos aguardando atendimento") quando há item urgente: some quando a contagem zera.
- **Indicadores por entidade** — mini-KPI (MTBF/Disponibilidade/OTs no ano) dentro do detalhe de um Equipamento, não só nas telas agregadas de Dashboard/Relatórios — mesmo cálculo (FR-16b), recorte por entidade única.

## State Patterns

**Chamado** (badge de cor, espelha a máquina de estado do backend AD-15): `aberto` (warning) → `em_andamento` (info/azul) ⇄ `aguardando_peça` (warning) → `resolvido` (primary/verde); `cancelado` (muted). Ação "Gerar OT corretiva" some assim que sai de `aberto`/`aguardando_peça`.

**OT**: `agendada` (warning) → `em_execução` (info/azul) → `concluída` (primary/verde); `cancelada` (muted).

**Severidade do chamado**: `crítica`/`alta` = `danger`/`warning` com destaque visual na lista (linha com borda colorida); `média`/`baixa` = neutro.

**Dashboard/página com dado**: 4 variações mockadas — `Default` (com dado), `Light` (tema claro), `Loading` (skeleton), `Empty` (0 chamados/OTs — CTA "Cadastrar equipamento" / "Exportar relatório"). Todo card de listagem/dashboard deveria ter esses 4 estados, não só Dashboard.

**Mobile offline**: banner fixo no topo (`Offline` + contador de itens pendentes) substitui o indicador `Online` quando sem rede; ação de sync vira "Tentar sincronizar agora"; medição salva localmente mostra confirmação explícita ("Salvo localmente... será enviada automaticamente quando reconectar") antes de voltar à lista.

## Interaction Primitives

- **Atribuir/Reatribuir Técnico** — ação disponível tanto no detalhe do Chamado (atribuição inicial, dispara `aberto→em_andamento`) quanto no detalhe da OT (reatribuição, não altera o estado da OT). Mesmo componente (seletor de técnico vinculado ao hospital), dois contextos.
- **Gerar OT corretiva** — botão de ação direta na linha da lista de Chamados (crítico/alto) e no detalhe do Chamado; sempre visível quando o chamado está em estado que permite (`aberto`/`aguardando_peça`, AD-15 do backend).
- **Timeline de status** — no detalhe de Chamado/OT, lista vertical de eventos (quem, quando, o quê) — espelha `audit_log`/transições do backend, não é campo editável.
- **Progresso de checklist** — barra de progresso ("7 de 10 itens preenchidos") na execução de OT; bloqueia "Concluir OT" enquanto item obrigatório não preenchido (herda regra de FR-7 do backend).

## Accessibility Floor

`[ASSUMPTION]` não avaliado nos mockups estáticos — itens a verificar na implementação: contraste `text-secondary`/`text-muted` sobre `bg` (paleta escura com cinzas próximos, checar WCAG AA); badges de status/severidade não podem depender só de cor (adicionar texto/ícone, já parecem ter label textual nos mockups); foco de teclado em modais e no construtor de checklist (drag-and-drop precisa de alternativa via teclado).

## Responsive & Platform

Web assume desktop (sidebar fixa); breakpoint mobile do painel web não foi mockado — provavelmente não é prioridade (Técnico usa o app mobile nativo, não o painel web responsivo). Mobile é single-column fixo, sem tablet/landscape mockado.

## Key Flows

**Fluxo 1 — Técnico executa OT preventiva offline.**
Rafael (técnico, sem sinal na UTI Neonatal do Hospital São Lucas) abre o app, vê "Meus hospitais" já sincronizados antes de entrar na área sem sinal. Toca no equipamento, abre o checklist de inspeção mensal agendado, preenche pressão de pico, alarme sonoro, estado do circuito — cada campo salvo local. Ao tentar avançar sem rede, a tela "Salvo Offline" confirma: 5 itens aguardando sincronização. Ele volta aos equipamentos e segue o dia. Ao reconectar, sincroniza automaticamente — realiza FR-14 do PRD backend.

**Fluxo 2 — Chamado crítico vira OT corretiva.**
Um chamado crítico de bomba de infusão aparece no topo da lista de Chamados de Emergência do Admin do Cliente, com destaque vermelho e SLA decorrido ("há 12 min"). Ela clica "Gerar OT corretiva" direto na linha — sem abrir o detalhe. O chamado sai da lista de pendentes (vira `em_andamento`), uma OT corretiva nasce vinculada a ele. Realiza FR-8/FR-9/FR-10.

**Fluxo 3 — Admin do Cliente monitora saúde do parque via Dashboard.**
Clara (Admin do Cliente) abre o painel de manhã, vê 3 chamados urgentes aguardando atendimento e disponibilidade em 97,4% — dentro do esperado. Um card de MTBF por status mostra queda no setor de Emergência; ela clica "Ver tudo" nos chamados recentes, prioriza o mais antigo. Realiza FR-16/FR-16b.
