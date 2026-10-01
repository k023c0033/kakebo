import { describe, expect, it } from 'vitest'
import { findPaperQuad, otsuThreshold, prepareReceiptImage } from './preprocess.js'

// 暗い背景(60)の上に、白い紙(230)の四角を置いた画像を作る
function photoWithPaper(width, height, [x0, y0, x1, y1], background = 60) {
  const gray = new Uint8ClampedArray(width * height).fill(background)
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) gray[y * width + x] = 230
  return gray
}

describe('otsuThreshold', () => {
  it('暗い部分と明るい部分の間の明るさを選ぶ', () => {
    const t = otsuThreshold(photoWithPaper(100, 100, [20, 20, 80, 80]))
    expect(t).toBeGreaterThanOrEqual(60)
    expect(t).toBeLessThan(230)
  })
})

describe('findPaperQuad', () => {
  it('暗い背景の上の紙の四すみを見つける', () => {
    const quad = findPaperQuad(photoWithPaper(400, 600, [100, 150, 300, 500]), 400, 600)
    const expected = [[100, 150], [300, 150], [300, 500], [100, 500]]
    quad.forEach(([x, y], i) => {
      expect(Math.abs(x - expected[i][0])).toBeLessThan(4)
      expect(Math.abs(y - expected[i][1])).toBeLessThan(4)
    })
  })

  it('紙が写真いっぱいのときは切り出さない', () => {
    expect(findPaperQuad(photoWithPaper(200, 300, [0, 0, 200, 300]), 200, 300)).toBeNull()
  })

  it('背景も明るい（白い机）ときは切り出さない', () => {
    // 白い机(230)の上の、影で少し暗く写った紙(60)。明るい部分は写真のふちまで届く
    const gray = photoWithPaper(400, 600, [0, 0, 400, 600])
    for (let y = 150; y < 500; y++) for (let x = 100; x < 300; x++) gray[y * 400 + x] = 60
    expect(findPaperQuad(gray, 400, 600)).toBeNull()
  })
})

describe('prepareReceiptImage', () => {
  it('紙を切り出して、読みやすい横幅に拡大する', () => {
    const gray = photoWithPaper(400, 600, [100, 150, 300, 500])
    const data = new Uint8ClampedArray(gray.length * 4)
    gray.forEach((v, i) => data.set([v, v, v, 255], i * 4))
    const out = prepareReceiptImage({ data, width: 400, height: 600 })
    expect(out.cropped).toBe(true)
    expect(out.width).toBe(1100)
    expect(Math.abs(out.height - 1925)).toBeLessThan(40)
  })
})
