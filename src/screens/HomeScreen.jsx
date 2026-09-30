import { expensesInMonth, totalOf, totalsByCategory } from '../expenses.js'
import { formatMonth, formatYen, monthKey, todayIso } from '../format.js'
import BudgetCard from './BudgetCard.jsx'

// 今月の収入・支出・予算と、支出のカテゴリ別の円グラフを見せる
export default function HomeScreen({ expenses, incomes, budget, onBudgetChange, onAdd }) {
  const key = monthKey(todayIso())
  const thisMonth = expensesInMonth(expenses, key)
  const total = totalOf(thisMonth)
  const income = totalOf(expensesInMonth(incomes, key))
  const byCategory = totalsByCategory(thisMonth)

  return (
    <section className="screen">
      <h2>{formatMonth(key)}</h2>

      <dl className="summary">
        <div>
          <dt>収入</dt>
          <dd className="income-amount">{formatYen(income)}</dd>
        </div>
        <div>
          <dt>支出</dt>
          <dd>{formatYen(total)}</dd>
        </div>
        <div>
          <dt>収入−支出</dt>
          <dd className={income - total < 0 ? 'minus' : ''}>{formatYen(income - total)}</dd>
        </div>
      </dl>

      <BudgetCard spent={total} budget={budget} onChange={onBudgetChange} />

      <h3 className="section-title">支出の内わけ</h3>

      <div className="donut-wrap">
        <div className="donut" style={{ background: donutBackground(byCategory, total) }} role="img" aria-label="カテゴリ別の支出の円グラフ">
          <div className="donut-hole">
            <span className="donut-caption">合計</span>
            <strong>{formatYen(total)}</strong>
          </div>
        </div>
      </div>

      <ul className="legend">
        {byCategory.map((c) => (
          <li key={c.id}>
            <span className="swatch" style={{ background: c.color }} />
            <span className="legend-label">{c.label}</span>
            <span className="legend-amount">{formatYen(c.total)}</span>
          </li>
        ))}
      </ul>

      {thisMonth.length === 0 && (
        <p className="empty">
          今月の支出はまだありません。
          <button type="button" className="link-button" onClick={onAdd}>支出を入力する</button>
        </p>
      )}
    </section>
  )
}

// CSS の conic-gradient で円グラフを描く（グラフ用の部品を入れずに済む）
function donutBackground(byCategory, total) {
  if (total === 0) return 'var(--track)'
  let start = 0
  const stops = byCategory
    .filter((c) => c.total > 0)
    .map((c) => {
      const end = start + (c.total / total) * 360
      const stop = `${c.color} ${start}deg ${end}deg`
      start = end
      return stop
    })
  return `conic-gradient(${stops.join(', ')})`
}
