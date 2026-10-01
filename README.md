# 家計簿

お金の使いすぎを防ぐための家計簿アプリです。スマホのホーム画面に置いて使える Web アプリ（PWA）として作っています。
データはスマホ（ブラウザ）の中に保存します。Googleでログインしたときだけ、PCとスマホで同じ記録を見られるようにクラウド（Firebase）にも保存します。

## いまできること

- **ホーム**：いちばん上に「今月あと使えるお金」。その下に口座残高・今月の収入・今月の支出と、支出のカテゴリ別の内わけ
- **口座残高**：銀行とはつながず、いまの残高を一度手で入れると、そのあと記録した収入・支出で自動で増減する。ずれたら入れ直す
- **予算**：1か月の予算を決めると、ホームに「何%使ったか・あといくら」をバーで表示。支出を入れて予算の80%・100%をこえたら、アプリの中とスマホの通知でお知らせ（月は毎月1日始まり）
- **入力**：支出（金額・日付・カテゴリ・支払い方法・お店・メモ）と収入（給料・仕送り）を手で入れる
- **一覧**：入れた支出と収入を日付ごとに見る・消す
- **PCとスマホの同期**：ホームの「Googleでログイン」を押すと、同じアカウントでログインした端末どうしで記録・予算・口座残高がそろう。オフラインで入れた分は、つながったときに送られる。レシートの写真は同期しない
- **レシート（試作）**：レシートの写真から日付・合計金額・お店の名前を読み取り、そのまま入力画面に渡す

カテゴリは「食費・日用品・交通費・娯楽」の4つ、支払い方法は「現金・クレジットカード・電子マネー・QR決済」の4つ、収入の種類は「給料・仕送り」の2つです。

スマホの通知は、ホームの予算のところにある「スマホの通知をオンにする」を押して許可すると届きます。iPhone では、ホーム画面に追加したアプリから開いたときだけ通知が使えます。

## 手元で動かす

[Node.js](https://nodejs.org/)（22 以上）を入れてから、このフォルダで次を実行します。

```sh
npm install      # 必要な部品をダウンロード（最初の1回）
npm run dev      # 開発用に起動。表示された http://localhost:5173/kakebo/ をブラウザで開く
```

ほかのコマンド：

| コマンド | すること |
| --- | --- |
| `npm test` | 自動テストを動かす |
| `npm run lint` | 書き方のチェック |
| `npm run build` | 公開用のファイルを `dist/` に作る |
| `npm run try-receipt -- 写真のフォルダ` | レシート写真をまとめて読み取り、日付・合計・店名がどう読めたかを表示する |

## しくみ

- 画面は [React](https://react.dev/)、組み立てには [Vite](https://vite.dev/) を使っています。
- レシートの文字読み取りは [Tesseract.js](https://tesseract.projectnaptha.com/) で、スマホのブラウザの中だけで行います。初回だけ日本語の読み取り用データ（数MB）をダウンロードします。
- 読み取った文字から日付・合計を探す処理は `src/receipt/parseReceipt.js` にあります。
- 支出・収入・予算・口座残高はいまは `localStorage` に保存しています。レシート画像を保存するようになったら、容量の大きい IndexedDB に移す予定です。
- 同期は [Firebase](https://firebase.google.com/)（Googleログインと Firestore、無料プラン）を使います。つなぎ先は `src/sync/firebaseConfig.js`、読み書きの決まりは `firestore.rules` です。`firebaseConfig` が `null` のあいだは同期の機能は出ません。
  - クラウドでの置き場所は `users/{ログインした人のID}/expenses|incomes/{記録のID}` と `users/{ID}/settings/main`（予算・口座残高）。
  - 手元で試すときは Firebase エミュレーター（`npx firebase-tools emulators:start --only auth,firestore --project demo-kakebo`）を起動し、`VITE_FIREBASE_EMULATOR=1 npm run dev` で開くと、本物の Firebase の代わりにそちらにつながります。
- 公開先は GitHub Pages（https://rinchan-codes.github.io/kakebo/ ）です。`main` に変更が入ると `.github/workflows/deploy.yml` が自動で組み立てて公開します。
  - 初回だけ、GitHub の Settings → Pages → Build and deployment の Source を「GitHub Actions」にしておく必要があります。
