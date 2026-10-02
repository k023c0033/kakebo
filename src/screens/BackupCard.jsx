import { useState } from 'react'
import { backupFileName, buildBackup, mergeBackup, parseBackup, toCsv } from '../backup.js'
import { formatDate, todayIso } from '../format.js'

// この日数より前に書き出したきりなら、書き出しをすすめる
const REMIND_DAYS = 30

function daysBetween(fromIso, toIso) {
  return Math.round((Date.parse(toIso) - Date.parse(fromIso)) / 86400000)
}

function download(text, fileName, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ホームのいちばん下。記録をファイルに書き出す・ファイルから戻す。
export default function BackupCard({ synced, expenses, incomes, budget, balance, lastBackup, onExported, onImport }) {
  // 読み込む前の確認 { backup, preview } と、結果のお知らせ
  const [pending, setPending] = useState(null)
  const [message, setMessage] = useState(null)
  const today = todayIso()
  const hasRecords = expenses.length + incomes.length > 0
  const remind = hasRecords && (lastBackup == null || daysBetween(lastBackup, today) >= REMIND_DAYS)

  function exportJson() {
    const backup = buildBackup({ expenses, incomes, budget, balance })
    download(JSON.stringify(backup, null, 1), backupFileName(today, 'json'), 'application/json')
    onExported(today)
    setMessage({ ok: true, text: 'バックアップを書き出しました。Googleドライブなど、スマホの外にも保存しておくと安心です。' })
  }

  function exportCsv() {
    download(toCsv(expenses, incomes), backupFileName(today, 'csv'), 'text/csv')
    setMessage({ ok: true, text: 'Excelで開けるCSVファイルを書き出しました。これは見る用で、読み込みには使えません。' })
  }

  async function handleFile(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setMessage(null)
    try {
      const backup = parseBackup(await file.text())
      const preview = mergeBackup({ expenses, incomes, budget, balance }, backup)
      setPending({ backup, preview })
    } catch (error) {
      setMessage({ ok: false, text: error.message })
    }
  }

  function confirmImport() {
    const { expenses: e, incomes: i, budget: b, balance: bal, added } = pending.preview
    onImport({ expenses: e, incomes: i, budget: b, balance: bal })
    setPending(null)
    setMessage({ ok: true, text: `読み込みました（支出${added.expenses}件・収入${added.incomes}件を追加）。` })
  }

  return (
    <section className="card backup">
      <h3 className="card-title">バックアップ</h3>
      <p className="hint">
        {synced
          ? 'クラウドにも保存されていますが、念のため、ときどき書き出しておくと安心です。'
          : '記録はこのスマホの中だけにあります。機種変更やデータ消去に備えて、ときどき書き出してください。'}
      </p>
      <p className={remind ? 'backup-last remind' : 'backup-last'}>
        前回の書き出し: {lastBackup ? formatDate(lastBackup) : 'まだありません'}
        {remind && '。そろそろ書き出しましょう'}
      </p>

      <div className="backup-buttons">
        <button type="button" className="primary-button" onClick={exportJson} disabled={!hasRecords}>書き出す</button>
        <label className="secondary-button file-label">
          読み込む
          <input type="file" accept=".json,application/json" onChange={handleFile} hidden />
        </label>
      </div>
      <button type="button" className="link-button" onClick={exportCsv} disabled={!hasRecords}>Excel用（CSV）で書き出す</button>

      {pending && (
        <div className="backup-confirm" role="alertdialog" aria-label="読み込みの確認">
          <p>
            {`ファイルには支出${pending.backup.expenses.length}件・収入${pending.backup.incomes.length}件があります。`}
            {`このうち、まだない支出${pending.preview.added.expenses}件・収入${pending.preview.added.incomes}件を追加します。今の記録は消えません。`}
          </p>
          {pending.backup.skipped > 0 && <p className="hint">読めなかった記録が{pending.backup.skipped}件あり、それは飛ばします。</p>}
          <div className="button-row">
            <button type="button" className="secondary-button" onClick={() => setPending(null)}>やめる</button>
            <button type="button" className="primary-button" onClick={confirmImport}>読み込む</button>
          </div>
        </div>
      )}

      {message && (
        <p className={message.ok ? 'notice' : 'error'} role="status">{message.text}</p>
      )}
    </section>
  )
}
