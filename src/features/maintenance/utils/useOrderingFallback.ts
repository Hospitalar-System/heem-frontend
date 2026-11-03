import { useEffect, useState } from 'react'
import { orderingErrorMessage } from './ordering'

/**
 * Quando o servidor recusa a ordenação escolhida (`ORDENACAO_INVALIDA`/`ORDENACAO_INDISPONIVEL`), volta à ordem padrão
 * (`resetOrder` limpa `ordenar`/`direcao` da URL) e devolve a mensagem para a tela; `dismiss` apaga o aviso
 * quando a pessoa escolhe outra ordem.
 */
export function useOrderingFallback(error: unknown, hasCustomOrder: boolean, resetOrder: () => void, orderKey: string) {
  const [message, setMessage] = useState<string | null>(null)
  const failure = orderingErrorMessage(error)

  useEffect(() => {
    if (!failure || !hasCustomOrder) return
    setMessage(failure)
    resetOrder()
    // `resetOrder` troca de identidade a cada render; o que importa é o erro e a ordem pedida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failure, hasCustomOrder, orderKey])

  return { message, dismiss: () => setMessage(null) }
}
