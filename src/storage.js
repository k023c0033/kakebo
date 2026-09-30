// 支出データはスマホ（ブラウザ）の中に保存する。サーバーには送らない。
// いまは手軽な localStorage を使う。レシート画像を保存するようになったら
// 容量の大きい IndexedDB に移す予定。

const KEY = 'kakebo.expenses.v1'

export function loadExpenses(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveExpenses(expenses, storage = globalThis.localStorage) {
  storage?.setItem(KEY, JSON.stringify(expenses))
}

export function newId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`
}
