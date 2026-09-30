// カテゴリは4つ。3つに入らない支出（服・サブスクなど）は「娯楽」に入れる。
export const CATEGORIES = [
  { id: 'food', label: '食費', color: '#e8833a' },
  { id: 'daily', label: '日用品', color: '#3a9fe8' },
  { id: 'transport', label: '交通費', color: '#4caf7d' },
  { id: 'fun', label: '娯楽', color: '#b36ad8' },
]

export const PAYMENT_METHODS = [
  { id: 'cash', label: '現金' },
  { id: 'credit', label: 'クレジットカード' },
  { id: 'emoney', label: '電子マネー' },
  { id: 'qr', label: 'QR決済' },
]

export function categoryOf(id) {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1]
}

export function paymentLabel(id) {
  return PAYMENT_METHODS.find((p) => p.id === id)?.label ?? ''
}
