import { useEffect, useState } from 'react'
import { readReceiptText } from '../receipt/ocr.js'
import { parseReceipt } from '../receipt/parseReceipt.js'
import { formatDate, formatYen } from '../format.js'

// 試作：レシート写真から日付・合計金額・店名がどれくらい読めるかを試す画面。
// 読めた内容はそのまま入力画面に渡せる。写真の保存はまだしない。
export default function ReceiptScreen({ onUse }) {
  const [previewUrl, setPreviewUrl] = useState(null)
  const [status, setStatus] = useState('idle') // idle | reading | done | error
  const [progress, setProgress] = useState(0)
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)

  // 写真を替えたときと画面を離れるときに、前の写真の表示用URLを片付ける
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl])

  async function handleFile(event) {
    const picked = event.target.files?.[0]
    if (!picked) return
    setPreviewUrl(URL.createObjectURL(picked))
    setStatus('reading')
    setProgress(0)
    setText('')
    setResult(null)
    try {
      const ocrText = await readReceiptText(picked, setProgress)
      setText(ocrText)
      setResult(parseReceipt(ocrText))
      setStatus('done')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  return (
    <section className="screen">
      <h2>レシートを読む（試作）</h2>
      <p className="hint">レシートを明るいところで、まっすぐ・大きめに撮ると読みやすくなります。</p>

      <label className="primary-button file-button">
        写真を撮る・選ぶ
        <input type="file" accept="image/*" capture="environment" onChange={handleFile} hidden />
      </label>

      {previewUrl && <img className="receipt-preview" src={previewUrl} alt="選んだレシートの写真" />}

      {status === 'reading' && (
        <div className="progress">
          <p>読み取り中… {Math.round(progress * 100)}%</p>
          <progress value={progress} max={1} />
          <p className="hint">はじめての時は読み取り用のデータをダウンロードするので少し時間がかかります。</p>
        </div>
      )}

      {status === 'error' && <p className="error">読み取りに失敗しました。通信状態を確かめて、もう一度試してください。</p>}

      {status === 'done' && result && (
        <>
          <dl className="result">
            <dt>日付</dt>
            <dd>{result.date ? formatDate(result.date) : '読めませんでした'}</dd>
            <dt>合計</dt>
            <dd>{result.total != null ? formatYen(result.total) : '読めませんでした'}</dd>
            <dt>お店</dt>
            <dd>{result.store ?? '読めませんでした'}</dd>
          </dl>
          <button type="button" className="primary-button" onClick={() => onUse(result)}>
            この内容で支出を入力する
          </button>
          <details className="raw-text">
            <summary>読み取った文字をすべて見る</summary>
            <pre>{text}</pre>
          </details>
        </>
      )}
    </section>
  )
}
