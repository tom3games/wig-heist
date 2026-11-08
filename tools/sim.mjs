// bot を種を変えて回し、結果の分布を出す。node tools/sim.mjs [回数] [性格] [v=1で出来事を全部出す]
import { createWorld } from '../shared/track.js?v=1'
import { createRunner, stepRunner } from '../shared/runner.js?v=1'
import { createStreet, buildPoles } from '../shared/street.js?v=1'
import { addTown, clearShopFront } from '../shared/town.js?v=1'
import { createHeist, stepHeist, summary, SHOP, SPAWN, RANKS, rankOf, addHeistMap } from '../shared/heist.js?v=1'
import { createBot, botInput } from '../shared/heistbot.js?v=1'
const N = +(process.argv[2] || 8), only = process.argv[3], verbose = process.argv[4] === 'v'
const world = createWorld('city'); clearShopFront(world, SHOP); addTown(world, SHOP); buildPoles(world, SHOP); addHeistMap(world)
const dt = 1 / 60
export function play(kind, seed) {
  const r = createRunner({ id: 'me', spawn: SPAWN })
  const H = createHeist(world, seed), b = createBot(kind, seed), st = createStreet(world, seed)
  const cnt = {}
  while (!H.over && H.t < 400) {
    const inp = botInput(b, r, H, world, dt)
    r.events.length = 0
    stepRunner(r, inp, dt, world); st.update(dt, r); st.collide(r)
    stepHeist(H, r, dt)
    for (const e of r.events) cnt['r:' + e.t] = (cnt['r:' + e.t] || 0) + 1
    for (const e of H.events) { cnt[e.t] = (cnt[e.t] || 0) + 1; if (verbose && !['pts', 'multUp'].includes(e.t)) console.log(H.t.toFixed(1), JSON.stringify(e)) }
    H.events.length = 0
    if (verbose && Math.round(H.t * 60) % 60 === 0) console.log(H.t.toFixed(0), 'pos', r.x.toFixed(0), r.y.toFixed(0), r.z.toFixed(0), 'v', Math.hypot(r.vx, r.vy, r.vz).toFixed(0), r.rope ? 'rope' : r.grounded ? 'ground' : r.climbing ? 'climb' : 'air', 'cp', H.cp)
  }
  return { ...summary(H), cnt }
}
const kinds = only ? only.split(',') : ['skilled', 'average', 'notech', 'idle']
for (const k of kinds) {
  const rows = [], t0 = Date.now()
  for (let s = +(process.env.S0 || 1); s < +(process.env.S0 || 1) + N; s++) rows.push(play(k, s))
  const avg = f => (rows.reduce((a, x) => a + f(x), 0) / rows.length)
  const sc = rows.map(x => x.score).sort((a, b) => a - b)
  const ends = {}; rows.forEach(x => ends[x.end] = (ends[x.end] || 0) + 1)
  const rk = {}; rows.forEach(x => { const c = 'SABCD'[rankOf(x.score)]; rk[c] = (rk[c] || 0) + 1 })
  console.log(`${k.padEnd(8)} 懸賞金 平均${Math.round(avg(x => x.score))} 中央${sc[sc.length >> 1]} 最小${sc[0]} 最大${sc[sc.length - 1]}  終わり ${JSON.stringify(ends)} 評価 ${JSON.stringify(rk)}  時間${avg(x => x.t).toFixed(0)}秒 輪${avg(x => x.rings).toFixed(1)}/${rows[0].of}  (${((Date.now() - t0) / 1000).toFixed(0)}s)`)
  console.log(`         警報${avg(x => x.alarms).toFixed(1)} 内訳${JSON.stringify(Object.fromEntries(['rotor', 'ball', 'shutter', 'line', 'net', 'drone'].map(s => [s, +avg(x => x.hitBy[s] || 0).toFixed(1)])))} 紙一重${avg(x => x.near).toFixed(1)}(極${avg(x => x.tight).toFixed(1)}) ナイス${avg(x => x.nice || 0).toFixed(1)} 掛け替え${avg(x => x.rehook || 0).toFixed(1)} 急旋回${avg(x => x.turn || 0).toFixed(1)} 壁蹴り${avg(x => x.kick || 0).toFixed(1)} 急降下${avg(x => x.dive || 0).toFixed(1)} 激突${avg(x => x.crash || 0).toFixed(1)} 振り切り${avg(x => x.shake || 0).toFixed(1)} 最高連続${avg(x => x.bestChain).toFixed(1)} 最高倍率${avg(x => x.bestMult).toFixed(2)} 見つかった${avg(x => x.cnt.spotted || 0).toFixed(1)} 車${avg(x => x.cnt['r:car'] || 0).toFixed(1)}`)
  console.log(`         輪の時刻 ${rows.slice(0, 4).map(x => x.ringT.join('/')).join('  ')}`)
}
console.log('判定の境目', RANKS.join('/'))
