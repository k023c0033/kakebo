import { createWorker } from 'tesseract.js'
import { prepareReceiptImage } from './preprocess.js'

// Tesseract.js（無料の文字読み取り）でレシート写真の文字を読む。
// 写真はサーバーに送らず、スマホのブラウザの中で読む。
// 初回だけ日本語の読み取り用データ（数MB）をダウンロードする。

// 写真をそのまま扱うと重いので、計算の前にこの大きさまで縮める
const MAX_SIDE = 2400

async function loadImageData(file) {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

function grayToCanvas({ gray, width, height }) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const image = ctx.createImageData(width, height)
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) {
    image.data[i] = image.data[i + 1] = image.data[i + 2] = gray[j]
    image.data[i + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  return canvas
}

// 1行ずつの文字と、その行の文字の高さ（大きい文字ほど店名らしい）
function linesOf(blocks) {
  return (blocks ?? []).flatMap((block) =>
    block.paragraphs.flatMap((paragraph) =>
      paragraph.lines.map((line) => ({ text: line.text.trim(), height: line.bbox.y1 - line.bbox.y0 })),
    ),
  )
}

// 読み取った文字と、行ごとの情報、整えたあとの画像（確認用）を返す
export async function readReceipt(file, onProgress = () => {}) {
  const worker = await createWorker(['jpn', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress(m.progress)
    },
  })
  try {
    // レシートは「左に品名・右に金額」の行が並ぶので、1つの文字のかたまりとして行ごとに読ませる
    await worker.setParameters({ tessedit_pageseg_mode: '6', preserve_interword_spaces: '1' })
    const prepared = prepareReceiptImage(await loadImageData(file))
    const canvas = grayToCanvas(prepared)
    const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true })
    return { text: data.text, lines: linesOf(data.blocks), cropped: prepared.cropped }
  } finally {
    await worker.terminate()
  }
}
