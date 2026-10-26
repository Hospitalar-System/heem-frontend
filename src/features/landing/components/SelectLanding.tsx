import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, Ref } from 'react'

export interface OpcaoSelect {
  valor: string
  rotulo: string
}

interface SelectLandingProps {
  id: string
  /** Id do <label> do campo (nomeia o combobox e a lista). */
  rotuloId: string
  opcoes: readonly OpcaoSelect[]
  /** Valor atual; '' (ou desconhecido) mostra o placeholder. */
  valor: string
  onChange: (valor: string) => void
  onBlur?: () => void
  placeholder?: string
  invalido?: boolean
  descritoPor?: string
  name?: string
  /** Ref do botão (o react-hook-form usa para focar o primeiro campo inválido). */
  inputRef?: Ref<HTMLButtonElement>
}

const ALTURA_MAXIMA = 236
const ALTURA_MINIMA = 120
const MARGEM = 16
const LIMITE_TYPE_AHEAD_MS = 600

/**
 * Dropdown da landing (reproduz `.sel/.dd-btn/.dd-list` da referência) no padrão combobox "select-only" do
 * WAI-ARIA: o foco fica no botão e a opção ativa é apontada por aria-activedescendant. Local da landing.
 */
export function SelectLanding({ id, rotuloId, opcoes, valor, onChange, onBlur, placeholder = 'Selecione', invalido, descritoPor, name, inputRef }: SelectLandingProps) {
  const listaId = useId()
  const hostRef = useRef<HTMLDivElement>(null)
  const botaoRef = useRef<HTMLButtonElement | null>(null)
  const listaRef = useRef<HTMLUListElement>(null)
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const [paraCima, setParaCima] = useState(false)
  const [alturaMaxima, setAlturaMaxima] = useState(ALTURA_MAXIMA)
  const busca = useRef({ texto: '', timer: 0 })

  const indiceSelecionado = opcoes.findIndex((opcao) => opcao.valor === valor)
  const selecionada = indiceSelecionado >= 0 ? opcoes[indiceSelecionado] : undefined
  const idOpcao = (i: number) => `${listaId}-op-${i}`

  const atribuirRef = useCallback(
    (el: HTMLButtonElement | null) => {
      botaoRef.current = el
      if (typeof inputRef === 'function') inputRef(el)
      else if (inputRef) (inputRef as { current: HTMLButtonElement | null }).current = el
    },
    [inputRef],
  )

  const abrir = (indice?: number) => {
    setAtivo(indice ?? (indiceSelecionado >= 0 ? indiceSelecionado : 0))
    setAberto(true)
  }

  const fechar = (devolverFoco = false) => {
    setAberto(false)
    if (devolverFoco) botaoRef.current?.focus()
  }

  const escolher = (i: number) => {
    onChange(opcoes[i].valor)
    fechar(true)
  }

  // Abre para cima quando falta espaço abaixo (limitado pelo diálogo, se houver) e ajusta a altura.
  useLayoutEffect(() => {
    if (!aberto) return
    const botao = botaoRef.current
    const lista = listaRef.current
    if (!botao || !lista) return
    const caixa = botao.closest('[role="dialog"]')?.getBoundingClientRect()
    const topo = Math.max(caixa?.top ?? 0, 0)
    const base = Math.min(caixa?.bottom ?? window.innerHeight, window.innerHeight)
    const rect = botao.getBoundingClientRect()
    const abaixo = base - rect.bottom - MARGEM
    const acima = rect.top - topo - MARGEM
    const necessario = Math.min(ALTURA_MAXIMA, lista.scrollHeight + 14)
    const subir = abaixo < necessario && acima > abaixo
    setParaCima(subir)
    setAlturaMaxima(Math.max(ALTURA_MINIMA, Math.min(ALTURA_MAXIMA, subir ? acima : abaixo)))
  }, [aberto])

  // Mantém a opção ativa visível na rolagem da lista.
  useEffect(() => {
    if (!aberto) return
    document.getElementById(`${listaId}-op-${ativo}`)?.scrollIntoView?.({ block: 'nearest' })
  }, [aberto, ativo, listaId])

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!aberto) return
    const aoClicarFora = (evento: Event) => {
      if (!hostRef.current?.contains(evento.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    document.addEventListener('touchstart', aoClicarFora)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      document.removeEventListener('touchstart', aoClicarFora)
    }
  }, [aberto])

  useEffect(() => {
    const controle = busca.current
    return () => window.clearTimeout(controle.timer)
  }, [])

  /** Type-ahead: acumula as letras digitadas; a mesma letra repetida percorre as opções com essa inicial. */
  const procurar = (tecla: string, base: number) => {
    const controle = busca.current
    window.clearTimeout(controle.timer)
    controle.timer = window.setTimeout(() => {
      controle.texto = ''
    }, LIMITE_TYPE_AHEAD_MS)
    controle.texto += tecla.toLowerCase()
    const repetida = [...controle.texto].every((letra) => letra === controle.texto[0])
    const termo = repetida ? controle.texto[0] : controle.texto
    const inicio = repetida ? base + 1 : base
    for (let passo = 0; passo < opcoes.length; passo += 1) {
      const i = (inicio + passo + opcoes.length) % opcoes.length
      if (opcoes[i].rotulo.toLowerCase().startsWith(termo)) return i
    }
    return -1
  }

  const aoTeclar = (evento: KeyboardEvent<HTMLButtonElement>) => {
    const ultimo = opcoes.length - 1
    const { key } = evento
    const imprimivel = key.length === 1 && key !== ' ' && !evento.ctrlKey && !evento.metaKey && !evento.altKey
    if (!aberto) {
      if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
        evento.preventDefault()
        abrir()
      } else if (imprimivel) {
        evento.preventDefault()
        const i = procurar(key, indiceSelecionado)
        abrir(i >= 0 ? i : undefined)
      }
      return
    }
    if (key === 'ArrowDown') {
      evento.preventDefault()
      setAtivo((i) => (i >= ultimo ? 0 : i + 1))
    } else if (key === 'ArrowUp') {
      evento.preventDefault()
      setAtivo((i) => (i <= 0 ? ultimo : i - 1))
    } else if (key === 'Home') {
      evento.preventDefault()
      setAtivo(0)
    } else if (key === 'End') {
      evento.preventDefault()
      setAtivo(ultimo)
    } else if (key === 'Enter' || key === ' ') {
      evento.preventDefault()
      escolher(ativo)
    } else if (key === 'Escape') {
      // Não deixa o Esc chegar ao diálogo: fecha só a lista.
      evento.preventDefault()
      evento.stopPropagation()
      fechar(true)
    } else if (key === 'Tab') {
      fechar()
    } else if (imprimivel) {
      evento.preventDefault()
      const i = procurar(key, ativo)
      if (i >= 0) setAtivo(i)
    }
  }

  return (
    <div ref={hostRef} className="landing-sel" data-open={aberto} data-up={aberto && paraCima}>
      <button
        ref={atribuirRef}
        id={id}
        name={name}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={listaId}
        aria-labelledby={rotuloId}
        aria-activedescendant={aberto ? idOpcao(ativo) : undefined}
        aria-invalid={invalido || undefined}
        aria-describedby={descritoPor}
        className={`landing-dd-btn${selecionada ? '' : ' empty'}`}
        onClick={() => (aberto ? fechar() : abrir())}
        onKeyDown={aoTeclar}
        onBlur={() => {
          setAberto(false)
          onBlur?.()
        }}
      >
        {selecionada ? selecionada.rotulo : placeholder}
      </button>
      <ul
        ref={listaRef}
        id={listaId}
        role="listbox"
        aria-labelledby={rotuloId}
        hidden={!aberto}
        className="landing-dd-list"
        style={{ maxHeight: alturaMaxima }}
        // Mantém o foco no botão ao clicar numa opção (senão o blur fecharia a lista antes do clique).
        onMouseDown={(evento) => evento.preventDefault()}
      >
        {opcoes.map((opcao, i) => (
          <li
            key={opcao.valor}
            id={idOpcao(i)}
            role="option"
            aria-selected={opcao.valor === valor}
            data-active={aberto && i === ativo}
            onClick={() => escolher(i)}
            onMouseMove={() => setAtivo(i)}
          >
            {opcao.rotulo}
          </li>
        ))}
      </ul>
    </div>
  )
}
