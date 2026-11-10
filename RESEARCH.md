# 月次調査の手順（Claude向け）

「本の手帖：今月の調査して」と頼まれたら、この手順で候補データを作って push する。所要 30〜60分。

## 0. 前提
- リポジトリ: `ykdtmnhnddsbba-jj/hon-techo`（GitHub Pages: https://ykdtmnhnddsbba-jj.github.io/hon-techo/ ）
- ユーザーのフォルダ: `G:\マイドライブ\App\売れ筋の本を探す`（ソースのコピーと HANDOFF.md を置く）
- 対象期間: 調査日から過去3か月（例: 調査日 2026-11-10 → 2026-08-10〜2026-11-10 発売）
- 使うブラウザ: Claude デスクトップアプリの**内蔵ブラウザ**（Amazon・メルカリともログイン不要）

## 1. Amazonで母集団を集める（tools/amazon_collect.js）
1. 内蔵ブラウザで `https://www.amazon.co.jp/gp/new-releases/books/466298` を開く。
2. `tools/amazon_collect.js` の中身を javascript_tool で実行 → `await __collectAsins()`。
   - コンピュータ・IT(466298)／ビジネス・経済(466282) × 新着・売れ筋 × 1〜2ページ。
3. `__collectInfo()` で各商品ページの 価格・発売日・寸法・重量・ページ数・売れ筋順位 を集める（`__infoDone` が true になるまで待つ）。
4. 対象期間に発売・IT/ビジネス書（年賀状・雑誌・家計簿・ゲーム攻略・手帳・資格のうち仕事と無関係なもの は除外）を選ぶ。
   中古が出回っていないと実績0になるので、**発売から2週間以上たった本を中心に**、直近発売の注目本も少し入れる。
5. 結果を `tools/raw/<YYYY-MM>/amazon.json` に保存（ISBN → {t,by,pub,date,price,pages,dim,wt,rank}）。
   Amazon本体に在庫が無く価格が出ない本は `price_note.json` に事情を書く（マケプレ価格をAmazon価格として扱わない）。

## 2. メルカリで売れた実績を見る（tools/mercari_collect.js）
1. 内蔵ブラウザで `https://jp.mercari.com/search?keyword=本&status=sold_out` を開き、**resize_window で 1400×9999** にする（縦長にしないと結果の描画が途中で止まり件数を取りこぼす）。終わったら preset desktop に戻す。
2. `tools/mercari_collect.js` を実行し、`window.__B=[[ISBN,'検索キーワード',['一致トークン',...]],...]` を入れて `__runMercari()`。
   - キーワードは書名の特徴的な部分。トークンは「旧版・別の本・前年版」を弾けるもの（例: `['経営の論点2027']`、`['pmp','8版']`）。
3. `__done2` が true になったら `__matchOut()` の結果を `tools/raw/<YYYY-MM>/mercari.json` に保存。
   - `sp`=売り切れ（＝売れた価格）、`op`=出品中（＝競合の出品価格。売れた価格ではない）。
   - 検索結果は最大120件／売れた日時は取れないので「売れた時期は未確認」と明記する。
4. 怪しいもの（件数が急に多い・価格が極端）は `rej`（除外された名前）や実際の検索ページを目で確認する。

## 3. 評価を書く（tools/annot.py）
ISBN → (ジャンル[], 実務有用性1-5, 需要の続きやすさ1-5, コメント)。ユーザーは クラウドインテグレーション会社のPM。

## 4. 生成・テスト・公開
```
cd tools && python3 build.py .. 2026-11 2026-08-10 2026-11-10 "2026-11-10"
node /path/to/test.js ..      # jsdom テスト（無ければ省略可）
git add -A && git commit -m "2026-11 の調査" && git push
```
`data/index.json` に月が追加され、サイトの月セレクタで過去月も見られる。
最後にユーザーのフォルダへ `index.html`・`HANDOFF.md`・`data/` をコピーし、HANDOFF.md の「調査履歴」を更新する。

## 判定ルール（サイト側で計算。設定タブで前提を変更可）
- 想定売却価格 = 売れた価格の中央値。中央値より安い出品中があればその最安値（ただし売れた最安値より下げない）
- 手取り = 想定売却価格 − 手数料10%（切り捨て）− ネコポス210円 − 梱包資材74円
- 実質負担 = Amazon価格 − 手取り（ランキングはこれが小さい順）
- ネコポス = 封筒 220×315mm（内寸は非公表→約205×300mmと仮定）。袋なので「幅＋厚さ ≤ 内寸幅」「高さ＋厚さ ≤ 内寸高さ」、梱包後の厚さ（本＋5mm）≤ 30mm、重さ ≤ 1kg
