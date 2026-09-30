import { categoryOf, incomeTypeLabel, paymentLabel } from '../constants.js'
import { groupByDate, totalOf } from '../expenses.js'
import { formatDate, formatYen } from '../format.js'

// 支出と収入をまとめて日付ごとに並べる。収入は緑の「＋」で見分ける。
export default function ListScreen({ expenses, incomes, onDeleteExpense, onDeleteIncome }) {
  const entries = [...expenses.map((e) => ({ ...e, kind: 'expense' })), ...incomes.map((i) => ({ ...i, kind: 'income' }))]

  if (entries.length === 0) {
    return (
      <section className="screen">
        <h2>一覧</h2>
        <p className="empty">まだ何も入力されていません。</p>
      </section>
    )
  }

  function handleDelete(entry) {
    const word = entry.kind === 'income' ? '収入' : '支出'
    if (!window.confirm(`${formatYen(entry.amount)} の${word}を消しますか？`)) return
    if (entry.kind === 'income') onDeleteIncome(entry.id)
    else onDeleteExpense(entry.id)
  }

  return (
    <section className="screen">
      <h2>一覧</h2>
      {groupByDate(entries).map((group) => {
        const spent = totalOf(group.items.filter((e) => e.kind === 'expense'))
        const earned = totalOf(group.items.filter((e) => e.kind === 'income'))
        return (
          <div key={group.date} className="day-group">
            <div className="day-header">
              <span>{formatDate(group.date)}</span>
              <span>
                {earned > 0 && <span className="income-amount">+{formatYen(earned)} </span>}
                {spent > 0 && formatYen(spent)}
              </span>
            </div>
            <ul className="expense-list">
              {group.items.map((e) => (e.kind === 'income' ? <IncomeRow key={e.id} income={e} onDelete={handleDelete} /> : <ExpenseRow key={e.id} expense={e} onDelete={handleDelete} />))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}

function ExpenseRow({ expense: e, onDelete }) {
  const category = categoryOf(e.category)
  return (
    <li className="expense-row">
      <span className="swatch" style={{ background: category.color }} />
      <div className="expense-main">
        <span className="expense-title">{e.store || category.label}</span>
        <span className="expense-sub">
          {category.label}・{paymentLabel(e.payment)}
          {e.memo && `・${e.memo}`}
        </span>
      </div>
      <span className="expense-amount">{formatYen(e.amount)}</span>
      <button type="button" className="delete-button" aria-label="消す" onClick={() => onDelete(e)}>×</button>
    </li>
  )
}

function IncomeRow({ income: i, onDelete }) {
  return (
    <li className="expense-row">
      <span className="swatch" style={{ background: 'var(--income)' }} />
      <div className="expense-main">
        <span className="expense-title">{incomeTypeLabel(i.type)}</span>
        <span className="expense-sub">収入{i.memo && `・${i.memo}`}</span>
      </div>
      <span className="expense-amount income-amount">+{formatYen(i.amount)}</span>
      <button type="button" className="delete-button" aria-label="消す" onClick={() => onDelete(i)}>×</button>
    </li>
  )
}
