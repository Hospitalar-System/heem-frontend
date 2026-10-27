# DataTable / StatusBadge: padrão das listas

Tokens extraídos da lista de Categorias (`/settings/categories`). O formato é a BASE; cada lista mantém suas colunas, campos e ações.

- **Contêiner:** `overflow-x-auto rounded-lg border border-border bg-surface`; tabela `w-full border-collapse text-left` com `minWidth` configurável.
- **Cabeçalho:** classe `.table-head` (fundo `surface`, `text-text-secondary`, `font-medium`), `h-12`, `text-[11px]`, caixa normal (sem uppercase), `px-4`, `th scope="col"`.
- **Linhas:** `.row-idle` + `.row-divider` (borda inferior suave, `color-mix` 45% do token), `h-12` (`rowHeightClass` para `h-14`/`h-16` com 2 linhas), `text-xs`, `px-4`. Clicável: `.row-clickable` (hover `surface-hi`, anel de foco `primary`, `tabIndex=0`, Enter/Espaço). Selecionada: `.row-selected` + `aria-current`.
- **Célula:** nome principal `text-sm font-medium text-text-primary`; secundárias `text-text-secondary`; subtexto `text-[10px]/[11px] text-text-muted`; números `tabular-nums`.
- **Selos (`StatusBadge` sobre `Badge`):** tamanho e raio únicos do `Badge`. Tons: neutral (cinza), success (primary), warning, danger, info; fundo suave, sem borda, texto sempre visível.
- **Menu de três pontos:** `RowActionsMenu` na última coluna, alinhado à direita (`rowActions`, `rowLabel` gera "Ações de <nome>"); linha sem ações = sem botão.
- **Vazio:** `min-h-64`, borda tracejada, ícone `text-text-muted`, título `font-semibold`, descrição `text-sm text-text-secondary`, ação opcional centralizada.
- **Carregando:** mesma tabela com linhas-esqueleto (`animate-pulse rounded bg-bg`), uma célula por coluna; `aria-busy` e `loadingLabel`.
- **Erro:** `role="alert"`, borda `danger/40`, botão "Tentar novamente".
- **Paginação:** a prop `pagination` renderiza `Pagination` abaixo, em barra com borda.

## Exemplo

```tsx
const columns: DataColumn<Hospital>[] = [
  { key: 'nome', header: 'Nome', cell: (h) => <span className="text-sm font-medium text-text-primary">{h.nome}</span> },
  { key: 'cidade', header: 'Cidade', hideBelow: 'md', cell: (h) => <span className="text-text-secondary">{h.cidade}</span> },
  { key: 'status', header: 'Situação', cell: (h) => <StatusBadge tone={h.ativo ? 'success' : 'neutral'}>{h.ativo ? 'Ativo' : 'Inativo'}</StatusBadge> },
]
<DataTable label="Hospitais" columns={columns} rows={items} getRowId={(h) => h.id} rowLabel={(h) => h.nome}
  rowActions={(h) => [{ label: 'Editar', onSelect: () => edit(h) }]} isLoading={q.isLoading}
  error={q.isError ? { message: 'Não foi possível carregar.', onRetry: () => void q.refetch() } : null}
  empty={{ icon: <Building2 />, title: 'Nenhum hospital', action: <PageAction onClick={create}>Novo hospital</PageAction> }} />
```

`StatusBadge` é só a casca que mapeia o status para a variante do `Badge` compartilhado (`src/components/ui/Badge.tsx`).
