import { describe, expect, it } from 'vitest'
import { backupFileName, buildBackup, mergeBackup, parseBackup, toCsv } from './backup.js'
import { loadLastBackup, saveLastBackup } from './storage.js'

const expense = { id: 'e1', date: '2026-09-30', amount: 1200, category: 'food', payment: 'cash', store: 'スーパー', memo: '', source: 'manual', createdAt: 10 }
const income = { id: 'i1', date: '2026-09-25', amount: 80000, type: 'salary', memo: 'バイト代', createdAt: 5 }

describe('バックアップの書き出し・読み込み', () => {
  it('書き出したものをそのまま読み戻せる', () => {
    const backup = buildBackup({ expenses: [expense], incomes: [income], budget: 50000, balance: { amount: 100000, setAt: 1 } }, new Date('2026-10-01T00:00:00Z'))
    const back = parseBackup(JSON.stringify(backup))
    expect(back.expenses).toEqual([expense])
    expect(back.incomes).toEqual([income])
    expect(back.budget).toBe(50000)
    expect(back.balance).toEqual({ amount: 100000, setAt: 1 })
    expect(back.skipped).toBe(0)
    expect(back.exportedAt).toBe('2026-10-01T00:00:00.000Z')
  })

  it('ファイル名に日付が入る', () => {
    expect(backupFileName('2026-10-01', 'json')).toBe('kakebo-2026-10-01.json')
  })

  it('JSONでないファイル・ほかのアプリのファイルは断る', () => {
    expect(() => parseBackup('abc')).toThrow('読めませんでした')
    expect(() => parseBackup('{"hello":1}')).toThrow('バックアップファイルではない')
    expect(() => parseBackup('{"app":"kakebo","version":99,"data":{}}')).toThrow('新しい版')
  })

  it('壊れた記録は飛ばして数える', () => {
    const text = JSON.stringify({
      app: 'kakebo',
      version: 1,
      data: { expenses: [expense, { id: 'x', date: '9/30', amount: 1, createdAt: 1 }, null], incomes: [{ ...income, amount: -5 }], budget: 'x', balance: { amount: 1 } },
    })
    const back = parseBackup(text)
    expect(back.expenses).toEqual([expense])
    expect(back.incomes).toEqual([])
    expect(back.skipped).toBe(3)
    expect(back.budget).toBe(null)
    expect(back.balance).toBe(null)
  })

  it('読み込みは今の記録に足す。同じ記録は二重にしない', () => {
    const other = { ...expense, id: 'e2', amount: 300 }
    const current = { expenses: [expense], incomes: [], budget: 40000, balance: null }
    const backup = { expenses: [expense, other], incomes: [income], budget: 50000, balance: { amount: 9, setAt: 1 } }
    const merged = mergeBackup(current, backup)
    expect(merged.expenses).toEqual([expense, other])
    expect(merged.incomes).toEqual([income])
    expect(merged.budget).toBe(40000)
    expect(merged.balance).toEqual({ amount: 9, setAt: 1 })
    expect(merged.added).toEqual({ expenses: 1, incomes: 1 })
  })

  it('CSVは日付の古い順で、カンマや引用符を含む文字も崩れない', () => {
    const csv = toCsv([{ ...expense, memo: 'お茶, "大"' }], [income])
    expect(csv.startsWith('﻿日付,種別,金額')).toBe(true)
    const lines = csv.slice(1).trim().split('\r\n')
    expect(lines[1]).toBe('2026-09-25,収入,80000,給料,,,バイト代')
    expect(lines[2]).toBe('2026-09-30,支出,1200,食費,現金,スーパー,"お茶, ""大"""')
  })

  it('前回の書き出し日を保存して読み戻せる', () => {
    const data = new Map()
    const s = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) }
    expect(loadLastBackup(s)).toBe(null)
    saveLastBackup('2026-10-01', s)
    expect(loadLastBackup(s)).toBe('2026-10-01')
  })
})
