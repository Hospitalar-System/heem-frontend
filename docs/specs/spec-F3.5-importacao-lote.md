# Spec F3.5 — Importação em lote

**Status:** implementação de preparação do frontend; processamento bloqueado pela dependência Story 11.1 do backend.  
**Issue:** [#28 — Story F3.5: Importação em lote](https://github.com/Hospitalar-System/heem-frontend/issues/28)  
**Documentos de referência:** `docs/design.md`, `docs/experience.md`, `docs/epics.md` e a issue #28.

## Objetivo

Permitir que Admin do Cliente prepare importações CSV de equipamentos, setores e usuários. A API deverá processar o arquivo de forma assíncrona, garantir idempotência, retornar contagens e disponibilizar erros por linha/coluna/motivo. O frontend não deve simular o resultado nem enviar arquivos até o contrato oficial da Story 11.1 estar disponível.

## Escopo

- Nova tela `/imports`, exclusiva para `admin_cliente`.
- Seleção de entidade: equipamentos, setores ou usuários.
- Download de modelo CSV preliminar baseado nos campos de criação conhecidos no frontend.
- Seleção de arquivo `.csv` e exibição do nome/tamanho.
- Aviso de dependência enquanto a API de importação não estiver disponível; ação de processamento fica desabilitada nesse estado.
- Integração futura com envio assíncrono, consulta de progresso, resumo final e download de relatório de erros, após validação do contrato do backend.

## Regras e segurança

- A rota e o item de navegação são visíveis somente para `admin_cliente`; o backend permanece autoridade final de autorização.
- Não persistir arquivos localmente, nem colocá-los em `localStorage`/`sessionStorage`.
- Não enviar CSV a endpoints CRUD existentes: esses endpoints não definem idempotência/semântica de lote.
- Os modelos são provisórios e refletem os campos de criação já conhecidos. Antes de habilitar envio, alinhar cabeçalhos, limites, formato de resposta, endpoint de status, idempotência e contrato do relatório com a Story 11.1.
- Nunca declarar importação concluída sem confirmação da API.

## Contrato pendente

A issue não informa endpoint nem DTO de importação. A implementação não assume nomes de rotas. Backend precisa definir: operação de upload/início; identificador de job; polling ou mecanismo de conclusão; resposta de total/criados/ignorados/com erro; regras de duplicidade; modelo CSV oficial para cada entidade; endpoint e formato do relatório de erros.

## Critérios de aceite

- [x] Admin do Cliente acessa `/imports`; outros papéis são redirecionados para acesso negado e não veem o link na navegação.
- [x] A pessoa escolhe entre equipamentos, setores e usuários e baixa um modelo CSV por tipo.
- [x] A pessoa pode selecionar um arquivo CSV e visualizar seu nome e tamanho.
- [x] A interface informa claramente que o processamento aguarda a API de importação do backend; não há chamada fictícia.
- [ ] O envio inicia processamento assíncrono sem bloquear a tela.
- [ ] A conclusão mostra total, criados, ignorados por duplicidade e erros.
- [ ] O relatório de erros apresenta linha, coluna e motivo e pode ser baixado.
- [ ] Reenviar um arquivo idêntico não duplica registros e explica as linhas ignoradas.
- [ ] Cabeçalhos/modelos são validados contra o contrato oficial da Story 11.1.

## Estados de interface

- **Default:** escolher tipo e baixar o modelo correspondente.
- **Arquivo selecionado:** exibir arquivo local escolhido e permitir removê-lo/substituí-lo.
- **Dependência indisponível:** explicar que nenhum dado foi enviado e manter processamento desabilitado.
- **Futuros estados de execução:** processamento, sucesso parcial/total, erro e relatório baixável serão implementados junto do contrato de backend.
- **Temas:** usar tokens semânticos para Dark e Light.

## Arquivos

- `src/features/imports/pages/BatchImportPage.tsx`
- `src/features/imports/types/index.ts`
- `src/features/imports/__tests__/BatchImportPage.test.tsx`
- `src/app/router.tsx`
- `src/features/dashboard/components/DashboardSidebar.tsx`
