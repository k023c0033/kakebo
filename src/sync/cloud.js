// Firebase（Googleログインと Firestore）とのやりとり。
// firebaseConfig があるときだけ読み込まれる（ないときはアプリが重くならない）。
// クラウドの中の形: users/{uid}/expenses/{id}, users/{uid}/incomes/{id}, users/{uid}/settings/main
import { initializeApp } from 'firebase/app'
import {
  GoogleAuthProvider,
  connectAuthEmulator,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from 'firebase/auth'
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  writeBatch,
} from 'firebase/firestore'
import { KINDS } from './queue.js'

// 1回にまとめて送れる数の上限（Firestore は500）
const BATCH_LIMIT = 400

const AUTH_MESSAGES = {
  'auth/unauthorized-domain': 'このアドレスからのログインが許可されていません。Firebase の「承認済みドメイン」を確かめてください。',
  'auth/network-request-failed': 'インターネットにつながっていないようです。つながってから、もう一度ためしてください。',
  'auth/operation-not-allowed': 'Firebase で Google ログインが有効になっていません。',
}

export function messageOf(error) {
  if (AUTH_MESSAGES[error?.code]) return AUTH_MESSAGES[error.code]
  if (error?.code === 'permission-denied') return 'クラウドに保存できませんでした。Firestore のルールを確かめてください。'
  return `うまくいきませんでした（${error?.code ?? error?.message ?? '原因不明'}）。`
}

export function createCloud(config, { emulator = false } = {}) {
  const app = initializeApp(config)
  const auth = getAuth(app)
  // オフラインでも記録でき、つながったら自動で送られるように、端末の中にも控えを持つ
  const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true,
  })
  if (emulator) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
    // 自動テスト用: Google の画面を通さずにログインする（エミュレーターのときだけ）
    globalThis.kakeboTestSignIn = (email) =>
      signInWithCredential(auth, GoogleAuthProvider.credential(JSON.stringify({ sub: email, email, email_verified: true })))
  }
  const userDoc = (uid, ...path) => doc(db, 'users', uid, ...path)
  const settingsRef = (uid) => userDoc(uid, 'settings', 'main')

  return {
    // ログイン状態が変わるたびに呼ばれる（user はログアウト中なら null）
    onUser(callback, onError) {
      getRedirectResult(auth).catch(onError)
      return onAuthStateChanged(auth, callback, onError)
    },

    async signIn() {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })
      try {
        await signInWithPopup(auth, provider)
      } catch (error) {
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return
        // 小さい窓が開けない環境では、ページごとログイン画面へ移る
        if (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment') {
          await signInWithRedirect(auth, provider)
          return
        }
        throw error
      }
    },

    signOut: () => signOut(auth),

    // クラウドの記録が変わるたびに handlers が呼ばれる。戻り値を呼ぶと止まる。
    subscribe(uid, { onList, onSettings, onError }) {
      const stops = KINDS.map((kind) =>
        onSnapshot(
          collection(db, 'users', uid, kind),
          (snap) => {
            // 端末の控えが空っぽのときの「とりあえず空」は無視して、本物が届くのを待つ
            if (snap.metadata.fromCache && snap.empty) return
            onList(kind, snap.docs.map((d) => d.data()))
          },
          onError,
        ),
      )
      stops.push(
        onSnapshot(
          settingsRef(uid),
          (snap) => {
            if (snap.exists()) onSettings(snap.data())
          },
          onError,
        ),
      )
      return () => stops.forEach((stop) => stop())
    },

    // ためておいた変更を送る。オフラインのときは端末に控えておき、つながったら届く。
    async send(uid, queue) {
      const ops = []
      for (const kind of KINDS) {
        for (const record of Object.values(queue[kind].put)) ops.push((b) => b.set(userDoc(uid, kind, record.id), record))
        for (const id of queue[kind].del) ops.push((b) => b.delete(userDoc(uid, kind, id)))
      }
      const commits = []
      for (let i = 0; i < ops.length; i += BATCH_LIMIT) {
        const batch = writeBatch(db)
        ops.slice(i, i + BATCH_LIMIT).forEach((op) => op(batch))
        commits.push(batch.commit())
      }

      const entries = Object.entries(queue.settings ?? {})
      if (entries.length > 0) {
        let current = {}
        if (entries.some(([, s]) => s.fillOnly)) {
          try {
            current = (await getDoc(settingsRef(uid))).data() ?? {}
          } catch {
            // オフラインで確かめられないときは、この端末の値を使う
          }
        }
        const patch = {}
        for (const [key, { value, fillOnly }] of entries) {
          if (!fillOnly || current[key] == null) patch[key] = value
        }
        if (Object.keys(patch).length > 0) {
          const batch = writeBatch(db)
          batch.set(settingsRef(uid), patch, { merge: true })
          commits.push(batch.commit())
        }
      }
      await Promise.all(commits)
    },
  }
}
