import { useState } from 'react'
import { CATEGORIES, PAYMENT_METHODS } from '../constants.js'
import { parseAmount, todayIso } from '../format.js'

// 支出の手入力。レシートから読んだ内容（draft）があれば最初から入れておく。
export default function AddExpenseScreen({ draft, onSave }) {
  const [date, setDate] = useState(draft?.date ?? todayIso())
  const [amount, setAmount] = useState(draft?.total != null ? String(draft.total) : '')
  const [category, setCategory] = useState('food')
  const [payment, setPayment] = useState('cash')
  const [store, setStore] = useState(draft?.store ?? '')
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
    onSave({
      date,
      amount: value,
      category,
      payment,
      store: store.trim(),
      memo: memo.trim(),
      source: draft ? 'receipt' : 'manual',
    })
  }

  return (
    <>
      {draft && <p className="notice">レシートから読んだ内容を入れました。まちがいがないか確かめてください。</p>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span>金額（円）</span>
          <input
            type="text"
            inputMode="numeric"
            placeholder="例: 1200"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value)
              setError('')
            }}
            autoFocus={!draft}
          />
        </label>

        <label className="field">
          <span>日付</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>

        <fieldset className="field">
          <legend>カテゴリ</legend>
          <div className="chips">
            {CATEGORIES.map((c) => (
              <label key={c.id} className={category === c.id ? 'chip selected' : 'chip'} style={{ '--chip-color': c.color }}>
                <input type="radio" name="category" value={c.id} checked={category === c.id} onChange={() => setCategory(c.id)} />
                {c.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>支払い方法</legend>
          <div className="chips">
            {PAYMENT_METHODS.map((p) => (
              <label key={p.id} className={payment === p.id ? 'chip selected' : 'chip'}>
                <input type="radio" name="payment" value={p.id} checked={payment === p.id} onChange={() => setPayment(p.id)} />
                {p.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="field">
          <span>お店（なくてもOK）</span>
          <input type="text" value={store} onChange={(e) => setStore(e.target.value)} placeholder="例: スーパー○○" />
        </label>

        <label className="field">
          <span>メモ（なくてもOK）</span>
          <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} />
        </label>

        {error && <p className="error" role="alert">{error}</p>}

        <button type="submit" className="primary-button">保存する</button>
      </form>
    </>
  )
}
