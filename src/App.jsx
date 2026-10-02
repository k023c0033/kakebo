import { useEffect, useState } from 'react'
import {
  loadBalance,
  loadBudget,
  loadExpenses,
  loadIncomes,
  loadLastBackup,
  newId,
  requestPersistentStorage,
  saveBalance,
  saveBudget,
  saveExpenses,
  saveIncomes,
  saveLastBackup,
} from './storage.js'
import { budgetAlert, crossedLevel } from './budget.js'
import { expensesInMonth, totalOf } from './expenses.js'
import { formatMonth, monthKey } from './format.js'
import { showNotification } from './notify.js'
import HomeScreen from './screens/HomeScreen.jsx'
import AddScreen from './screens/AddScreen.jsx'
import ListScreen from './screens/ListScreen.jsx'
import ReceiptScreen from './screens/ReceiptScreen.jsx'
import BackupCard from './screens/BackupCard.jsx'
import SyncCard from './screens/SyncCard.jsx'
import { useSync } from './sync/useSync.js'
import { queueDelete, queueListChange, queuePut, queueSettings } from './sync/queue.js'

const TABS = [
  { id: 'home', label: 'ホーム', icon: '◔' },
  { id: 'add', label: '入力', icon: '＋' },
  { id: 'list', label: '一覧', icon: '☰' },
  { id: 'receipt', label: 'レシート', icon: '▣' },
]

export default function App() {
  const [tab, setTab] = useState('home')
  const [expenses, setExpenses] = useState(loadExpenses)
  const [incomes, setIncomes] = useState(loadIncomes)
  const [budget, setBudget] = useState(loadBudget)
  const [balance, setBalance] = useState(loadBalance)
  const [lastBackup, setLastBackup] = useState(loadLastBackup)
  // 予算の80%・100%をこえたときにアプリの中に出すお知らせ
  const [alert, setAlert] = useState(null)
  // レシートから読んだ内容を入力画面に渡すための下書き
  const [draft, setDraft] = useState(null)
  // ログイン中は、クラウドから届いた変化（ほかの端末での記録）をここで画面に入れる
  const sync = useSync({ expenses, incomes, budget, balance }, (data) => {
    if ('expenses' in data) setExpenses(data.expenses)
    if ('incomes' in data) setIncomes(data.incomes)
    if ('budget' in data) setBudget(data.budget)
    if ('balance' in data) setBalance(data.balance)
  })

  // 画面を切り替えたら一番上から見せる（保存後のお知らせが隠れないように）
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  // 記録がブラウザに勝手に消されないように頼んでおく
  useEffect(() => {
    requestPersistentStorage()
  }, [])

  useEffect(() => {
    saveExpenses(expenses)
  }, [expenses])

  useEffect(() => {
    saveIncomes(incomes)
  }, [incomes])

  useEffect(() => {
    saveBudget(budget)
  }, [budget])

  useEffect(() => {
    saveBalance(balance)
  }, [balance])

  function addExpense(expense) {
    const key = monthKey(expense.date)
    const before = totalOf(expensesInMonth(expenses, key))
    const level = crossedLevel(before, before + expense.amount, budget)
    if (level) {
      const message = budgetAlert(level, before + expense.amount, budget, formatMonth(key))
      setAlert({ ...message, level })
      showNotification(message.title, message.body)
    } else {
      setAlert(null)
    }
    const record = { ...expense, id: newId(), createdAt: Date.now() }
    setExpenses((list) => [...list, record])
    sync.record((q) => queuePut(q, 'expenses', record))
    setDraft(null)
    setTab('list')
  }

  function addIncome(income) {
    const record = { ...income, id: newId(), createdAt: Date.now() }
    setIncomes((list) => [...list, record])
    sync.record((q) => queuePut(q, 'incomes', record))
    setAlert(null)
    setTab('list')
  }

  function deleteExpense(id) {
    setExpenses((list) => list.filter((e) => e.id !== id))
    sync.record((q) => queueDelete(q, 'expenses', id))
  }

  function deleteIncome(id) {
    setIncomes((list) => list.filter((i) => i.id !== id))
    sync.record((q) => queueDelete(q, 'incomes', id))
  }

  function handleExported(date) {
    saveLastBackup(date)
    setLastBackup(date)
  }

  function handleImport(data) {
    setExpenses(data.expenses)
    setIncomes(data.incomes)
    changeBudget(data.budget)
    changeBalance(data.balance)
    sync.record((q) => queueListChange(queueListChange(q, 'expenses', expenses, data.expenses), 'incomes', incomes, data.incomes))
  }

  function changeBudget(value) {
    setBudget(value)
    if (value !== budget) sync.record((q) => queueSettings(q, 'budget', value))
  }

  function changeBalance(value) {
    setBalance(value)
    if (value !== balance) sync.record((q) => queueSettings(q, 'balance', value))
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
        {alert && (
          <div className={`budget-alert ${alert.level}`} role="alert">
            <div>
              <strong>{alert.title}</strong>
              <p>{alert.body}</p>
            </div>
            <button type="button" className="delete-button" aria-label="お知らせを閉じる" onClick={() => setAlert(null)}>×</button>
          </div>
        )}

        {tab === 'home' && (
          <HomeScreen
            expenses={expenses}
            incomes={incomes}
            budget={budget}
            balance={balance}
            onBudgetChange={changeBudget}
            onBalanceChange={(amount) => changeBalance(amount == null ? null : { amount, setAt: Date.now() })}
            onAdd={() => setTab('add')}
          />
        )}
        {tab === 'home' && <SyncCard sync={sync} />}
        {tab === 'home' && (
          <BackupCard
            synced={sync.status === 'signedIn'}
            expenses={expenses}
            incomes={incomes}
            budget={budget}
            balance={balance}
            lastBackup={lastBackup}
            onExported={handleExported}
            onImport={handleImport}
          />
        )}
        {tab === 'add' && (
          <AddScreen key={draft ? 'draft' : 'blank'} draft={draft} onSaveExpense={addExpense} onSaveIncome={addIncome} />
        )}
        {tab === 'list' && (
          <ListScreen expenses={expenses} incomes={incomes} onDeleteExpense={deleteExpense} onDeleteIncome={deleteIncome} />
        )}
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
              setAlert(null)
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
