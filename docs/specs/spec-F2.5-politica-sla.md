# Spec F2.5 — Política de SLA

**Status:** implementação frontend concluída contra o contrato da emenda; integração real em `dev` pendente de validação.
**Story:** F2.5 — Política de SLA
**Issue:** [#27 — Story F2.5: Política de SLA](https://github.com/Hospitalar-System/heem-frontend/issues/27)
**Contrato backend:** [Comentário da issue de 16/10/2026](https://github.com/Hospitalar-System/heem-frontend/issues/27#issuecomment-6217448307), Story 8.3 liberada em `dev`.
**Persona:** Admin do Cliente
**Rota:** `/settings/sla`
**Documentos relacionados:** `docs/design.md`, `docs/epics.md`, `docs/experience.md`

## Objetivo

Permitir que o Admin do Cliente consulte e configure os prazos de atendimento e resolução para cada severidade, e que a fila/detalhe de chamados mostrem o status de SLA fornecido pelo backend.

## Escopo

- Exibir quatro severidades, da mais urgente à menos urgente: Crítica, Alta, Média e Baixa.
- Consultar os prazos efetivos, incluindo valores padrão devolvidos pelo servidor quando o tenant não os editou.
- Permitir editar prazo de atendimento e de resolução com unidade em minutos ou horas.
- Validar prazo positivo e resolução maior ou igual ao prazo de atendimento, convertendo para minutos antes do envio.
- Salvar a política e avisar que a alteração vale apenas para chamados abertos a partir daquele momento; prazos de chamados existentes permanecem congelados.
- Mostrar na lista e no detalhe de chamados o status SLA enviado pela API, quando disponível.
- Exibir o item de menu e autorizar a rota somente a `admin_cliente`; os demais papéis são encaminhados à página de acesso negado, enquanto o backend continua sendo autoridade e responde 403.

Fora de escopo: pausar SLA, recalcular o status a partir de timestamps no navegador, alterar prazos de chamados já abertos, implementar o comportamento do app mobile e exibir o histórico de mudanças da política.

## Referência de API

Todas as chamadas usam `/api/v1`, Bearer token e ProblemDetail para erros.

| Ação | Contrato |
|---|---|
| Consultar política | `GET /sla/politica` retorna quatro itens `{ severidade, atendimentoMin, resolucaoMin, padrao }`. `padrao=true` indica valor padrão do sistema para aquela severidade. |
| Salvar política | `PUT /sla/politica` recebe array com uma ou mais severidades e retorna a política efetiva. O frontend envia as quatro linhas para salvar o conjunto exibido. |
| Dados SLA do chamado | `GET /chamados` e `GET /chamados/{id}` incluem `slaAtendimentoAte`, `slaResolucaoAte`, `slaStatus`; datas/status podem ser nulos em chamados antigos ou sem SLA. |

O backend rejeita prazos menores ou iguais a zero, resolução menor que atendimento, severidades duplicadas e lista vazia (`400 SLA_POLITICA_INVALIDA`). Valores padrão informados no comentário são crítica 15 min/4 h, alta 30 min/8 h, média 2 h/24 h e baixa 8 h/72 h, mas estão sujeitos à validação do piloto. O frontend não codifica esses números: apresenta o que `GET` retorna.

`slaStatus` é `no_prazo`, `em_risco`, `vencido` ou `null`. O backend aplica limiar de risco em 80%, regra de atendimento/resolução e relógio 24x7. A tela apenas apresenta o status e datas recebidos; não reproduz a regra de negócio no cliente.

## Fluxo de configuração

1. Ao abrir `/settings/sla`, carregar a política efetiva; mostrar skeleton durante a consulta.
2. Renderizar uma linha por severidade com valores e unidades selecionáveis (`min`/`h`), mais indicação “Padrão do sistema” ou “Personalizado”.
3. Ao salvar, converter horas em minutos e enviar a lista à API.
4. Em sucesso, atualizar os valores com a resposta do backend e informar que a nova política se aplica apenas a chamados abertos dali em diante.
5. Em erro, manter as edições no formulário, exibir detalhe útil e permitir nova tentativa.

O formulário mantém valores em números inteiros na unidade selecionada; resolução não pode ser menor que atendimento depois da conversão para minutos. Zero, negativos, campos vazios e valores não numéricos são inválidos.

## Estados e acessibilidade

- Loading: skeleton para as quatro linhas e ação de salvar desabilitada.
- Default: política carregada, indicação de origem dos valores e formulário editável.
- Error: mensagem recuperável com retry para consulta; erro de salvamento mantém os valores editados.
- Success: confirmação acessível e visível da efetivação futura.
- Todas as labels identificam severidade, prazo e unidade; erros ficam associados ao respectivo campo; status de SLA inclui texto e não depende apenas de cor.
- Layout usa tokens semânticos do Design System e permanece utilizável em tema Dark/Light e larguras estreitas.

## Critérios de aceite

- [x] Quatro severidades e prazos efetivos são carregados de `GET /sla/politica` em ordem de urgência.
- [x] `padrao` diferencia valores padrão do sistema de valores personalizados, sem fallback numérico local.
- [x] Atendimento e resolução aceitam minutos ou horas; conversão enviada à API é em minutos.
- [x] Zero, valores inválidos e resolução inferior ao atendimento são bloqueados antes do PUT.
- [x] PUT atualiza a política, exibe a resposta efetiva e informa que só afeta novos chamados.
- [x] O item e a rota são exclusivos de `admin_cliente`; demais papéis não recebem a tela e a API permanece protegida por 403.
- [x] Lista/detalhe exibem status SLA recebido pela API e acomodam `null`/chamados antigos sem inventar status.
- [ ] Backend `dev` é validado ponta a ponta, incluindo valores padrão aprovados pelo piloto e resposta 403 para outros papéis.

## Dependências e decisões

1. A configuração depende da Story 8.3 do `heem-backend`, liberada em `dev` conforme comentário da issue.
2. Confirmar os quatro valores padrão com o piloto; a UI não os presume.
3. No app mobile, o pull usa `updated_at`; o comentário orienta recalcular status no aparelho a partir das datas e eventos. Essa responsabilidade é de `heem-mobile`, fora desta implementação web.
