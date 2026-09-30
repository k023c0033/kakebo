import { useState } from 'react'
import { parseAmount } from '../format.js'

// 口座残高を入れる・直す。通帳やアプリで見た今の残高を入れると、
// そこから先は記録した収入・支出で自動で増えたり減ったりする。
export default function BalanceForm({ current, onSave, onCancel }) {
  const [text, setText] = useState(current == null ? '' : String(current))
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const value = parseAmount(text)
    if (text.trim() === '' || !Number.isInteger(value)) {
      setError('残高は数字で入れてください')
      return
    }
    onSave(value)
  }

  return (
    <form className="card budget-form" onSubmit={handleSubmit} noValidate>
      <h3 className="card-title">口座残高</h3>
      <p className="hint">通帳や銀行アプリで見た、いまの残高を入れてください。このあと記録した収入・支出で自動で増減します。ずれてきたら、ここで入れ直せます。</p>
      <label className="field">
        <span>いまの残高（円）</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="例: 120000"
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
        <button type="button" className="secondary-button" onClick={onCancel}>やめる</button>
        <button type="submit" className="primary-button">決める</button>
      </div>
    </form>
  )
}
