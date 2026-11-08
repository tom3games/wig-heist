// 夜の街の見た目（怪盗、市長のカツラを盗む）。空は画像を読まず shader（紺の空・月・星・地平線の街明かり）
// 街の頂点色を夜の色に落とす。建物の窓の明かりは facade.js のシェーダー
import * as THREE from 'three'

const _c = new THREE.Color()
export const PALETTE = {
  zenith: new THREE.Color(0x050915), mid: new THREE.Color(0x0e1630), horizon: new THREE.Color(0x2a2c48), glow: new THREE.Color(0xc8d6ff),
  city: new THREE.Color(0x6a4a3a), fog: new THREE.Color(0x0f1428), moon: new THREE.Color(0xb8c8ff), hemiSky: new THREE.Color(0x4a5a8a), hemiGround: new THREE.Color(0x2a2018)
}
const SKY_V = 'varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }'
const SKY_F = `
uniform vec3 cZ, cM, cH, cG, cC; uniform vec3 moonD; uniform float uT, uAlarm;
varying vec3 vD;
float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
void main(){
  vec3 d = normalize(vD); float y = d.y;
  vec3 c = mix(cH, cM, smoothstep(0.0, 0.25, y)); c = mix(c, cZ, smoothstep(0.2, 0.8, y));
  // 地平線の街明かり（橙のにじみ）
  c += cC * (1.0 - smoothstep(-0.02, 0.18, y)) * 0.55;
  // 月と月のまわりの光
  float s = max(0.0, dot(d, moonD));
  c += cG * (pow(s, 40.0) * 0.18 + pow(s, 400.0) * 0.35);
  c = mix(c, vec3(0.86, 0.9, 1.0), smoothstep(0.9994, 0.9997, s));
  // 星（上の方だけ・ゆっくり瞬く）
  vec2 sp = vec2(atan(d.z, d.x) * 90.0, y * 140.0);
  float st = step(0.9965, h(floor(sp))) * smoothstep(0.12, 0.4, y);
  c += vec3(0.8, 0.85, 1.0) * st * (0.55 + 0.45 * sin(uT * 2.0 + h(floor(sp) + 3.0) * 30.0));
  // 薄い雲
  float cl = n(vec2(atan(d.z, d.x) * 3.0 + uT * 0.006, y * 7.0)) * n(vec2(atan(d.z, d.x) * 7.0, y * 13.0 + uT * 0.01));
  c = mix(c, c * 0.7 + vec3(0.03, 0.035, 0.06), smoothstep(0.25, 0.6, cl) * smoothstep(0.02, 0.3, y) * 0.6);
  // 警報が鳴ると空が少し赤く
  c += vec3(0.25, 0.0, 0.02) * uAlarm * (1.0 - smoothstep(0.0, 0.5, y));
  if (y < 0.0) c = mix(cH * 0.6, c, 0.4);
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`
export function makeSky(renderer, scene, moonDir) {
  const u = { cZ: { value: PALETTE.zenith }, cM: { value: PALETTE.mid }, cH: { value: PALETTE.horizon }, cG: { value: PALETTE.glow }, cC: { value: PALETTE.city }, moonD: { value: moonDir.clone() }, uT: { value: 0 }, uAlarm: { value: 0 } }
  const mat = new THREE.ShaderMaterial({ uniforms: u, vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false, fog: false })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), mat)
  mesh.renderOrder = -10; mesh.frustumCulled = false
  scene.add(mesh)
  // 金属の映り込み用の環境（夜空の色の小さな絵から作る。1回だけ）
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64
  const x = cv.getContext('2d'), g = x.createLinearGradient(0, 0, 0, 64)
  g.addColorStop(0, '#060a18'); g.addColorStop(0.4, '#16203e'); g.addColorStop(0.5, '#5a4a4a'); g.addColorStop(0.56, '#1a1820'); g.addColorStop(1, '#0a0a0e')
  x.fillStyle = g; x.fillRect(0, 0, 128, 64)
  const et = new THREE.CanvasTexture(cv); et.mapping = THREE.EquirectangularReflectionMapping; et.colorSpace = THREE.SRGBColorSpace
  const pm = new THREE.PMREMGenerator(renderer)
  scene.environment = pm.fromEquirectangular(et).texture
  scene.environmentIntensity = 0.55
  pm.dispose(); et.dispose()
  scene.background = PALETTE.fog.clone()
  return { mesh, u, update(cam, t, alarm) { mesh.position.copy(cam); u.uT.value = t; u.uAlarm.value += ((alarm || 0) - u.uAlarm.value) * 0.05 } }
}

// 街の頂点色と材質を夜の色に（少し暗く、青く）。建物の外壁は facade.js
export function buildNight(scene) {
  scene.traverse(o => {
    const a = o.isMesh && o.geometry && o.geometry.attributes.color
    if (!a || o.userData.keepColor) return
    for (let i = 0; i < a.count; i++) {
      const r = a.getX(i), g = a.getY(i), b = a.getZ(i), l = r * 0.3 + g * 0.59 + b * 0.11
      a.setXYZ(i, (l + (r - l) * 0.7) * 0.62, (l + (g - l) * 0.7) * 0.66, (l + (b - l) * 0.7) * 0.8)
    }
    a.needsUpdate = true
  })
  scene.traverse(o => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return
    const m = o.material
    if (m.isMeshStandardMaterial && !m.userData.night) {
      m.userData.night = true
      if (m.transparent && m.opacity > 0.8 && m.metalness > 0.2) m.color.setHex(0x0e1626)   // 運河の水（夜の色）
      else if (m.alphaTest > 0) m.color.multiply(_c.setHex(0x8a9aa0))   // 木の葉・草
    }
  })
}
