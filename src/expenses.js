import { CATEGORIES } from './constants.js'
import { monthKey } from './format.js'

// 新しい日付が上、同じ日なら後から入れたものが上
export function sortExpenses(expenses) {
  return [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
}

export function expensesInMonth(expenses, key) {
  return expenses.filter((e) => monthKey(e.date) === key)
}

export function totalOf(expenses) {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
}

export function totalsByCategory(expenses) {
  return CATEGORIES.map((c) => ({
    ...c,
    total: totalOf(expenses.filter((e) => e.category === c.id)),
  }))
}

// 一覧で日付ごとにまとめて出すため
export function groupByDate(expenses) {
  const groups = []
  for (const e of sortExpenses(expenses)) {
    const last = groups[groups.length - 1]
    if (last && last.date === e.date) last.items.push(e)
    else groups.push({ date: e.date, items: [e] })
  }
  return groups
}
