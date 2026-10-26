# Acessibilidade da landing (Story L4)

Alvo: WCAG 2.1 AA, temas claro, escuro e automático.

## Contraste (verificado por `__tests__/Contraste.test.ts`)
O teste lê os tokens reais de `src/index.css` e de `landing.css`, deriva os fundos mesclados (`color-mix`) e exige razão
>= 4,5:1 para texto normal. Pares checados: texto principal, secundário e muted; texto primário (links, chips, rótulos);
texto de erro; tinta sobre o verde do botão (inclusive no hover); etiqueta de aviso; aviso provisório e `[PENDENTE]`.
Fundos: `bg`, `surface`, `bg-deep`, `surface-hi`, `primary-soft`, `danger-soft` (sobre bg e surface) e o CTA final.

Falhavam e foram corrigidos **só no escopo `.landing`** (tokens globais do sistema intactos):

| Par | Antes | Depois |
| --- | --- | --- |
| Muted no claro (`#a1a1aa` sobre `#f4f5f7`) | 2,35:1 | `#55555e`, >= 4,5:1 em todos os fundos |
| Muted no escuro sobre `surface`/`surface-hi` | 4,17:1 / 3,09:1 | `#b2b2ba`, >= 4,5:1 |
| Verde de texto no claro (`#2eb87e` sobre bg e chips) | 2,1 a 2,3:1 | `--primary-text: #0b6b45` (texto), o verde segue só em fundos/bordas |
| Erro no escuro sobre `danger-soft` | 3,7 a 4,3:1 | `--danger-text: #ff8080` |
| Erro no claro sobre `danger-soft` | 3,6:1 | `--danger-text: #b91c1c` |

Texto de links e chips usa `text-[var(--primary-text)]`/`--danger-text` em vez de `text-primary`/`text-danger`.
Ainda não coberto pelo teste: contraste de bordas de componentes (1.4.11), que usam `--border` global.

## Teclado e semântica
- Skip link "Ir para o conteúdo" é o primeiro foco; `main#conteudo` recebe o foco. Foco visível (anel) em links, botões,
  abas, campos, dropdown, fechar do diálogo e checkbox.
- Abas (`role=tablist`, setas/Home/End), dropdown próprio (`SelectLanding`: Enter/Espaço/setas/Esc) e diálogo (Esc,
  foco preso, devolve o foco a quem abriu) cobertos pelos testes das stories L2c/L3 (`LandingSecoes`, `SelectLanding`, `Agendar`).
- `h1` único e sem salto de nível (`__tests__/Acessibilidade.test.tsx`, na landing e nas duas páginas legais);
  `lang="pt-BR"`; regiões `banner`/`main`/`contentinfo`; navegações com `aria-label`.
- Imagens com `alt` descritivo, `width`/`height` e `loading="lazy"`; ícones decorativos `aria-hidden`; gráfico SVG com
  `role="img"` e `aria-label`; botão de fechar com `aria-label`.
- `prefers-reduced-motion` segue respeitado (sem movimento, conteúdo nunca oculto; barra de progresso não renderiza).
- Os trechos `[PENDENTE]` têm contorno tracejado além do realce de cor (não dependem só de cor).

## Fora do escopo desta verificação
Leitor de tela real (NVDA/VoiceOver) e auditoria automatizada (axe/Lighthouse) não foram executados aqui; ficam na
verificação manual do PR.
