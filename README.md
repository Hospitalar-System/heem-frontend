# HEMM Front-end

Aplicação web de gestão do HEMM, um CMMS hospitalar multi-tenant para administração de clientes, ativos e rotinas de manutenção. O painel atende principalmente Super Admin e Admin do Cliente. O app de campo do Técnico está no repositório [`heem-mobile`](https://github.com/Hospitalar-System/heem-mobile).

> **Status:** a base de desenvolvimento está configurada. As telas e funcionalidades do produto ainda serão implementadas conforme as especificações em `docs/`.

## Requisitos

- Node.js 20 ou superior
- npm

## Começar

Na raiz do repositório, instale as dependências e inicie o servidor local:

```bash
npm install
npm run dev
```

O Vite exibirá o endereço local no terminal. Para gerar e servir uma versão de produção:

```bash
npm run build
npm run preview
```

## Comandos disponíveis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento com atualização automática. |
| `npm run build` | Verifica os tipos TypeScript e gera a aplicação em `dist/`. |
| `npm run preview` | Serve localmente o build de produção. |
| `npm run lint` | Executa o ESLint no projeto. |
| `npm test` | Executa os testes uma vez com Vitest. |
| `npm run test:watch` | Executa o Vitest em modo de observação. |

## Documentação do produto

Consulte as especificações antes de implementar funcionalidades ou componentes:

- [`docs/design.md`](docs/design.md) — modos de tema, tokens semânticos e regras visuais.
- [`docs/experience.md`](docs/experience.md) — arquitetura da informação, fluxos e padrões de interação.
- [`docs/epics.md`](docs/epics.md) — épicos, histórias, regras de negócio e critérios de aceite.
- [`AGENTS.md`](AGENTS.md) — instruções de desenvolvimento para agentes de IA.

## Stack

- React 19, TypeScript e Vite 5
- React Router DOM 6 para navegação
- TanStack React Query e Axios para dados e chamadas HTTP
- React Hook Form e Zod para formulários e validação
- Tailwind CSS 3 para estilos, com tokens semânticos configurados em [`tailwind.config.js`](tailwind.config.js)
- Vitest, happy-dom e Testing Library para testes
- Sonner para notificações, Lucide para ícones, Recharts para gráficos e dnd-kit para interações de arrastar e soltar

## Estrutura atual

```text
src/
├── app/
│   ├── providers.tsx  # React Query e notificações
│   └── router.tsx     # Rotas da aplicação
├── test/
│   └── setup.ts       # Configuração global da Testing Library
├── App.tsx            # Página inicial provisória
├── index.css          # Estilos e tokens base
└── main.tsx           # Ponto de entrada
```

As funcionalidades devem ser organizadas por domínio em `src/features/`, com páginas, componentes, hooks, schemas, tipos e acesso à API agrupados por feature. Componentes reutilizáveis e infraestrutura ficam em `src/components/`, `src/lib/`, `src/config/` e `src/types/`, conforme necessário.

## Integração com o backend

O front-end consumirá o contrato REST/OpenAPI do [`heem-backend`](https://github.com/Hospitalar-System/heem-backend), com endpoints sob `/api/v1/`. A configuração de ambiente e a integração das chamadas serão feitas junto às primeiras funcionalidades; atualmente não há variável de ambiente obrigatória para iniciar a base local.
