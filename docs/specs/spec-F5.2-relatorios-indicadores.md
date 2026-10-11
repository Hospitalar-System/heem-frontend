# Spec F5.2 — Relatórios & Indicadores

**Status:** implementado; contratos confirmados no código do backend  
**Story:** F5.2 — Relatórios & Indicadores (`docs/epics.md`)  
**Issue:** [#18 — Hospitalar-System/heem-frontend](https://github.com/Hospitalar-System/heem-frontend/issues/18)  
**Referência visual:** [HEMM no Figma, nó 2411:8](https://www.figma.com/design/EDy6hci8DTe0hniabXwsqi/HEMM?node-id=2411-8)  
**Frame principal:** `W17-Relatorios/Default` (`2404:14074`), 1440×900; variação `W17-Relatorios/Default/Dark` (`2404:15825`)  
**Documentos relacionados:** `AGENTS.md`, `docs/design.md`, `docs/experience.md`, `docs/epics.md`, `docs/specs/spec-F5.1-dashboard.md`

> A issue #18 não pôde ser lida neste ambiente (GitHub respondeu 404). O escopo foi derivado do frame Figma e da Story F5.2 em `docs/epics.md`.

## Objetivo

Permitir ao Admin do Cliente analisar MTBF, tempo médio de atendimento/resolução e disponibilidade do parque, filtrando por período, hospital e setor. Os dados devem refletir o tenant autorizado pelo backend, sem reproduzir fórmulas ou valores demonstrativos no frontend.

## Acesso e navegação

- Rota prevista: `/reports`.
- Persona: `admin_cliente`. A tela não deve aparecer nem ser acessível por papéis que não tenham autorização para relatórios.
- Reutilizar o shell compartilhado do painel: sidebar, cabeçalho `Relatórios & Indicadores`, contexto do tenant, busca, notificações e seletor de tema.
- A sidebar já contém o item Relatórios; a implementação deve conectá-lo à rota acima.
- O tenant é determinado pela sessão e pelas permissões do backend. Não enviar `tenantId` controlado pelo usuário para ampliar o escopo dos dados.

## Estrutura visual

Seguir a hierarquia do frame desktop, usando tokens semânticos de `docs/design.md`, Inter, bordas discretas e superfícies do tema:

1. **Barra de filtros:** período selecionável, hospital e setor. O setor deve acompanhar o hospital escolhido; `Todos` representa ausência de filtro. No frame, os filtros ficam à esquerda e os botões Exportar Excel/PDF à direita.
2. **KPIs:** quatro cards em linha no desktop: MTBF médio, tempo médio de atendimento, tempo médio de resolução e disponibilidade média. Cada um apresenta valor e comparação/delta do período quando fornecidos pelo backend.
3. **Análises:** gráfico de disponibilidade por hospital ao longo do período, ao lado do ranking horizontal de MTBF por setor.
4. **Detalhamento por setor:** tabela com setor, MTBF, tempo médio de atendimento, tempo médio de resolução e disponibilidade.

O exemplo no Figma mostra um intervalo de julho de 2026, quatro KPIs, uma série semanal de disponibilidade e linhas de setores. Esses valores, nomes e datas são ilustrativos e nunca devem ser usados como dados operacionais. O período inicial real deve ser definido com produto/backend; não fixar o intervalo do mockup.

## Filtros e comportamento

- Período: permitir selecionar intervalo inicial/final e validar que o início não seja posterior ao fim. Respeitar o timezone acordado com o backend.
- Hospital: oferecer `Todos` e hospitais acessíveis ao usuário, carregados da API disponível.
- Setor: oferecer `Todos` e setores do hospital selecionado. Se hospital for `Todos`, a lista de setor deve seguir uma decisão explícita de produto/API (por exemplo, todos os setores autorizados); não combinar entidades sem suporte do contrato.
- Alterar qualquer filtro atualiza KPIs, gráficos e tabela com o mesmo recorte. Evitar mostrar dados de filtros anteriores como se fossem do novo recorte; manter a tela em estado de carregamento ou preservar dados com indicação visual de atualização.
- O intervalo e os IDs de hospital/setor enviados devem usar o formato definido pelo backend. Não inventar nomes de parâmetros ou enums antes de confirmar OpenAPI.
- Se filtros forem serializados na URL, permitir recarregar/compartilhar a mesma consulta sem persistir dados pessoais ou tokens no navegador.

## Integração com API

Rotas conhecidas do backend, conforme inventário do projeto:

| Uso esperado | Rota disponível | Estado do contrato |
| --- | --- | --- |
| Agregados dos indicadores | `GET /api/v1/relatorios/indicadores` | Confirmado: opcionais `hospitalId`, `setorId`; obrigatórios `desde`, `ate` como ISO-8601 `Instant`. Retorna `mtbfHoras`, `tempoMedioAtendimentoHoras`, `tempoMedioResolucaoHoras` (nullable), `disponibilidadePercentual` (0–100), `qtdOtsPreventivas`, `qtdOtsCorretivas`. Restrito a `ADMIN_CLIENTE`; tenant vem do contexto autenticado. |
| Conformidade | `GET /api/v1/relatorios/conformidade` | Mesmo recorte; retorna percentuais e contagem por nível de risco. Não atende os visuais de F5.2 e não é necessário nesta tela. |
| Opções de filtro | `GET /api/v1/hospitais`, `GET /api/v1/hospitais/{hospitalId}/setores` | Confirmado e consumido pelo frontend; setor depende do hospital, e `Todos` omite o respectivo ID. |
| Exportação assíncrona (Story F5.3) | `POST /api/v1/relatorios/exportacoes`, `GET /api/v1/relatorios/exportacoes/{id}` | Exporta `chamados`, `ordens_trabalho` ou `medicoes`; não exporta indicadores. Botões permanecem desabilitados para não apresentar conteúdo incorreto. |

`GET /api/v1/relatorios/dashboard` pertence ao dashboard F5.1 e não deve ser tratado como contrato dos relatórios sem confirmação explícita.

Usar `apiClient`/Axios compartilhado, token Bearer da sessão e React Query para cache/invalidação. Tratar falhas RFC 7807 mostrando `detail`/`code` de forma útil; não apresentar amostras do Figma em caso de falha.

### Contrato e limitações observadas

O endpoint retorna um conjunto escalar para um recorte; não fornece série temporal, comparativo de períodos ou agregado multi-hospital/multi-setor em uma resposta. A tela obtém o KPI geral pelo escopo selecionado e compõe gráficos/tabela consultando indicadores por hospital/setor com cache React Query. A disponibilidade por hospital é exibida como comparação agregada no intervalo, não como linha semanal. Ao escolher um setor sem hospital, a comparação de disponibilidade fica restrita ao hospital dono daquele setor.

O backend devolve `null` para médias sem amostras, zero para contagens de OTs e disponibilidade calculada; o frontend mostra “—” para médias ausentes e usa a ausência de médias e de OTs para decidir estado vazio. Não há dados de delta/período anterior no contrato, então nenhum delta é inventado. O intervalo inicial é o mês corrente até hoje; datas do input são convertidas de horário local para instantes ISO no envio.

### View model

O frontend pode normalizar as respostas em um view model equivalente a:

```ts
interface ReportsViewModel {
  kpis: {
    averageMtbfHours: number | null
    mtbfChangePercent: number | null
    averageResponseHours: number | null
    responseChangeHours: number | null
    averageResolutionHours: number | null
    resolutionChangeHours: number | null
    availabilityPercent: number | null
    availabilityChangePp: number | null
  }
  availabilityByHospital: Array<{
    hospitalId: string
    hospitalName: string
    points: Array<{ period: string; percent: number | null }>
  }>
  mtbfBySector: Array<{ sectorId: string; sectorName: string; hours: number | null }>
  sectors: Array<{
    sectorId: string
    sectorName: string
    mtbfHours: number | null
    averageResponseHours: number | null
    averageResolutionHours: number | null
    availabilityPercent: number | null
  }>
}
```

Os nomes acima descrevem a interface; os valores são obtidos do DTO confirmado e sem fórmulas duplicadas no frontend.

## Exportação e limite de escopo

Os botões Exportar Excel e Exportar PDF aparecem no frame, mas estão desabilitados até F5.3 oferecer conteúdo de indicadores. A rota disponível aceita apenas `chamados`, `ordens_trabalho` ou `medicoes`; não se deve rotular esses arquivos como exportação de indicadores.

## Estados obrigatórios

- **Default:** KPIs, dois gráficos e tabela com respostas reais do recorte selecionado.
- **Loading:** skeletons para KPIs, gráficos e tabela; os controles globais permanecem navegáveis. Mudança de filtros não deve misturar métricas de recortes distintos.
- **Empty:** resposta válida sem amostras apresenta estado vazio explicativo, preservando filtros e oferecendo ação para ampliar/limpar o recorte. Não usar o estado vazio para erros.
- **Error:** falha de API com mensagem baseada em `ProblemDetail` e ação de tentar novamente. Tratar opções de filtros e agregados sem bloquear toda a aplicação quando forem consultas independentes.
- **Tema:** suportar Dark, Light e Auto conforme o ThemeProvider; o frame principal é escuro e a variação Dark deve manter todos os contrastes sem valores hardcoded.

Se uma resposta não contiver o período comparativo necessário, não inventar delta nem sinal verde/vermelho. Exibir “—”/indisponível com contexto acessível.

## Acessibilidade e responsividade

- Inputs de data e selects têm labels persistentes e nomes acessíveis; filtros são operáveis por teclado.
- KPIs expõem o valor, a unidade e o sentido do delta por texto, não apenas por cor/seta.
- Gráfico de disponibilidade expõe uma alternativa textual ou tabular com hospital, período e percentual; gráfico MTBF informa setor e horas. Cor nunca é o único indicador.
- Tabela usa cabeçalhos semânticos, foco visível e contraste AA. Skeletons anunciam carregamento sem ler placeholders repetidamente.
- Figma define desktop de 1440×900. Em larguras menores, KPIs passam a grade responsiva, filtros quebram linhas, gráficos empilham e tabela permite rolagem horizontal controlada; não comprimir ou sobrepor textos.

## Critérios de aceite

- [x] `/reports` é visível e acessível somente para `admin_cliente` autorizado.
- [x] Filtros de período, hospital e setor carregam opções válidas e atualizam as consultas com o recorte selecionado.
- [x] KPIs, disponibilidade por hospital, MTBF por setor e tabela consomem agregados da API, sem fixtures como dados operacionais nem fórmulas duplicadas.
- [x] Unidades, valores ausentes e ausência de comparativos são apresentados sem inferir deltas.
- [x] Estado sem amostras é distinto de erro; há skeleton e ação de retry para falhas de consulta.
- [x] Botões de exportação ficam desabilitados enquanto a API não exportar indicadores (evita rotular chamados/OTs/medições incorretamente).
- [x] Tema Dark, Light e Auto é herdado pelo ThemeProvider; layout é responsivo e usa labels acessíveis.
- [x] Testes cobrem validação do intervalo e contrato de envio dos filtros à API.
- [ ] Testes de interação da tela (estados, RBAC e atualização completa por filtros) ainda podem ser ampliados.

## Decisões necessárias antes da implementação

1. Backend pode adicionar agregação em lote/série temporal de disponibilidade e MTBF para reduzir fan-out de chamadas.
2. F5.3 deve oferecer formato exportável de indicadores antes de habilitar os botões desta tela.
