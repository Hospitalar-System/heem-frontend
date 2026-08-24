---
stepsCompleted: [1]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-HEEM-2026-08-24/prd.md
  - _bmad-output/planning-artifacts/architecture/architecture-HEEM-2026-08-24/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-HEEM-2026-08-24/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-HEEM-2026-08-24/EXPERIENCE.md
---

# HEMM Frontend (Web) - Epic Breakdown

## Overview

Decompõe o **painel web** do HEMM em épicos e stories implementáveis. Épicos M1/M2 (app mobile do Técnico) vivem no repo `heem-mobile` — ver `epics.md` de lá. Insumo principal: `EXPERIENCE.md`/`DESIGN.md` (IA, telas, fluxos, componentes — já derivados de mockups reais). O PRD e a Architecture Spine do **backend** entram como referência de contrato (quais FRs a API expõe, formato REST/OpenAPI, papéis) — o frontend não reimplementa lógica de negócio, só consome.

## Requirements Inventory

### Functional Requirements

*(mesmas FRs do PRD backend — aqui como "o que a UI precisa permitir o usuário fazer", não como lógica a reimplementar)*

FR-1: Provisionamento de tenant · FR-2: Gestão de usuários do tenant · FR-3: Login/sessão · FR-3b: Usuários internos da plataforma · FR-3c: Vínculo usuário-hospital · FR-3d: Anonimização de PII sob solicitação · FR-4: CRUD hospitais/setores · FR-5: CRUD equipamentos · FR-6: Consulta de equipamentos (Técnico) · FR-7: Checklist e itens · FR-8: Abertura de chamado · FR-9: Transição de estado do chamado · FR-10: Geração de OT corretiva · FR-11: Agendamento de OT preventiva · FR-12: Execução de OT · FR-13: Registro de medição · FR-14: Sync offline (push) · FR-15: Sync offline (pull referência) · FR-16: Dashboard · FR-16b: Indicadores (MTBF/disponibilidade) · FR-17: Exportação de relatório · FR-18: Trilha de auditoria (só leitura, se exposta)

### NonFunctional Requirements

NFR-1: Nenhuma tela vaza dado de outro tenant/hospital (espelha RBAC do backend na UI — esconder ação/dado que o papel não pode ver, não só bloquear no clique)
NFR-2: Confiabilidade do sync offline mobile (medição salva local nunca se perde, mesmo com app fechado/crash)
NFR-3: Estados de loading/empty/error obrigatórios em toda tela com dado assíncrono (padrão visto no Dashboard: Default/Light/Loading/Empty)
NFR-4: Acessibilidade mínima — contraste AA, badges de status não dependem só de cor, foco de teclado em modais (ver EXPERIENCE.md § Accessibility Floor)
NFR-5: Performance percebida em campo — app mobile responsivo mesmo em rede intermitente/lenta

### Additional Requirements

*(extraídas da Architecture Spine do backend — contrato que o frontend deve respeitar)*

- Toda chamada de API usa `/api/v1/...`; erro sempre `ProblemDetail` RFC 7807 com `code`/`traceId` fixos (AD-9) — tratamento de erro na UI deve ler esses campos, não inventar parsing próprio.
- Token: access TTL ≤15min + refresh TTL ≤7dias rotação single-use (AD-8) — frontend implementa refresh silencioso, sessão expira sem aviso brusco.
- RBAC: UI deve esconder ação/rota que o papel da sessão não pode executar (`admin_cliente`/`tecnico`/`interno_hospital`/`super_admin`), espelhando `@PreAuthorize` do backend — nunca confiar só no backend pra esconder, mas nunca só na UI pra proteger.
- Sync mobile: `POST /api/v1/sync/medicoes` (push, `Idempotency-Key`+`client_id`) e `GET /api/v1/sync/referencia` (pull, cursor opaco) — Medição é sempre local-first, nunca espera confirmação do servidor pra deixar o técnico seguir (AD-13).
- Upload de foto de equipamento via URL assinada S3 (TTL curto) — fluxo de 2 passos (pedir URL, fazer upload direto), não passa binário pelo backend HEMM.

### UX Design Requirements

*(extraídas de EXPERIENCE.md — ver documento completo pra detalhe)*

UX-DR1: IA Web completa — Login, Dashboard, Equipamentos, Ordens de Trabalho, Chamados de Emergência, Checklists, Hospitais, Setores, Relatórios & Indicadores, Usuários & Papéis (Admin do Cliente) + Clientes/Usuários internos (Super Admin, parcialmente mockado).
UX-DR2: IA Mobile completa — Login, Home (Meus hospitais), Equipamentos, Equipamento Detalhe, Medições (Preenchimento/Salvo Offline), Abrir Chamado, Home Offline.
UX-DR3: Componente Tabela de listagem com filtro+busca+badge de status, reutilizável em Equipamentos/OTs/Chamados/Setores.
UX-DR4: Componente Detalhe em Abas (Dados/Histórico/Checklists/OTs), padrão pra qualquer entidade com sub-relações.
UX-DR5: Componente Modal de criação rápida (Novo cliente, Convidar usuário) — nunca navega pra página cheia.
UX-DR6: Construtor de Checklist — lista reordenável (drag) + painel de configuração de item.
UX-DR7: KPI card row reutilizável (Dashboard e Relatórios) + variante "indicador por entidade" (Equipamento Detalhe).
UX-DR8: Badges de status (Chamado, OT) e Tag de severidade — mapeamento de cor/estado exato em EXPERIENCE.md § State Patterns, espelha máquina de estado do backend (AD-15).
UX-DR9: 4 estados obrigatórios por tela de listagem/dashboard — Default, Loading (skeleton), Empty (com CTA), e tema Light como alternativa visual.
UX-DR10: Padrão de UI offline mobile — banner fixo de status + contador de pendências + confirmação explícita de "salvo localmente" + ação "tentar sincronizar agora".
UX-DR11: Interação Atribuir/Reatribuir Técnico (chamado e OT, mesmo componente, dois contextos).
UX-DR12: Interação Gerar OT corretiva — botão direto na linha da lista E no detalhe do chamado.
UX-DR13: Timeline de status (somente leitura) no detalhe de Chamado/OT.
UX-DR14: Progresso de checklist com bloqueio de conclusão por item obrigatório não preenchido.
UX-DR15: Multi-select de vínculo (chips) — hospitais vinculados a um usuário.
UX-DR16: Filtro de período/hospital/setor reutilizável (Relatórios e potencialmente outras listagens).
UX-DR17: Banner de alerta agregado no topo de listagem (ex. "N chamados críticos aguardando").
UX-DR18: `[GAP]` Interno do Hospital sem tela mockada — épico correspondente terá desenho de tela feito ad-hoc durante a story, não a partir de mockup existente.

### FR Coverage Map

FR-3: Epic F1, Epic M1 — login web e mobile (implementações distintas, mesma FR de backend)
FR-1: Epic F2 — provisionamento de tenant (UI de Super Admin)
FR-2: Epic F2 — gestão de usuários do tenant
FR-3b: Epic F2 — usuários internos da plataforma
FR-3c: Epic F2 — vínculo usuário-hospital
FR-3d: Epic F2 — anonimização de PII sob solicitação
FR-4: Epic F3 — hospitais/setores
FR-5: Epic F3 — equipamentos
FR-6: Epic F3, Epic M1 — consulta de equipamentos (web admin e mobile técnico)
FR-7: Epic F4 — checklist e itens
FR-8: Epic F4, Epic M2 — abertura de chamado (web, por Interno/Admin em nome de alguém, e mobile pelo Técnico)
FR-9: Epic F4 — transição de estado do chamado
FR-10: Epic F4 — geração de OT corretiva
FR-11: Epic F4 — agendamento de OT preventiva
FR-12: Epic F4, Epic M2 — execução de OT (visão admin e execução real pelo técnico)
FR-13: Epic M2 — registro de medição
FR-14: Epic M2 — sync offline push
FR-15: Epic M2 — sync offline pull
FR-16: Epic F5 — dashboard
FR-16b: Epic F5 — indicadores
FR-17: Epic F5 — exportação de relatório
FR-18: não coberto por epic de UI — auditoria é consumida internamente pelo backend, sem tela dedicada nos mockups (fora de escopo até haver demanda)

## Epic List

*(F = heem-frontend/Web · M = heem-mobile/Técnico — repos distintos na org, mesmo design system)*

### Epic F1: Autenticação & Sessão (Web)
Admin do Cliente/Super Admin faz login, mantém sessão viva via refresh silencioso, e é deslogado com segurança.
**FRs covered:** FR-3
**Implementation notes:** UX-DR1 (tela Login). Refresh token TTL 7d rotação single-use (AD-8) — implementar refresh silencioso antes de expirar, não esperar 401.

### Epic F2: Identidade & Tenant (Web)
Super Admin provisiona clientes; Admin do Cliente gerencia usuários, papéis e vínculo usuário-hospital.
**FRs covered:** FR-1, FR-2, FR-3b, FR-3c, FR-3d
**Implementation notes:** UX-DR5 (modal Novo cliente/Convidar), UX-DR15 (multi-select de hospitais). RBAC de UI: Super Admin e Admin do Cliente têm IAs diferentes (NFR-1).

### Epic F3: Gestão de Ativos (Web)
Admin do Cliente estrutura hospital → setor → equipamento e navega o parque de ativos.
**FRs covered:** FR-4, FR-5, FR-6
**Implementation notes:** UX-DR3 (tabela), UX-DR4 (detalhe em abas), UX-DR7 (indicador por entidade no Equipamento Detalhe — depende de FR-16b existir na API).

### Epic F4: Checklists, Chamados & Ordens de Trabalho (Web)
Admin do Cliente cria checklists e agenda OT preventiva; acompanha e resolve chamados de emergência gerando OT corretiva.
**FRs covered:** FR-7, FR-8, FR-9, FR-10, FR-11, FR-12
**Implementation notes:** UX-DR6 (construtor de checklist), UX-DR8 (badges espelhando AD-15), UX-DR11/12/13/17 (atribuir técnico, gerar OT corretiva, timeline, banner de alerta).

### Epic F5: Dashboard & Relatórios (Web)
Admin do Cliente monitora saúde operacional (dashboard) e indicadores de manutenção, exporta relatórios.
**FRs covered:** FR-16, FR-16b, FR-17
**Implementation notes:** UX-DR7 (KPI cards), UX-DR9 (4 estados obrigatórios), UX-DR16 (filtros).


## Epic F1: Autenticação & Sessão (Web)

Admin do Cliente/Super Admin faz login, mantém sessão viva via refresh silencioso, e é deslogado com segurança.

### Story F1.1: Tela de login

Como Admin do Cliente, Super Admin,
Eu quero entrar com e-mail e senha,
Para que eu acesse o painel do HEMM.

**Acceptance Criteria:**

**Given** a tela de Login (UX-DR1, `DESIGN.md` tokens)
**When** informo credenciais válidas
**Then** sou autenticado e redirecionado ao Dashboard (ou à tela inicial do meu papel)

**And** erro de credencial inválida usa `ProblemDetail.code`/mensagem da API, nunca texto genérico hardcoded
**And** token é armazenado de forma segura (nunca em `localStorage` puro sem proteção contra XSS — decisão de mecanismo exato fica com quem implementa)

### Story F1.2: Sessão persistente e logout

Como qualquer usuário logado,
Eu quero que minha sessão renove sozinha enquanto uso o sistema, e encerre quando eu sair,
Para que eu não seja interrompido no meio do trabalho nem fique logado indevidamente.

**Acceptance Criteria:**

**Given** um access token perto de expirar (TTL ≤15min, AD-8)
**When** o token está próximo do vencimento e há atividade do usuário
**Then** o app renova via refresh token silenciosamente, sem redirecionar pra login

**And** refresh token expirado/inválido desloga e redireciona pra Login sem crash
**And** ação de "Sair" limpa sessão local e invalida o estado da UI (nenhuma tela protegida acessível depois)


## Epic F2: Identidade & Tenant (Web)

Super Admin provisiona clientes; Admin do Cliente gerencia usuários, papéis e vínculo usuário-hospital.

### Story F2.1: Provisionamento de tenant (Super Admin)

Como Super Admin,
Eu quero ver a lista de clientes (tenants) e criar um novo,
Para que eu dê onboarding a um novo hospital-cliente.

**Acceptance Criteria:**

**Given** a tela Clientes (Super Admin)
**When** clico "Novo cliente" e preencho razão social, CNPJ, tipo e e-mail do admin
**Then** o modal (UX-DR5) cria o tenant via API e a lista atualiza sem reload de página

**And** CNPJ inválido/duplicado mostra erro inline vindo do `ProblemDetail` da API

### Story F2.2: Gestão de usuários do tenant

Como Admin do Cliente,
Eu quero ver, convidar e desativar usuários do meu tenant,
Para que eu controle quem acessa o sistema.

**Acceptance Criteria:**

**Given** a tela Usuários & Papéis
**When** convido um usuário com e-mail, papel e hospitais vinculados (UX-DR15, chips removíveis)
**Then** o convite é enviado via API e o usuário aparece na lista com status "Convidado"

**And** desativar um usuário reflete imediatamente (badge de status muda, sem precisar recarregar)
**And** só papéis `admin_cliente`/`tecnico`/`interno_hospital` aparecem no seletor (nunca `super_admin`)

### Story F2.3: Usuários internos da plataforma (Super Admin)

Como Super Admin,
Eu quero ver e gerenciar outros usuários internos da plataforma,
Para que a operação não dependa de uma única conta.

**Acceptance Criteria:**

**Given** a área de administração da plataforma
**When** crio/edito/desativo um `platform_user`
**Then** a ação usa o endpoint de platform_user (nunca o de tenant) e não aparece pra nenhum Admin do Cliente

`[ASSUMPTION]` layout exato dessa tela não foi mockado — reaproveitar o padrão de tabela (UX-DR3) já usado em Usuários & Papéis.

### Story F2.4: Anonimização de PII sob solicitação

Como Admin do Cliente ou Super Admin,
Eu quero disparar a anonimização de dados pessoais de um usuário,
Para que o HEMM atenda pedido de exclusão/anonimização da LGPD.

**Acceptance Criteria:**

**Given** o perfil de um usuário existente
**When** aciono "Anonimizar dados pessoais" e confirmo (ação destrutiva/irreversível — precisa confirmação explícita, ex. digitar o nome do usuário)
**Then** a UI chama a API de anonimização (FR-3d) e reflete o campo anonimizado (ex. `cpf` mascarado) sem exigir reload

**And** a ação não aparece disponível para `platform_user` (fora do escopo, AD-6)


## Epic F3: Gestão de Ativos (Web)

Admin do Cliente estrutura hospital → setor → equipamento e navega o parque de ativos.

### Story F3.1: Hospitais e setores

Como Admin do Cliente,
Eu quero ver, criar e editar hospitais e seus setores,
Para que eu estruture fisicamente onde os equipamentos existem.

**Acceptance Criteria:**

**Given** a tela Hospitais (cards por hospital, UX-DR3)
**When** crio um hospital ou, dentro dele, um setor
**Then** a lista/cards atualizam sem reload; setor exige hospital selecionado

**And** cada card de hospital mostra contagem de equipamentos/setores (visto no mockup)

### Story F3.2: Listagem de equipamentos

Como Admin do Cliente,
Eu quero ver todos os equipamentos com filtro por hospital/setor/status e busca,
Para que eu encontre rápido o que preciso.

**Acceptance Criteria:**

**Given** a tela Equipamentos (UX-DR3)
**When** aplico filtros (hospital/setor/status) ou busco por código/nome
**Then** a tabela atualiza com badge de status (`OK`/`Devida`/`Emergência`/`Inativo`) por linha

**And** clicar numa linha abre o Equipamento Detalhe

### Story F3.3: Cadastro de equipamento

Como Admin do Cliente,
Eu quero cadastrar um equipamento com atributos técnicos flexíveis e foto,
Para que ele fique rastreável no sistema.

**Acceptance Criteria:**

**Given** o formulário "Novo equipamento"
**When** preencho código, nome, modelo, nº série e envio uma foto
**Then** a foto sobe direto pro S3 via URL assinada (2 passos: pedir URL → PUT direto), nunca passando pelo backend HEMM como binário

**And** campos de `dados_gerais` são dinâmicos (chave/valor livre), não um formulário fixo

### Story F3.4: Equipamento Detalhe

Como Admin do Cliente ou Técnico,
Eu quero ver os dados, histórico de medições, checklists e OTs de um equipamento, e seus indicadores,
Para que eu entenda o estado e o histórico de manutenção dele.

**Acceptance Criteria:**

**Given** um equipamento existente
**When** abro o detalhe
**Then** vejo 4 abas (Dados/Histórico de medições/Checklists/OTs, UX-DR4) e o card de indicadores (MTBF/Disponibilidade/OTs no ano — FR-16b, UX-DR7)

**And** botão "Agendar OT preventiva" visível a partir daqui (leva pro fluxo do Epic F4)
**And** Técnico só acessa o detalhe de equipamento do(s) hospital(is) vinculado(s) a ele (NFR-1)


## Epic F4: Checklists, Chamados & Ordens de Trabalho (Web)

Admin do Cliente cria checklists e agenda OT preventiva; acompanha e resolve chamados de emergência gerando OT corretiva.

### Story F4.1: Construtor de checklist

Como Admin do Cliente,
Eu quero montar um checklist com itens ordenados e reordenáveis,
Para que eu padronize o que precisa ser verificado numa OT preventiva.

**Acceptance Criteria:**

**Given** a tela Construtor de Checklist (UX-DR6)
**When** adiciono itens (descrição, tipo, unidade, obrigatório) e reordeno por drag
**Then** a ordem persiste e reflete exatamente no formulário de execução de OT depois

**And** reordenar também funciona por teclado (alternativa ao drag, ver Accessibility Floor)

### Story F4.2: Lista de chamados de emergência

Como Admin do Cliente,
Eu quero ver os chamados abertos, priorizados por severidade e tempo, e gerar OT corretiva direto da lista,
Para que eu resolva o mais urgente primeiro sem abrir cada chamado.

**Acceptance Criteria:**

**Given** a tela Chamados de Emergência
**When** há chamados críticos/altos aguardando
**Then** aparece o banner de alerta agregado (UX-DR17, "N chamados críticos aguardando") e cada linha crítica/alta tem destaque visual (tag de severidade, UX-DR8)

**And** botão "Gerar OT corretiva" na própria linha (UX-DR12) funciona sem abrir o detalhe
**And** botão some quando o chamado não está em `aberto`/`aguardando_peça` (espelha AD-15)

### Story F4.3: Chamado Detalhe

Como Admin do Cliente ou Técnico,
Eu quero ver a descrição, atribuir um técnico, acompanhar a timeline e gerar OT corretiva,
Para que o atendimento do chamado seja rastreável ponta a ponta.

**Acceptance Criteria:**

**Given** um chamado existente
**When** abro o detalhe
**Then** vejo descrição, badge de status atual (UX-DR8), e timeline de transições somente-leitura (UX-DR13)

**And** ação "Atribuir Técnico" (UX-DR11) lista só técnicos vinculados ao hospital do chamado
**And** atribuir técnico transiciona automaticamente `aberto→em_andamento` (espelha AD-15/FR-9)

### Story F4.4: Lista e agendamento de Ordens de Trabalho

Como Admin do Cliente,
Eu quero ver todas as OTs e agendar uma nova preventiva,
Para que a manutenção programada aconteça.

**Acceptance Criteria:**

**Given** a tela Ordens de Trabalho (filtro por status/tipo/técnico/período)
**When** clico "Nova OT" e escolho checklist, equipamento e técnico
**Then** a OT nasce em `agendada` e aparece na lista com badge correto (UX-DR8)

**And** seletor de técnico só lista quem está vinculado ao hospital do equipamento escolhido

### Story F4.5: OT Detalhe e execução (visão Admin)

Como Admin do Cliente,
Eu quero acompanhar a execução de uma OT — medições registradas, progresso do checklist, e reatribuir técnico se preciso,
Para que eu tenha visibilidade do trabalho de campo em tempo real.

**Acceptance Criteria:**

**Given** uma OT em qualquer estado
**When** abro o detalhe
**Then** vejo medições já registradas, barra de progresso do checklist (UX-DR14) e timeline de status

**And** "Reatribuir Técnico" (UX-DR11) troca o técnico responsável sem alterar o estado da OT
**And** para OT corretiva sem checklist original, mostra o checklist ad-hoc de item único (espelha FR-12 do backend)


## Epic F5: Dashboard & Relatórios (Web)

Admin do Cliente monitora saúde operacional (dashboard) e indicadores de manutenção, exporta relatórios.

### Story F5.1: Dashboard

Como Admin do Cliente,
Eu quero ver, ao abrir o sistema, um resumo do estado operacional do meu tenant,
Para que eu saiba onde prestar atenção sem navegar tela por tela.

**Acceptance Criteria:**

**Given** a tela Dashboard
**When** acesso com dado existente / carregando / sem dado
**Then** os 4 estados mockados aparecem corretamente: Default (KPIs+gráficos+chamados recentes), Loading (skeleton), Empty (CTA "Cadastrar equipamento"/"Exportar relatório"), e o tema Light é selecionável (UX-DR9)

**And** KPI cards (equipamentos ativos, OTs por status, chamados emergência, disponibilidade — UX-DR7) batem com os dados de FR-16/FR-16b
**And** lista de "Chamados recentes" linka pro Chamado Detalhe (Epic F4)

### Story F5.2: Relatórios & Indicadores

Como Admin do Cliente,
Eu quero ver MTBF, tempo médio de atendimento/resolução e disponibilidade, filtrando por período/hospital/setor,
Para que eu avalie a performance de manutenção do meu parque.

**Acceptance Criteria:**

**Given** a tela Relatórios & Indicadores
**When** aplico filtro de período/hospital/setor (UX-DR16)
**Then** KPIs, gráficos (disponibilidade por hospital, MTBF por setor) e a tabela de detalhamento por setor atualizam consistentes com FR-16b

**And** sem dado no período filtrado mostra estado vazio, nunca erro

### Story F5.3: Exportação de relatório

Como Admin do Cliente,
Eu quero exportar o relatório filtrado em PDF ou Excel,
Para que eu leve esse dado pra fora do sistema.

**Acceptance Criteria:**

**Given** os botões "Exportar Excel"/"Exportar PDF" na tela de Relatórios
**When** clico em um deles
**Then** a geração é assíncrona (FR-17) — UI mostra estado de "gerando" e disponibiliza o arquivo quando pronto, sem travar a tela

**And** exportação respeita o mesmo filtro de período/hospital/setor aplicado na tela

