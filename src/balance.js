// 口座の残高の目安。銀行とはつながず、ユーザーが一度手で入れた残高を起点にして、
// そのあとに記録した収入を足し、支出を引いて出す。ずれたら残高を入れ直せばよい。

// anchor: { amount: 入れた残高, setAt: 入れた時刻（ミリ秒） }
export function currentBalance(anchor, expenses, incomes) {
  if (!anchor) return null
  const after = (list) => list.filter((x) => x.createdAt > anchor.setAt).reduce((sum, x) => sum + x.amount, 0)
  return anchor.amount + after(incomes) - after(expenses)
}
