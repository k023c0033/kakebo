// まだクラウド（Firebase）に送っていない変更をためておく箱。
// ログインしていないとき・ログインの確認中・アプリを開いた直後の変更もここに入り、
// ログインできたらまとめて送る。こうしておくと、ほかの端末で消した記録を
// この端末がよみがえらせることがない（送るのは自分が変えたものだけ）。

export const KINDS = ['expenses', 'incomes']

export function emptyQueue() {
  return {
    expenses: { put: {}, del: [] },
    incomes: { put: {}, del: [] },
    // { budget: { value, fillOnly }, balance: ... }
    settings: null,
  }
}

export function isQueueEmpty(queue) {
  return KINDS.every((k) => Object.keys(queue[k].put).length === 0 && queue[k].del.length === 0) && queue.settings == null
}

export function queuePut(queue, kind, record) {
  const part = queue[kind]
  return {
    ...queue,
    [kind]: { put: { ...part.put, [record.id]: record }, del: part.del.filter((id) => id !== record.id) },
  }
}

export function queueDelete(queue, kind, id) {
  const part = queue[kind]
  const { [id]: _removed, ...put } = part.put
  return { ...queue, [kind]: { put, del: part.del.includes(id) ? part.del : [...part.del, id] } }
}

// 予算・口座残高の変更。key は 'budget' か 'balance'。
// fillOnly はクラウドにまだ値がないときだけ使う印（初めてのログイン用）。
export function queueSettings(queue, key, value, { fillOnly = false } = {}) {
  const settings = queue.settings ?? {}
  // 自分で変えた値（fillOnly でない）は、あとから来た fillOnly で上書きしない
  if (fillOnly && settings[key] && !settings[key].fillOnly) return queue
  return { ...queue, settings: { ...settings, [key]: { value, fillOnly } } }
}

// 新しく送る分(later)を古い分(earlier)の後ろにつなぐ。同じ記録なら later が勝つ。
export function mergeQueues(earlier, later) {
  let queue = earlier
  for (const kind of KINDS) {
    for (const record of Object.values(later[kind].put)) queue = queuePut(queue, kind, record)
    for (const id of later[kind].del) queue = queueDelete(queue, kind, id)
  }
  for (const [key, { value, fillOnly }] of Object.entries(later.settings ?? {})) {
    queue = queueSettings(queue, key, value, { fillOnly })
  }
  return queue
}

// 初めてこのアカウントでログインしたとき、この端末の記録をぜんぶ送る分。
// 予算・口座残高はクラウドにまだないときだけ使う（もう片方の端末の値を消さない）。
export function queueFromLocal({ expenses, incomes, budget, balance }) {
  let queue = emptyQueue()
  for (const e of expenses) queue = queuePut(queue, 'expenses', e)
  for (const i of incomes) queue = queuePut(queue, 'incomes', i)
  if (budget != null) queue = queueSettings(queue, 'budget', budget, { fillOnly: true })
  if (balance != null) queue = queueSettings(queue, 'balance', balance, { fillOnly: true })
  return queue
}

// クラウドから届いた一覧に、まだ送っていない変更を重ねて画面に出す一覧を作る
export function overlayList(cloudList, part) {
  const removed = new Set([...part.del, ...Object.keys(part.put)])
  return [...cloudList.filter((x) => !removed.has(x.id)), ...Object.values(part.put)]
}

// クラウドの予算・口座残高に、まだ送っていない変更を重ねる
export function overlaySettings(cloud, pending) {
  const result = { budget: cloud.budget ?? null, balance: cloud.balance ?? null }
  for (const [key, { value, fillOnly }] of Object.entries(pending ?? {})) {
    if (!fillOnly || result[key] == null) result[key] = value
  }
  return result
}

// 一覧の変化から、送る変更を作る（バックアップの読み込みなど、まとめて変わるとき用）
export function queueListChange(queue, kind, before, after) {
  const beforeById = new Map(before.map((x) => [x.id, x]))
  const afterIds = new Set(after.map((x) => x.id))
  let next = queue
  for (const x of after) if (beforeById.get(x.id) !== x) next = queuePut(next, kind, x)
  for (const x of before) if (!afterIds.has(x.id)) next = queueDelete(next, kind, x.id)
  return next
}
