/* レシピ集 — 閲覧専用ビューア
   画面コードとレシピデータは分離。データは recipes/ 以下のみを編集する。 */

const STATUS_COLOR = {
  '完全版':   'var(--s-kanzen)',
  '基本版':   'var(--s-kihon)',
  '完成候補': 'var(--s-kouho)',
  '改良中':   'var(--s-kairyo)',
  '試作中':   'var(--s-shisaku)'
};

const CATEGORY_ORDER = [
  'シフォンケーキ', 'スポンジ／ジェノワーズ', 'クッキー',
  'パン', 'クリーム／デコレーション', 'その他'
];

const state = { recipes: [], category: null, query: '' };

/* ---------- 保存（お気に入り・最近見た） ---------- */
const store = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }
};
const favs = () => store.get('favorites', []);
const isFav = id => favs().includes(id);
const toggleFav = id => {
  const list = favs();
  const i = list.indexOf(id);
  i === -1 ? list.push(id) : list.splice(i, 1);
  store.set('favorites', list);
};
const recents = () => store.get('recents', []);
const pushRecent = id => {
  const list = recents().filter(x => x !== id);
  list.unshift(id);
  store.set('recents', list.slice(0, 6));
};

/* ---------- 読み込み ---------- */
async function loadRecipes() {
  const index = await fetch('recipes/index.json?v=' + Date.now()).then(r => r.json());
  const files = Array.isArray(index) ? index : index.recipes;
  const list = await Promise.all(
    files.map(f => fetch(`recipes/${f}.json?v=${Date.now()}`)
      .then(r => r.json())
      .catch(() => null))
  );
  return list.filter(Boolean);
}

/* ---------- ユーティリティ ---------- */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const byId = id => state.recipes.find(r => r.id === id);
const statusOf = r => r.status || (r.variants?.[0]?.status) || '';
const sizesOf = r => (r.variants || []).map(v => v.size).filter(Boolean).join('・');

function badge(status) {
  if (!status) return '';
  return `<span class="badge" style="color:${STATUS_COLOR[status] || 'var(--ink-soft)'}">${esc(status)}</span>`;
}

function searchText(r) {
  const parts = [r.name, r.category, r.summary, ...(r.tags || [])];
  (r.variants || []).forEach(v => {
    parts.push(v.size, v.mold);
    (v.ingredientGroups || []).forEach(g => {
      parts.push(g.name);
      (g.items || []).forEach(i => parts.push(i.name, i.note));
    });
  });
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function match(r) {
  if (state.category && r.category !== state.category) return false;
  if (state.query && !searchText(r).includes(state.query.toLowerCase())) return false;
  return true;
}

/* ---------- カード ---------- */
function cardHTML(r) {
  const status = statusOf(r);
  const sizes = sizesOf(r);
  return `
  <a class="card" href="#/recipe/${encodeURIComponent(r.id)}"
     style="--accent:${STATUS_COLOR[status] || 'var(--line)'}">
    <div class="card__top">
      <span class="card__name">${esc(r.name)}</span>
      ${isFav(r.id) ? '<span class="card__fav">★</span>' : ''}
      ${badge(status)}
    </div>
    <div class="card__meta">
      <span>${esc(r.category || '')}</span>
      ${sizes ? `<span>${esc(sizes)}</span>` : ''}
    </div>
    ${r.summary ? `<p class="card__desc">${esc(r.summary)}</p>` : ''}
  </a>`;
}

function cardsHTML(list, emptyText) {
  if (!list.length) return `<p class="empty">${esc(emptyText)}</p>`;
  return `<div class="cards">${list.map(cardHTML).join('')}</div>`;
}

/* ---------- トップ画面 ---------- */
function renderHome() {
  const filtering = state.category || state.query;
  const visible = state.recipes.filter(match);
  const cats = [...new Set([...CATEGORY_ORDER, ...state.recipes.map(r => r.category)])]
    .filter(Boolean);

  const favList = favs().map(byId).filter(Boolean);
  const recentList = recents().map(byId).filter(Boolean);

  const head = (title, count) => `
    <div class="section__head">
      <h2>${esc(title)}</h2>
      ${count != null ? `<span class="section__count">${count}件</span>` : ''}
    </div>`;

  let html = '';

  if (!filtering && favList.length) {
    html += `<section class="section">${head('お気に入り')}${cardsHTML(favList)}</section>`;
  }
  if (!filtering && recentList.length) {
    html += `<section class="section">${head('最近見たレシピ')}${cardsHTML(recentList)}</section>`;
  }

  html += `<section class="section">
    ${head('カテゴリ')}
    <div class="cats">
      <button class="cat" data-cat="" aria-pressed="${!state.category}">すべて</button>
      ${cats.map(c => `<button class="cat" data-cat="${esc(c)}" aria-pressed="${state.category === c}">${esc(c)}</button>`).join('')}
    </div>
  </section>`;

  const title = state.category || (state.query ? `「${state.query}」の検索結果` : 'レシピ一覧');
  html += `<section class="section">
    ${head(title, visible.length)}
    ${cardsHTML(visible, state.recipes.length ? '該当するレシピはありません。条件を変えて探してみてください。' : 'まだレシピがありません。recipes/ にレシピを追加すると、ここに表示されます。')}
  </section>`;

  document.getElementById('app').innerHTML = html;

  document.querySelectorAll('.cat').forEach(btn => {
    btn.addEventListener('click', () => {
      state.category = btn.dataset.cat || null;
      renderHome();
      window.scrollTo({ top: 0 });
    });
  });
}

/* ---------- 詳細画面 ---------- */
function renderDetail(id, sizeIndex = 0) {
  const r = byId(id);
  if (!r) { location.hash = '#/'; return; }

  const variants = r.variants || [];
  const v = variants[sizeIndex] || {};
  const status = v.status || statusOf(r);

  const ing = (v.ingredientGroups || []).map(g => `
    <div class="group">
      ${g.name ? `<p class="group__name">■ ${esc(g.name)}</p>` : ''}
      ${(g.items || []).map(i => `
        <div class="ing">
          <span class="ing__name">${esc(i.name)}</span>
          <span class="ing__dots"></span>
          <span class="ing__amt">${esc(i.amount)}</span>
          ${i.note ? `<span class="ing__note">${esc(i.note)}</span>` : ''}
        </div>`).join('')}
    </div>`).join('');

  const facts = [
    ['型／サイズ', v.mold || v.size],
    ['焼成温度', v.bakeTemp],
    ['焼成時間', v.bakeTime],
    ['仕上がり', v.result]
  ].filter(([, val]) => val);

  const block = (title, body) => body ? `<section class="block"><h2 class="block__title">${title}</h2>${body}</section>` : '';

  const history = (r.history || []).map(h => `
    <div class="log">
      <p class="log__date">${esc(h.date || '')}</p>
      ${h.change ? `<p class="log__change">${esc(h.change)}</p>` : ''}
      ${h.result ? `<p class="log__result">→ ${esc(h.result)}</p>` : ''}
      ${h.next ? `<p class="log__next">次回：${esc(h.next)}</p>` : ''}
    </div>`).join('');

  document.getElementById('app').innerHTML = `
  <article class="detail">
    <a class="back" href="#/">← 一覧へもどる</a>
    <h1 class="detail__title">${esc(r.name)}</h1>
    <div class="detail__head">
      ${badge(status)}
      <span class="section__count">${esc(r.category || '')}</span>
      <button class="favbtn" id="fav" aria-pressed="${isFav(r.id)}">${isFav(r.id) ? '★ お気に入り' : '☆ お気に入り'}</button>
    </div>
    ${r.summary ? `<p class="detail__desc">${esc(r.summary)}</p>` : ''}

    ${variants.length > 1 ? `<div class="sizes">${variants.map((x, i) =>
      `<button class="size" data-i="${i}" aria-pressed="${i === sizeIndex}">${esc(x.size || `配合${i + 1}`)}</button>`).join('')}</div>` : ''}

    ${block('材料', ing)}
    ${block('作り方', (v.steps || []).length ? `<ol class="steps">${v.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : '')}
    ${block('焼成・仕上がり', facts.length ? `<dl class="facts">${facts.map(([k, val]) => `<dt>${k}</dt><dd>${esc(val)}</dd>`).join('')}</dl>` : '')}
    ${block('重要ポイント', (v.points || r.points || []).length ? `<ul class="points">${(v.points || r.points).map(p => `<li>${esc(p)}</li>`).join('')}</ul>` : '')}
    ${block('メモ', (v.memo || r.memo) ? `<div class="note">${esc(v.memo || r.memo)}</div>` : '')}
    ${block('試作・改善の記録', history)}
  </article>`;

  document.getElementById('fav').addEventListener('click', () => {
    toggleFav(r.id);
    renderDetail(id, sizeIndex);
  });
  document.querySelectorAll('.size').forEach(btn => {
    btn.addEventListener('click', () => renderDetail(id, Number(btn.dataset.i)));
  });
}

/* ---------- ルーティング ---------- */
function route() {
  const m = location.hash.match(/^#\/recipe\/(.+)$/);
  if (m) {
    const id = decodeURIComponent(m[1]);
    pushRecent(id);
    renderDetail(id);
    window.scrollTo({ top: 0 });
  } else {
    renderHome();
  }
}

window.addEventListener('hashchange', route);
document.getElementById('search').addEventListener('input', e => {
  state.query = e.target.value.trim();
  if (location.hash.startsWith('#/recipe/')) location.hash = '#/';
  else renderHome();
});

loadRecipes()
  .then(list => {
    state.recipes = list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ja'));
    route();
  })
  .catch(() => {
    document.getElementById('app').innerHTML =
      '<p class="empty">レシピデータを読み込めませんでした。recipes/index.json を確認してください。（ローカルで開く場合は簡易サーバー経由で表示してください）</p>';
  });
