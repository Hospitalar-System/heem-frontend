# Telas do aplicativo na landing

As telas da vitrine são capturas reais do aplicativo móvel (build de desenvolvimento, tema escuro, dados de exemplo:
"Hospital Dev", "Tecnico Hospital Dev", EQ-0001 e afins; nenhum dado real de paciente, pessoa ou cliente).
Cada chave de `telas.ts` aponta para um arquivo desta pasta via `new URL('./arquivo.webp', import.meta.url).href`.
Uma chave sem `src` cai no placeholder gerado em código (`placeholderTela`), sem mexer nos componentes.

## Como foram geradas

Capturas de tela do celular (1080 x 2400, retrato), a partir de `Screenshot_20261021_*_HEEM (dev).jpg`. Os originais
**não** ficam no repositório. Para cada tela: corte da barra de status do Android (topo, 78 px) e da barra de navegação
(fundo, 42 px), ficando 1080 x 2280; redução para 472 x 996 px (2x de um celular de 236 px de largura); WebP qualidade 80,
sem metadados EXIF. Feito com `sharp` instalado fora do repositório (não é dependência do projeto).

A engrenagem flutuante do build de desenvolvimento (menu de depuração) que aparece sobre as capturas foi retirada
repintando o fundo ao redor. Na tela de chamados ela cobria o botão "Novo", que foi redesenhado com o mesmo verde
e o texto "Novo".

| Chave em `telas.ts` | Arquivo | Origem (captura) | Tela |
| --- | --- | --- | --- |
| `novoChamado` | `novo-chamado.webp` | `..._152002_...` | Novo chamado: equipamento, severidade e descrição |
| `inicio` | `inicio.webp` | `..._151935_...` | Hoje: atalho de emergência, fila do técnico e hospitais |
| `fichaEquipamento` | `ficha-equipamento.webp` | `..._151942_...` | Ficha do equipamento: atalhos e dados técnicos |
| `minhasOts` | `minhas-ots.webp` | `..._151928_...` | Ordens de trabalho, com uma preventiva atrasada |
| `chamados` | `chamados.webp` | `..._151915_...` | Lista de chamados, com severidade e status |
| `offlineSessao` | `offline-sessao.webp` | `..._151902_...` | Perfil: sincronização, pendências e sessão (chave ainda não usada em nenhum painel) |

Tamanho final: cada arquivo tem de 19 a 29 KB.

Atualize também o `alt` de cada tela se o conteúdo da captura mudar.
