import { expensesInMonth, totalOf, totalsByCategory } from '../expenses.js'
import { formatMonth, formatYen, monthKey, todayIso } from '../format.js'
import BudgetCard from './BudgetCard.jsx'

// ホーム。いちばん上で「今月あといくら使えるか」をひと目で見せ、
// その下に収入・支出、支出の内わけを小さくまとめる。
export default function HomeScreen({ expenses, incomes, budget, onBudgetChange, onAdd }) {
  const today = todayIso()
  const key = monthKey(today)
  const thisMonth = expensesInMonth(expenses, key)
  const total = totalOf(thisMonth)
  const income = totalOf(expensesInMonth(incomes, key))
  const byCategory = totalsByCategory(thisMonth)

  return (
    <section className="screen home">
      <h2>{formatMonth(key)}</h2>

      <div className="home-grid">
        <div className="home-main">
          <BudgetCard spent={total} income={income} budget={budget} today={today} onChange={onBudgetChange} />

          <dl className="summary">
            <div>
              <dt>収入</dt>
              <dd className="income-amount">{formatYen(income)}</dd>
            </div>
            <div>
              <dt>支出</dt>
              <dd>{formatYen(total)}</dd>
            </div>
            {/* 予算がないときは上の大きい数字が「収入−支出」なので、ここには出さない */}
            {budget && (
              <div>
                <dt>収入−支出</dt>
                <dd className={income - total < 0 ? 'minus' : ''}>{formatYen(income - total)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card home-side">
          <h3 className="card-title">支出の内わけ</h3>
          {thisMonth.length === 0 ? (
            <p className="empty">
              今月の支出はまだありません。
              <button type="button" className="link-button" onClick={onAdd}>支出を入力する</button>
            </p>
          ) : (
            <div className="breakdown">
              <div className="donut" style={{ background: donutBackground(byCategory, total) }} role="img" aria-label="カテゴリ別の支出の円グラフ">
                <div className="donut-hole" />
              </div>
              <ul className="legend">
                {byCategory.map((c) => (
                  <li key={c.id} className={c.total === 0 ? 'zero' : ''}>
                    <span className="swatch" style={{ background: c.color }} />
                    <span className="legend-label">{c.label}</span>
                    <span className="legend-percent">{Math.round((c.total / total) * 100)}%</span>
                    <span className="legend-amount">{formatYen(c.total)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
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
