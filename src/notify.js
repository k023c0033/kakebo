// スマホの通知（画面の上に出るお知らせ）を出す。
// 許可されていないときや、対応していないブラウザでは何もしない（アプリ内の表示だけになる）。

export function notificationSupported() {
  return typeof Notification !== 'undefined'
}

export function notificationPermission() {
  return notificationSupported() ? Notification.permission : 'unsupported'
}

export async function askNotificationPermission() {
  if (!notificationSupported()) return 'unsupported'
  return Notification.requestPermission()
}

export async function showNotification(title, body) {
  if (notificationPermission() !== 'granted') return
  const options = { body, icon: `${import.meta.env.BASE_URL}icon-192.png`, tag: 'kakebo-budget' }
  try {
    // Android の Chrome などはサービスワーカー経由でないと通知を出せない
    const registration = await navigator.serviceWorker?.getRegistration()
    if (registration) {
      await registration.showNotification(title, options)
      return
    }
    new Notification(title, options)
  } catch (err) {
    console.error(err)
  }
}
