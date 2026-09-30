const yen = new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' })

export function formatYen(amount) {
  return yen.format(amount)
}

// 端末の時刻で今日の日付を 'YYYY-MM-DD' にする
export function todayIso(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 'YYYY-MM'（月は1日始まり）
export function monthKey(isoDate) {
  return isoDate.slice(0, 7)
}

export function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number)
  const week = '日月火水木金土'[new Date(y, m - 1, d).getDay()]
  return `${m}月${d}日(${week})`
}

export function formatMonth(key) {
  const [y, m] = key.split('-').map(Number)
  return `${y}年${m}月`
}
