// 支出・収入・予算はスマホ（ブラウザ）の中に保存する。サーバーには送らない。
// いまは手軽な localStorage を使う。レシート画像を保存するようになったら
// 容量の大きい IndexedDB に移す予定。

const EXPENSES_KEY = 'kakebo.expenses.v1'
const INCOMES_KEY = 'kakebo.incomes.v1'
const BUDGET_KEY = 'kakebo.budget.v1'
const BALANCE_KEY = 'kakebo.balance.v1'

function loadJson(key, fallback, storage) {
  try {
    const raw = storage?.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function loadList(key, storage) {
  const list = loadJson(key, [], storage)
  return Array.isArray(list) ? list : []
}

export function loadExpenses(storage = globalThis.localStorage) {
  return loadList(EXPENSES_KEY, storage)
}

export function saveExpenses(expenses, storage = globalThis.localStorage) {
  storage?.setItem(EXPENSES_KEY, JSON.stringify(expenses))
}

export function loadIncomes(storage = globalThis.localStorage) {
  return loadList(INCOMES_KEY, storage)
}

export function saveIncomes(incomes, storage = globalThis.localStorage) {
  storage?.setItem(INCOMES_KEY, JSON.stringify(incomes))
}

// 月の予算（円）。毎月同じ金額を使う。未設定なら null。
export function loadBudget(storage = globalThis.localStorage) {
  const value = loadJson(BUDGET_KEY, null, storage)
  return Number.isInteger(value) && value > 0 ? value : null
}

export function saveBudget(budget, storage = globalThis.localStorage) {
  if (budget == null) storage?.removeItem(BUDGET_KEY)
  else storage?.setItem(BUDGET_KEY, JSON.stringify(budget))
}

// 口座残高の起点 { amount, setAt }。未設定なら null。
export function loadBalance(storage = globalThis.localStorage) {
  const value = loadJson(BALANCE_KEY, null, storage)
  return value && Number.isInteger(value.amount) && Number.isFinite(value.setAt) ? value : null
}

export function saveBalance(balance, storage = globalThis.localStorage) {
  if (balance == null) storage?.removeItem(BALANCE_KEY)
  else storage?.setItem(BALANCE_KEY, JSON.stringify(balance))
}

export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
