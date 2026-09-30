// 予算に対して「80%をこえた」「100%をこえた」を知らせるための計算。

export const WARN_RATIO = 0.8

// 使った割合（予算なしなら null）
export function usageRatio(spent, budget) {
  return budget ? spent / budget : null
}

// 'ok'（80%未満）| 'warn'（80%以上）| 'over'（100%をこえた）
export function budgetLevel(spent, budget) {
  if (!budget) return 'ok'
  if (spent > budget) return 'over'
  if (spent >= budget * WARN_RATIO) return 'warn'
  return 'ok'
}

// 支出を1件足したことで、段階が上がったときだけその段階を返す（知らせるのは1回だけにしたいので）
export function crossedLevel(before, after, budget) {
  const order = ['ok', 'warn', 'over']
  const from = budgetLevel(before, budget)
  const to = budgetLevel(after, budget)
  return order.indexOf(to) > order.indexOf(from) ? to : null
}

// 段階が上がったときに出すお知らせの文面
export function budgetAlert(level, spent, budget, monthLabel) {
  const percent = Math.floor((spent / budget) * 100)
  if (level === 'over') {
    return { title: `${monthLabel}の予算をこえました`, body: `予算の${percent}%を使っています。ここからは節約モードでいきましょう。` }
  }
  return { title: `${monthLabel}の予算の80%をこえました`, body: `予算の${percent}%を使っています。残りの日数を考えて使いましょう。` }
}
