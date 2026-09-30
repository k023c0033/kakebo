import { useState } from 'react'
import AddExpenseScreen from './AddExpenseScreen.jsx'
import AddIncomeScreen from './AddIncomeScreen.jsx'

// 入力画面。上の切り替えで「支出」と「収入」を選ぶ。
export default function AddScreen({ draft, onSaveExpense, onSaveIncome }) {
  const [kind, setKind] = useState('expense')

  return (
    <section className="screen">
      <h2>{kind === 'expense' ? '支出を入力' : '収入を入力'}</h2>

      <div className="segmented" role="tablist" aria-label="入力する種類">
        {[
          ['expense', '支出'],
          ['income', '収入'],
        ].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={kind === id} className={kind === id ? 'selected' : ''} onClick={() => setKind(id)}>
            {label}
          </button>
        ))}
      </div>

      {kind === 'expense' ? <AddExpenseScreen draft={draft} onSave={onSaveExpense} /> : <AddIncomeScreen onSave={onSaveIncome} />}
    </section>
  )
}
