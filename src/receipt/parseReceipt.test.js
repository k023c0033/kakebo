import { describe, expect, it } from 'vitest'
import { findDate, findStoreName, findTotal, findTotalCandidates, parseReceipt } from './parseReceipt.js'

describe('findDate', () => {
  it.each([
    ['2026年9月30日(水) 12:34', '2026-09-30'],
    ['2026/09/30 12:34', '2026-09-30'],
    ['2026-9-3', '2026-09-03'],
    ['26/09/30 18:02', '2026-09-30'],
    ['令和8年9月30日', '2026-09-30'],
    ['R8.9.30', '2026-09-30'],
    ['２０２６年　９月３０日', '2026-09-30'],
    ['2 0 2 6 / 0 9 / 3 0', '2026-09-30'],
    ['2026% 9月29日(火)', '2026-09-29'],
    ['2026年99月28日(月)', '2026-09-28'],
  ])('%s → %s', (text, expected) => {
    expect(findDate(text)).toBe(expected)
  })

  it('ありえない日付は無視する', () => {
    expect(findDate('2026/13/40')).toBeNull()
    expect(findDate('TEL 03-1234-5678')).toBeNull()
  })
})

describe('findTotal', () => {
  it('合計の行から金額を読む', () => {
    expect(findTotal('小計 ¥1,000\n合計 ¥1,100\nお預り ¥2,000\nお釣り ¥900')).toBe(1100)
  })

  it('空白が入った「合 計」や全角の金額も読める', () => {
    expect(findTotal('合 計　￥１，２３４')).toBe(1234)
  })

  it('点数が同じ行にあっても金額を選ぶ', () => {
    expect(findTotal('合計 3点 ¥980')).toBe(980)
  })

  it('金額が次の行にあるときも読める', () => {
    expect(findTotal('合計\n¥2,480')).toBe(2480)
  })

  it('税の行やお預りの行は合計として使わない', () => {
    expect(findTotal('(内消費税等 ¥90)\n10%対象 ¥990\n合計 ¥990\nお預り合計 ¥1,000')).toBe(990)
  })

  it('合計がなければ小計を使う', () => {
    expect(findTotal('小計 ¥500')).toBe(500)
  })

  it('何もなければ null', () => {
    expect(findTotal('ありがとうございました')).toBeNull()
  })
})

describe('findTotal（OCRの読みまちがいがあるとき）', () => {
  it('「合計(税込)」も合計として読む', () => {
    expect(findTotal('内税10% ¥98\n合計(税込) ¥1,080\nQR決済 ¥1,080')).toBe(1080)
  })

  it('「合計」の字が読めなくても、お預り−お釣りから求める', () => {
    expect(findTotal('小 計 ¥3,261\n消費税 8% ¥260\n割引 -¥100\nA 計 ¥3,421\n現 計 ¥5,000\nおつり ¥1,579')).toBe(3421)
  })

  it('「合計」の字が読めなくても、支払い方法の行から求める', () => {
    expect(findTotal('小計 ¥648\nan ¥648\n(税率10%対象 ¥190)\n交通系IC支払 ¥648\n残高 ¥3,210')).toBe(648)
  })

  it('金額の中の O を 0 として読む', () => {
    expect(findTotal('合計 ¥1,O80')).toBe(1080)
  })

  it('税率の「10%」は金額にしない', () => {
    expect(findTotalCandidates('外税10%\n合計 ¥500')).toEqual([500])
  })
})

describe('parseReceipt の金額候補', () => {
  it('合計の候補を先に、そのほかの金額を大きい順に並べる', () => {
    const { amounts } = parseReceipt('牛乳 ¥198\n合計 ¥776\nお預り ¥1,000\nお釣り ¥230')
    expect(amounts.slice(0, 2)).toEqual([776, 770])
    expect(amounts).toContain(198)
  })
})

describe('findStoreName', () => {
  it('上のほうの最初の文字の行を店名にする', () => {
    expect(findStoreName('\n  \nファミリーマート 渋谷店\nTEL 03-1234-5678')).toBe('ファミリーマート渋谷店')
  })

  it('日本語の文字の間に入った空白を消す', () => {
    expect(findStoreName('スー パー テス ト 駅 前 店')).toBe('スーパーテスト駅前店')
    expect(findStoreName('CAFE ABC 渋 谷')).toBe('CAFE ABC 渋谷')
  })

  it('あいさつや住所の行は飛ばす', () => {
    expect(findStoreName('いらっしゃいませ\nハッピーマート 駅前店\n東京都中野区1-2-3')).toBe('ハッピーマート駅前店')
  })

  it('行の文字の高さがわかれば、上のほうで一番大きい行を選ぶ', () => {
    const lines = [
      { text: '本日はご来店ありがとうございます', height: 20 },
      { text: '中央店', height: 20 },
      { text: 'スーパーまるやま', height: 34 },
      { text: '牛乳 ¥198', height: 20 },
      { text: '合計 ¥198', height: 34 },
    ]
    expect(findStoreName('', lines)).toBe('スーパーまるやま')
  })

  it('領収書などの見出しは飛ばす', () => {
    expect(findStoreName('領収書\nカフェ・ド・テスト')).toBe('カフェ・ド・テスト')
  })
})

describe('parseReceipt', () => {
  it('まとめて取り出す', () => {
    const text = `スーパーテスト 駅前店
TEL 03-0000-0000
2026年9月30日(水) 18:02
牛乳 ¥198
食パン ¥158
小計 ¥356
(内消費税等 ¥26)
合計 ¥356
お預り ¥1,000
お釣り ¥644`
    expect(parseReceipt(text)).toMatchObject({ date: '2026-09-30', total: 356, store: 'スーパーテスト駅前店' })
  })
})
