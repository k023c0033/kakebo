import { describe, expect, it } from 'vitest'
import { currentBalance } from './balance.js'
import { loadBalance, saveBalance } from './storage.js'

describe('currentBalance', () => {
  const expenses = [
    { amount: 1000, createdAt: 50 },
    { amount: 300, createdAt: 150 },
  ]
  const incomes = [
    { amount: 80000, createdAt: 60 },
    { amount: 20000, createdAt: 200 },
  ]

  it('残高を入れたあとの収入を足し、支出を引く', () => {
    expect(currentBalance({ amount: 100000, setAt: 100 }, expenses, incomes)).toBe(100000 + 20000 - 300)
  })

  it('入れる前の記録は、もう残高にふくまれているので数えない', () => {
    expect(currentBalance({ amount: 5000, setAt: 999 }, expenses, incomes)).toBe(5000)
  })

  it('残高を入れていなければ null', () => {
    expect(currentBalance(null, expenses, incomes)).toBe(null)
  })

  it('保存して読み戻せる・壊れていたら null', () => {
    const data = new Map()
    const s = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) }
    saveBalance({ amount: 120000, setAt: 5 }, s)
    expect(loadBalance(s)).toEqual({ amount: 120000, setAt: 5 })
    s.setItem('kakebo.balance.v1', '{"amount":"x"}')
    expect(loadBalance(s)).toBe(null)
  })
})
