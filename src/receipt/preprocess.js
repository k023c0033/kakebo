// レシート写真を、文字読み取り（OCR）が読みやすい形に整える。
// 1. 写真の中からレシートの紙（明るい四角）を探して、斜めやゆがみをまっすぐに直して切り出す
// 2. 文字が小さすぎないように拡大する
// 3. 影やムラを消して、薄くなった文字を濃くする
// どれもスマホの中だけで計算する（写真はどこにも送らない）。
// 画面に依存しない計算だけをここに置き、テストできるようにしている。

// 写真の明るさ（0〜255）を1マスずつ並べた配列にする
export function toGray({ data, width, height }) {
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0, j = 0; j < gray.length; i += 4, j++) {
    gray[j] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000
  }
  return gray
}

// 白と黒を分けるのにちょうどいい明るさを自動で決める（大津の方法）
export function otsuThreshold(gray) {
  const hist = new Array(256).fill(0)
  for (const v of gray) hist[v]++
  const total = gray.length
  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * hist[i]
  let sumBack = 0
  let countBack = 0
  let best = 0
  let threshold = 127
  for (let t = 0; t < 256; t++) {
    countBack += hist[t]
    if (countBack === 0) continue
    const countFore = total - countBack
    if (countFore === 0) break
    sumBack += t * hist[t]
    const meanBack = sumBack / countBack
    const meanFore = (sumAll - sumBack) / countFore
    const between = countBack * countFore * (meanBack - meanFore) ** 2
    if (between > best) {
      best = between
      threshold = t
    }
  }
  return threshold
}

// 小さく縮めた画像（計算を速くするため）
function shrink(gray, width, height, maxSide) {
  const scale = Math.min(1, maxSide / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))
  const out = new Uint8ClampedArray(w * h)
  for (let y = 0; y < h; y++) {
    const sy = Math.min(height - 1, Math.floor(y / scale))
    for (let x = 0; x < w; x++) {
      out[y * w + x] = gray[sy * width + Math.min(width - 1, Math.floor(x / scale))]
    }
  }
  return { gray: out, width: w, height: h, scale: w / width }
}

// 写真の中のレシートの紙（いちばん大きい明るい部分）の四すみを探す。
// 紙が写真いっぱいに写っているときや、見つからないときは null。
export function findPaperQuad(gray, width, height) {
  const small = shrink(gray, width, height, 400)
  const { width: w, height: h } = small
  const threshold = otsuThreshold(small.gray)
  const bright = small.gray.map((v) => (v > threshold ? 1 : 0))

  // つながった明るい部分のうち、いちばん大きいものを探す
  const label = new Int32Array(w * h)
  let bestLabel = 0
  let bestSize = 0
  let next = 1
  const stack = []
  for (let start = 0; start < w * h; start++) {
    if (!bright[start] || label[start]) continue
    let size = 0
    label[start] = next
    stack.push(start)
    while (stack.length) {
      const p = stack.pop()
      size++
      const x = p % w
      const y = (p - x) / w
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && bright[q] && !label[q]) {
          label[q] = next
          stack.push(q)
        }
      }
    }
    if (size > bestSize) {
      bestSize = size
      bestLabel = next
    }
    next++
  }

  const ratio = bestSize / (w * h)
  // 小さすぎるのは紙ではなく、大きすぎるのは紙が写真いっぱい（切り出す必要なし）
  if (ratio < 0.02 || ratio > 0.85) return null

  // 背景も明るい（白い机など）と、紙と背景がつながって写真の3辺以上に届く。そのときは切り出さない
  let top = false, bottom = false, left = false, right = false
  for (let p = 0; p < w * h; p++) {
    if (label[p] !== bestLabel) continue
    const x = p % w
    const y = (p - x) / w
    if (y === 0) top = true
    if (y === h - 1) bottom = true
    if (x === 0) left = true
    if (x === w - 1) right = true
  }
  if (top + bottom + left + right >= 3) return null

  // 四すみ：左上は x+y、右上は y-x、右下は -(x+y)、左下は x-y がいちばん小さい点
  const corners = [null, null, null, null]
  const best = [Infinity, Infinity, Infinity, Infinity]
  for (let p = 0; p < w * h; p++) {
    if (label[p] !== bestLabel) continue
    const x = p % w
    const y = (p - x) / w
    const scores = [x + y, y - x, -(x + y), x - y]
    for (let k = 0; k < 4; k++) {
      if (scores[k] < best[k]) {
        best[k] = scores[k]
        corners[k] = [x, y]
      }
    }
  }
  const s = 1 / small.scale
  const quad = corners.map(([x, y]) => [(x + 0.5) * s, (y + 0.5) * s])

  // 四すみで囲んだ面積が、明るい部分の面積とだいたい同じなら四角い紙とみなす
  // （くしゃくしゃの紙や、背景も明るい写真ではゆがめずにそのまま読む）
  const quadArea = polygonArea(quad) * small.scale * small.scale
  if (quadArea < bestSize * 0.8 || quadArea > bestSize * 1.35) return null
  return quad
}

function polygonArea(points) {
  let area = 0
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i]
    const [x2, y2] = points[(i + 1) % points.length]
    area += x1 * y2 - x2 * y1
  }
  return Math.abs(area) / 2
}

const dist = ([x1, y1], [x2, y2]) => Math.hypot(x2 - x1, y2 - y1)

// 長方形の (u, v) を、写真の中の四角形 quad の位置に移す式（射影変換）を求める
function homography(width, height, quad) {
  const src = [[0, 0], [width, 0], [width, height], [0, height]]
  const a = []
  const b = []
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i]
    const [x, y] = quad[i]
    a.push([u, v, 1, 0, 0, 0, -u * x, -v * x])
    b.push(x)
    a.push([0, 0, 0, u, v, 1, -u * y, -v * y])
    b.push(y)
  }
  return [...solve(a, b), 1]
}

// 連立方程式を解く（ガウスの消去法）
function solve(a, b) {
  const n = b.length
  const m = a.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(m[r][col]) > Math.abs(m[pivot][col])) pivot = r
    ;[m[col], m[pivot]] = [m[pivot], m[col]]
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = m[r][col] / m[col][col]
      for (let c = col; c <= n; c++) m[r][c] -= f * m[col][c]
    }
  }
  return m.map((row, i) => row[n] / row[i])
}

// 写真の中の四角形 quad を、まっすぐな長方形に引きのばして切り出す
export function warpQuad(gray, width, height, quad, outWidth, outHeight) {
  const [h0, h1, h2, h3, h4, h5, h6, h7] = homography(outWidth, outHeight, quad)
  const out = new Uint8ClampedArray(outWidth * outHeight)
  for (let v = 0; v < outHeight; v++) {
    for (let u = 0; u < outWidth; u++) {
      const d = h6 * u + h7 * v + 1
      const x = (h0 * u + h1 * v + h2) / d - 0.5
      const y = (h3 * u + h4 * v + h5) / d - 0.5
      const x0 = Math.max(0, Math.min(width - 2, Math.floor(x)))
      const y0 = Math.max(0, Math.min(height - 2, Math.floor(y)))
      const fx = Math.max(0, Math.min(1, x - x0))
      const fy = Math.max(0, Math.min(1, y - y0))
      const p = y0 * width + x0
      const top = gray[p] * (1 - fx) + gray[p + 1] * fx
      const bottom = gray[p + width] * (1 - fx) + gray[p + width + 1] * fx
      out[v * outWidth + u] = top * (1 - fy) + bottom * fy
    }
  }
  return out
}

// 拡大・縮小（なめらかに）
export function resize(gray, width, height, outWidth, outHeight) {
  return warpQuad(gray, width, height, [[0, 0], [width, 0], [width, height], [0, height]], outWidth, outHeight)
}

// 影やムラを消して、文字をくっきりさせる。
// まわりの明るさ（紙の色）で割ると、影の部分も紙は白、文字は黒になる。
export function flattenLighting(gray, width, height) {
  const radius = Math.max(8, Math.round(Math.min(width, height) / 30))
  // まず小さく黒い点（文字）を消して紙の明るさだけにする（近くの最大値）
  const paper = boxBlur(maxFilter(gray, width, height, Math.max(2, Math.round(radius / 3))), width, height, radius)
  const ratio = new Float32Array(gray.length)
  for (let i = 0; i < gray.length; i++) ratio[i] = Math.min(1, gray[i] / Math.max(1, paper[i]))

  // 一番濃い文字が真っ黒、紙が真っ白になるように引きのばす
  const sorted = Float32Array.from(ratio).sort()
  const dark = sorted[Math.floor(sorted.length * 0.005)]
  const light = 0.92
  const span = Math.max(0.05, light - dark)
  const out = new Uint8ClampedArray(gray.length)
  for (let i = 0; i < gray.length; i++) out[i] = ((ratio[i] - dark) / span) * 255
  return out
}

function maxFilter(gray, width, height, r) {
  const tmp = new Uint8ClampedArray(gray.length)
  const out = new Uint8ClampedArray(gray.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let m = 0
      for (let k = Math.max(0, x - r); k <= Math.min(width - 1, x + r); k++) m = Math.max(m, gray[y * width + k])
      tmp[y * width + x] = m
    }
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let m = 0
      for (let k = Math.max(0, y - r); k <= Math.min(height - 1, y + r); k++) m = Math.max(m, tmp[k * width + x])
      out[y * width + x] = m
    }
  }
  return out
}

function boxBlur(gray, width, height, r) {
  // 合計表（integral image）で、まわりの平均を速く求める
  const sums = new Float64Array((width + 1) * (height + 1))
  for (let y = 0; y < height; y++) {
    let row = 0
    for (let x = 0; x < width; x++) {
      row += gray[y * width + x]
      sums[(y + 1) * (width + 1) + x + 1] = sums[y * (width + 1) + x + 1] + row
    }
  }
  const out = new Float32Array(gray.length)
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - r)
    const y1 = Math.min(height, y + r + 1)
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - r)
      const x1 = Math.min(width, x + r + 1)
      const s = sums[y1 * (width + 1) + x1] - sums[y0 * (width + 1) + x1] - sums[y1 * (width + 1) + x0] + sums[y0 * (width + 1) + x0]
      out[y * width + x] = s / ((x1 - x0) * (y1 - y0))
    }
  }
  return out
}

// 読み取りにちょうどいい大きさ（レシートの横幅）
const TARGET_WIDTH = 1100
const MAX_PIXELS = 5_000_000

// 写真（色つき）を受け取り、まっすぐ・大きく・くっきりした白黒の画像を返す
export function prepareReceiptImage(imageData) {
  const { width, height } = imageData
  const gray = toGray(imageData)
  const quad = findPaperQuad(gray, width, height)

  let paperWidth = width
  let paperHeight = height
  if (quad) {
    const [tl, tr, br, bl] = quad
    paperWidth = (dist(tl, tr) + dist(bl, br)) / 2
    paperHeight = (dist(tl, bl) + dist(tr, br)) / 2
  }
  // 紙を切り出せたときはその横幅を、切り出せなかったときは写真を小さくしすぎないようにそろえる
  let scale = quad ? TARGET_WIDTH / paperWidth : Math.max(1, TARGET_WIDTH / paperWidth)
  if (paperWidth * paperHeight * scale * scale > MAX_PIXELS) scale = Math.sqrt(MAX_PIXELS / (paperWidth * paperHeight))
  const outWidth = Math.max(1, Math.round(paperWidth * scale))
  const outHeight = Math.max(1, Math.round(paperHeight * scale))

  const straight = quad
    ? warpQuad(gray, width, height, quad, outWidth, outHeight)
    : resize(gray, width, height, outWidth, outHeight)
  return { gray: flattenLighting(straight, outWidth, outHeight), width: outWidth, height: outHeight, cropped: Boolean(quad) }
}
