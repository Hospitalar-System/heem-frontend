# Telas do aplicativo na landing

Hoje todas as telas usam um placeholder gerado em código (`telas.ts`, "Tela do aplicativo — em breve").
Para trocar, coloque o arquivo nesta pasta e altere só o `src` da chave correspondente em `telas.ts`
(por exemplo `src: new URL('./novo-chamado.webp', import.meta.url).href`). Nenhum componente muda.

Formato: WebP, 472 x 968 px (2x de um celular de 236 px de largura), tema escuro, dados de exemplo
(sem dados reais de paciente ou de cliente).

| Chave em `telas.ts` | Arquivo esperado | Tela |
| --- | --- | --- |
| `novoChamado` | `novo-chamado.webp` | Abrir chamado: equipamento, severidade e descrição |
| `inicio` | `inicio.webp` | Tela inicial, com atalho de emergência e fila do técnico |
| `fichaEquipamento` | `ficha-equipamento.webp` | Ficha do equipamento, com dados técnicos e atalhos |
| `minhasOts` | `minhas-ots.webp` | Minhas OTs, com uma preventiva atrasada |
| `chamados` | `chamados.webp` | Lista de chamados, com severidade e status |
| (opcional, nova chave) | `offline-sessao.webp` | Aviso de modo offline / sessão perto de expirar |

Atualize também o `alt` de cada tela se o conteúdo da captura mudar.
