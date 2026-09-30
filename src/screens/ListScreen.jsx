import { categoryOf, paymentLabel } from '../constants.js'
import { groupByDate, totalOf } from '../expenses.js'
import { formatDate, formatYen } from '../format.js'

export default function ListScreen({ expenses, onDelete }) {
  if (expenses.length === 0) {
    return (
      <section className="screen">
        <h2>支出の一覧</h2>
        <p className="empty">まだ何も入力されていません。</p>
      </section>
    )
  }

  function handleDelete(expense) {
    if (window.confirm(`${formatYen(expense.amount)} の支出を消しますか？`)) onDelete(expense.id)
  }

  return (
    <section className="screen">
      <h2>支出の一覧</h2>
      {groupByDate(expenses).map((group) => (
        <div key={group.date} className="day-group">
          <div className="day-header">
            <span>{formatDate(group.date)}</span>
            <span>{formatYen(totalOf(group.items))}</span>
          </div>
          <ul className="expense-list">
            {group.items.map((e) => {
              const category = categoryOf(e.category)
              return (
                <li key={e.id} className="expense-row">
                  <span className="swatch" style={{ background: category.color }} />
                  <div className="expense-main">
                    <span className="expense-title">{e.store || category.label}</span>
                    <span className="expense-sub">
                      {category.label}・{paymentLabel(e.payment)}
                      {e.memo && `・${e.memo}`}
                    </span>
                  </div>
                  <span className="expense-amount">{formatYen(e.amount)}</span>
                  <button type="button" className="delete-button" aria-label="消す" onClick={() => handleDelete(e)}>×</button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </section>
  )
}
