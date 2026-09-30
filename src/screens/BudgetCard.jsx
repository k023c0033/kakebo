import { useState } from 'react'
import { budgetLevel, usageRatio } from '../budget.js'
import { formatYen, parseAmount } from '../format.js'
import { askNotificationPermission, notificationPermission } from '../notify.js'

// ホームの「今月の予算」。使った割合をバーで見せ、予算の金額もここで決める。
export default function BudgetCard({ spent, budget, onChange }) {
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
      <div className="card">
        <h3 className="card-title">今月の予算</h3>
        {!editing && (
          <>
            <p className="hint">1か月に使ってよい金額を決めると、80%と100%をこえたときにお知らせします。</p>
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

  return (
    <div className={`card budget ${level}`}>
      <div className="card-head">
        <h3 className="card-title">今月の予算 {formatYen(budget)}</h3>
        <button type="button" className="link-button" onClick={() => setEditing(true)}>変える</button>
      </div>
      <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(ratio * 100)} aria-label="予算を使った割合">
        <div className="meter-fill" style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
        <div className="meter-mark" style={{ left: '80%' }} aria-hidden="true" />
      </div>
      <p className="budget-text">
        {Math.floor(ratio * 100)}% 使用・
        {left >= 0 ? `あと ${formatYen(left)}` : `${formatYen(-left)} オーバー`}
      </p>
      {permission === 'default' && (
        <button type="button" className="secondary-button" onClick={handleAllow}>スマホの通知をオンにする</button>
      )}
      {permission === 'denied' && <p className="hint">通知がブロックされています。ブラウザの設定で許可すると、スマホにもお知らせが届きます。</p>}
    </div>
  )
}
