// レシートの文字（OCRの結果）から、日付・合計金額・店名の候補を取り出す。
// OCRは「合 計」のように文字の間に空白を入れたり、全角と半角が混ざったりするので、
// まず表記をそろえてから探す。

const TOTAL_KEYWORDS = ['総合計', '合計', 'お買上計', 'お買上げ計', 'お買い上げ計', 'お会計', 'ご請求額', '領収金額', 'お支払金額']
const SUBTOTAL_KEYWORDS = ['小計']
// 合計っぽく見えても、合計金額ではない行
const EXCLUDE_KEYWORDS = ['預', '釣', '税', '対象', '点数', '値引', '割引', 'ポイント']

const MAX_AMOUNT = 10_000_000

// 全角を半角に、「￥」を「¥」にそろえる
export function normalizeText(text) {
  return text.normalize('NFKC').replace(/\r\n?/g, '\n')
}

function compact(line) {
  return line.replace(/\s+/g, '')
}

function isValidDate(year, month, day) {
  if (year < 2000 || year > 2099) return false
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

function toIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// 例: 2026年9月30日 / 2026/09/30 / 2026-9-30 / 26/09/30 / 令和8年9月30日 / R8.9.30
export function findDate(text) {
  const patterns = [
    { re: /(?:令和|R)(\d{1,2}|元)[年./-](\d{1,2})[月./-](\d{1,2})/, era: true },
    { re: /(20\d{2})[年./-](\d{1,2})[月./-](\d{1,2})/ },
    { re: /(?<!\d)(\d{2})[./-](\d{1,2})[./-](\d{1,2})(?!\d)/, shortYear: true },
  ]
  // 空白をそのまま残した行と、空白を詰めた行の両方で探す
  // （「2 0 2 6 / 0 9」は詰めないと読めず、「26/09/30 18:02」は詰めると時刻とくっつく）
  const lines = normalizeText(text).split('\n').flatMap((l) => [l, compact(l)])
  for (const { re, era, shortYear } of patterns) {
    for (const line of lines) {
      const m = line.match(re)
      if (!m) continue
      let year = m[1] === '元' ? 1 : Number(m[1])
      if (era) year += 2018
      else if (shortYear) year += 2000
      const month = Number(m[2])
      const day = Number(m[3])
      if (isValidDate(year, month, day)) return toIsoDate(year, month, day)
    }
  }
  return null
}

// 行の中の金額らしい数字を取り出す。「¥」や「円」が付いているものを優先する。
function amountsInLine(line) {
  const results = []
  const re = /([¥\\])?(\d{1,3}(?:[,.]\d{3})+|\d+)(円)?/g
  for (const m of line.matchAll(re)) {
    const value = Number(m[2].replace(/[,.]/g, ''))
    if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) continue
    results.push({ value, marked: Boolean(m[1] || m[3]) })
  }
  return results
}

function pickAmount(line) {
  const amounts = amountsInLine(line)
  if (amounts.length === 0) return null
  const marked = amounts.filter((a) => a.marked)
  const pool = marked.length > 0 ? marked : amounts
  return pool[pool.length - 1].value
}

function findAmountByKeywords(lines, keywords) {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const keyword = keywords.find((k) => line.includes(k))
    if (!keyword) continue
    if (EXCLUDE_KEYWORDS.some((k) => line.includes(k))) continue
    // 「合計」の後ろだけを見る（前にある点数などを拾わないため）
    const after = line.slice(line.indexOf(keyword) + keyword.length)
    const amount = pickAmount(after) ?? (lines[i + 1] ? pickAmount(lines[i + 1]) : null)
    if (amount != null) return amount
  }
  return null
}

export function findTotal(text) {
  const lines = normalizeText(text).split('\n').map(compact).filter(Boolean)
  const total = findAmountByKeywords(
    lines.filter((l) => !SUBTOTAL_KEYWORDS.some((k) => l.includes(k))),
    TOTAL_KEYWORDS,
  )
  if (total != null) return total
  return findAmountByKeywords(lines, SUBTOTAL_KEYWORDS)
}

// OCRが日本語の文字の間に入れた空白を消す（英数字どうしの空白は残す）
function joinJapanese(line) {
  return line.replace(/(?<=[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}ー])\s+(?=[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}ー])/gu, '')
}

// 店名はたいてい一番上にあるので、数字や記号だけではない最初の行を候補にする
export function findStoreName(text) {
  const lines = normalizeText(text).split('\n').map((l) => l.trim()).filter(Boolean)
  for (const line of lines.slice(0, 5)) {
    const letters = line.replace(/[\d\s\-‐ー_.,:;/\\()（）¥*#=|]/g, '')
    if (letters.length >= 2 && !/領収|レシート|TEL|電話/i.test(line)) return joinJapanese(line)
  }
  return null
}

export function parseReceipt(text) {
  return {
    date: findDate(text),
    total: findTotal(text),
    store: findStoreName(text),
  }
}
