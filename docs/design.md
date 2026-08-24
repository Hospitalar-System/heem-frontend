---
name: HEMM
description: Painel web de gestão (Admin do Cliente/Super Admin) e app mobile de campo (Técnico) para CMMS hospitalar. Superfície escura por padrão, alta densidade de dados operacionais, sem framework de UI declarado — tokens próprios.
status: final
created: '2026-08-24'
updated: '2026-08-24'
colors:
  bg: '#1F1F1F'
  surface: '#2A2A2E'
  border: '#3A3A3E'
  text-primary: '#F5F5F5'
  text-secondary: '#C2C2C2'
  text-muted: '#8A8A90'
  primary: '#3ED597'
  primary-hover: '#38B38C'
  danger: '#FF4E4E'
  warning: '#F5A623'
typography:
  h1:
    fontFamily: 'Inter'
    fontSize: 28px
    fontWeight: '600'
  h2:
    fontFamily: 'Inter'
    fontSize: 22px
    fontWeight: '600'
  h3:
    fontFamily: 'Inter'
    fontSize: 18px
    fontWeight: '600'
  body:
    fontFamily: 'Inter'
    fontSize: 14px
    fontWeight: '400'
  caption:
    fontFamily: 'Inter'
    fontSize: 12px
    fontWeight: '400'
rounded:
  DEFAULT: 8px
spacing:
  table-row-height: 48px
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.bg}'
    radius: '{rounded.DEFAULT}'
  button-danger:
    background: '{colors.danger}'
    foreground: '{colors.text-primary}'
    radius: '{rounded.DEFAULT}'
  input:
    background: '{colors.surface}'
    border: '{colors.border}'
    radius: '{rounded.DEFAULT}'
  badge-status:
    radius: '{rounded.full}'
  tag-severidade:
    radius: '{rounded.full}'
  kpi-card:
    background: '{colors.surface}'
    border: '{colors.border}'
    radius: '{rounded.DEFAULT}'
  sidebar-item-active:
    background: '{colors.surface}'
    foreground: '{colors.primary}'
---

## Brand & Style

HEMM é ferramenta operacional, não produto de consumo — a superfície escura de alta densidade (sidebar fixa, tabelas compactas, cards de KPI) comunica "console de operação hospitalar", perto de um dashboard de infraestrutura do que de um app de produtividade. Verde (`{colors.primary}`) é o único acento cromático de ação/positivo; vermelho e laranja são reservados exclusivamente para estado de risco (chamado crítico, equipamento com manutenção devida). Sem elementos decorativos — cada cor carrega significado operacional.

## Colors

- **`bg` (`#1F1F1F`)** — fundo base de toda tela, dark-first.
- **`surface` (`#2A2A2E`)** — cards, sidebar, modais, linhas de tabela em hover.
- **`border` (`#3A3A3E`)** — divisores, contorno de input/card.
- **`text-primary` (`#F5F5F5`)** / **`text-secondary` (`#C2C2C2`)** — hierarquia de texto; secundário pra metadado (datas, subtítulos, labels de campo).
- **`text-muted` (`#8A8A90`)** — placeholder, texto desabilitado, skeleton.
- **`primary` (`#3ED597`)** / **`primary-hover` (`#38B38C`)** — ação primária e status "OK/saudável" (disponibilidade alta, chamado resolvido). Nunca usado decorativamente.
- **`danger` (`#FF4E4E`)** — severidade crítica, chamado vencido, ação destrutiva. Reservado — não usar pra ênfase genérica.
- **`warning` (`#F5A623`)** — severidade média/alta, manutenção devida, estado "atenção".

`[ASSUMPTION]` Modo claro (`Dashboard / Light` existe nos mockups) usa a mesma paleta com inversão de `bg`/`surface`/`text` — valores hex exatos do tema claro não foram fornecidos; usar como referência visual até confirmação, não hardcodar sem checar o mockup.

## Typography

Inter em toda a interface (web e mobile). Ramp fixo: `h1` 28/600 (título de página), `h2` 22/600 (título de seção/card), `h3` 18/600 (subtítulo/nome de entidade em detalhe), `body` 14/400 (texto padrão, tabela), `caption` 12/400 (metadado, timestamp, label pequeno).

## Layout & Spacing

Web: sidebar fixa à esquerda (ícones + label), conteúdo principal com header de página (breadcrumb + busca global + ação primária no canto superior direito). Linha de tabela ~`{spacing.table-row-height}`. Mobile: single-column, bottom tab bar (Home/Minhas OTs/Chamados/Perfil).

## Shapes

Raio padrão `{rounded.DEFAULT}` (8px) em inputs, cards, botões e modais. Badges/tags usam pílula (`rounded.full`).

## Components

- **Button** — variantes primário (`{colors.primary}` fill), secundário, ghost, perigo (`{colors.danger}` fill). Primário = uma ação por tela.
- **Input / Select / Datepicker** — `{colors.surface}` fill, borda `{colors.border}`, raio `{rounded.DEFAULT}`.
- **Badge de status** — pílula colorida por estado (mapeamento em EXPERIENCE.md § State Patterns).
- **Tag de severidade** — pílula: crítica (`danger`), alta (`warning`), média/baixa (`text-muted`).
- **KPI card** — `{colors.surface}` + `{colors.border}`, número grande (`h1`/`h2`) + label (`caption`) + delta (seta + %).
- **Tabs, Avatar, Sidebar item, Toast, Empty state, Skeleton loading** — presentes nos mockups; especificação visual detalhada fica pendente de extração pixel-a-pixel quando o front for implementado (fora do escopo deste spine).

## Do's and Don'ts

| Do | Don't |
|---|---|
| Verde só pra ação primária / estado saudável | Verde decorativo ou em texto neutro |
| Vermelho/laranja só pra severidade e estado de risco real | Usar danger/warning por ênfase visual |
| Uma ação primária (botão verde) por tela | Múltiplos botões primários competindo |
| Densidade alta (tabela, KPI compacto) — é ferramenta operacional | Espaçamento generoso tipo landing page/consumer app |
