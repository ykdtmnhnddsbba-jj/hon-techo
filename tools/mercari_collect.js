// 内蔵ブラウザで https://jp.mercari.com/search を開き、resize_window で 1400x9999 にしてから javascript_tool で実行する
// （縦長にしないと検索結果が少しずつしか描画されず件数を取り逃がす）。
// window.__B = [[ISBN, 検索キーワード, [一致判定トークン...]], ...] を入れて __runMercari() → 完了まで __done2 を見て待つ。
window.__scrape=(sold)=>[...document.querySelectorAll('li[data-testid="item-cell"]')].filter(li=>sold===undefined||/SOLD/.test(li.innerText)===sold).map(li=>{const a=li.querySelector('a[href*="/item/"],a[href*="/shops/product/"]');const img=li.querySelector('img');const p=li.querySelector('[data-testid="item-tile-price"]');return {id:a?a.getAttribute('href').split('/').pop():'',name:(img?img.alt:'').replace(/のサムネイル.*$/,''),price:p?+p.textContent.replace(/[^\d]/g,''):null}}).filter(x=>x.id);
window.__ms=async(kw,status)=>{const prev=window.__scrape().map(x=>x.id).slice(0,5).join();const u='/search?keyword='+encodeURIComponent(kw)+'&status='+status;window.next.router.push(u);
  // URLが変わっても一覧が前のページのまま残ることがあるので、先頭の商品が入れ替わるまで待つ
  for(let i=0;i<60;i++){await new Promise(r=>setTimeout(r,250));const cur=window.__scrape().map(x=>x.id).slice(0,5).join();if(location.search.includes('status='+status)&&cur!==prev)break}
  await new Promise(r=>setTimeout(r,2500));let last=-1,stable=0;
  for(let i=0;i<40;i++){window.scrollTo(0,document.body.scrollHeight);const n=window.__scrape().length;if(n===last){stable++;if(stable>=4)break}else{stable=0;last=n}await new Promise(r=>setTimeout(r,400))}
  // 売り切れ検索は「SOLD」表示のある商品だけ、出品中検索は「SOLD」表示のない商品だけ数える（2026-11-23: 混ざる事例あり）
  window.scrollTo(0,0);return window.__scrape(status==='sold_out')};
window.__runMercari=()=>{window.__res2={};window.__done2=false;(async()=>{for(const [a,kw] of window.__B){try{const s=await window.__ms(kw,'sold_out');const o=await window.__ms(kw,'on_sale');window.__res2[a]={s,o}}catch(e){window.__res2[a]={err:String(e)}}}window.__done2=true})();return 'started'};
// 書名一致だけ残す（NFKC・小文字・記号/空白除去後に、トークンが全部含まれるもの。トークン内の | はOR）
window.__matchOut=()=>{const norm=s=>String(s).normalize('NFKC').toLowerCase().replace(/[\s　\[\]［］【】「」『』()（）・,，、。!！?？~〜―─-]/g,'');
  const out={};for(const [a,kw,tok] of window.__B){const v=window.__res2[a];if(!v||v.err){out[a]={kw,err:v&&v.err};continue}
    const m=x=>tok.every(t=>t.split('|').some(tt=>norm(x.name).includes(norm(tt))));const ms=v.s.filter(m),mo=v.o.filter(m);
    out[a]={kw,sp:ms.map(x=>x.price),si:ms.slice(0,8).map(x=>[x.id,x.name.slice(0,40),x.price]),op:mo.map(x=>x.price),raw:[v.s.length,v.o.length]}}
  return out};
