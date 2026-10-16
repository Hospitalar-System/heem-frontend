# Spec F3.6 — Etiquetas do Equipamento

**Status:** implementado no frontend; link ao equipamento que já usa a etiqueta depende de o backend fornecer seu ID no conflito `ETIQUETA_EM_USO`.
**Story:** F3.6 — Etiquetas do equipamento  
**Issue:** [#30 — Story F3.6: Etiquetas do equipamento](https://github.com/Hospitalar-System/heem-frontend/issues/30)  
**Tela relacionada:** [Spec F3.2–F3.4 — Equipamentos](spec-F3.2-F3.3-F3.4-equipamentos.md)  
**Rota frontend:** seção “Etiquetas” no detalhe `/assets/:id`  
**Acesso da seção:** Admin do Cliente (`admin_cliente`).

## Objetivo e escopo

Permitir ao Admin do Cliente consultar etiquetas ativas do equipamento, vincular uma etiqueta QR/código de barras/outro valor e desvincular uma etiqueta com confirmação. A seção pertence ao detalhe do equipamento e pode exibir mais de uma etiqueta ativa.

O valor deve aceitar digitação, colagem e leitores USB de código de barras que enviam os caracteres como teclado. Não implementar câmera, geração de QR, impressão, resolução da etiqueta para navegação ou sincronização offline nesta story. A resolução por valor e inclusão de etiquetas no pull pertencem à Story 12.2 do backend.

## Integração

As rotas são relativas a `/api/v1`, usam `apiClient` com Bearer token e devem sempre manter o `equipamentoId` da tela no escopo da operação.

| Ação | Endpoint | Contrato |
|---|---|---|
| Listar etiquetas ativas | `GET /equipamentos/{id}/etiquetas` | Disponível para `admin_cliente` e `tecnico`; resposta contém `{ id, equipamentoId, valor, tipo, vinculadoPor, vinculadoEm }`. |
| Vincular etiqueta | `POST /equipamentos/{id}/etiquetas` | Body `{ valor, tipo }`; `tipo` aceita `qr`, `barras` ou `outro`. `201` cria; `200` retorna a mesma etiqueta ativa quando o valor já está vinculado ao mesmo equipamento. |
| Desvincular etiqueta | `DELETE /equipamentos/{id}/etiquetas/{etiquetaId}` | Permitido apenas para Admin; sucesso `204`. Requer confirmação na UI. |

`POST` normaliza espaços externos com trim. Valor vazio, acima de 200 caracteres ou contendo caractere de controle retorna `400`; tipo inválido também retorna `400`. `409 ETIQUETA_EM_USO` significa que o valor está ativo em outro equipamento. O `detail` inclui código e nome desse equipamento apenas quando o usuário tem acesso ao hospital correspondente; em caso contrário, será genérico. Não expor nem inferir informação adicional a partir da resposta.

O backend devolve `403` para `interno_hospital` e `404` para Técnico de outro hospital. A interface desta story só apresenta a seção para `admin_cliente`, conforme o issue, mas toda autorização continua sob responsabilidade do backend. Vincular/desvincular atualiza o equipamento; invalidar também o cache do detalhe e das listagens/métricas pertinentes.

## Requisitos funcionais

1. Adicionar a aba/seção “Etiquetas” à navegação acessível do detalhe de equipamento. Ela só aparece para usuários com papel `admin_cliente`; demais papéis não devem receber a seção nem suas ações.
2. Consultar `GET /equipamentos/{id}/etiquetas` ao entrar na seção. Mostrar apenas etiquetas ativas retornadas para aquele equipamento; tratar uma lista vazia como estado vazio, sem fixtures.
3. Para cada etiqueta, exibir valor, tipo em rótulo legível, autor de vínculo e data/hora conforme resposta. Se `vinculadoPor` for um identificador, resolvê-lo a partir de dados já disponíveis quando possível; não fazer chamadas em lote improvisadas. Se não puder ser resolvido, mostrar o identificador retornado, não inventar nome.
4. “Vincular etiqueta” abre um formulário com campo de valor (`maxLength=200`) e tipo (`QR`, `Código de barras`, `Outro`). O campo permite digitar, colar e receber a entrada sequencial de leitor USB sem dependência de hardware/API especial.
5. Validar no frontend trim, valor não vazio, limite de 200 caracteres e ausência de caracteres de controle. Normalizar o valor com trim no envio. A API permanece autoridade final e seus erros devem ser apresentados no formulário.
6. Em `201`, informar vínculo criado e atualizar a lista. Em `200` idempotente para o mesmo equipamento, informar que a etiqueta já estava vinculada e não duplicar o item.
7. Em `409 ETIQUETA_EM_USO`, manter o formulário preenchido e apresentar o erro `detail` recebido. Oferecer link para o equipamento atual apenas se a resposta/API fornecer um identificador confiável e o usuário tiver autorização para acessá-lo. O contrato atual documenta código e nome, mas não `equipamentoId`; não fabricar um destino. Se não houver identificador, exibir os dados textuais retornados sem link e manter essa lacuna registrada.
8. Desvincular solicita confirmação identificando o valor/tipo, previne envio duplicado e só remove a etiqueta da lista após `204`. O backend preserva o histórico; a UI atualiza a lista de ativas e não promete uma tela de histórico que não existe no contrato.
9. Tratar `400`, `403`, `404`, falha de rede e estado de mutação sem apagar o shell ou perder dados não enviados. Mensagens genéricas do backend devem continuar genéricas; nunca tentar descobrir por probing qual equipamento usa um valor.
10. Não incluir `POST /equipamentos/etiquetas/resolver`, etiquetas no pull, câmera, leitura móvel ou navegação por valor; esses itens são da Story 12.2.

## Estados e acessibilidade

- Dark/Light via tokens semânticos existentes; sem cores hexadecimais locais.
- Skeleton da lista ao consultar etiquetas, estado vazio com CTA, erro com retry e estados de envio/desvinculação.
- Formulário com labels associados, tipo selecionável, limites de valor anunciados e mensagem de validação associada ao campo.
- Leitor USB funciona como entrada de teclado: não interceptar atalhos, não submeter automaticamente a cada caractere e não limpar o campo antes da confirmação do backend.
- Confirmação de desvinculação em diálogo acessível, com foco controlado, cancelamento por teclado e ação destrutiva identificada por texto.
- `409` usa `role="alert"`; valores e tipos permanecem legíveis e selecionáveis. Ícones não substituem rótulos.
- A seção e as ações preservam operação por teclado e nomes acessíveis.

## Critérios de aceite

- [x] A seção “Etiquetas” aparece no detalhe do equipamento apenas para `admin_cliente`.
- [x] A lista consulta etiquetas ativas daquele equipamento e mostra valor, tipo, quem vinculou e quando, usando os dados recebidos.
- [x] É possível vincular etiquetas dos tipos `qr`, `barras` e `outro`, incluindo valor inserido por leitor USB que opera como teclado.
- [x] Valores vazios, acima de 200 caracteres ou com caracteres de controle são tratados; erros do backend permanecem no formulário.
- [x] Repetir um vínculo no mesmo equipamento trata a resposta idempotente `200` sem duplicar a etiqueta.
- [ ] `409 ETIQUETA_EM_USO` apresenta a resposta segura do backend; o link ao equipamento permanece bloqueado porque o contrato não retorna um ID navegável/autorizável.
- [x] Desvincular exige confirmação, só atualiza a lista após `204` e não sugere que o histórico foi apagado.
- [x] Loading, empty, error, envio, confirmação e restrição de papel têm testes; Dark/Light usam os tokens semânticos compartilhados.

## Dependências e limites conhecidos

- O comentário do issue informa que a Story 12.1 do backend foi liberada em `dev` (PR #132), com as rotas e DTOs resumidos nesta especificação.
- A resposta documentada para `ETIQUETA_EM_USO` inclui código/nome do equipamento, mas não declara seu ID. O critério de link clicável exige esse ID ou outro mecanismo de resolução autorizado; até existir, mostrar o contexto textual sem link.
- A UI de histórico de etiquetas não está coberta por endpoint de leitura; o backend preserva registros desvinculados, mas esta tela lista somente etiquetas ativas.
- A leitura da etiqueta para abrir o equipamento, o delta no pull e `POST /equipamentos/etiquetas/resolver` ficam para a Story 12.2.
