import { describe, expect, it } from 'vitest'
import { expensesInMonth, groupByDate, totalOf, totalsByCategory } from './expenses.js'
import { loadExpenses, saveExpenses } from './storage.js'

const sample = [
  { id: 'a', date: '2026-09-30', amount: 500, category: 'food', createdAt: 1 },
  { id: 'b', date: '2026-09-30', amount: 300, category: 'fun', createdAt: 2 },
  { id: 'c', date: '2026-09-01', amount: 200, category: 'food', createdAt: 3 },
  { id: 'd', date: '2026-08-31', amount: 999, category: 'daily', createdAt: 4 },
]

describe('expenses', () => {
  it('月で絞り込んで合計する（月は1日始まり）', () => {
    const sept = expensesInMonth(sample, '2026-09')
    expect(sept.map((e) => e.id)).toEqual(['a', 'b', 'c'])
    expect(totalOf(sept)).toBe(1000)
  })

  it('カテゴリごとに合計する', () => {
    const totals = totalsByCategory(expensesInMonth(sample, '2026-09'))
    expect(totals.map((t) => [t.id, t.total])).toEqual([
      ['food', 700],
      ['daily', 0],
      ['transport', 0],
      ['fun', 300],
    ])
  })

  it('日付ごとにまとめ、新しい順に並べる', () => {
    const groups = groupByDate(sample)
    expect(groups.map((g) => g.date)).toEqual(['2026-09-30', '2026-09-01', '2026-08-31'])
    expect(groups[0].items.map((e) => e.id)).toEqual(['b', 'a'])
  })
})

describe('storage', () => {
  function memoryStorage() {
    const data = new Map()
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }
  }

  it('保存したものを読み戻せる', () => {
    const s = memoryStorage()
    saveExpenses(sample, s)
    expect(loadExpenses(s)).toEqual(sample)
  })

  it('壊れたデータなら空にする', () => {
    const s = memoryStorage()
    s.setItem('kakebo.expenses.v1', '{oops')
    expect(loadExpenses(s)).toEqual([])
  })
})
