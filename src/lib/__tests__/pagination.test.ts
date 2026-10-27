import { describe, expect, it, vi } from 'vitest'
import { apiClient } from '../axios'
import { fetchPaged, readTotalCount } from '../pagination'

describe('readTotalCount', () => {
  it('lê o header x-total-count', () => expect(readTotalCount({ 'x-total-count': '120' }, 3)).toBe(120))

  it('cai para o tamanho da lista sem header ou com valor inválido', () => {
    expect(readTotalCount({}, 3)).toBe(3)
    expect(readTotalCount(undefined, 4)).toBe(4)
    expect(readTotalCount({ 'x-total-count': 'abc' }, 5)).toBe(5)
    expect(readTotalCount({ 'x-total-count': '-1' }, 6)).toBe(6)
  })
})

describe('fetchPaged', () => {
  it('envia pagina/tamanho, descarta filtros vazios e devolve o total do header', async () => {
    const spy = vi.spyOn(apiClient, 'get')
    const result = await fetchPaged('/chamados', { pagina: 0, tamanho: 1, status: '', tipo: undefined })
    expect(spy).toHaveBeenCalledWith('/chamados', { params: { pagina: 0, tamanho: 1 } })
    expect(result.items).toHaveLength(1)
    expect(result.total).toBeGreaterThanOrEqual(1)
  })
})
