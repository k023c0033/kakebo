import { describe, expect, it } from 'vitest'
import { findDate, findStoreName, findTotal, parseReceipt } from './parseReceipt.js'

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

describe('findStoreName', () => {
  it('上のほうの最初の文字の行を店名にする', () => {
    expect(findStoreName('\n  \nファミリーマート 渋谷店\nTEL 03-1234-5678')).toBe('ファミリーマート渋谷店')
  })

  it('日本語の文字の間に入った空白を消す', () => {
    expect(findStoreName('スー パー テス ト 駅 前 店')).toBe('スーパーテスト駅前店')
    expect(findStoreName('CAFE ABC 渋 谷')).toBe('CAFE ABC 渋谷')
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
    expect(parseReceipt(text)).toEqual({ date: '2026-09-30', total: 356, store: 'スーパーテスト駅前店' })
  })
})
