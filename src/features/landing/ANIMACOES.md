# Animações da landing (Story L2c)

## O que a referência faz
`landing-heem-referencia.html`: entrada do hero em cascata (`hin`, atrasos 0/.1/.2/.3/.4 s), revelar ao rolar
(`.rv [data-r]` com atraso escalonado e variações `up`/`left`/`right`/`scale`), barra de progresso (`#prog`),
sombra da nav após 8 px, desenho da linha do gráfico (1,6 s, atraso .3 s), elevação no hover (cartões -4 px,
chips de norma -2 px), transição das abas e entrada `hin .45s` dos painéis. O que esconde o conteúdo (`.rv`)
só é ligado depois que o observador está ativo.

## O que a página fazia
O código tinha as peças, mas com `prefers-reduced-motion: reduce` **tudo** era desligado: `Reveal` não
aplicava nada, `ScrollProgress` não renderizava, `hin`/painéis/gráfico sem animação e o hover sem elevação.
Além disso: a linha do gráfico animava ao montar (antes de a janela estar na tela), faltavam as variações
`left`/`right` e a elevação dos chips de norma.

## Causa
Confirmada pelo Pedro: no Windows dele "Efeitos de animação" está **desligado**, o que ativa
`prefers-reduced-motion: reduce` no navegador. A página obedecia e ficava sem nenhuma animação.

## Correção
- `useRevelar` (hook novo): observa o elemento uma vez; o estado que esconde (`pending`) só existe depois
  que o `IntersectionObserver` está ativo (sem observador, erro ao criá-lo ou reduced motion: conteúdo
  sempre visível). Cada `Reveal`/painel montado depois tem o próprio observador.
- `Reveal` ganhou `left`/`right`; atrasos escalonados como na referência (cartões 90 ms, perfis 100 ms scale,
  normas 120 ms, CTA e vitrine scale).
- Gráfico: `data-draw` pending/in; a linha só desenha quando a janela entra na tela.
- Chips de norma com `translateY(-2px)` no hover; `SelectLanding` local (dropdown fiel).
- Reduced motion, de forma graciosa: sem translate/scale, sem desenho de traço, sem barra de progresso e
  sem giro da seta; ficam só fades de opacidade de 150 ms e mudanças de estado instantâneas. Conteúdo nunca
  fica oculto.

## Como conferir
- Windows: Configurações -> Acessibilidade -> Efeitos visuais -> "Efeitos de animação" **ligado** = animações
  completas; **desligado** = versão sem movimento.
- DevTools -> Rendering -> "Emulate CSS prefers-reduced-motion" (reduce / no-preference) e recarregue a página.
