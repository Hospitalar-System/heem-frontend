import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from '../Checkbox'

describe('Checkbox', () => {
  it('expõe um checkbox nativo com o rótulo como nome acessível e alterna por clique', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Atrasadas" onCheckedChange={onCheckedChange} />)
    const box = screen.getByRole('checkbox', { name: 'Atrasadas' })
    expect(box).not.toBeChecked()
    await user.click(screen.getByText('Atrasadas'))
    expect(box).toBeChecked()
    expect(onCheckedChange).toHaveBeenLastCalledWith(true)
    await user.click(box)
    expect(box).not.toBeChecked()
    expect(onCheckedChange).toHaveBeenLastCalledWith(false)
  })

  it('funciona controlado e responde ao teclado (Espaço)', async () => {
    const user = userEvent.setup()
    function Harness() {
      const [on, setOn] = useState(true)
      return <Checkbox label="Ativa" checked={on} onCheckedChange={setOn} />
    }
    render(<Harness />)
    const box = screen.getByRole('checkbox', { name: 'Ativa' })
    expect(box).toBeChecked()
    await user.tab()
    expect(box).toHaveFocus()
    await user.keyboard(' ')
    expect(box).not.toBeChecked()
    await user.keyboard(' ')
    expect(box).toBeChecked()
  })

  it('indica o estado misto com aria-checked="mixed" e volta ao normal ao interagir', async () => {
    const user = userEvent.setup()
    render(<Checkbox label="Todos" indeterminate onCheckedChange={() => undefined} />)
    const box = screen.getByRole('checkbox', { name: 'Todos' }) as HTMLInputElement
    expect(box).toHaveAttribute('aria-checked', 'mixed')
    expect(box.indeterminate).toBe(true)
    await user.click(box)
    expect(box.indeterminate).toBe(false)
  })

  it('desabilitado não altera nem dispara callbacks', async () => {
    const user = userEvent.setup()
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Bloqueada" disabled onCheckedChange={onCheckedChange} />)
    const box = screen.getByRole('checkbox', { name: 'Bloqueada' })
    expect(box).toBeDisabled()
    await user.click(box)
    expect(box).not.toBeChecked()
    expect(onCheckedChange).not.toHaveBeenCalled()
  })

  it('marca erro com aria-invalid e associa a descrição', () => {
    render(<Checkbox label="Aceito" description="Obrigatório para continuar" invalid />)
    const box = screen.getByRole('checkbox', { name: 'Aceito' })
    expect(box).toHaveAttribute('aria-invalid', 'true')
    expect(box).toHaveAccessibleDescription('Obrigatório para continuar')
  })

  it('aceita aria-label quando não há rótulo visível', () => {
    render(<Checkbox aria-label="Selecionar linha" />)
    expect(screen.getByRole('checkbox', { name: 'Selecionar linha' })).toBeInTheDocument()
  })

  it('é compatível com o register do React Hook Form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    function Form() {
      const { register, handleSubmit } = useForm<{ lembrar: boolean }>({ defaultValues: { lembrar: false } })
      return <form onSubmit={handleSubmit(onSubmit)}>
        <Checkbox label="Lembrar de mim" {...register('lembrar')} />
        <button type="submit">Enviar</button>
      </form>
    }
    render(<Form />)
    await user.click(screen.getByRole('checkbox', { name: 'Lembrar de mim' }))
    await user.click(screen.getByRole('button', { name: 'Enviar' }))
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toEqual({ lembrar: true })
  })
})
