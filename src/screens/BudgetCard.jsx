import { useState } from 'react'
import { budgetLevel, daysLeftInMonth, usageRatio } from '../budget.js'
import { formatYen, parseAmount } from '../format.js'
import { askNotificationPermission, notificationPermission } from '../notify.js'

// ホームのいちばん上。「今月あといくら使えるか」を大きく見せ、予算の金額もここで決める。
export default function BudgetCard({ spent, income, budget, today, onChange }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(budget ? String(budget) : '')
  const [error, setError] = useState('')
  const [permission, setPermission] = useState(notificationPermission)

  function handleSubmit(event) {
    event.preventDefault()
    const value = parseAmount(text)
    if (!Number.isInteger(value) || value <= 0) {
      setError('予算は1円以上の数字で入れてください')
      return
    }
    onChange(value)
    setEditing(false)
  }

  async function handleAllow() {
    setPermission(await askNotificationPermission())
  }

  if (editing || !budget) {
    return (
      <div className="card hero">
        {editing && <h3 className="card-title">今月の予算</h3>}
        {!editing && (
          <>
            <p className="hero-label">今月の収入−支出</p>
            <p className={income - spent < 0 ? 'hero-amount minus' : 'hero-amount'}>{formatYen(income - spent)}</p>
            <p className="hint">1か月に使ってよい金額（予算）を決めると、ここに「あと使えるお金」が出て、80%と100%をこえたときにお知らせします。</p>
            <button type="button" className="primary-button" onClick={() => setEditing(true)}>予算を決める</button>
          </>
        )}
        {editing && (
          <form className="budget-form" onSubmit={handleSubmit} noValidate>
            <label className="field">
              <span>1か月の予算（円）・毎月1日から数えます</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="例: 50000"
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setError('')
                }}
                autoFocus
              />
            </label>
            {error && <p className="error" role="alert">{error}</p>}
            <div className="button-row">
              <button type="button" className="secondary-button" onClick={() => setEditing(false)}>やめる</button>
              <button type="submit" className="primary-button">決める</button>
            </div>
            {budget && (
              <button
                type="button"
                className="link-button"
                onClick={() => {
                  onChange(null)
                  setText('')
                  setEditing(false)
                }}
              >
                予算をなしにする
              </button>
            )}
          </form>
        )}
      </div>
    )
  }

  const ratio = usageRatio(spent, budget)
  const level = budgetLevel(spent, budget)
  const left = budget - spent
  const days = daysLeftInMonth(today)

  return (
    <div className={`card hero budget ${level}`}>
      <div className="card-head">
        <p className="hero-label">{left >= 0 ? '今月あと使えるお金' : '今月の予算をこえた金額'}</p>
        <button type="button" className="link-button" onClick={() => setEditing(true)}>予算を変える</button>
      </div>
      <p className={left >= 0 ? 'hero-amount' : 'hero-amount minus'}>{formatYen(Math.abs(left))}</p>
      <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label="予算を使った割合">
        <div className="meter-fill" style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
        <div className="meter-mark" style={{ left: '80%' }} aria-hidden="true" />
      </div>
      <p className="budget-text">
        予算 {formatYen(budget)} のうち {formatYen(spent)} 使用（{Math.floor(ratio * 100)}%）
      </p>
      {left > 0 && (
        <p className="per-day">
          月末まであと{days}日・1日あたり <strong>{formatYen(Math.floor(left / days))}</strong>
        </p>
      )}
      {permission === 'default' && (
        <button type="button" className="secondary-button" onClick={handleAllow}>スマホの通知をオンにする</button>
      )}
      {permission === 'denied' && <p className="hint">通知がブロックされています。ブラウザの設定で許可すると、スマホにもお知らせが届きます。</p>}
    </div>
  )
}
