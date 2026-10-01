// Firebase の「つなぎ先」。Firebase コンソールの「プロジェクトの設定」→「マイアプリ」に出てくる値。
// パスワードではなく、アプリに入って誰でも見られる前提の値なので、ここに書いてよい。
// 記録を守っているのは Firestore のルール（firestore.rules）。
// null のあいだは同期の機能は出さず、これまでどおり端末の中だけで動く。
export const firebaseConfig = null
