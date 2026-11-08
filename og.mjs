// SNS 用の画像 og.png（1200x630）。回転レーザーの輪のすき間を、カツラを下げた怪盗が紙一重で抜ける瞬間＋題字。node og.mjs
import './mute-auto.mjs'  // テスト中は絶対に音を出さない（playwright を無音に差し替え）
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { muteContext, MUTE_LAUNCH } from './mute.mjs'
const PORT = 6445
const srv = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 500))
const b = await chromium.launch({ ...MUTE_LAUNCH, args: [...MUTE_LAUNCH.args, '--use-angle=metal'] })
const ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 1200, height: 630 } }); await muteContext(ctx)
const p = await ctx.newPage()
await p.goto(`http://localhost:${PORT}/`); await p.waitForFunction(() => window.__wigReady, null, { timeout: 40000 })
await p.waitForFunction(() => document.fonts.check('900 40px "Zen Old Mincho"'), null, { timeout: 15000 }).catch(() => {})
await p.waitForTimeout(2500)   // 人物の読み込み
const CAM = JSON.parse(process.env.OGCAM || 'null')
await p.evaluate(CAM => {
  heist.start(7); heist.dbg.pause(true); heist.H.noLight = true; heist.H.drones.length = 0; heist.H.inv = 1e9
  const h = heist.H.haz.find(q => q.kind === 'rotor'), C = heist.H.cps[0]
  // 羽根が斜めの時: すき間の真ん中を抜ける
  h.w = 0; h.ph = 0.4
  const a = 0.4 + Math.PI / h.n, d = 3.4
  const x = h.cx + h.ux * Math.cos(a) * d, y = h.cy + Math.sin(a) * d - 1.1, z = h.cz + h.uz * Math.cos(a) * d
  heist.dbg.teleport(x - 0.6, y, z); const me = heist.me
  Object.assign(me, { vx: 24, vy: 3, vz: 1, grounded: false, yaw: Math.PI / 2 })
  me.rope = { x: x + 14, y: y + 24, z: z - 6, len: 28, t: 0.6 }
  for (let i = 0; i < 6; i++) heist.dbg.render(1)
  window.__freeze = true; window.__holdFx = true
  heist.dbg.render(30)
  const c = heist.camera
  const P = CAM || [x + 6.5, y + 2.4, z + 2.6, x, y + 1.3, z + 2.6, 56]
  c.position.set(P[0], P[1], P[2]); c.lookAt(P[3], P[4], P[5]); c.fov = P[6]; c.updateProjectionMatrix()
  heist.dbg.render(2)
  for (const id of ['hud', 'pause', 'title']) document.getElementById(id).classList.add('hidden')
  document.getElementById('hitflash').style.opacity = '.35'
  const dv = document.createElement('div')
  dv.innerHTML = `<div style="position:fixed;inset:0;z-index:28;background:linear-gradient(90deg,rgba(5,8,18,.88) 0%,rgba(5,8,18,.6) 36%,rgba(5,8,18,0) 60%)"></div>
  <div style="position:fixed;left:44px;top:58px;z-index:30;width:430px;padding:22px 26px 20px;background:#ece5d4;transform:rotate(-2deg);box-shadow:0 16px 40px rgba(0,0,0,.6);font-family:'Zen Old Mincho',serif;color:#1a1712">
    <div style="position:absolute;inset:8px;border:2px solid rgba(26,23,18,.5)"></div>
    <div style="font-weight:900;font-size:22px;letter-spacing:.5em;color:#9c1820">予告状</div>
    <div style="margin-top:8px;font-weight:900;font-size:58px;line-height:1.18;letter-spacing:.02em">怪盗、<br>市長の<br>カツラを盗む</div>
  </div>
  <div style="position:fixed;left:56px;top:470px;z-index:30;font-family:'BIZ UDPGothic',sans-serif;font-weight:700;color:#eef0f6;text-shadow:0 2px 10px rgba(0,0,0,.95);font-size:30px;line-height:1.5">夜の街をワイヤーで飛び、<br>赤い光を紙一重で抜けて逃げろ</div>
  <div style="position:fixed;right:40px;top:40px;z-index:30;font-family:'Zen Old Mincho',serif;font-weight:900;font-size:44px;color:#ffb3b8;text-shadow:0 0 18px rgba(255,60,80,.7),0 2px 8px #000;transform:rotate(-4deg)">紙一重</div>`
  document.body.appendChild(dv)
}, CAM)
await p.waitForTimeout(800)
await p.screenshot({ path: process.env.OGOUT || 'og.png' })
await b.close(); srv.kill()
console.log('og.png')
