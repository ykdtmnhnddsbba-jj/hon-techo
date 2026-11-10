// 内蔵ブラウザで https://jp.mercari.com/search を開き、resize_window で 1400x9999 にしてから javascript_tool で実行する
// （縦長にしないと検索結果が少しずつしか描画されず件数を取り逃がす）。
// window.__B = [[ISBN, 検索キーワード, [一致判定トークン...]], ...] を入れて __runMercari() → 完了まで __done2 を見て待つ。
window.__scrape=()=>[...document.querySelectorAll('li[data-testid="item-cell"]')].map(li=>{const a=li.querySelector('a[href*="/item/"],a[href*="/shops/product/"]');const img=li.querySelector('img');const p=li.querySelector('[data-testid="item-tile-price"]');return {id:a?a.getAttribute('href').split('/').pop():'',name:(img?img.alt:'').replace(/のサムネイル.*$/,''),price:p?+p.textContent.replace(/[^\d]/g,''):null}}).filter(x=>x.id);
window.__ms=async(kw,status)=>{const u='/search?keyword='+encodeURIComponent(kw)+'&status='+status;const before=location.href;window.next.router.push(u);
  for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,250));if(location.href!==before)break}
  await new Promise(r=>setTimeout(r,1500));let last=-1,stable=0;
  for(let i=0;i<40;i++){window.scrollTo(0,document.body.scrollHeight);const n=window.__scrape().length;if(n===last){stable++;if(stable>=4)break}else{stable=0;last=n}await new Promise(r=>setTimeout(r,400))}
  window.scrollTo(0,0);return window.__scrape()};
window.__runMercari=()=>{window.__res2={};window.__done2=false;(async()=>{for(const [a,kw] of window.__B){try{const s=await window.__ms(kw,'sold_out');const o=await window.__ms(kw,'on_sale');window.__res2[a]={s,o}}catch(e){window.__res2[a]={err:String(e)}}}window.__done2=true})();return 'started'};
// 書名一致だけ残す（NFKC・小文字・記号/空白除去後に、トークンが全部含まれるもの。トークン内の | はOR）
window.__matchOut=()=>{const norm=s=>String(s).normalize('NFKC').toLowerCase().replace(/[\s　\[\]［］【】「」『』()（）・,，、。!！?？~〜―─-]/g,'');
  const out={};for(const [a,kw,tok] of window.__B){const v=window.__res2[a];if(!v||v.err){out[a]={kw,err:v&&v.err};continue}
    const m=x=>tok.every(t=>t.split('|').some(tt=>norm(x.name).includes(norm(tt))));const ms=v.s.filter(m),mo=v.o.filter(m);
    out[a]={kw,sp:ms.map(x=>x.price),si:ms.slice(0,8).map(x=>[x.id,x.name.slice(0,40),x.price]),op:mo.map(x=>x.price),raw:[v.s.length,v.o.length]}}
  return out};
