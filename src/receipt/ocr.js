import { createWorker } from 'tesseract.js'

// Tesseract.js（無料の文字読み取り）でレシート写真の文字を読む。
// 写真はサーバーに送らず、スマホのブラウザの中で読む。
// 初回だけ日本語の読み取り用データ（数MB）をダウンロードする。

const MAX_SIDE = 1800

// スマホの写真は大きすぎて遅いので、縮めて白黒にしてから読ませる
async function prepareImage(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  ctx.filter = 'grayscale(1) contrast(1.3)'
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas
}

export async function readReceiptText(file, onProgress = () => {}) {
  const worker = await createWorker(['jpn', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(m.progress)
    },
  })
  try {
    const image = await prepareImage(file)
    const { data } = await worker.recognize(image)
    return data.text
  } finally {
    await worker.terminate()
  }
}
