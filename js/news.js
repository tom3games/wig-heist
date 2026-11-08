// 結果の紙: 翌朝の新聞の号外。見出し・写真（いちばんの紙一重）・逃げ方の数字・懸賞金・市長の一言・手配の判
// 1枚の画像にして保存・SNS に貼れる
const W = 1080, H = 1350
const MIN = '"Zen Old Mincho", "Hiragino Mincho ProN", "Yu Mincho", serif', SANS = '"BIZ UDPGothic", "Hiragino Sans", sans-serif'

export function drawNews(cv, d) {
  cv.width = W; cv.height = H
  const x = cv.getContext('2d')
  // 背景: 夜の机
  x.fillStyle = '#0d1020'; x.fillRect(0, 0, W, H)
  x.save(); x.translate(W / 2, H / 2); x.rotate(0.012); x.translate(-W / 2, -H / 2)
  const L = 56, T = 40, PW = W - 112, PH = H - 80
  x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(L + 10, T + 14, PW, PH)
  x.fillStyle = '#ece5d4'; x.fillRect(L, T, PW, PH)
  // 紙の黄ばみ（決まった場所に）
  let sd = 11; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647
  for (let i = 0; i < 18; i++) { const cx = L + rr() * PW, cy = T + rr() * PH, g = x.createRadialGradient(cx, cy, 2, cx, cy, 60 + rr() * 140); g.addColorStop(0, 'rgba(150,120,70,.1)'); g.addColorStop(1, 'rgba(150,120,70,0)'); x.fillStyle = g; x.fillRect(L, T, PW, PH) }
  const ink = '#16140f', red = '#b0201a', mute = '#5c564a', rule = '#2a2620'
  // 題字の帯: 新聞の名前・日付・号外
  x.textBaseline = 'alphabetic'; x.fillStyle = ink; x.textAlign = 'left'
  x.font = `900 46px ${MIN}`; x.fillText(d.paper, L + 36, T + 70)
  x.font = `700 22px ${SANS}`; x.fillStyle = mute; x.fillText(d.date, L + 38, T + 104)
  x.fillStyle = rule; x.fillRect(L + 30, T + 120, PW - 60, 5); x.fillRect(L + 30, T + 130, PW - 60, 1.5)
  // 号外（赤い四角）
  x.save(); x.translate(L + PW - 120, T + 64); x.rotate(-0.04)
  x.fillStyle = red; x.fillRect(-84, -50, 168, 100)
  x.fillStyle = '#fff4ec'; x.font = `900 ${d.ja ? 62 : 40}px ${MIN}`; x.textAlign = 'center'; x.fillText(d.extra, 0, d.ja ? 22 : 15)
  x.restore()
  // 大見出し（日本語は縦書きで右・英語は横書きで上）と写真
  let HY = T + 160
  x.fillStyle = ink
  const head = d.head
  let px = L + 36, py = HY, pw, ph
  if (d.ja) {
    const hs = Math.max(...head.split('\n').map(l => l.length)) > 7 ? 78 : 92
    x.font = `900 ${hs}px ${MIN}`; x.textAlign = 'center'
    const colX = L + PW - 70
    vert(x, head, colX, HY + hs * 0.9, hs * 1.02, Math.floor((640) / (hs * 1.02)), hs * 1.05)
    // 小見出し（縦・二列目）
    x.font = `700 40px ${MIN}`; x.fillStyle = d.good ? '#1d4a30' : red
    const subX = colX - (head.includes('\n') || head.length > Math.floor(640 / (hs * 1.02)) ? hs * 2.2 : hs * 1.25)
    vert(x, d.sub, subX, HY + 40, 42, 15, 44)
    pw = subX - 60 - px; ph = Math.round(pw * 0.72)
  } else {
    x.textAlign = 'left'; x.font = `900 64px ${MIN}`
    const lines = wrapLines(x, head, PW - 72)
    lines.forEach((ln, i) => x.fillText(ln, L + 36, HY + 58 + i * 70))
    HY += lines.length * 70 + 10
    x.font = `700 34px ${MIN}`; x.fillStyle = d.good ? '#1d4a30' : red; x.fillText(d.sub, L + 36, HY + 30)
    py = HY + 54; pw = PW - 72; ph = Math.round(pw * 0.42)
  }
  x.fillStyle = '#d8d0bc'; x.fillRect(px - 6, py - 6, pw + 12, ph + 12)
  if (d.photo) {
    x.save(); x.beginPath(); x.rect(px, py, pw, ph); x.clip()
    const iw = d.photo.width, ih = d.photo.height, s = Math.max(pw / iw, ph / ih)
    x.filter = 'grayscale(1) contrast(1.25) brightness(1.15) sepia(.25)'
    x.drawImage(d.photo, px + (pw - iw * s) / 2, py + (ph - ih * s) / 2, iw * s, ih * s)
    x.filter = 'none'
    // 網点（新聞の写真らしく）
    x.fillStyle = 'rgba(236,229,212,.22)'
    for (let yy = py; yy < py + ph; yy += 5) for (let xx = px + ((yy / 5) % 2) * 2.5; xx < px + pw; xx += 5) x.fillRect(xx, yy, 1.6, 1.6)
    x.restore()
  } else { x.fillStyle = '#2a2a2e'; x.fillRect(px, py, pw, ph) }
  x.fillStyle = mute; x.font = `700 22px ${SANS}`; x.textAlign = 'left'
  wrap(x, d.caption, px, py + ph + 34, pw, 30)
  // 本文の線
  let y = py + ph + 104
  x.fillStyle = rule; x.fillRect(px, y - 40, pw, 2)
  // 逃げ方の数字（2列）
  const half = (pw - 24) / 2
  d.stats.forEach(([k, v, good], i) => {
    const cx = px + (i % 2) * (half + 24), cy = y + Math.floor(i / 2) * 50
    x.fillStyle = mute; x.font = `700 24px ${SANS}`; x.textAlign = 'left'; x.fillText(k, cx, cy)
    x.fillStyle = good ? '#1d4a30' : ink; x.font = `900 32px ${MIN}`; x.textAlign = 'right'; x.fillText(v, cx + half, cy + 2)
    x.strokeStyle = '#b8ae98'; x.lineWidth = 1.5; x.setLineDash([4, 6]); x.beginPath(); x.moveTo(cx, cy + 14); x.lineTo(cx + half, cy + 14); x.stroke(); x.setLineDash([])
  })
  y += Math.ceil(d.stats.length / 2) * 50 + 18
  // 懸賞金（下の帯）
  const by = T + PH - 300
  x.fillStyle = rule; x.fillRect(L + 30, by - 18, PW - 60, 3)
  x.fillStyle = mute; x.font = `700 28px ${SANS}`; x.textAlign = 'left'; x.fillText(d.bountyLabel, L + 40, by + 26)
  x.fillStyle = ink; x.font = `900 108px ${MIN}`; x.fillText(d.bounty, L + 34, by + 134)
  // 市長の一言（吹き出しではなく、談話の囲み）
  x.fillStyle = '#16140f'; x.fillRect(L + 40, by + 168, 96, 38)
  x.fillStyle = '#ece5d4'; x.font = `700 22px ${SANS}`; x.textAlign = 'center'; x.fillText(d.mayor, L + 88, by + 195)
  x.fillStyle = ink; x.font = `700 30px ${MIN}`; x.textAlign = 'left'
  wrap(x, d.quote, L + 152, by + 198, PW - 152 - 330, 40)
  // 手配の判（評価）: 朱の丸い判
  x.save(); x.translate(L + PW - 160, by + 110); x.rotate(-0.16)
  x.strokeStyle = red; x.lineWidth = 9; x.beginPath(); x.arc(0, 0, 118, 0, Math.PI * 2); x.stroke(); x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 102, 0, Math.PI * 2); x.stroke()
  x.fillStyle = red; x.textAlign = 'center'
  x.font = `700 22px ${SANS}`; x.fillText(d.rankLabel, 0, -58)
  x.font = `900 120px ${MIN}`; x.fillText(d.rank, 0, 40)
  x.font = `900 ${d.rankName.length > 7 ? 20 : 26}px ${MIN}`; x.fillText(d.rankName, 0, 82)
  // 判のかすれ（紙の色で上から削る）
  for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(236,229,212,${0.3 + rr() * 0.5})`; const a = rr() * 6.28, r0 = rr() * 120; x.fillRect(Math.cos(a) * r0, Math.sin(a) * r0, 2 + rr() * 6, 1 + rr() * 3) }
  x.restore()
  x.fillStyle = mute; x.font = `400 20px ${SANS}`; x.textAlign = 'right'; x.fillText(d.footer, L + PW - 36, T + PH - 22)
  x.restore()
}
// 縦書き（列の右から左へ）。per: 1列の字数
function vert(x, s, X, Y, step, per, colGap) {
  // 改行（\n）で列を分ける（語の途中で折らない）。無ければ per 字ずつ
  if (s.includes('\n')) { let col = 0; for (const part of s.split('\n')) { const n = Math.ceil([...part].length / per); vert(x, part, X - col * colGap, Y, step, per, colGap); col += n } return }
  const cs = [...s]
  cs.forEach((c, i) => {
    const col = Math.floor(i / per), row = i % per
    const cx = X - col * colGap, cy = Y + row * step
    // 句読点・小さい字・長音は縦書きの形に
    if ('、。'.includes(c)) { x.fillText(c, cx + step * 0.32, cy - step * 0.55); return }
    if ('ー〜…'.includes(c)) { x.save(); x.translate(cx, cy - step * 0.33); x.rotate(Math.PI / 2); x.fillText(c, 0, step * 0.33); x.restore(); return }
    if ('「」（）'.includes(c)) { x.save(); x.translate(cx, cy - step * 0.33); x.rotate(Math.PI / 2); x.fillText(c, 0, step * 0.33); x.restore(); return }
    x.fillText(c, cx, cy)
  })
}
function wrapLines(x, s, w) {
  const out = []; let line = ''
  for (const word of s.split(' ')) { const tryL = line ? line + ' ' + word : word; if (x.measureText(tryL).width > w && line) { out.push(line); line = word } else line = tryL }
  if (line) out.push(line)
  return out
}
function wrap(x, s, X, Y, w, lh) {
  let line = '', y = Y
  const parts = /[^\x00-\x7f]/.test(s) ? [...s] : s.split(/(?<= )/)
  for (const c of parts) { if (x.measureText(line + c).width > w && line) { x.fillText(line, X, y); line = c.trimStart(); y += lh } else line += c }
  if (line) x.fillText(line, X, y)
}
