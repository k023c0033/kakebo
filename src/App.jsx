import { useEffect, useState } from 'react'
import { loadExpenses, newId, saveExpenses } from './storage.js'
import HomeScreen from './screens/HomeScreen.jsx'
import AddExpenseScreen from './screens/AddExpenseScreen.jsx'
import ListScreen from './screens/ListScreen.jsx'
import ReceiptScreen from './screens/ReceiptScreen.jsx'

const TABS = [
  { id: 'home', label: 'ホーム', icon: '◔' },
  { id: 'add', label: '入力', icon: '＋' },
  { id: 'list', label: '一覧', icon: '☰' },
  { id: 'receipt', label: 'レシート', icon: '▣' },
]

export default function App() {
  const [tab, setTab] = useState('home')
  const [expenses, setExpenses] = useState(loadExpenses)
  // レシートから読んだ内容を入力画面に渡すための下書き
  const [draft, setDraft] = useState(null)

  useEffect(() => {
    saveExpenses(expenses)
  }, [expenses])

  function addExpense(expense) {
    setExpenses((list) => [...list, { ...expense, id: newId(), createdAt: Date.now() }])
    setDraft(null)
    setTab('list')
  }

  function deleteExpense(id) {
    setExpenses((list) => list.filter((e) => e.id !== id))
  }

  function handleReceiptResult(result) {
    setDraft(result)
    setTab('add')
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>家計簿</h1>
      </header>

      <main className="app-main">
        {tab === 'home' && <HomeScreen expenses={expenses} onAdd={() => setTab('add')} />}
        {tab === 'add' && <AddExpenseScreen key={draft ? 'draft' : 'blank'} draft={draft} onSave={addExpense} />}
        {tab === 'list' && <ListScreen expenses={expenses} onDelete={deleteExpense} />}
        {tab === 'receipt' && <ReceiptScreen onUse={handleReceiptResult} />}
      </main>

      <nav className="tab-bar" aria-label="画面の切り替え">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === tab ? 'tab active' : 'tab'}
            aria-current={t.id === tab ? 'page' : undefined}
            onClick={() => {
              setDraft(null)
              setTab(t.id)
            }}
          >
            <span className="tab-icon" aria-hidden="true">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
