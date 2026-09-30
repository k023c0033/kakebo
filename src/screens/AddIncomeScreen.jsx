import { useState } from 'react'
import { INCOME_TYPES } from '../constants.js'
import { parseAmount, todayIso } from '../format.js'

// 収入（給料・仕送り）の手入力
export default function AddIncomeScreen({ onSave }) {
  const [date, setDate] = useState(todayIso())
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('salary')
  const [memo, setMemo] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const value = parseAmount(amount)
    if (!Number.isInteger(value) || value <= 0) {
      setError('金額は1円以上の数字で入れてください')
      return
    }
    if (!date) {
      setError('日付を入れてください')
      return
    }
    onSave({ date, amount: value, type, memo: memo.trim() })
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate>
      <label className="field">
        <span>金額（円）</span>
        <input
          type="text"
          inputMode="numeric"
          placeholder="例: 80000"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value)
            setError('')
          }}
        />
      </label>

      <label className="field">
        <span>日付</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>

      <fieldset className="field">
        <legend>種類</legend>
        <div className="chips">
          {INCOME_TYPES.map((t) => (
            <label key={t.id} className={type === t.id ? 'chip selected' : 'chip'} style={{ '--chip-color': 'var(--income)' }}>
              <input type="radio" name="income-type" value={t.id} checked={type === t.id} onChange={() => setType(t.id)} />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="field">
        <span>メモ（なくてもOK）</span>
        <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="例: バイト代 9月分" />
      </label>

      {error && <p className="error" role="alert">{error}</p>}

      <button type="submit" className="primary-button">保存する</button>
    </form>
  )
}
