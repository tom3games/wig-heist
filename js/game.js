// 怪盗、市長のカツラを盗む（wig-heist）。空中出前（sky-delivery）・廃都迎撃（ufo-demae v4）の街とワイヤーで、夜の街を逃げる
// 赤く光る物（レーザー・鉄球・高圧線・網・ドローン）に触れたら警報（3回で御用）。金の輪をくぐって公園の気球へ
// 2026-11-09 初版。電流オフィス（狭い通路）が却下されたあと、「広いマップを飛び回って、テクニックで避ける」で作った
import * as THREE from 'three'
import { GAME } from '../shared/config.js?v=1'
import { createWorld } from '../shared/track.js?v=1'
import { buildScene } from './scene.js?v=1'
import { FX } from './fx.js?v=1'
import { setAniso, lazyStart } from './look.js?v=1'
import { Q, LOW } from './quality.js?v=1'
import { RunnerModel } from './runnermodel.js?v=1'
import { CharRunnerModel, loadCharAssets, charAssets } from './charmodel.js?v=1'
import { createRunner, stepRunner, findAnchor, rayHit, floorAt, canKick, RUN } from '../shared/runner.js?v=1'
import { createStreet, buildPoles } from '../shared/street.js?v=1'
import { addTown, clearShopFront } from '../shared/town.js?v=1'
import { buildPoles3d, buildHouses3d, trafficPool } from './street3d.js?v=1'
import { carLights } from './carmodel.js?v=1'
import { createHeist, stepHeist, summary, addHeistMap, target, rankOf, BASE, SPAWN, HZ, RANKS, PTS } from '../shared/heist.js?v=1'
import { createBot, botInput } from '../shared/heistbot.js?v=1'
import { HeistView, WigView } from './heist3d.js?v=1'
import { drawNews } from './news.js?v=1'
import { makeSky, buildNight, PALETTE } from './night.js?v=1'
import { facadeTime } from './facade.js?v=1'

const $ = id => document.getElementById(id)
window.__bootSet && window.__bootSet(0.35)
const STEP = GAME.step
const URL_ = 'https://tom3games.com/play/wig-heist/'
const store = { get: k => { try { return localStorage.getItem(k) } catch (e) { return null } }, set: (k, v) => { try { localStorage.setItem(k, v) } catch (e) {} } }
const pick = a => a[Math.floor(Math.random() * a.length)]
const man = v => Math.round(v).toLocaleString()

// ---------------------------------------------------------------- 文言（日英）
const T = {
  ja: {
    card: '予告状', cardBody: '今宵、市長のカツラを\n頂きに参上する', cardSign: '怪盗',
    logo: '怪盗、市長のカツラを盗む', start: '盗みに行く', how: '遊び方', lang: 'EN', more: 'ほかのゲーム', muteOn: '音あり', muteOff: '音なし', loading: '屋根の上で待機中',
    howTitle: '逃げ方の心得', ok: '覚えた',
    howItems: [
      '右下の<b>大ボタン</b>で前のビルにワイヤー、もう一度で離す。左のスティックで向き。ビルをタップするとそこに掛かる',
      '赤く光る物に触れたら<b>警報</b>。3回で<b>御用</b>',
      '金の<b>輪</b>を順にくぐって公園の<b>気球</b>へ。輪の中の赤い光はすき間を抜ける',
      '振り子の下を過ぎて<b>振り上がり始め</b>で離すと、遠く速く跳べる（ナイスリリース）',
      '<b>紙一重</b>・離してすぐ次へ<b>急旋回</b>・壁に当たった瞬間に<b>壁蹴り</b>・空中で地面をタップして<b>急降下</b>。地面に着かずにつなぐと懸賞金が上がる'
    ],
    keysPc: 'PC: WASD・矢印で向き　クリックでワイヤー（空中で地面をクリックで急降下）　E は前へ自動　ドラッグで見回す',
    credit: '音: Kenney, rubberduck, artisticdude, poinl, ezwa, SpliceSound ほか（CC0・Public domain）。詳しくは CREDITS.md',
    bLabel: '懸賞金', unit: '万円', lamps: '警報', ringL: (n, of) => `目印 ${n}/${of}`, goalL: '気球', leftL: s => `包囲まで ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, chainL: n => `${n}連続`,
    tooFar: '届かない', kickL: '蹴る', pause: '中断', paused: '一時停止', resume: '続ける', quit: 'やめる',
    mayor: '市長', buddy: '相棒',
    tips: {
      start: '赤く光る物に触れるな。3回で御用だ', swing: '振り上がり始めで離せ。遠くへ跳べる', kick: '壁にぶつかった瞬間にボタン。壁を蹴れる',
      lit: 'サーチライトだ。速く飛ぶか、ビルの陰へ', drone: 'ドローンはビルの角で振れば、ぶつかる', canal: '高圧線は上を越えて、空中で地面をタップ。急降下だ', ring: '金の輪をくぐれ。次はあの光の柱だ'
    },
    radio: ['市長です。あれはカツラではありません', '市民の皆さん、市長の帽子を見かけたら交番へ', '市長です。今夜は頭が冷えます', 'レーザーの電気代は、市が持ちます', '怪盗に告ぐ。今なら許す。…やっぱり許さない', '市長です。あれは帽子です。地毛の帽子です', 'ドローン隊、低く飛べ。上から見られたくない', '市長です。カツラ…いや帽子は、市の宝です', '鉄球は工事のものです。たまたまです', '市長です。風が強いので、帽子は飛ばされないように'],
    rare: ['デュフフ…あ、マイク入ってる', '市長の奥さんです。あの人、昔からカツラです', '相棒: そのカツラ、ちょっと臭うぞ'],
    onHit: ['市長です。よし！', '焦がすな！それは高いんだ', 'いいぞ、もう少しだ'], onSpot: ['いたぞ！帽子だ！', 'ヘリが見つけた。ドローン隊、行け'], onRing: ['目印を消せ！誰だ置いたのは', 'その輪は市の備品だ'],
    pop: { nice: 'ナイスリリース', turn: '急旋回', kick: '壁蹴り', dive: '急降下', crash: 'ドローン激突', shake: '振り切った', near: '紙一重', tight: '極・紙一重', ring: '目印' },
    hitL: n => `警報 ${n}/3`, spotted: '見つかった', caught: '御用', escaped: '逃走成功', surrounded: '包囲された', lit: '照らされている',
    again: 'もう一回', save: '画像を保存', post: 'Xでポスト', toTitle: 'タイトル',
    news: {
      paper: '夜更新聞', extra: '号外',
      head: { escaped: { wig: '怪盗、市長の\nカツラを持ち去る', spare: '怪盗、予備の\nカツラを持ち去る', brow: '怪盗、市長の\n眉毛を持ち去る' }, caught: '怪盗、御用', surrounded: '怪盗、包囲され\n御用', quit: '怪盗、闇に消える' },
      sub: { escaped: ['「帽子は無傷」と市長', '帽子は少し焦げた模様', '帽子はチリチリに'], caught: '帽子は市長の頭に戻る', surrounded: '夜明けとともに包囲', quit: '行方は分かっていない' },
      quote: { escaped: ['あれは帽子だ。カツラではない。返してほしい', '少し焦げても帽子は帽子だ。返してくれ', 'チリチリでもいい。あれしか無いんだ'], spare: '予備でよかった。…本当に予備でよかった', brow: '眉毛は二本ある。片方だけでも返してほしい', caught: '帽子は戻った。地毛は無事だ', surrounded: '朝まで粘るとは。だが帽子は戻った', quit: '帽子はどこだ。誰か見なかったか' },
      cap: { near: g => `レーザーを紙一重でくぐる怪盗（すき間${g}m）`, goal: '気球に飛び乗る怪盗', hit: '警報の光に浮かぶ怪盗', none: '夜の街を飛ぶ怪盗' },
      st: ['紙一重', 'ナイスリリース', '急旋回', '壁蹴り', '急降下', 'ドローン激突', '警報', '逃走時間'], times: n => `${n}回`,
      bountyLabel: '懸賞金', bounty: s => `${man(s)}万円`, rankLabel: '手配', rankName: ['伝説の怪盗', '大怪盗', '怪盗', 'こそ泥', '見習い泥棒'],
      footer: 'tom3games.com/play/wig-heist'
    },
    postText: (s, r, end) => `怪盗、市長のカツラを盗む で懸賞金 ${man(s)}万円（手配${r}${end === 'escaped' ? '・逃走成功' : ''}）`
  },
  en: {
    card: 'NOTICE', cardBody: 'Tonight I shall take\nthe Mayor\'s wig', cardSign: 'The Phantom',
    logo: 'WIG HEIST', start: 'Go steal it', how: 'How to play', lang: 'JP', more: 'More games', muteOn: 'Sound on', muteOff: 'Muted', loading: 'Waiting on the rooftop',
    howTitle: 'THE RULES', ok: 'Got it',
    howItems: [
      'The <b>big button</b> fires a wire at the building ahead; press again to let go. Left stick steers. Tap a building to hook it',
      'Touch anything glowing red and the <b>alarm</b> goes off. Three alarms and you are <b>caught</b>',
      'Fly through the gold <b>rings</b> in order, then into the <b>balloon</b>. Slip through the gaps in the red light inside each ring',
      'Let go just as the swing <b>starts to rise</b> to fly farther and faster (nice release)',
      '<b>Close calls</b>, quick <b>re-hook turns</b>, <b>wall kicks</b> (button the moment you hit a wall) and <b>dives</b> (tap the ground mid-air) raise your bounty. Keep chaining without landing'
    ],
    keysPc: 'PC: WASD / arrows steer · click to wire (click the ground mid-air to dive) · E hooks ahead · drag to look',
    credit: 'Sounds: Kenney, rubberduck, artisticdude, poinl, ezwa, SpliceSound and others (CC0 / public domain). See CREDITS.md',
    bLabel: 'BOUNTY', unit: '', lamps: 'ALARM', ringL: (n, of) => `Ring ${n}/${of}`, goalL: 'Balloon', leftL: s => `Cornered in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`, chainL: n => `${n} chain`,
    tooFar: 'Too far', kickL: 'KICK', pause: 'Pause', paused: 'Paused', resume: 'Resume', quit: 'Quit',
    mayor: 'MAYOR', buddy: 'PARTNER',
    tips: {
      start: 'Do not touch anything red. Three alarms and you are done', swing: 'Let go as the swing starts to rise. You fly farther', kick: 'Hit the button the moment you hit a wall. Wall kick',
      lit: 'Searchlight. Fly fast or hide behind a building', drone: 'Swing round a corner and the drones crash', canal: 'Clear the power lines from above, then tap the ground to dive', ring: 'Fly through the gold ring. Next one is under that light'
    },
    radio: ['This is the Mayor. That is not a wig', 'Citizens, if you see the Mayor\'s hat, call the police', 'This is the Mayor. My head is cold tonight', 'The city is paying for the lasers', 'Phantom, I will forgive you now. ...No, I will not', 'This is the Mayor. It is a hat. A natural hair hat', 'Drones, fly low. I do not want to be seen from above', 'The w... hat is a city treasure', 'The wrecking balls are for construction. Coincidence'],
    rare: ['Heh heh... oh, the mic is on', 'This is the Mayor\'s wife. He has worn a wig for years', 'Partner: that wig smells a bit'],
    onHit: ['This is the Mayor. Yes!', 'Do not burn it! It was expensive', 'Good, almost there'], onSpot: ['There! The hat!', 'The chopper found him. Drones, go'], onRing: ['Remove those rings! Who put them there', 'That ring is city property'],
    pop: { nice: 'NICE RELEASE', turn: 'HARD TURN', kick: 'WALL KICK', dive: 'DIVE', crash: 'DRONE CRASH', shake: 'SHOOK IT', near: 'CLOSE CALL', tight: 'RAZOR CLOSE', ring: 'RING' },
    hitL: n => `ALARM ${n}/3`, spotted: 'SPOTTED', caught: 'CAUGHT', escaped: 'ESCAPED', surrounded: 'CORNERED', lit: 'In the light',
    again: 'Again', save: 'Save image', post: 'Post on X', toTitle: 'Title',
    news: {
      paper: 'THE NIGHT OWL', extra: 'EXTRA',
      head: { escaped: { wig: 'PHANTOM FLEES WITH WIG', spare: 'PHANTOM TAKES SPARE WIG', brow: 'PHANTOM TAKES EYEBROW' }, caught: 'PHANTOM CAUGHT', surrounded: 'PHANTOM CORNERED', quit: 'PHANTOM VANISHES' },
      sub: { escaped: ['"The hat is fine," says Mayor', 'Hat reportedly singed', 'Hat now frizzy'], caught: 'Hat back on the Mayor\'s head', surrounded: 'Police close in at dawn', quit: 'Whereabouts unknown' },
      quote: { escaped: ['It is a hat. Not a wig. I want it back', 'Singed or not, it is my hat. Return it', 'Frizzy is fine. It is the only one I have'], spare: 'Thank goodness it was the spare. Truly', brow: 'I have two eyebrows. Even one back would help', caught: 'The hat is back. My real hair is safe', surrounded: 'He held out till morning. But the hat is back', quit: 'Where is my hat. Did anyone see it' },
      cap: { near: g => `The Phantom slips past a laser (${g} m gap)`, goal: 'The Phantom leaps into the balloon', hit: 'The Phantom in the alarm lights', none: 'The Phantom over the night city' },
      st: ['Close calls', 'Nice releases', 'Hard turns', 'Wall kicks', 'Dives', 'Drone crashes', 'Alarms', 'Time'], times: n => `${n}`,
      bountyLabel: 'BOUNTY', bounty: s => `¥${(Math.round(s) * 10000).toLocaleString()}`, rankLabel: 'WANTED', rankName: ['LEGEND', 'MASTER THIEF', 'PHANTOM', 'PETTY THIEF', 'ROOKIE'],
      footer: 'tom3games.com/play/wig-heist'
    },
    postText: (s, r, end) => `WIG HEIST: bounty ¥${(Math.round(s) * 10000).toLocaleString()} (rank ${r}${end === 'escaped' ? ', escaped' : ''})`
  }
}
let lang = store.get('wig.lang') || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en')
const t = k => T[lang][k]
const touchMode = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
document.body.classList.toggle('is-touch', touchMode)
function applyLang() {
  document.documentElement.lang = lang
  for (const el of document.querySelectorAll('[data-t]')) { const v = t(el.dataset.t); if (typeof v === 'string') el.textContent = v }
  $('cardBody').innerHTML = t('cardBody').replace(/\n/g, '<br>')
  $('howList').innerHTML = t('howItems').map((s, i) => `<li data-n="${'一二三四五'[i]}"><span>${s}</span></li>`).join('')
  $('howKeys').textContent = touchMode ? '' : t('keysPc')
  $('btnMute').textContent = Snd.muted ? t('muteOff') : t('muteOn')
  $('bUnit').textContent = t('unit')
}

// ---------------------------------------------------------------- 音（録音素材だけ）
Snd.muted = store.get('wig.mute') === '1'
Snd.def({
  wire: ['snd/swish-1.mp3', 'snd/swish-2.mp3', 'snd/swish-3.mp3'], hook: ['snd/metalClick.mp3', 'snd/metal_02.mp3'], whoosh: 'snd/swish-5.mp3',
  land: ['snd/footstep_01.mp3', 'snd/footstep_02.mp3'], bonk: ['snd/thwack-01.mp3', 'snd/thwack-03.mp3'], clang: ['snd/clang_1.mp3', 'snd/clang_2.mp3'],
  zap: 'snd/zap.mp3', spark: ['snd/spark.mp3', 'snd/spark2.mp3'], siren: 'snd/siren.mp3', whistle: 'snd/whistle.mp3', drone: 'snd/drone_1.mp3', dpop: 'snd/drone_pop.mp3',
  glass: 'snd/glass_breaking_01.mp3', grunt: ['snd/grunt_01.mp3', 'snd/grunt_02.mp3', 'snd/grunt_03.mp3', 'snd/grunt_04.mp3'], ring: 'snd/ring.mp3',
  click: 'snd/click_001.mp3', tick: 'snd/tick_002.mp3', radio: ['snd/radio_1.mp3', 'snd/radio_2.mp3'], jWin: 'snd/jWin.mp3', jMid: 'snd/jMid.mp3', jLose: 'snd/jLose.mp3'
})
const sfx = (n, o) => Snd.play(n, o)
const sfxAt = (n, x, z, o = {}) => { const p = me || (demo && demo.r); const d = p ? Math.hypot(x - p.x, z - p.z) : 0, k = Math.max(0, 1 - d / 120); if (k > 0.05) sfx(n, { ...o, vol: (o.vol || 1) * (0.25 + 0.75 * k) }) }

// ---------------------------------------------------------------- 描画の土台
const renderer = new THREE.WebGLRenderer({ antialias: !LOW, powerPreference: 'high-performance', preserveDrawingBuffer: true })
renderer.setPixelRatio(Q.pixelRatio)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.3
setAniso(renderer)
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
$('view').appendChild(renderer.domElement)
const scene = new THREE.Scene()
const FOG_D = 0.0036
scene.fog = new THREE.FogExp2(PALETTE.fog.getHex(), FOG_D)
// 月の光（青白く低い）と、空の紺・地面の街明かりの照り返し
const sun = new THREE.DirectionalLight(PALETTE.moon.getHex(), 1.0)
sun.userData.dir = new THREE.Vector3(0.45, 0.55, -0.7).normalize()
sun.castShadow = true
sun.shadow.mapSize.set(Q.shadow, Q.shadow)
Object.assign(sun.shadow.camera, { left: -Q.shadowRange, right: Q.shadowRange, top: Q.shadowRange, bottom: -Q.shadowRange, near: 1, far: 400 })
sun.shadow.normalBias = 0.04; sun.shadow.bias = -0.0004
scene.add(sun, sun.target)
const hemi = new THREE.HemisphereLight(PALETTE.hemiSky.getHex(), PALETTE.hemiGround.getHex(), 1.7)
scene.add(hemi)
const sky = makeSky(renderer, scene, sun.userData.dir)
const camera = new THREE.PerspectiveCamera(64, 1, 0.3, 2400)
const world = createWorld('city')
clearShopFront(world, BASE)
const built = buildScene(scene, world)
for (const g of built.gates) g.grp.visible = false
const fx = new FX(scene, world)
const town = addTown(world, BASE)
addHeistMap(world)
const poles3d = buildPoles3d(scene, buildPoles(world, BASE))
const houses3d = buildHouses3d(scene, town)
const carsDraw = trafficPool(scene, LOW)
buildNight(scene)
// 夜: 街灯と家の窓が点き、車はヘッドライト
poles3d.bulbMat.emissiveIntensity = 2.2; houses3d.winMat.emissiveIntensity = 0.9; carLights(1)
let street = createStreet(world, 1)
const view = new HeistView(scene, world, LOW), wigView = new WigView(scene)
// ワイヤー: 明るい水色の芯＋外側の淡い光（ufo-demae v4 と同じ。危ない物の赤と別の色）
const ropeMat = new THREE.MeshBasicMaterial({ color: 0xd8fbff, fog: false })
const ropeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 6).rotateX(Math.PI / 2).translate(0, 0, 0.5), ropeMat)
const ropeGlow = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 8).rotateX(Math.PI / 2).translate(0, 0, 0.5), new THREE.MeshBasicMaterial({ color: 0x3fd8ff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }))
ropeMesh.add(ropeGlow); ropeMesh.renderOrder = 4; ropeGlow.renderOrder = 4
ropeMesh.visible = false; scene.add(ropeMesh)
const aimMark = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.75, 24), new THREE.MeshBasicMaterial({ color: 0x7ff6ff, transparent: true, opacity: 0.9, depthTest: false }))
aimMark.renderOrder = 5; aimMark.visible = false; scene.add(aimMark)

// ---------------------------------------------------------------- 状態
let mode = 'title'
let me = null, H = null, model = null, demo = null
let paused = false, dbgPause = false, endAt = 0, photo = null, photoScore = -1, photoWhy = 'none', photoGap = 0, quitEnd = false
let hitStop = 0, fovKick = 0, flashA = 0, redA = 0, goldA = 0, slowT = 0
let tut = false, tutSeen = {}
const cam = { hd: Math.PI / 2, pitch: 0.15, userT: -1e9, pos: new THREE.Vector3(), off: new THREE.Vector3(-6, 3, 0), look: new THREE.Vector3(), lookOff: new THREE.Vector3(), fov: 64 }
const _v = new THREE.Vector3(), _w = new THREE.Vector3()
function spawnRunner(id) { return createRunner({ id, spawn: SPAWN }) }
function newModel() { if (model) { scene.remove(model.group); model.dispose() } model = charAssets.ready ? new CharRunnerModel() : new RunnerModel(); scene.add(model.group); if (model.okamochi) model.okamochi.visible = false; return model }

// ---------------------------------------------------------------- 入力
const keys = new Set()
let pendingWire = null
addEventListener('keydown', e => {
  if (mode !== 'play') return
  if (e.repeat) return
  keys.add(e.code)
  if (e.code === 'KeyE' || e.code === 'Space') { pressButton(); e.preventDefault() }
  if (e.code === 'Escape' || e.code === 'KeyP') setPause(!paused)
})
addEventListener('keyup', e => keys.delete(e.code))
const gest = new Map()
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2()
renderer.domElement.addEventListener('pointerdown', e => {
  Snd.init()
  if (mode !== 'play' || paused) return
  gest.set(e.pointerId, { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now(), moved: false })
})
addEventListener('pointermove', e => {
  const g = gest.get(e.pointerId); if (!g) return
  const dx = e.clientX - g.lx, dy = e.clientY - g.ly; g.lx = e.clientX; g.ly = e.clientY
  if (!g.moved && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 12) g.moved = true
  if (!g.moved) return
  cam.hd -= dx * 0.00792; cam.pitch = Math.max(-0.9, Math.min(1, cam.pitch + dy * 0.00528)); cam.userT = performance.now()
})
addEventListener('pointerup', e => {
  const g = gest.get(e.pointerId); if (!g) return
  gest.delete(e.pointerId)
  if (!g.moved && performance.now() - g.t < 450 && mode === 'play' && !paused) aimAt(e.clientX, e.clientY)
})
addEventListener('pointercancel', e => gest.delete(e.pointerId))
// 大ボタン（E・Space）: 壁に当たった直後か張り付いている時は壁蹴り、ワイヤー中なら離す、それ以外は前の上へ自動で掛ける
function pressButton() { if (!me || mode !== 'play' || paused) return; pendingWire = canKick(me) ? { kick: true } : { at: null, key: true } }
// 画面のタップ: 建物・地面のワイヤー。ワイヤー中なら外す
function aimAt(cx, cy) {
  const rc = renderer.domElement.getBoundingClientRect()
  ndc.set((cx - rc.left) / rc.width * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1)
  ray.setFromCamera(ndc, camera)
  const o = ray.ray.origin, d = ray.ray.direction
  if (me && me.rope) { pendingWire = { at: null, sx: cx, sy: cy }; return }
  const minT = me ? Math.max(0, (me.x - o.x) * d.x + (me.y + 1 - o.y) * d.y + (me.z - o.z) * d.z - 1) : 0
  const b = rayHit(world, o.x, o.y, o.z, d.x, d.y, d.z, 400, minT)
  const tb = b ? Math.hypot(b.x - o.x, b.y - o.y, b.z - o.z) : Infinity
  let at = b
  if (me && !me.grounded && !me.climbing) {
    const g = groundRay(o, d, RUN.wireRange + 60)
    if (g && !(tb < g.t + 6)) at = { x: g.x, y: g.y, z: g.z, ground: true }
  }
  pendingWire = { at, sx: cx, sy: cy }
}
function groundRay(o, d, maxT) {
  const below = t => { const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t; return y <= floorAt(world, x, z, y).h }
  for (let t = 1; t < maxT; t += 1) {
    if (!below(t)) continue
    let a = t - 1, b2 = t
    for (let i = 0; i < 6; i++) { const m = (a + b2) / 2; if (below(m)) b2 = m; else a = m }
    const x = o.x + d.x * b2, z = o.z + d.z * b2
    return { x, y: floorAt(world, x, z, o.y + d.y * b2 + 0.5).h, z, t: b2 }
  }
  return null
}
const stick = { x: 0, y: 0, id: null }
{
  const el = $('stick'), knob = el.querySelector('.knob')
  const ctr = () => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, R: r.width / 2 } }
  const upd = e => {
    const c = ctr()
    let dx = (e.clientX - c.x) / c.R, dy = (e.clientY - c.y) / c.R
    const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l }
    stick.x = dx; stick.y = dy; knob.style.transform = `translate(${dx * 36}px,${dy * 36}px)`
  }
  const grab = e => { stick.id = e.pointerId; el.classList.add('held'); upd(e) }
  el.addEventListener('pointerdown', e => { Snd.init(); if (stick.id != null) return; e.preventDefault(); e.stopPropagation(); grab(e) })
  addEventListener('pointermove', e => {
    if (e.pointerId === stick.id) { upd(e); return }
    if (stick.id == null && gest.has(e.pointerId)) { const c = ctr(); if (Math.hypot(e.clientX - c.x, e.clientY - c.y) < c.R) { gest.delete(e.pointerId); grab(e) } }
  }, true)
  const end = e => { if (e.pointerId !== stick.id) return; stick.id = null; stick.x = stick.y = 0; knob.style.transform = ''; el.classList.remove('held') }
  addEventListener('pointerup', end, true); addEventListener('pointercancel', end, true)
  window.__stickCenter = () => ctr()
  for (const b of document.querySelectorAll('.tbtn')) b.addEventListener('pointerdown', e => { e.preventDefault(); Snd.init(); if (b.dataset.k === 'wire') pressButton() })
}
function screenBasis() { const e = camera.matrixWorld.elements; let rx = e[0], rz = e[2], fx = -e[8], fz = -e[10]; const a = Math.hypot(rx, rz) || 1, b = Math.hypot(fx, fz) || 1; return { r: { x: rx / a, z: rz / a }, f: { x: fx / b, z: fz / b } } }
function gather() {
  let thr = 0, brk = 0, steer = 0, wallY = null, wallX = null
  if (keys.has('KeyW') || keys.has('ArrowUp')) thr = 1
  if (keys.has('KeyS') || keys.has('ArrowDown')) brk = 1
  if (keys.has('KeyA') || keys.has('ArrowLeft')) steer -= 1
  if (keys.has('KeyD') || keys.has('ArrowRight')) steer += 1
  const B = screenBasis(), SR = B.r, SF = B.f
  let moveDir = null
  if (stick.id != null) {
    const mag = Math.min(1, Math.hypot(stick.x, stick.y))
    if (mag > 0.15) {
      const dx = SR.x * stick.x - SF.x * stick.y, dz = SR.z * stick.x - SF.z * stick.y, l = Math.hypot(dx, dz) || 1
      moveDir = { x: dx / l, z: dz / l }; steer = 0; thr = Math.max(thr, Math.min(1, mag * 1.3))
    }
    if (me.climbing) {
      const cl = me.climbing, sideSign = SR.x * cl.nz - SR.z * cl.nx >= 0 ? 1 : -1
      wallY = Math.abs(stick.y) > 0.25 ? -stick.y : 0; wallX = Math.abs(stick.x) > 0.25 ? stick.x * sideSign : 0
    }
  }
  const inp = { throttle: thr, brake: brk, steer, jump: false, wire: false, wallY, wallX, moveDir }
  inp.wireYaw = moveDir ? Math.atan2(moveDir.x, moveDir.z) : touchMode ? Math.atan2(SF.x, SF.z) : undefined
  if (pendingWire) {
    inp.wire = true
    if (pendingWire.at) inp.wireAt = pendingWire.at
    else if (pendingWire.key && !me.rope) { const a = findAnchor(world, me, Math.atan2(SF.x, SF.z)); if (a) inp.wireAt = { ...a, auto: true } }
    me._tap = pendingWire; pendingWire = null
  }
  return inp
}

// ---------------------------------------------------------------- 画面の切り替え
function show(id) { for (const s of ['title', 'how', 'pause', 'result']) $(s).classList.toggle('hidden', s !== id); $('hud').classList.toggle('hidden', mode !== 'play') }
function newDemo() { const s = Math.floor(Math.random() * 1000); H = createHeist(world, s); demo = { r: spawnRunner('demo'), b: createBot('average', s) }; view.build(H) }
function toTitle() {
  mode = 'title'; paused = false; me = null
  newDemo(); newModel()
  show('title'); $('touch').classList.add('hidden')
  Snd.loop('amb', 'snd/city.wav', 0.22); Snd.loop('wind', null); Snd.loop('heli', 'snd/heli.wav', 0.05); Snd.loop('buzz', null); Snd.loop('bgm', null)
}
function startHeist(seed = Math.floor(Math.random() * 1e6)) {
  Snd.init(); sfx('click')
  if (window.TM) TM.start()
  tut = store.get('wig.tut') !== '1'; tutSeen = {}
  mode = 'play'; paused = false; demo = null; photo = null; photoScore = -1; photoWhy = 'none'; endAt = 0; quitEnd = false
  me = spawnRunner('me'); H = createHeist(world, seed, { tut }); street = createStreet(world, seed)
  view.build(H)
  log.length = 0
  newModel()
  cam.hd = Math.PI / 2; cam.pitch = 0.12; cam.userT = -1e9
  show(null); $('touch').classList.toggle('hidden', !touchMode)
  Snd.loop('amb', 'snd/city.wav', 0.16); Snd.loop('wind', 'snd/wind_loop.wav', 0.0001); Snd.loop('heli', 'snd/heli.wav', 0.0001); Snd.loop('buzz', 'snd/buzz.mp3', 0.0001); Snd.loop('bgm', 'snd/bgm.mp3', 0.2)
  sfx('siren', { vol: 0.35, rate: 0.95 })
  hint('start', 'buddy', 3.2)
  radioT = 9
}
function setPause(p) { if (mode !== 'play') return; paused = p; $('pause').classList.toggle('hidden', !p) }

// ---------------------------------------------------------------- 画面の文字（同時に1つ。話し手は 相棒 か 市長）
let sayT = 0, sayPri = 0
function say(who, text, sec = 2.4, pri = 0) {
  if (sayT > 0.4 && pri < sayPri) return
  const el = $('say'); el.className = 'say ' + who; el.innerHTML = `<small>${t(who)}</small>${text}`; sayT = Math.max(sec, 0.9 + text.length * 0.09); sayPri = pri
  if (who === 'mayor') sfx('radio', { vol: 0.3 })
}
let bannerT = 0
function banner(b, cls = '') { $('bannerB').textContent = b; const el = $('banner'); el.className = 'banner ' + cls; void el.offsetWidth; el.classList.add('pop'); bannerT = 2.2 }
let nearT = 0
function pop(txt, sub = '', cls = '') { const el = $('near'); $('nearTxt').textContent = txt; $('nearN').textContent = sub; el.className = 'near ' + cls; void el.offsetWidth; el.classList.add('pop'); nearT = 0.9 }
function hint(k, who = 'buddy', sec = 3) { if (!tut || tutSeen[k] || mode !== 'play') return; tutSeen[k] = true; say(who, t('tips')[k], sec, 2) }
let radioT = 9
function updateHud(dt) {
  const S = H.stats
  const sc = S.score; if ($('bVal')._v !== sc) { $('bVal')._v = sc; $('bVal').textContent = lang === 'ja' ? man(sc) : '¥' + (Math.round(sc) * 10000).toLocaleString(); const b = $('bounty'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump') }
  const ch = $('bChain'), key = H.chain + ':' + H.mult
  if (ch._k !== key) { ch._k = key; $('bMult').textContent = 'x' + H.mult; $('bChainN').textContent = H.chain ? t('chainL')(H.chain) : ''; ch.classList.toggle('hot', H.mult >= 2); ch.classList.toggle('on', H.chain > 0) }
  // 警報ランプ（点いた数）
  const lp = $('lamps')
  if (lp._n !== H.alarms) { lp._n = H.alarms; [...lp.querySelectorAll('.lamp')].forEach((l, i) => l.classList.toggle('on', i < H.alarms)); lp.classList.remove('hit'); void lp.offsetWidth; if (H.alarms) lp.classList.add('hit') }
  // 次の目標の方角と残り時間
  const T0 = target(H), d = Math.hypot(T0.x - me.x, T0.z - me.z)
  const dd = Math.round(d) + 'm'; if ($('arrowD')._v !== dd) { $('arrowD')._v = dd; $('arrowD').textContent = dd }
  $('arrow').querySelector('svg').style.transform = `rotate(${compassAng(T0.x, T0.z).toFixed(3)}rad)`
  const rl = H.cp < H.cps.length ? t('ringL')(H.cp + 1, H.cps.length) : t('goalL'); if ($('arrowN')._v !== rl) { $('arrowN')._v = rl; $('arrowN').textContent = rl }
  const left = Math.max(0, Math.ceil(HZ.timeLimit - H.t)), ll = t('leftL')(left); if ($('timer')._v !== ll) { $('timer')._v = ll; $('timer').textContent = ll; $('timer').classList.toggle('urgent', left <= 30) }
  // サーチライトの警報計（照らされている時だけ）
  const L = H.light, eye = $('eye'), on = L.meter > 0.02 && L.cd <= 0
  eye.classList.toggle('hidden', !on); if (on) $('eyeFill').style.transform = `scaleX(${Math.min(1, L.meter).toFixed(3)})`
  if (sayT > 0) { sayT -= dt; $('say').classList.toggle('hidden', sayT <= 0) }
  if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.add('hidden') }
  if (nearT > 0) { nearT -= dt; if (nearT <= 0) $('near').classList.add('hidden') }
}
function compassAng(gx, gz) {
  camera.updateMatrixWorld()
  const e = camera.matrixWorld.elements, fx = -e[8], fz = -e[10], rx = -fz, rz = fx
  const dx = gx - me.x, dz = gz - me.z
  return Math.atan2(dx * rx + dz * rz, dx * fx + dz * fz)
}
// 点の数字が当たった所から浮く
const floats = []
function floatPts(x, y, z, txt, cls = '') {
  if (floats.length > 8) { const o = floats.shift(); o.el.remove() }
  const el = document.createElement('div'); el.className = 'fpts ' + cls; el.textContent = txt; $('tags').appendChild(el)
  floats.push({ el, x, y, z, t: 0 })
}
function updateFloats(dt) {
  const W = innerWidth, Hh = innerHeight
  for (let i = floats.length - 1; i >= 0; i--) {
    const f = floats[i]; f.t += dt
    if (f.t > 0.9) { f.el.remove(); floats.splice(i, 1); continue }
    _v.set(f.x, f.y + f.t * 3, f.z).project(camera)
    if (_v.z > 1) { f.el.style.opacity = '0'; continue }
    f.el.style.opacity = String(Math.min(1, (0.9 - f.t) * 3))
    f.el.style.transform = `translate(${((_v.x + 1) / 2 * W).toFixed(0)}px,${((1 - _v.y) / 2 * Hh).toFixed(0)}px) translate(-50%,-50%)`
  }
}

// ---------------------------------------------------------------- 出来事
const log = []
function onRunnerEvent(e) {
  log.push({ src: 'r', ...e, at: H ? +H.t.toFixed(2) : 0 })
  if (e.t === 'wire') { sfx('wire', { vol: 0.7 }); sfx('hook', { vol: 0.5, delay: 0.06 }); if (tut && !tutSeen.swing && H.t > 4) setTimeout(() => hint('swing'), 900) }
  else if (e.t === 'wireMiss') {
    sfx('wire', { vol: 0.4, rate: 1.3 })
    const tp = me._tap
    if (e.far && tp && tp.sx != null) { const el = $('miss'); el.style.left = tp.sx + 'px'; el.style.top = tp.sy + 'px'; el.classList.remove('hidden'); el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; clearTimeout(el._t); el._t = setTimeout(() => el.classList.add('hidden'), 800) }
  }
  else if (e.t === 'land') { sfx('land', { vol: Math.min(1, 0.3 + e.impact / 20) }); if (e.impact > 14) { sfx('bonk', { vol: 0.5 }); fx.addShake(Math.min(0.6, e.impact / 40)) } }
  else if (e.t === 'bonk') { sfx('bonk', { vol: 0.8 }); fx.addShake(0.4); if (tut) setTimeout(() => hint('kick'), 200) }
  else if (e.t === 'unwire' && !e.auto) { const v = Math.hypot(me.vx, me.vy, me.vz); if (v > 16 || e.nice != null) { sfx('whoosh', { vol: Math.min(0.9, v / 45), rate: 0.9 + Math.random() * 0.2 }); fovKick = Math.min(7, Math.max(0, (v - 14) * 0.3) + (e.nice != null ? 3 : 0)) } }
  else if (e.t === 'wallkick') { sfx('bonk', { vol: 0.7, rate: 1.3 }); sfx('whoosh', { vol: 0.7 }); fx.addShake(0.3); fovKick = 5; fx.dust(e.x, e.y + 1, e.z, 10) }
  else if (e.t === 'car') { sfx('bonk', { vol: 1, rate: 0.8 }); fx.addShake(0.7) }
}
function onHeistEvent(e) {
  log.push({ src: 'h', ...e, at: +H.t.toFixed(2) })
  if (mode !== 'play') return
  const u = lang === 'ja' ? '万' : ''
  if (e.t === 'tech') {
    pop(t('pop')[e.kind] || '', '+' + man(e.pts) + u, e.kind)
    floatPts(e.x, e.y + 0.5, e.z, '+' + man(e.pts), H.mult >= 2 ? 'hot' : '')
    if (e.kind === 'nice') { sfx('whoosh', { vol: 0.9, rate: 0.8 }); flashA = Math.max(flashA, 0.35) }
    else if (e.kind === 'turn') { sfx('wire', { vol: 0.8, rate: 0.85 }); flashA = Math.max(flashA, 0.25) }
    else if (e.kind === 'kick') { flashA = Math.max(flashA, 0.3) }
    else if (e.kind === 'dive') { sfx('whoosh', { vol: 0.8, rate: 0.7 }); fovKick = 8 }
    else if (e.kind === 'crash') { sfxAt('clang', e.x, e.z, { vol: 1 }); sfxAt('dpop', e.x, e.z, { vol: 0.9 }); sfxAt('glass', e.x, e.z, { vol: 0.5, delay: 0.1 }); fx.sparks(e.x, e.y, e.z, 26, null, 11); fx.flash(e.x, e.y, e.z); hitStop = 0.05 }
    else if (e.kind === 'shake') { sfx('whoosh', { vol: 0.8 }) }
  }
  else if (e.t === 'near') {
    flashA = Math.max(flashA, e.tight ? 0.7 : 0.45); fovKick = -5; slowT = e.tight ? 0.22 : 0.12
    sfx('whoosh', { vol: 0.9, rate: 0.85 }); sfx('spark', { vol: 0.35, rate: 1.5 })
    pop(t('pop')[e.tight ? 'tight' : 'near'], '+' + man(e.pts) + u, e.tight ? 'tight' : 'near')
    floatPts(e.x, e.y, e.z, '+' + man(e.pts), 'hot')
    const sc = (e.tight ? 300 : 120) + e.v * 2 - e.gap * 40; if (sc > photoScore) { photoScore = sc; photoWhy = 'near'; photoGap = e.gap; snapNext = 2 }
  }
  else if (e.t === 'ring') {
    sfx('ring', { vol: 0.8 }); sfx('jMid', { vol: 0.35, delay: 0.1 }); goldA = 0.8; fovKick = 6
    banner(t('pop').ring + ' ' + e.n + '/' + e.of, 'gold')
    floatPts(e.x, e.y + 2, e.z, '+' + man(e.pts), 'gold')
    if (e.n === 1 && tut) { store.set('wig.tut', '1'); setTimeout(() => hint('ring'), 1500) }
    if (e.n === 3 && tut) setTimeout(() => hint('canal'), 2400)
    if (Math.random() < 0.35) setTimeout(() => { if (mode === 'play') say('mayor', pick(t('onRing'))) }, 1200)
  }
  else if (e.t === 'hit') {
    redA = 1; hitStop = 0.1; fx.addShake(1.1); sfx('zap', { vol: 0.9 }); sfx('spark', { vol: 0.8 }); sfx('grunt', { vol: 0.9 }); sfx('siren', { vol: 0.55 }); sfx('whistle', { vol: 0.6, delay: 0.25 })
    fx.sparks(e.x, e.y, e.z, 30, null, 12); fx.smoke(e.x, e.y, e.z, { size: 1.6, life: 1, dark: 0.3 })
    pop(t('hitL')(e.n), '', 'hit'); Snd.duck(0.4, 1.4)
    if (e.n < HZ.alarms) setTimeout(() => { if (mode === 'play') say('mayor', pick(t('onHit')), 2, 1) }, 900)
    if (photoWhy === 'none' && 200 > photoScore) { photoScore = 200; photoWhy = 'hit'; snapNext = 2 }
  }
  else if (e.t === 'caught') { banner(t('caught'), 'red'); sfx('whistle', { vol: 1 }); sfx('jLose', { vol: 0.7, delay: 0.6 }); Snd.loop('bgm', null) }
  else if (e.t === 'surrounded') { banner(t('surrounded'), 'red'); sfx('siren', { vol: 0.9 }); sfx('jLose', { vol: 0.7, delay: 0.6 }); Snd.loop('bgm', null) }
  else if (e.t === 'goal') { banner(t('escaped'), 'gold'); sfx('jWin', { vol: 0.9 }); goldA = 1; photoWhy = 'goal'; photoScore = 1e9; snapNext = 24; Snd.loop('bgm', null); say('mayor', lang === 'ja' ? '気球…？あれは市の気球だ！' : 'A balloon...? That is the city\'s balloon!', 3, 3) }
  else if (e.t === 'spotted') { banner(t('spotted'), 'red'); sfx('siren', { vol: 0.5, rate: 1.1 }); sfx('drone', { vol: 0.6 }); setTimeout(() => { if (mode === 'play') say('mayor', pick(t('onSpot')), 2, 1) }, 500); if (tut) setTimeout(() => hint('drone'), 2600) }
  else if (e.t === 'lit') { sfx('tick', { vol: 0.8 }); sfx('tick', { vol: 0.8, delay: 0.2 }); hint('lit') }
  else if (e.t === 'droneSee') { sfxAt('drone', e.x, e.z, { vol: 0.7 }) }
  else if (e.t === 'droneCrash' && !e.mine) { sfxAt('dpop', e.x, e.z, { vol: 0.6 }); fx.sparks(e.x, e.y, e.z, 12, null, 8) }
  else if (e.t === 'multUp') { sfx('hook', { vol: 0.6, rate: 1.3 }); multPulse = 1 }
  else if (e.t === 'end') { endAt = e.how === 'escaped' ? 3.2 : 2.4 }
}
let snapNext = 0, multPulse = 0

// ---------------------------------------------------------------- 結果
function showResult() {
  if (mode !== 'play') return
  mode = 'result'
  Snd.loop('wind', null); Snd.loop('buzz', null); Snd.loop('bgm', null)
  const s = summary(H), N = t('news'), ja = lang === 'ja'
  if (!photo || snapNext > 0) { snapNext = 0; renderer.render(scene, camera); const c2 = document.createElement('canvas'); c2.width = 640; c2.height = Math.round(640 * innerHeight / innerWidth); c2.getContext('2d').drawImage(renderer.domElement, 0, 0, c2.width, c2.height); photo = c2 }   // 写真がまだ無ければ今の場面
  const end = quitEnd ? 'quit' : H.end || 'quit'
  const rank = rankOf(s.score)
  const w = Math.min(2, s.wig)
  const head = end === 'escaped' ? N.head.escaped[s.loot] : N.head[end]
  const sub = end === 'escaped' ? N.sub.escaped[w] : N.sub[end]
  const quote = end === 'escaped' ? (s.loot === 'wig' ? N.quote.escaped[w] : N.quote[s.loot]) : N.quote[end]
  const cap = photoWhy === 'near' ? N.cap.near(photoGap.toFixed(1)) : N.cap[photoWhy] || N.cap.none
  const d0 = new Date(), mm = Math.floor(s.t / 60), ss = Math.floor(s.t % 60)
  const T_ = N.times
  const d = {
    paper: N.paper, extra: N.extra, date: ja ? `${d0.getFullYear()}年${d0.getMonth() + 1}月${d0.getDate()}日` : d0.toDateString(), head, sub, good: end === 'escaped',
    photo, caption: cap,
    stats: [[N.st[0], T_(s.near), s.near >= 5], [N.st[1], T_(s.nice || 0), (s.nice || 0) >= 3], [N.st[2], T_(s.turn || 0), (s.turn || 0) >= 3], [N.st[3], T_(s.kick || 0), (s.kick || 0) >= 1], [N.st[4], T_(s.dive || 0), (s.dive || 0) >= 2], [N.st[5], T_(s.crash || 0), (s.crash || 0) >= 1], [N.st[6], `${s.alarms}/3`, s.alarms === 0], [N.st[7], `${mm}:${String(ss).padStart(2, '0')}`, false]],
    bountyLabel: N.bountyLabel, bounty: N.bounty(s.score), mayor: t('mayor'), quote, rankLabel: N.rankLabel, rank: 'SABCD'[rank], rankName: N.rankName[rank], footer: N.footer, ja
  }
  drawNews($('slip'), d)
  sfx('radio', { vol: 0.4 })
  $('btnPost').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(t('postText')(s.score, 'SABCD'[rank], end)) + '&url=' + encodeURIComponent(URL_) + '&hashtags=' + encodeURIComponent(ja ? '怪盗,ワイヤーアクション' : 'WigHeist')
  $('touch').classList.add('hidden')
  for (const f of floats) f.el.remove(); floats.length = 0
  show('result')
  window.__lastScore = s.score; window.__lastSummary = { ...s, end, rank }
  if (window.TM) TM.end(s.score, end === 'escaped')
}
$('btnPost').addEventListener('click', () => { if (window.TM) TM.share('x') })
$('btnSave').onclick = () => { if (window.TM) TM.share('save'); $('slip').toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'wig-heist-news.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000) }) }
$('btnStart').onclick = () => startHeist()
$('btnAgain').onclick = () => startHeist()
$('btnTitle').onclick = () => toTitle()
$('btnHow').onclick = () => { Snd.init(); show('how') }
for (const b of document.querySelectorAll('[data-close]')) b.onclick = () => show('title')
$('btnLang').onclick = () => { lang = lang === 'ja' ? 'en' : 'ja'; store.set('wig.lang', lang); applyLang() }
$('btnMute').onclick = () => { Snd.init(); Snd.setMute(!Snd.muted); store.set('wig.mute', Snd.muted ? '1' : '0'); applyLang() }
$('btnPause').onclick = () => setPause(true)
$('btnResume').onclick = () => setPause(false)
$('btnQuit').onclick = () => { setPause(false); quitEnd = true; H.over = true; H.end = 'quit'; showResult() }

// ---------------------------------------------------------------- カメラ
const lerpAngle = (a, b, k) => { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return a + d * k }
function updateCamera(dt, c) {
  if (window.__freeze) return
  const pos = model.group.position
  const v = Math.hypot(c.vx, c.vz)
  let hx = Math.sin(c.yaw), hz = Math.cos(c.yaw)
  if (v > 8) { const k = c.grounded ? 0.25 : 0.45; hx = hx * (1 - k) + (c.vx / v) * k; hz = hz * (1 - k) + (c.vz / v) * k; const l = Math.hypot(hx, hz); hx /= l; hz /= l }
  const manual = touchMode || performance.now() - cam.userT < 1800
  const out = H && H.over && mode === 'play'
  if (!manual && !out) { cam.hd = lerpAngle(cam.hd, Math.atan2(hx, hz), 1 - Math.exp(-dt * (touchMode ? 2.2 : 5))); cam.pitch += (0.08 - cam.pitch) * (1 - Math.exp(-dt * 1.5)) }
  if (out) cam.hd += dt * 0.4   // 終わりの場面: ゆっくり回り込む
  hx = Math.sin(cam.hd); hz = Math.cos(cam.hd)
  let back = 5.6 + Math.min(2.4, v * 0.07), up = 2.1
  if (camera.aspect < 1) { back += 0.8; up += 0.5 }
  if (out) { back += 5 + Math.min(6, H.endT * 2); up += 1 }
  up += cam.pitch * 4.2; back *= 1 - Math.max(0, cam.pitch) * 0.15
  let tx = pos.x - hx * back, tz = pos.z - hz * back, ty = pos.y + up
  for (let i = 1; i <= 6; i++) {
    const f = i / 6, px = pos.x + (tx - pos.x) * f, pz = pos.z + (tz - pos.z) * f, py = pos.y + (ty - pos.y) * f
    let hit = false
    for (const o of world.nearby(px, pz)) {
      if (o.slab || o.kind === 'bound' || o.y0 == null || py < o.y0 || py > o.y1) continue
      const cs = Math.cos(o.yaw || 0), sn = Math.sin(o.yaw || 0), dx = px - o.cx, dz = pz - o.cz
      if (Math.abs(dx * cs - dz * sn) < o.hw + 0.4 && Math.abs(dx * sn + dz * cs) < o.hl + 0.4) { hit = true; break }
    }
    if (hit) { const ff = Math.max(0.25, (i - 1) / 6); tx = pos.x + (tx - pos.x) * ff; tz = pos.z + (tz - pos.z) * ff; ty = pos.y + up * 0.8 + (1 - ff) * 2; break }
  }
  const gy = world.groundAt(tx, tz, ty).h + 0.8
  if (ty < gy) ty = gy
  cam.off.lerp(_v.set(tx - pos.x, ty - pos.y, tz - pos.z), 1 - Math.exp(-dt * (out ? 2 : 10)))
  cam.pos.set(pos.x + cam.off.x, pos.y + cam.off.y, pos.z + cam.off.z)
  cam.lookOff.lerp(_v.set(hx * 10, (camera.aspect < 1 ? 3.4 : 2.6) + 1.3 - cam.pitch * 1.6 + Math.max(0, -cam.pitch) * 12, hz * 10), 1 - Math.exp(-dt * 12))
  if (out) cam.lookOff.set(0, 1.5, 0)
  cam.look.set(pos.x + cam.lookOff.x, pos.y + cam.lookOff.y, pos.z + cam.lookOff.z)
  camera.position.copy(cam.pos)
  const sh_ = fx.shake
  if (sh_ > 0) camera.position.add(_v.set((Math.random() - 0.5) * sh_, (Math.random() - 0.5) * sh_ * 0.7, (Math.random() - 0.5) * sh_))
  camera.lookAt(cam.look)
  const asp = camera.aspect
  const base = asp >= 1 ? 60 : Math.min(84, 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(37)) / asp) * 180 / Math.PI)
  const fov = base + Math.min(18, Math.max(0, Math.hypot(c.vx, c.vy, c.vz) - 6) * 0.5)
  cam.fov += (fov - cam.fov) * (1 - Math.exp(-dt * 4))
  fovKick *= Math.exp(-dt * 6)
  camera.fov = cam.fov + fovKick; camera.updateProjectionMatrix()
  const me_ = camera.matrixWorld.elements, rl = Math.hypot(me_[0], me_[2]) || 1, lat = (c.vx * me_[0] + c.vz * me_[2]) / rl
  cam.bank = (cam.bank || 0) + (Math.max(-0.1, Math.min(0.1, (c.rope ? lat : 0) * -0.004)) - (cam.bank || 0)) * (1 - Math.exp(-dt * 3))
  camera.rotateZ(cam.bank)
}

// ---------------------------------------------------------------- ループ
function resize() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); fx.setScale && fx.setScale(h) }
addEventListener('resize', resize); resize()
let last = performance.now(), acc = 0, frameN = 0
function stepOnce() {
  if (mode === 'play' && !paused && me && !H.over) {
    const inp = gather()
    me.events.length = 0
    stepRunner(me, inp, STEP, world)
    street.update(STEP, me); street.collide(me)
    stepHeist(H, me, STEP)
    for (const e of me.events) onRunnerEvent(e)
    for (const e of H.events) onHeistEvent(e)
    H.events.length = 0
  } else if (mode === 'title' && demo) {
    const inp = botInput(demo.b, demo.r, H, world, STEP)
    demo.r.events.length = 0
    stepRunner(demo.r, inp, STEP, world); street.update(STEP, demo.r); street.collide(demo.r)
    stepHeist(H, demo.r, STEP)
    H.events.length = 0
    if (H.over || H.t > 80) newDemo()
  } else if (mode === 'play' && H && H.over) {
    stepHeist(H, me, STEP)
    if (H.end === 'escaped') { me.y += STEP * 2.5; me.vx = me.vy = me.vz = 0; me.rope = null; view.balloon.position.y += STEP * 2.5 }   // 気球で上がっていく
    else { me.vx *= 0.9; me.vz *= 0.9; me.events.length = 0; stepRunner(me, { throttle: 0, steer: 0 }, STEP, world) }
  }
}
function frame() {
  requestAnimationFrame(frame)
  const now = performance.now()
  let dt = Math.min(0.1, (now - last) / 1000); last = now
  if (hitStop > 0) { hitStop -= dt; acc = 0 }
  else if (!dbgPause) { if (slowT > 0) slowT -= dt; acc += dt * (slowT > 0 ? 0.35 : 1); let n = 0; while (acc >= STEP && n < 6) { stepOnce(); acc -= STEP; n++ } if (n >= 6) acc = 0 }
  else dt = 0
  render(dt || 0.016)
}
const spd = $('speedfx'), sctx = spd.getContext('2d'), hf = $('hitflash'), rf = $('redflash'), gf = $('goldflash')
const lines = Array.from({ length: 46 }, () => ({ a: Math.random() * Math.PI * 2, p: Math.random(), s: 0.6 + Math.random() * 0.8, w: 1 + Math.random() * 2 }))
let spdOn = false
function drawSpeed(v, dt) {
  if (!window.__holdFx) { flashA = Math.max(0, flashA - dt * 5); redA = Math.max(0, redA - dt * 2.2); goldA = Math.max(0, goldA - dt * 2.5) }
  hf.style.opacity = flashA.toFixed(2); rf.style.opacity = redA.toFixed(2); gf.style.opacity = goldA.toFixed(2)
  const k = Math.max(0, Math.min(1, (v - 20) / 18))
  window.__speedK = k
  if (k <= 0) { if (spdOn) { sctx.clearRect(0, 0, spd.width, spd.height); spdOn = false } return }
  spdOn = true
  const W = innerWidth, Hh = innerHeight, dpr = Math.min(2, devicePixelRatio || 1)
  if (spd.width !== Math.round(W * dpr) || spd.height !== Math.round(Hh * dpr)) { spd.width = Math.round(W * dpr); spd.height = Math.round(Hh * dpr) }
  sctx.setTransform(dpr, 0, 0, dpr, 0, 0); sctx.clearRect(0, 0, W, Hh)
  const cx = W / 2, cy = Hh * 0.45, Rr = Math.hypot(W, Hh) * 0.55
  sctx.lineCap = 'round'
  const n = Math.round(lines.length * (0.35 + 0.65 * k))
  for (let i = 0; i < n; i++) {
    const L = lines[i]
    L.p += dt * L.s * (1.6 + k * 2.4); if (L.p > 1) { L.p -= 1; L.a = Math.random() * Math.PI * 2 }
    const r1 = Rr * (1.05 - L.p * 0.45), r0 = r1 - Rr * (0.12 + 0.2 * k) * L.s
    const ca = Math.cos(L.a), sa = Math.sin(L.a)
    sctx.strokeStyle = `rgba(220,236,255,${(0.1 + 0.3 * k) * Math.min(1, L.p * 4)})`; sctx.lineWidth = L.w
    sctx.beginPath(); sctx.moveTo(cx + ca * r0, cy + sa * r0); sctx.lineTo(cx + ca * r1, cy + sa * r1); sctx.stroke()
  }
}
function render(dt) {
  const c = mode === 'title' ? demo && demo.r : me
  const now = performance.now() / 1000
  facadeTime.value = now
  if (c && model) {
    model.update(c, dt)
    if (c.rope) {
      const h = model.handWorld
      ropeMesh.visible = true
      ropeMesh.position.copy(h); ropeMesh.lookAt(c.rope.x, c.rope.y, c.rope.z); ropeMesh.scale.set(1, 1, Math.max(0.1, h.distanceTo(_v.set(c.rope.x, c.rope.y, c.rope.z)))); ropeGlow.material.opacity = 0.28 + 0.1 * Math.sin(now * 14)
    } else ropeMesh.visible = false
    // 盗んだカツラ: 空いている手（無ければ腰の横）から下げる
    const hand = model.wigHand || _w.set(c.x + Math.cos(c.yaw) * 0.45, c.y + 1.0, c.z - Math.sin(c.yaw) * 0.45)
    wigView.set(H ? H.loot : 'wig', H ? H.wig : 0); wigView.update(hand, Math.min(dt, 0.05), _v.set(c.vx, c.vy, c.vz))
    updateCamera(dt, c)
    const d = sun.userData.dir; sun.position.set(c.x + d.x * 150, c.y + d.y * 150, c.z + d.z * 150); sun.target.position.set(c.x, c.y, c.z)
  }
  if (H) view.update(H, dt, now, camera.position)
  // ボタンで掛かる所の印（ワイヤーを持っていない時）・壁蹴りできる時はボタンに「蹴る」
  aimMark.visible = false
  if (mode === 'play' && me && !me.rope && frameN % 4 === 0) { const SF = screenBasis().f; aimMark.userData.p = findAnchor(world, me, Math.atan2(SF.x, SF.z)) }
  if (mode === 'play' && me && !me.rope && aimMark.userData.p) { const p = aimMark.userData.p; aimMark.visible = true; aimMark.position.set(p.x, p.y, p.z); aimMark.lookAt(camera.position); aimMark.scale.setScalar(Math.max(1, camera.position.distanceTo(aimMark.position) * 0.04)) }
  const wb = document.querySelector('.tbtn[data-k=wire]')
  if (wb && mode === 'play' && me) { const k = canKick(me) ? 'k' : me.rope ? 'r' : aimMark.userData.p ? 'b' : ''; if (wb._aim !== k) { wb._aim = k; wb.classList.toggle('aim', k === 'b'); wb.classList.toggle('kick', k === 'k'); wb.querySelector('.kick-l').textContent = k === 'k' ? t('kickL') : '' } }
  // 音: 風（速さ）・ヘリ（近さ）・電気のジジジ（近い仕掛け）
  if (mode === 'play' && me) {
    const v3 = Math.hypot(me.vx, me.vy, me.vz)
    const wl = Snd.loops.wind; if (wl && wl.g) { const gv = me.grounded ? 0 : Math.min(0.35, Math.max(0, (v3 - 16) / 40)); wl.g.gain.value = Number.isFinite(gv) ? gv : 0 }
    const hl = Snd.loops.heli; if (hl && hl.g) { const L = H.light, dd = Math.hypot(L.hx - me.x, L.hy - me.y, L.hz - me.z); const gv = H.over ? 0 : Math.min(0.5, Math.max(0.04, 1 - dd / 110) * 0.5); hl.g.gain.value = Number.isFinite(gv) ? gv : 0 }
    const bl = Snd.loops.buzz; if (bl && bl.g && frameN % 6 === 0) { let g = 1e9; for (const h of H.haz) { const q = Math.hypot(h.cx - me.x, h.cz - me.z) - h.rad * 0.5; if (q < g) g = q } const gv = H.over ? 0 : Math.max(0, 1 - g / 25) * 0.35; bl.g.gain.value = Number.isFinite(gv) ? gv : 0 }
  }
  drawSpeed(mode === 'play' && me ? Math.hypot(me.vx, me.vy, me.vz) : 0, dt)
  carsDraw.draw(street.traffic.cars, camera.position, dt)
  sky.update(camera.position, now, H && mode === 'play' ? Math.min(1, H.alarms / 3 + (H.light.meter > 0.3 ? 0.3 : 0)) : 0)
  fx.update(dt)
  fx.shake = Math.max(0, fx.shake - dt * 2.5)
  if (mode === 'play' && H) {
    updateHud(dt); updateFloats(dt)
    multPulse = Math.max(0, multPulse - dt * 3); $('bChain').style.setProperty('--pulse', multPulse.toFixed(2))
    if (!paused && !H.over && dt > 0) {
      radioT -= dt; if (radioT <= 0) { radioT = 18 + Math.random() * 9; say('mayor', Math.random() < 0.08 ? pick(t('rare')) : pick(t('radio'))) }
    }
    if (endAt > 0) { endAt -= dt; if (endAt <= 0) showResult() }
  }
  renderer.render(scene, camera)
  if (snapNext > 0 && --snapNext === 0) { const c2 = document.createElement('canvas'); c2.width = 640; c2.height = Math.round(640 * innerHeight / innerWidth); c2.getContext('2d').drawImage(renderer.domElement, 0, 0, c2.width, c2.height); photo = c2 }
  frameN++
}

// ---------------------------------------------------------------- 検証用の窓口
window.heist = {
  get mode() { return mode }, log, get hitStop() { return hitStop }, get flashA() { return flashA }, get fovKick() { return fovKick }, get me() { return me }, get H() { return H }, RUN, HZ, PTS, RANKS, world, camera, touchMode, cam, renderer, fx, scene, view,
  start: seed => startHeist(seed), toTitle, showResult, setLang: l => { lang = l; applyLang() }, get lang() { return lang },
  pointXY: (x, y, z) => { camera.updateMatrixWorld(); _v.set(x, y, z).project(camera); return { x: (_v.x + 1) / 2 * innerWidth, y: (1 - _v.y) / 2 * innerHeight, z: _v.z } },
  dbg: {
    pause: on => { dbgPause = on }, step: n => { for (let i = 0; i < n; i++) stepOnce(); render(STEP) },
    teleport: (x, y, z, yaw) => { Object.assign(me, { x, y, z, vx: 0, vy: 0, vz: 0, rope: null, climbing: null, grounded: y < 0.1 }); H.lastX = x; H.lastY = y; H.lastZ = z; if (yaw != null) me.yaw = yaw },
    pressWire: (sx, sy) => aimAt(sx, sy), wireAuto: () => pressButton(),
    keys, stick, say, get model() { return model },
    render: n => { for (let i = 0; i < n; i++) render(1 / 30) },
    lookAt: (x, z) => { cam.hd = Math.atan2(x - me.x, z - me.z); cam.userT = performance.now() },
    anchor: () => findAnchor(world, me, cam.hd),
    safe: () => { H.inv = 1e9; H.noLight = true; H.drones.length = 0 },
    wireAt: (x, y, z, ground = false) => { pendingWire = { at: { x, y, z, ground } } },
    // 画面のどこを押せばビル／地面に掛かるか（本物の指で押すテスト用）
    screenAnchor: () => {
      camera.updateMatrixWorld()
      for (let sy = 0.18; sy < 0.6; sy += 0.04) for (let sx = 0.15; sx < 0.86; sx += 0.05) {
        ndc.set(sx * 2 - 1, -(sy * 2 - 1)); ray.setFromCamera(ndc, camera)
        const o = ray.ray.origin, d = ray.ray.direction, h = rayHit(world, o.x, o.y, o.z, d.x, d.y, d.z, 400, Math.max(0, (me.x - o.x) * d.x + (me.y + 1 - o.y) * d.y + (me.z - o.z) * d.z - 1))
        if (h && !h.pole && h.y > me.y + 4 && Math.hypot(h.x - me.x, h.y - me.y - 1.5, h.z - me.z) < RUN.wireRange - 5) return { x: sx * innerWidth, y: sy * innerHeight, hit: h }
      }
      return null
    },
    screenGround: () => {
      camera.updateMatrixWorld()
      for (let sy = 0.72; sy > 0.42; sy -= 0.03) for (let sx = 0.36; sx < 0.65; sx += 0.04) {   // 左下のスティックと右下のボタンを避ける
        ndc.set(sx * 2 - 1, -(sy * 2 - 1)); ray.setFromCamera(ndc, camera)
        const o = ray.ray.origin, d = ray.ray.direction, g = groundRay(o, d, RUN.wireRange + 60)
        const b = rayHit(world, o.x, o.y, o.z, d.x, d.y, d.z, 400, 0), tb = b ? Math.hypot(b.x - o.x, b.y - o.y, b.z - o.z) : Infinity
        if (g && !(tb < g.t + 6) && Math.hypot(g.x - me.x, g.y - me.y, g.z - me.z) < RUN.wireRange - 5) return { x: sx * innerWidth, y: sy * innerHeight, g }
      }
      return null
    },
    stepUntil: (fn, max = 3000) => { const f = new Function('heist', 'return ' + fn); for (let i = 0; i < max; i++) { stepOnce(); if (f(window.heist)) { render(STEP); return i + 1 } } render(STEP); return -1 }
  }
}
applyLang()
toTitle()
// 準備完了: 最初の画面を2回描いたら（画像・人物・音は裏で読む。届くまでは仮の色と手続きの人形）
requestAnimationFrame(() => requestAnimationFrame(() => {
  window.__bootDone = true; window.__bootSet && window.__bootSet(1)
  const b = $('boot'); b.classList.add('out'); setTimeout(() => b.classList.add('hidden'), 380)
  window.__wigReady = true
  lazyStart()
  loadCharAssets().then(() => { if (charAssets.ready && model && !(model instanceof CharRunnerModel)) newModel() })
}))
requestAnimationFrame(frame)
