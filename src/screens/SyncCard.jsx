// ホームの下のほう。Googleでログインすると、PCとスマホで同じ記録を見られる。
export default function SyncCard({ sync }) {
  if (sync.status === 'off') return null

  return (
    <section className="card sync">
      <h3 className="card-title">PCとスマホの同期</h3>

      {sync.status === 'checking' && <p className="hint">ログインの状態を確かめています…</p>}

      {sync.status === 'signedOut' && (
        <>
          <p className="hint">
            Googleでログインすると、PCとスマホで同じ記録を見られます。今この端末にある記録も、そのまま引きつがれます。レシートの写真は同期しません。
          </p>
          <button type="button" className="primary-button" onClick={sync.signIn}>Googleでログイン</button>
        </>
      )}

      {sync.status === 'signedIn' && (
        <>
          <p className="sync-state">
            <span className="sync-dot" aria-hidden="true" />
            {sync.email ?? 'Googleアカウント'} で同期しています
          </p>
          <p className="hint">ほかの端末でも同じアカウントでログインしてください。オフラインのときの記録は、つながったときに送られます。</p>
          <button type="button" className="link-button" onClick={sync.signOut}>ログアウト（この端末の記録は消えません）</button>
        </>
      )}

      {sync.error && (
        <div className="sync-error">
          <p className="error" role="status">{sync.error}</p>
          {sync.sendFailed && <button type="button" className="secondary-button" onClick={sync.retry}>もう一度送る</button>}
        </div>
      )}
    </section>
  )
}
