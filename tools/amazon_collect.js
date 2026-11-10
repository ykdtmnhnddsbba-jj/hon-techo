// 内蔵ブラウザで https://www.amazon.co.jp/gp/new-releases/books/466298 を開き、javascript_tool で実行する。
// (1) ランキングからISBN(ASIN)を集める → (2) 各商品ページから書誌情報を取る（window.__info に溜まる。45秒制限があるので数回に分けて呼ぶ）
// IT=466298 / ビジネス・経済=466282
window.__collectAsins = async () => {
  async function grab(url){const h=await fetch(url,{credentials:'include'}).then(r=>r.text());const d=new DOMParser().parseFromString(h,'text/html');const s=new Set();
    const rl=d.querySelector('[data-client-recs-list]');if(rl){JSON.parse(rl.getAttribute('data-client-recs-list')).forEach(x=>s.add(x.id))}
    d.querySelectorAll('a[href*="/dp/"]').forEach(a=>{const m=a.getAttribute('href').match(/dp\/(\w{10})/);if(m)s.add(m[1])});return [...s]}
  const all=new Set();
  for(const c of ['466298','466282'])for(const t of ['new-releases','bestsellers'])for(const p of [1,2])(await grab(`/gp/${t}/books/${c}/?pg=${p}`)).forEach(a=>all.add(a));
  window.__asins=[...all].filter(a=>/^\d{9}[\dX]$/.test(a));return window.__asins.length;
};
window.__amzInfo = async (a) => {
  const h=await fetch('/dp/'+a,{credentials:'include'}).then(r=>r.text());const d=new DOMParser().parseFromString(h,'text/html');
  const t=(d.querySelector('#productTitle')||{}).textContent?.trim()||'';
  const b=[...d.querySelectorAll('#detailBullets_feature_div li')].map(x=>x.textContent.replace(/[\s‎‏]+/g,' ').trim()).join(' / ');
  const g=re=>(b.match(re)||[])[1]||'';
  const price=[...d.querySelectorAll('#tmm-grid-swatch-PAPERBACK .slot-price span, #tmm-grid-swatch-HARDCOVER .slot-price span, #price, #corePrice_feature_div .a-offscreen')].map(x=>x.textContent.trim()).find(x=>/￥/.test(x))||'';
  const by=(d.querySelector('#bylineInfo')||{}).textContent?.replace(/\s+/g,' ').replace(/形式:.*/,'').trim()||'';
  return {t,by,price,date:g(/発売日 : (\S+)/),pages:g(/本の長さ : (\d+)/),dim:g(/寸法 : ([\d.]+ x [\d.]+ x [\d.]+ cm)/),pub:g(/出版社 : ([^/]+)/).trim(),wt:g(/商品の重量 : ([\d.]+ \S+)/),rank:g(/本 - ([\d,]+)位/)};
};
window.__collectInfo = (list) => { window.__info=window.__info||{}; (async()=>{const todo=(list||window.__asins).filter(a=>!window.__info[a]);
  for(let i=0;i<todo.length;i+=6){await Promise.all(todo.slice(i,i+6).map(async a=>{try{window.__info[a]=await window.__amzInfo(a)}catch(e){window.__info[a]={err:1}}}))}window.__infoDone=true})(); return 'started'; };
