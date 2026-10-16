# Spec F5.3 — Exportação de relatório

**Status:** fluxo de exportação assíncrona implementado no frontend; suporte backend ao conteúdo `INDICADORES` precisa ser confirmado no ambiente `dev`.
**Story:** F5.3 — Exportação de relatório (`docs/epics.md`)
**Issue:** [#18 — Story F5.3: Exportação de relatório](https://github.com/Hospitalar-System/heem-frontend/issues/18)
**Emenda aprovada:** [Comentário de 14/10/2026](https://github.com/Hospitalar-System/heem-frontend/issues/18#issuecomment-6178478067)
**Persona:** Admin do Cliente
**Tela integrada:** `/reports` — [Spec F5.2](./spec-F5.2-relatorios-indicadores.md) e frame `W17-Relatorios/Default`.
**Documentos relacionados:** `docs/design.md`, `docs/epics.md`, `docs/experience.md`

## Objetivo

Permitir que o Admin do Cliente exporte o relatório filtrado em Excel ou PDF sem bloquear a tela, acompanhe a geração assíncrona e baixe o arquivo quando estiver pronto.

## Escopo

- Exportar com os filtros de período, hospital e setor atualmente aplicados em `/reports`.
- Escolher o conteúdo a exportar: chamados, ordens de trabalho, medições e indicadores (`INDICADORES`, conforme emenda aprovada).
- Solicitar exportação em `xlsx` ou `pdf`.
- Acompanhar o job de forma assíncrona, sem bloquear filtros, indicadores ou navegação da página.
- Exibir estados de solicitação, processamento, conclusão, falha e erro ao consultar o job.
- Disponibilizar o download somente quando o backend marcar o job como concluído e fornecer `urlDownload`.

Fora de escopo: montar o arquivo no navegador, armazenar arquivos permanentemente no frontend, alterar os filtros da tela de Relatórios, exportação CSV na UI e histórico persistido de jobs. O backend é responsável por autorização, escopo do tenant, geração do arquivo e validade da URL de download.

## Contratos de API

Todas as rotas usam `/api/v1`, Bearer token e erros no formato ProblemDetail.

| Ação | Rota | Comportamento esperado |
|---|---|---|
| Solicitar exportação | `POST /relatorios/exportacoes` | Envia `desde`, `ate`, `hospitalId?`, `setorId?`, `conteudo` e `formato`; recebe `id`, `status` e `urlDownload` opcional/nula. |
| Consultar job | `GET /relatorios/exportacoes/{id}` | Consulta o status do job; enquanto `pendente`, consultar novamente em intervalo limitado; estados terminais `concluido` e `falhou`. |

O request preserva o mesmo intervalo ISO-8601 e filtros ativos usados pelos indicadores. Ao trocar hospital, o setor é limpo pela tela de Relatórios e não deve vazar para o novo pedido.

Conteúdos previamente listados pelo contrato da tela: `chamados`, `ordens_trabalho` e `medicoes`. A emenda da issue acrescenta `INDICADORES` (grafia/capitalização conforme texto aprovado), que representa os indicadores filtrados da Story 10.5. O backend precisa aceitar e processar esse valor. Formatos desta tela: `xlsx` e `pdf`.

## Fluxos e estados

1. Usuário escolhe conteúdo e aciona Excel ou PDF.
2. Enquanto o POST está em andamento, botões indicam indisponibilidade temporária e a página permanece interativa.
3. Ao receber um `id` de job, mostrar “Exportação em processamento” e consultar o status sem bloquear o restante da tela.
4. Se o status for `concluido` e houver `urlDownload`, mostrar a ação “Baixar arquivo”. Não renderizar link antes disso.
5. Se o status for `falhou`, informar que a geração falhou e permitir iniciar outra exportação.
6. Se o POST ou GET falhar, manter filtros/indicadores, exibir mensagem recuperável e permitir nova tentativa.

O estado ativo de exportação pode permanecer na memória da página até seu estado terminal. Não alegar que há histórico de exportações persistido se a API não o fornecer.

## Requisitos funcionais

- RF1: exportar Excel e PDF pelos comandos da página `/reports`.
- RF2: reutilizar o filtro de datas/hospital/setor vigente, sem aceitar `tenantId` enviado pelo cliente.
- RF3: suportar os quatro conteúdos disponíveis, incluindo `INDICADORES`.
- RF4: geração assíncrona com estados visíveis; não bloquear a visualização dos indicadores nem a mudança de filtros.
- RF5: polling termina em `concluido` ou `falhou`; não continuar consultando depois de estado terminal.
- RF6: só habilitar o download após conclusão e URL fornecida pelo backend.
- RF7: apresentar erro e retry sem recarregar a página; não descartar os filtros quando a solicitação falhar.
- RF8: impedir solicitação com intervalo vazio/inválido ou data inicial posterior à data final.

## Acessibilidade e design

- Usar tokens semânticos e manter compatibilidade Dark/Light.
- Os estados de geração e conclusão usam região `role="status"`; falhas usam `role="alert"`.
- Botões têm rótulos claros (“Exportar Excel”, “Exportar PDF”), foco visível e `disabled` enquanto o pedido estiver sendo enviado.
- Indicador de processamento inclui texto; animação não é a única forma de comunicar estado.
- Link de download identifica o arquivo e preserva comportamento seguro ao abrir URL externa.

## Critérios de aceite

- [x] A tela oferece escolha de conteúdo e ações de exportação Excel/PDF.
- [x] O POST inclui período e filtros ativos de hospital/setor.
- [x] O frontend solicita o job, consulta status enquanto pendente e não bloqueia a página.
- [x] O download só aparece para job concluído com URL.
- [x] Falha no pedido/status é exibida sem limpar os filtros e permite retry/reinício.
- [x] O conteúdo `INDICADORES` está disponível para exportar os indicadores filtrados.
- [ ] O backend em `dev` confirma suporte ao conteúdo `INDICADORES`, geração real de ambos os formatos e expiração/validade da URL.
- [ ] Teste de integração contra o backend confirma o contrato de status e comportamento de polling.

## Dependências e riscos

1. A emenda informa que a Story depende de stories correspondentes no `heem-backend` implantadas em `dev`; os IDs não estão no comentário da issue.
2. Confirmar se o backend aceita `INDICADORES` exatamente em maiúsculas, inclusive para os formatos `xlsx` e `pdf`.
3. Confirmar duração/limite recomendado de polling e validade da URL temporária.
4. A tela expõe um job ativo por vez; múltiplas exportações simultâneas e histórico exigem requisito/contrato adicional.
