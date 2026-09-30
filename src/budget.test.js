import { describe, expect, it } from 'vitest'
import { budgetAlert, budgetLevel, crossedLevel } from './budget.js'
import { loadBudget, loadIncomes, saveBudget, saveIncomes } from './storage.js'
import { parseAmount } from './format.js'

describe('budget', () => {
  it('80%未満・80%以上・100%をこえた、の3段階', () => {
    expect(budgetLevel(39999, 50000)).toBe('ok')
    expect(budgetLevel(40000, 50000)).toBe('warn')
    expect(budgetLevel(50000, 50000)).toBe('warn')
    expect(budgetLevel(50001, 50000)).toBe('over')
    expect(budgetLevel(99999, null)).toBe('ok')
  })

  it('段階が上がったときだけ知らせる', () => {
    expect(crossedLevel(30000, 41000, 50000)).toBe('warn')
    expect(crossedLevel(41000, 42000, 50000)).toBe(null)
    expect(crossedLevel(45000, 51000, 50000)).toBe('over')
    expect(crossedLevel(30000, 60000, 50000)).toBe('over')
    expect(crossedLevel(51000, 52000, 50000)).toBe(null)
    expect(crossedLevel(0, 99999, null)).toBe(null)
  })

  it('お知らせの文面', () => {
    expect(budgetAlert('warn', 41000, 50000, '2026年9月').title).toBe('2026年9月の予算の80%をこえました')
    expect(budgetAlert('over', 51000, 50000, '2026年9月').body).toContain('102%')
  })
})

describe('収入と予算の保存', () => {
  function memoryStorage() {
    const data = new Map()
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: (k) => data.delete(k) }
  }

  it('収入を保存して読み戻せる', () => {
    const s = memoryStorage()
    const incomes = [{ id: 'x', date: '2026-09-25', amount: 80000, type: 'salary', memo: '', createdAt: 1 }]
    saveIncomes(incomes, s)
    expect(loadIncomes(s)).toEqual(incomes)
  })

  it('予算を保存・なしにできる', () => {
    const s = memoryStorage()
    expect(loadBudget(s)).toBe(null)
    saveBudget(50000, s)
    expect(loadBudget(s)).toBe(50000)
    saveBudget(null, s)
    expect(loadBudget(s)).toBe(null)
  })
})

describe('parseAmount', () => {
  it('全角やカンマ・円つきでも読める', () => {
    expect(parseAmount('１，２００円')).toBe(1200)
    expect(parseAmount('¥50,000')).toBe(50000)
    expect(Number.isNaN(parseAmount('abc'))).toBe(true)
  })
})
