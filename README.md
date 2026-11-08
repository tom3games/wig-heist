# 怪盗、市長のカツラを盗む（wig-heist）

https://tom3games.com/play/wig-heist/

市長のカツラを盗んだ怪盗が、夜の街をワイヤーで飛んで逃げる3Dワイヤーアクション。回転レーザー・鉄球・高圧線・通りを走査するレーザーの網・警備ドローン・ヘリのサーチライト。赤く光る物に3回触れたら御用。金の輪を5つくぐって公園の気球へ。紙一重・ナイスリリース・急旋回・壁蹴り・急降下で懸賞金が上がる。結果は翌朝の号外。街とワイヤーは空中出前（sky-delivery）・廃都迎撃（ufo-demae v4）のものを夜にした。

- 遊ぶ: ブラウザで開くだけ（スマホ縦）
- 開発: `node server.mjs` → http://localhost:6441 ／ 本体は `node tools/build.mjs` で dist/game.js に1つにまとめる（js/ shared/ を直したら毎回。verify.mjs も最初に回す）
- 検証 `node verify.mjs` ／ 釣り合い `node tools/sim.mjs 8`（skilled・average・notech・idle）／ 掛かる向き `node tools/reach.mjs` ／ fps `node tools/fps.mjs` ／ 撮影 `node tools/shot.mjs` ／ 地図 `node tools/map.mjs` ／ OGP `node og.mjs`
- 調整値は shared/heist.js の HZ・PTS・RANKS・COURSE・NETS、技は shared/runner.js の RUN（nice*・rehook*・kick*）。見た目は js/heist3d.js（仕掛け・輪・気球・カツラ）・js/night.js（夜空）・js/facade.js（窓の明かり）・js/news.js（号外）
- 仕様の正本: ~/Desktop/claudecode/ideas/wig-heist.md
- 素材の出所は CREDITS.md（全部 CC0 か Public domain）
