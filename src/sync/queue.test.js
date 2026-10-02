import { describe, expect, it } from 'vitest'
import {
  emptyQueue,
  isQueueEmpty,
  mergeQueues,
  overlayList,
  overlaySettings,
  queueDelete,
  queueFromLocal,
  queueListChange,
  queuePut,
  queueSettings,
} from './queue.js'

const a = { id: 'a', date: '2026-10-01', amount: 100, createdAt: 1 }
const b = { id: 'b', date: '2026-10-01', amount: 200, createdAt: 2 }

describe('送る変更の箱', () => {
  it('はじめは空', () => {
    expect(isQueueEmpty(emptyQueue())).toBe(true)
  })

  it('追加してから消すと、消すだけが残る', () => {
    const q = queueDelete(queuePut(emptyQueue(), 'expenses', a), 'expenses', 'a')
    expect(q.expenses.put).toEqual({})
    expect(q.expenses.del).toEqual(['a'])
    expect(isQueueEmpty(q)).toBe(false)
  })

  it('消してからまた入れると、入れるだけが残る', () => {
    const q = queuePut(queueDelete(emptyQueue(), 'incomes', 'a'), 'incomes', a)
    expect(q.incomes.del).toEqual([])
    expect(q.incomes.put).toEqual({ a })
  })

  it('初めてのログインでは端末の記録をぜんぶ送り、予算はクラウドにないときだけ使う', () => {
    const q = queueFromLocal({ expenses: [a], incomes: [b], budget: 50000, balance: null })
    expect(Object.keys(q.expenses.put)).toEqual(['a'])
    expect(Object.keys(q.incomes.put)).toEqual(['b'])
    expect(q.settings).toEqual({ budget: { value: 50000, fillOnly: true } })
  })

  it('自分で変えた予算は、あとから来た「なければ使う」に負けない', () => {
    let q = queueSettings(emptyQueue(), 'budget', 30000)
    q = mergeQueues(q, queueFromLocal({ expenses: [], incomes: [], budget: 50000, balance: null }))
    expect(q.settings.budget).toEqual({ value: 30000, fillOnly: false })
  })

  it('つなぐと、あとの変更が勝つ', () => {
    const earlier = queuePut(emptyQueue(), 'expenses', a)
    const later = queueDelete(emptyQueue(), 'expenses', 'a')
    const q = mergeQueues(earlier, later)
    expect(q.expenses.put).toEqual({})
    expect(q.expenses.del).toEqual(['a'])
  })
})

describe('クラウドの値に、まだ送っていない変更を重ねる', () => {
  it('一覧', () => {
    const b2 = { ...b, amount: 999 }
    let q = queuePut(emptyQueue(), 'expenses', b2)
    q = queueDelete(q, 'expenses', 'a')
    expect(overlayList([a, b], q.expenses)).toEqual([b2])
  })

  it('予算と口座残高', () => {
    const balance = { amount: 1000, setAt: 1 }
    expect(overlaySettings({ budget: 40000 }, null)).toEqual({ budget: 40000, balance: null })
    expect(overlaySettings({ budget: 40000 }, { budget: { value: 50000, fillOnly: true }, balance: { value: balance, fillOnly: true } })).toEqual({
      budget: 40000,
      balance,
    })
    expect(overlaySettings({ budget: 40000 }, { budget: { value: null, fillOnly: false } })).toEqual({ budget: null, balance: null })
  })
})

describe('一覧の変化から送る変更を作る', () => {
  it('増えた・変わった・消えたものだけ', () => {
    const a2 = { ...a, amount: 5 }
    const c = { ...a, id: 'c' }
    const q = queueListChange(emptyQueue(), 'expenses', [a, b], [a2, c])
    expect(Object.keys(q.expenses.put).sort()).toEqual(['a', 'c'])
    expect(q.expenses.del).toEqual(['b'])
  })
})
