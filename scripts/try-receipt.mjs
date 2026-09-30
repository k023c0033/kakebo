// レシート写真をまとめて読み取り、日付・合計・店名がどう読めたかを表示する（試作の精度確認用）。
// 使い方: npm run try-receipt -- 写真のフォルダ または 写真ファイル
import { readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { createWorker } from 'tesseract.js'
import { parseReceipt } from '../src/receipt/parseReceipt.js'

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp'])

function listImages(target) {
  if (statSync(target).isFile()) return [target]
  return readdirSync(target)
    .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
    .sort()
    .map((f) => join(target, f))
}

const targets = process.argv.slice(2)
if (targets.length === 0) {
  console.error('写真のフォルダかファイルを指定してください。例: npm run try-receipt -- ./receipts')
  process.exit(1)
}

// LANG_PATH を指定すると、読み取り用データをネットからではなくそのフォルダから読む
const options = process.env.LANG_PATH ? { langPath: process.env.LANG_PATH } : {}
const worker = await createWorker(['jpn', 'eng'], 1, options)
try {
  for (const file of targets.flatMap(listImages)) {
    const { data } = await worker.recognize(file)
    const result = parseReceipt(data.text)
    console.log(`\n=== ${file}`)
    console.log(`日付: ${result.date ?? '(読めず)'} / 合計: ${result.total ?? '(読めず)'} / 店名: ${result.store ?? '(読めず)'}`)
    if (process.env.SHOW_TEXT) console.log(data.text)
  }
} finally {
  await worker.terminate()
}
