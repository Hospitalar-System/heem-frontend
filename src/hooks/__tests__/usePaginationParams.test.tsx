import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { usePageClamp, usePaginationParams } from '../usePaginationParams'

function wrapperFor(initial: string) {
  return ({ children }: PropsWithChildren) => <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
}

function setup(initial: string) {
  return renderHook(() => ({ pagination: usePaginationParams(), location: useLocation() }), { wrapper: wrapperFor(initial) })
}

describe('usePaginationParams', () => {
  it('usa página 1 e 25 itens por padrão e converte para o índice 0-based do backend', () => {
    const { result } = setup('/x')
    expect(result.current.pagination.page).toBe(1)
    expect(result.current.pagination.size).toBe(25)
    expect(result.current.pagination.apiParams).toEqual({ pagina: 0, tamanho: 25 })
  })

  it('lê pagina (1-based) e tamanho da URL', () => {
    const { result } = setup('/x?pagina=3&tamanho=50')
    expect(result.current.pagination.apiParams).toEqual({ pagina: 2, tamanho: 50 })
  })

  it.each(['?pagina=abc&tamanho=7', '?pagina=0&tamanho=1000', '?pagina=-2&tamanho=', '?pagina=1.5'])('cai no padrão com valor inválido (%s)', (query) => {
    const { result } = setup(`/x${query}`)
    expect(result.current.pagination.apiParams).toEqual({ pagina: 0, tamanho: 25 })
  })

  it('escreve a página preservando os demais filtros e omite a página 1', () => {
    const { result } = setup('/x?status=ABERTO')
    act(() => result.current.pagination.setPage(3))
    expect(result.current.location.search).toBe('?status=ABERTO&pagina=3')
    act(() => result.current.pagination.setPage(1))
    expect(result.current.location.search).toBe('?status=ABERTO')
  })

  it('trocar o tamanho volta para a página 1 e mantém filtros', () => {
    const { result } = setup('/x?status=ABERTO&pagina=4')
    act(() => result.current.pagination.setSize(10))
    const params = new URLSearchParams(result.current.location.search)
    expect(params.get('pagina')).toBeNull()
    expect(params.get('tamanho')).toBe('10')
    expect(params.get('status')).toBe('ABERTO')
  })

  it('setFilters altera filtros, remove vazios e volta para a página 1 preservando o tamanho', () => {
    const { result } = setup('/x?pagina=5&tamanho=50&tipo=PREVENTIVA')
    act(() => result.current.pagination.setFilters({ status: 'ABERTO', tipo: '' }))
    const params = new URLSearchParams(result.current.location.search)
    expect(params.get('status')).toBe('ABERTO')
    expect(params.has('tipo')).toBe(false)
    expect(params.has('pagina')).toBe(false)
    expect(params.get('tamanho')).toBe('50')
  })

  it('resetPage mantém os filtros', () => {
    const { result } = setup('/x?pagina=2&status=ABERTO')
    act(() => result.current.pagination.resetPage())
    expect(result.current.location.search).toBe('?status=ABERTO')
  })

  it('usePageClamp volta para a última página válida quando a atual passou do fim', async () => {
    const { result } = renderHook(() => {
      const pagination = usePaginationParams()
      usePageClamp(pagination, 60)
      return { pagination, location: useLocation() }
    }, { wrapper: wrapperFor('/x?pagina=9&status=A') })
    await waitFor(() => expect(result.current.pagination.page).toBe(3))
    expect(new URLSearchParams(result.current.location.search).get('status')).toBe('A')
  })

  it('usePageClamp não age enquanto os dados são antigos (ready=false)', () => {
    const { result } = renderHook(() => {
      const pagination = usePaginationParams()
      usePageClamp(pagination, 10, false)
      return pagination
    }, { wrapper: wrapperFor('/x?pagina=9') })
    expect(result.current.page).toBe(9)
  })
})
