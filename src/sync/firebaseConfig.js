// Firebase の「つなぎ先」。Firebase コンソールの「プロジェクトの設定」→「マイアプリ」に出てくる値。
// パスワードではなく、アプリに入って誰でも見られる前提の値なので、ここに書いてよい。
// 記録を守っているのは Firestore のルール（firestore.rules）と、Authentication の「承認済みドメイン」。
// null にすると同期の機能は出ず、端末の中だけで動く。
export const firebaseConfig = {
  apiKey: 'AIzaSyBP3zNR0KlNDca1HhYi0LSRUM9BtzNJo7I',
  authDomain: 'kakebo-b7a98.firebaseapp.com',
  projectId: 'kakebo-b7a98',
  storageBucket: 'kakebo-b7a98.firebasestorage.app',
  messagingSenderId: '520741189828',
  appId: '1:520741189828:web:ccc78d2e446040c3e27191',
}
