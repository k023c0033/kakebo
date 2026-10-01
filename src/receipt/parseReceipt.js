// レシートの文字（OCRの結果）から、日付・合計金額・店名の候補を取り出す。
// OCRは「合 計」のように文字の間に空白を入れたり、全角と半角が混ざったりするので、
// まず表記をそろえてから探す。

const TOTAL_KEYWORDS = ['総合計', '税込合計', '合計', 'お買上計', 'お買上げ計', 'お買い上げ計', 'お会計', 'ご請求額', '領収金額', 'お支払金額', 'お支払い金額']
// OCRが「合計」を読みまちがえたときによく出る形（「台計」「合言十」「A計」など）
const TOTAL_MISREAD = /^[^\d¥]{0,2}(?:[台含会A-Za-z]計|合言十|合訂)/
const SUBTOTAL_KEYWORDS = ['小計']
// 支払い方法の行（ここの金額は合計と同じことが多い）
const PAYMENT_KEYWORDS = /支払|決済|クレジット|カード|電子マネー|交通系|IC|QR|PayPay|iD|QUICPay|Suica|PASMO|nanaco|WAON|楽天Edy|d払い|auPAY/
// お預り・お釣り（お預り − お釣り = 合計）
const DEPOSIT_KEYWORDS = /預|現計|現金|お支払(?!金額)/
const CHANGE_KEYWORDS = /釣|おつり|つり銭/
// 合計っぽく見えても、合計金額ではない行
const EXCLUDE_KEYWORDS = /預|釣|つり|対象|消費税|内税|外税|税額|税等|税率|値引|割引|ポイント|残高|点数/

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

// OCRが月や日の数字を1つ多く読んだとき（「99月」など）のために、ありえる読み方を順に試す
function digitChoices(digits) {
  const choices = [digits]
  if (digits.length >= 2) choices.push(digits.slice(-2), digits.slice(-1), digits.slice(0, 2), digits.slice(0, 1))
  return [...new Set(choices)].map(Number)
}

// 例: 2026年9月30日 / 2026/09/30 / 2026-9-30 / 26/09/30 / 令和8年9月30日 / R8.9.30
export function findDate(text) {
  const patterns = [
    { re: /(?:令和|R)(\d{1,2}|元)[年./-](\d{1,2})[月./-](\d{1,2})/, era: true },
    { re: /(20\d{2})[年./-](\d{1,2})[月./-](\d{1,2})/ },
    // 「年」が別の文字に読まれても、「月」「日」が読めていれば日付とわかる
    { re: /(20\d{2})\D{0,2}?(\d{1,3})月(\d{1,3})日/, fuzzy: true },
    { re: /(?<!\d)(\d{2})[./-](\d{1,2})[./-](\d{1,2})(?!\d)/, shortYear: true },
  ]
  // 空白をそのまま残した行と、空白を詰めた行の両方で探す
  // （「2 0 2 6 / 0 9」は詰めないと読めず、「26/09/30 18:02」は詰めると時刻とくっつく）
  const lines = normalizeText(text).split('\n').flatMap((l) => [l, compact(l)])
  for (const { re, era, shortYear, fuzzy } of patterns) {
    for (const line of lines) {
      const m = line.match(re)
      if (!m) continue
      let year = m[1] === '元' ? 1 : Number(m[1])
      if (era) year += 2018
      else if (shortYear) year += 2000
      const months = fuzzy ? digitChoices(m[2]) : [Number(m[2])]
      const days = fuzzy ? digitChoices(m[3]) : [Number(m[3])]
      for (const month of months) {
        for (const day of days) {
          if (isValidDate(year, month, day)) return toIsoDate(year, month, day)
        }
      }
    }
  }
  return null
}

// 金額の中でOCRが数字を文字と読みまちがえやすいもの（「¥1,O80」の O など）を直す
function fixDigits(line) {
  return line.replace(/(?<=[¥\\\d,])[OoD](?=[\d,]|円|$)/g, '0').replace(/(?<=[¥\\\d,])[lI|](?=[\d,]|円|$)/g, '1')
}

// 行の中の金額らしい数字を取り出す。「¥」や「円」が付いているものを優先する。
function amountsInLine(line) {
  const results = []
  const re = /([¥\\])?(\d{1,3}(?:[,.]\d{3})+|\d+)(円)?/g
  for (const m of fixDigits(line).matchAll(re)) {
    const value = Number(m[2].replace(/[,.]/g, ''))
    if (!Number.isFinite(value) || value <= 0 || value > MAX_AMOUNT) continue
    // 「8%」「10%」のような税率は金額ではない
    if (line[m.index + m[0].length] === '%') continue
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

// 行の見出し（金額より前の部分）
function labelOf(line) {
  const m = line.match(/[¥\\]?\d[\d,.]*円?\)?$/)
  return m ? line.slice(0, m.index) : line
}

// 見出しの後ろ、なければ次の行から金額を取る
function amountAfter(lines, i, keywordEnd) {
  return pickAmount(lines[i].slice(keywordEnd)) ?? (lines[i + 1] && !/\D{2,}/.test(labelOf(lines[i + 1])) ? pickAmount(lines[i + 1]) : null)
}

// 合計金額の候補を、確からしい順に並べる。
// OCRは「合計」の字を読みまちがえることがあるので、ひとつの手がかりだけに頼らず
// 「合計」の行・支払い方法の行・お預り−お釣り・小計 の点数を足して決める。
export function findTotalCandidates(text) {
  const lines = normalizeText(text).split('\n').map(compact).filter(Boolean)
  const scores = new Map()
  const add = (value, points, order) => {
    if (value == null) return
    const prev = scores.get(value) ?? { value, score: 0, order }
    prev.score += points
    prev.order = Math.min(prev.order, order)
    scores.set(value, prev)
  }

  let deposit = null
  let change = null
  lines.forEach((line, i) => {
    const label = labelOf(line)
    const excluded = EXCLUDE_KEYWORDS.test(label.replace('税込', ''))
    const keyword = TOTAL_KEYWORDS.find((k) => label.includes(k))
    if (keyword && !excluded && !SUBTOTAL_KEYWORDS.some((k) => label.includes(k))) {
      add(amountAfter(lines, i, line.indexOf(keyword) + keyword.length), 4, 0)
    } else if (!excluded && TOTAL_MISREAD.test(label)) {
      add(pickAmount(line), 3, 1)
    } else if (SUBTOTAL_KEYWORDS.some((k) => label.includes(k)) && !excluded) {
      add(amountAfter(lines, i, line.indexOf('小計') + 2), 1, 3)
    } else if (PAYMENT_KEYWORDS.test(label) && !/残高|ポイント/.test(label)) {
      add(pickAmount(line), 2, 2)
    }
    if (DEPOSIT_KEYWORDS.test(label) && !CHANGE_KEYWORDS.test(label)) deposit ??= pickAmount(line)
    if (CHANGE_KEYWORDS.test(label)) change ??= pickAmount(line)
  })
  if (deposit != null && change != null && deposit > change) add(deposit - change, 3, 1)

  return [...scores.values()]
    .sort((a, b) => b.score - a.score || a.order - b.order || b.value - a.value)
    .map((c) => c.value)
}

export function findTotal(text) {
  return findTotalCandidates(text)[0] ?? null
}

// 読みまちがえたときにすぐ選び直せるように、レシートに出てくる金額を大きい順に並べる
export function findAmounts(text) {
  const values = new Set()
  for (const line of normalizeText(text).split('\n').map(compact)) {
    if (/対象|税|%|残高|ポイント|TEL|電話|登録番号/.test(labelOf(line))) continue
    for (const a of amountsInLine(line)) if (a.marked) values.add(a.value)
  }
  return [...values].sort((a, b) => b - a)
}

// OCRが日本語の文字の間に入れた空白を消す（英数字どうしの空白は残す）
function joinJapanese(line) {
  return line.replace(/(?<=[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}ー])\s+(?=[\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}ー])/gu, '')
}

// 店名ではない行（あいさつ・見出し・住所・電話番号など）
const NOT_STORE = /領収|レシート|TEL|電話|登録番号|いらっしゃいませ|ありがとう|ご来店|毎度|〒|^(東京都|北海道|(京都|大阪)府|.{2,3}県)|お客様|計|[¥\\]|\d{1,2}:\d{2}|\d+[年/.-]\d+/i

function isStoreLike(line) {
  const letters = line.replace(/[\d\s\-‐ー_.,:;/\\()（）¥*#=|]/g, '')
  return letters.length >= 2 && !NOT_STORE.test(line.replace(/\s/g, ''))
}

// 店名はたいてい一番上のほうにあり、ロゴのように大きな文字で印刷されている。
// lines（行ごとの文字の高さ）があれば、上の5行のうち一番大きい文字の行を選ぶ。
export function findStoreName(text, lines = null) {
  if (lines?.length) {
    const top = lines.filter((l) => l.text.trim()).slice(0, 5)
    const heights = lines.map((l) => l.height).sort((a, b) => a - b)
    const median = heights[Math.floor(heights.length / 2)]
    const candidates = top.filter((l) => isStoreLike(normalizeText(l.text)))
    const biggest = candidates.reduce((best, l) => (!best || l.height > best.height ? l : best), null)
    if (biggest && biggest.height >= median * 1.2) return joinJapanese(normalizeText(biggest.text).trim())
  }
  const textLines = normalizeText(text).split('\n').map((l) => l.trim()).filter(Boolean)
  const found = textLines.slice(0, 5).find(isStoreLike)
  return found ? joinJapanese(found) : null
}

export function parseReceipt(text, lines = null) {
  const totals = findTotalCandidates(text)
  return {
    date: findDate(text),
    total: totals[0] ?? null,
    store: findStoreName(text, lines),
    // 読みまちがえたときにタップで選び直せる金額（確からしい順 → 大きい順）
    amounts: [...new Set([...totals, ...findAmounts(text)])].slice(0, 8),
  }
}
