// PCとスマホの同期。ログインしているあいだ、記録をクラウド（Firebase）と行き来させる。
// 記録の本体はこれまでどおり端末（localStorage）にも保存しているので、
// ログインしていなくても、オフラインでも、今までどおり使える。
import { useEffect, useRef, useState } from 'react'
import { firebaseConfig } from './firebaseConfig.js'
import { emptyQueue, isQueueEmpty, mergeQueues, overlayList, overlaySettings, queueFromLocal } from './queue.js'

const QUEUE_KEY = 'kakebo.syncQueue.v1'
// この端末が最後に同期したアカウント。初めてのアカウントなら端末の記録をぜんぶ送る。
const UID_KEY = 'kakebo.syncUid.v1'

function loadQueue() {
  try {
    const value = JSON.parse(localStorage.getItem(QUEUE_KEY))
    return value?.expenses && value?.incomes ? value : emptyQueue()
  } catch {
    return emptyQueue()
  }
}

// 開発用: VITE_FIREBASE_EMULATOR=1 で起動すると、本物ではなく手元の Firebase エミュレーターにつなぐ
const emulator = import.meta.env.VITE_FIREBASE_EMULATOR === '1'
const config = emulator ? { apiKey: 'demo', authDomain: 'localhost', projectId: 'demo-kakebo', appId: 'demo' } : firebaseConfig

let cloudPromise = null
// 読み込み済みの部品。ログインの小さい窓は、ボタンを押したその場で開かないと
// ブラウザに止められるので、読み込みを待たずに使えるようにとっておく
let loaded = null
function loadCloud() {
  cloudPromise ??= import('./cloud.js').then((m) => (loaded = { ...m, cloud: m.createCloud(config, { emulator }) }))
  return cloudPromise
}

export const syncAvailable = config != null

// state: 今の { expenses, incomes, budget, balance }
// apply: クラウドから届いた値を画面に反映する関数 { expenses, incomes, budget, balance } のどれか
export function useSync(state, apply) {
  // status: 'off'（同期なし）| 'checking' | 'signedOut' | 'signedIn'
  const [status, setStatus] = useState(syncAvailable ? 'checking' : 'off')
  const [user, setUser] = useState(null)
  const [error, setError] = useState(null)
  // 送るのに失敗したら、自動ではくり返さず「もう一度送る」を待つ
  const [sendFailed, setSendFailed] = useState(false)
  const [queue, setQueue] = useState(loadQueue)
  // イベントやクラウドからの知らせの中で最新の値を読むための控え
  const queueRef = useRef(queue)
  const userRef = useRef(null)
  const failedRef = useRef(false)
  const stateRef = useRef(state)
  const applyRef = useRef(apply)
  useEffect(() => {
    stateRef.current = state
    applyRef.current = apply
  })

  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    } catch {
      // 保存できなくても、今開いているあいだは送れる
    }
  }, [queue])

  function changeQueue(next) {
    queueRef.current = next
    setQueue(next)
  }

  // ログイン中なら、ためた変更を送る
  function flush() {
    const u = userRef.current
    const sending = queueRef.current
    if (!u || failedRef.current || isQueueEmpty(sending)) return
    changeQueue(emptyQueue())
    loadCloud().then(({ cloud, messageOf }) =>
      cloud.send(u.uid, sending).catch((e) => {
        // 送れなかった分は箱に戻す（そのあとの変更のほうを優先）
        changeQueue(mergeQueues(sending, queueRef.current))
        failedRef.current = true
        setSendFailed(true)
        setError(messageOf(e))
      }),
    )
  }

  // ログイン状態を見張る
  useEffect(() => {
    if (!syncAvailable) return
    let stop = () => {}
    let alive = true
    loadCloud().then(({ cloud, messageOf }) => {
      if (!alive) return
      stop = cloud.onUser(
        (u) => {
          if (u && localStorage.getItem(UID_KEY) !== u.uid) {
            // このアカウントで初めて同期する端末: 端末の記録をクラウドに足す
            changeQueue(mergeQueues(queueFromLocal(stateRef.current), queueRef.current))
            localStorage.setItem(UID_KEY, u.uid)
          }
          userRef.current = u
          setUser(u)
          setStatus(u ? 'signedIn' : 'signedOut')
          flush()
        },
        (e) => setError(messageOf(e)),
      )
    })
    return () => {
      alive = false
      stop()
    }
  }, [])

  // ログイン中はクラウドの変化を受け取る
  useEffect(() => {
    if (!user) return
    let stop = () => {}
    let alive = true
    loadCloud().then(({ cloud, messageOf }) => {
      if (!alive) return
      stop = cloud.subscribe(user.uid, {
        onList: (kind, list) => applyRef.current({ [kind]: overlayList(list, queueRef.current[kind]) }),
        onSettings: (data) => applyRef.current(overlaySettings(data, queueRef.current.settings)),
        onError: (e) => setError(messageOf(e)),
      })
    })
    return () => {
      alive = false
      stop()
    }
  }, [user])

  function retry() {
    setError(null)
    failedRef.current = false
    setSendFailed(false)
    flush()
  }

  async function signIn() {
    setError(null)
    const { cloud, messageOf } = loaded ?? (await loadCloud())
    try {
      await cloud.signIn()
    } catch (e) {
      setError(messageOf(e))
    }
  }

  async function signOut() {
    setError(null)
    const { cloud } = await loadCloud()
    await cloud.signOut()
  }

  return {
    status,
    email: user?.email ?? null,
    error,
    sendFailed,
    signIn,
    signOut,
    retry,
    // 変更を送る箱に入れ、ログイン中ならすぐ送る。f は (queue) => queue
    record(f) {
      changeQueue(f(queueRef.current))
      flush()
    },
  }
}
