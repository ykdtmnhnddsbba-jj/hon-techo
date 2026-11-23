#!/usr/bin/env python3
"""調査の生データ（tools/raw/<月>/amazon.json・mercari.json）＋ annot.py から data/<月>.json と data/index.json を作る。
使い方: python3 build.py <repo_dir> <YYYY-MM> <window_from> <window_to> <researched_at>
"""
import json, sys, re, statistics, urllib.parse, os
sys.path.insert(0, os.path.dirname(__file__))
from annot import A

repo, month, wfrom, wto, rat = sys.argv[1:6]
RAW = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'raw', month)
amz = json.load(open(os.path.join(RAW, 'amazon.json')))
mer = json.load(open(os.path.join(RAW, 'mercari.json')))

def dims(s):
    m = re.findall(r'[\d.]+', s or '')
    if len(m) < 3: return None
    v = sorted(float(x) * 10 for x in m[:3])
    return {'h': round(v[2], 1), 'w': round(v[1], 1), 't': round(v[0], 1)}

def weight(s):
    if not s: return None
    m = re.match(r'([\d.]+)\s*(\S+)', s)
    if not m: return None
    v = float(m.group(1))
    return round(v * 1000) if m.group(2).lower().startswith('k') else round(v)

def ymd(s):
    y, m, d = (int(x) for x in s.split('/'))
    return f'{y:04d}-{m:02d}-{d:02d}'

def yen(s):
    m = re.search(r'[\d,]+', s or '')
    return int(m.group(0).replace(',', '')) if m else None

# Amazon本体に在庫がなく価格が取れなかった本の補足（任意）
PRICE_NOTE = json.load(open(os.path.join(RAW, 'price_note.json'))) if os.path.exists(os.path.join(RAW, 'price_note.json')) else {}
books, excluded = [], []
for isbn, (genres, use, dem, comment) in A.items():
    a = amz.get(isbn)
    r = mer.get(isbn, {})
    if not a:
        excluded.append({'title': isbn, 'reason': 'Amazonの書誌情報を取得できず'}); continue
    rd = ymd(a['date']) if a.get('date') else None
    size = dims(a.get('dim'))
    if size is not None:
        size['weight_g'] = weight(a.get('wt'))
    kw = r.get('kw') or a['t']
    q = urllib.parse.quote(kw)
    sold = r.get('sp', [])
    onsale = r.get('op', [])
    b = {
        'isbn': isbn, 'asin': isbn, 'title': a['t'], 'author': a.get('by', ''), 'publisher': a.get('pub', ''),
        'release_date': rd, 'in_window': bool(rd and wfrom <= rd <= wto), 'genres': genres, 'genre_ok': True,
        'price': yen(a.get('price')), 'price_note': PRICE_NOTE.get(isbn, ''), 'pages': int(a['pages']) if a.get('pages') else None,
        'amazon_rank': int(a['rank'].replace(',', '')) if a.get('rank') else None,
        'size': size,
        'mercari': {
            'checked_at': rat, 'search_keyword': kw,
            'sold_count': len(sold), 'sold_prices': sold,
            'sold_median': statistics.median(sold) if sold else None,
            'on_sale_count': len(onsale), 'on_sale_min': min(onsale) if onsale else None, 'on_sale_prices': onsale,
            'sold_items': [{'id': i, 'name': n, 'price': p} for i, n, p in r.get('si', [])],
            'search_url_sold': f'https://jp.mercari.com/search?keyword={q}&status=sold_out',
            'search_url_on_sale': f'https://jp.mercari.com/search?keyword={q}&status=on_sale',
            'note': r.get('note', ''), 'raw_hits': r.get('raw'),
        },
        'usefulness': use, 'demand': dem, 'comment': comment,
        'sources': [
            {'label': 'Amazon.co.jp 商品ページ（価格・発売日・寸法・重量・売れ筋順位）', 'url': f'https://www.amazon.co.jp/dp/{isbn}'},
            {'label': 'メルカリ 売り切れ検索（売れた価格）', 'url': f'https://jp.mercari.com/search?keyword={q}&status=sold_out'},
            {'label': 'メルカリ 出品中検索（競合）', 'url': f'https://jp.mercari.com/search?keyword={q}&status=on_sale'},
        ],
    }
    books.append(b)

out = {
    '_readme': {
        'about': '本の手帖の候補データ。Claudeが調査日時点でAmazon.co.jpとメルカリを確認した結果。',
        'price': 'Amazon.co.jpの新品価格（税込）',
        'size': 'Amazon商品ページの寸法をmmに換算（h=高さ, w=幅, t=厚さ）。weight_g=重量',
        'mercari.sold_prices': 'メルカリ「売り切れ」検索の結果のうち、書名が一致した商品の価格（＝実際に売れた価格）。検索結果は最大120件まで、売れた時期は未確認',
        'mercari.on_sale_prices': 'メルカリ「出品中」検索で書名が一致した商品の価格（＝競合の出品価格。売れた価格ではない）',
        'usefulness/demand': 'Claudeによる実務有用性・需要の続きやすさの評価（1〜5）',
    },
    'month': month, 'label': f'{int(month[:4])}年{int(month[5:])}月の調査', 'researched_at': rat,
    'window': {'from': wfrom, 'to': wto},
    'notes': [
        '候補の母集団：Amazon.co.jp「コンピュータ・IT」「ビジネス・経済」の新着ランキング・売れ筋ランキング（各1〜2ページ）に載った本のうち、対象期間に発売されたIT・ビジネス書。',
        'メルカリは内蔵ブラウザで「売り切れ」「出品中」を書名で検索し、書名が一致したものだけ数えています（旧版・別の本・セット売りは除外）。',
        '発売から2週間以内の本は、まだ中古が出回っておらず売却実績0件になりやすい点に注意。',
        '年度版（〜2027など）は翌年版が出ると相場が大きく下がるため、早めに読んで売る前提です。',
    ],
    'books': books, 'excluded': excluded,
}
os.makedirs(os.path.join(repo, 'data'), exist_ok=True)
fn = f'data/{month}.json'
json.dump(out, open(os.path.join(repo, fn), 'w'), ensure_ascii=False, indent=1)
idxp = os.path.join(repo, 'data/index.json')
idx = json.load(open(idxp)) if os.path.exists(idxp) else {'months': []}
idx['months'] = [m for m in idx['months'] if m['month'] != month]
idx['months'].insert(0, {'month': month, 'label': out['label'], 'file': fn, 'researched_at': rat})
idx['months'].sort(key=lambda m: m['month'], reverse=True)
json.dump(idx, open(idxp, 'w'), ensure_ascii=False, indent=1)
print('books', len(books), 'excluded', len(excluded))
