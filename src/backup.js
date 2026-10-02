// バックアップ（書き出し・読み込み）。記録はスマホの中にしかないので、
// 機種変更やブラウザのデータ消去に備えてファイルに書き出せるようにする。
// 戻す用は JSON、Excel で見る用は CSV。
import { categoryOf, incomeTypeLabel, paymentLabel } from './constants.js'
import { sortExpenses } from './expenses.js'

const APP = 'kakebo'
const VERSION = 1

export function buildBackup({ expenses, incomes, budget, balance }, now = new Date()) {
  return {
    app: APP,
    version: VERSION,
    exportedAt: now.toISOString(),
    data: { expenses, incomes, budget, balance },
  }
}

export function backupFileName(today, ext) {
  return `kakebo-${today}.${ext}`
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isRecord(x) {
  return (
    x != null &&
    typeof x === 'object' &&
    typeof x.id === 'string' &&
    x.id !== '' &&
    typeof x.date === 'string' &&
    DATE_RE.test(x.date) &&
    Number.isInteger(x.amount) &&
    x.amount > 0 &&
    Number.isFinite(x.createdAt)
  )
}

// ファイルの中身を読んで、使える記録だけを取り出す。
// アプリのファイルでなければ Error（message はそのまま画面に出せる文）を投げる。
export function parseBackup(text) {
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('このファイルは読めませんでした。家計簿から書き出したJSONファイルを選んでください。')
  }
  if (json?.app !== APP || !json.data || typeof json.data !== 'object') {
    throw new Error('家計簿のバックアップファイルではないようです。')
  }
  if (json.version > VERSION) {
    throw new Error('新しい版のアプリで書き出したファイルです。アプリを最新にしてから読み込んでください。')
  }

  const { expenses, incomes, budget, balance } = json.data
  const list = (x) => (Array.isArray(x) ? x : [])
  const goodExpenses = list(expenses).filter(isRecord)
  const goodIncomes = list(incomes).filter(isRecord)
  return {
    expenses: goodExpenses,
    incomes: goodIncomes,
    budget: Number.isInteger(budget) && budget > 0 ? budget : null,
    balance: balance && Number.isInteger(balance.amount) && Number.isFinite(balance.setAt) ? balance : null,
    skipped: list(expenses).length - goodExpenses.length + list(incomes).length - goodIncomes.length,
    exportedAt: typeof json.exportedAt === 'string' ? json.exportedAt : null,
  }
}

// 今の記録にファイルの記録を足す。同じ記録（同じid）は二重にしない。
// 予算と口座残高は、今まだ入れていないときだけファイルの値を使う。
export function mergeBackup(current, backup) {
  const addNew = (list, extra) => {
    const ids = new Set(list.map((x) => x.id))
    return extra.filter((x) => !ids.has(x.id))
  }
  const newExpenses = addNew(current.expenses, backup.expenses)
  const newIncomes = addNew(current.incomes, backup.incomes)
  return {
    expenses: [...current.expenses, ...newExpenses],
    incomes: [...current.incomes, ...newIncomes],
    budget: current.budget ?? backup.budget,
    balance: current.balance ?? backup.balance,
    added: { expenses: newExpenses.length, incomes: newIncomes.length },
  }
}

function csvCell(value) {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// 支出と収入を1つの表にする。先頭の BOM は Excel で文字化けさせないため。
export function toCsv(expenses, incomes) {
  const rows = [
    ...expenses.map((e) => ({ kind: '支出', ...e, what: categoryOf(e.category).label, pay: paymentLabel(e.payment) })),
    ...incomes.map((i) => ({ kind: '収入', ...i, what: incomeTypeLabel(i.type), pay: '' })),
  ]
  const lines = [
    ['日付', '種別', '金額', 'カテゴリ・種類', '支払い方法', '店名', 'メモ'],
    ...sortExpenses(rows).reverse().map((r) => [r.date, r.kind, r.amount, r.what, r.pay, r.store, r.memo]),
  ]
  return '﻿' + lines.map((cells) => cells.map(csvCell).join(',')).join('\r\n') + '\r\n'
}
