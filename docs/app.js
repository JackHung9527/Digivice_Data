// 哥吉拉怪獸對打機速查：共用程式（依 window.GZ.kind 區分 dm＝彩元祖、pen＝彩色超代）
(() => {
'use strict';
const D = window.GZ, M = {};
D.monsters.forEach(m => M[m.id] = m);
const PEN = D.kind === 'pen';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const STAGE = {I:'幼年期Ⅰ', II:'幼年期Ⅱ', III:'成長期', IV:'成熟期', V:'完全體', VI:'究極體', 'VI+':'超究極體', M:'形態變化'};
const NEXT_T = PEN
  ? {I:'10 分鐘', II:'12 小時', III:'24 小時', IV:'32 小時', V:'40 小時', VI:'48 小時'}
  : {I:'10 分鐘', II:'12 小時', III:'24 小時', IV:'36 小時', V:'48 小時', VI:'48 小時'};
const ATTR = {Vaccine:'疫苗種', Data:'資料種', Virus:'病毒種', Free:'自由種'};
const GC = {b:'藍', y:'黃', r:'紅'};
const store = {
  get(k, d) { try { const v = localStorage.getItem(D.device + '.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(D.device + '.' + k, JSON.stringify(v)); } catch (e) {} }
};
const rng = ([a, b]) => b >= 99 ? `${a}+` : (a === b ? `${a}` : `${a}–${b}`);
const chip = (t, c = '') => `<span class="chip ${c}">${t}</span>`;
const topH = () => $('.top').offsetHeight;
const monOpt = m => `<option value="${m.id}">${esc(m.zh)}（${STAGE[m.stage]}）</option>`;
const hasOpt = (sel, v) => !!sel && [...sel.options].some(o => o.value === String(v));
const phURL = {};
let coll = store.get('coll', 'all'), phTarget = null, toastTimer;

/* ---------- 條件標籤 ---------- */
const jogName = j => j === 'ANY4' ? '其他版本任一成熟期' : j === 'ANY5' ? '其他版本任一完全體' : (M[j] ? M[j].zh : j);
function reqChips(r) {
  const o = [];
  if (r.none) o.push(chip('無條件', 'ok'));
  if (r.frag === 1) o.push(chip('碎片孵化', 'frag'));
  if (r.frag === 0) o.push(chip('非碎片孵化', 'dim'));
  if (r.area === 1) o.push(chip('已通關第7關', 'area'));
  if (r.area === 0) o.push(chip('未通關第7關', 'area'));
  if (r.cm) o.push(chip(`失誤 ${rng(r.cm)} 次`, 'cm'));
  if (r.g) o.push(chip(`${GC[r.g.c]} ${rng([r.g.min, r.g.max])} 格`, 'g' + r.g.c));
  if (r.gc === 'r') o.push(chip('G細胞 紅（8格以上）', 'gr'));
  if (r.gc === 'b') o.push(chip('G細胞 藍／空（7格以下）', 'gb'));
  if (r.poop) o.push(chip(`進化時便便 ${r.poop} 坨`, 'cm'));
  if (r.bt) o.push(chip(`對戰 ${r.bt}+ 場`, 'bt'));
  if (r.btAs) o.push(chip(`以${esc(M[r.btAs.id].zh)}對戰 ${r.btAs.n}+ 場`, 'bt'));
  if (r.life) o.push(chip(`總對戰 ${r.life}+ 場`, 'bt'));
  if (r.win) o.push(chip(`勝率 ${r.win}%+`, 'bt'));
  if (r.rand) o.push(chip(`${r.rand}% 隨機`, 'rand'));
  if (r.death) o.push(chip(`死亡時 ${r.death}% 機率`, 'rand'));
  if (r.defeat) o.push(chip(`擊倒 ${r.defeat} 隻完全體以上的哥吉拉／G侵食／G融合`, 'frag'));
  if (r.mode) o.push(chip('戰鬥中形態變化', 'ok'));
  return o.join('');
}

/* ---------- 怪獸卡片 ---------- */
function routes(list) {
  return list.map(x => {
    const t = M[x.id];
    const normal = x.req.filter(r => !r.jog), jogs = x.req.filter(r => r.jog).map(r => r.jog);
    const parts = normal.map(r => `<div class="opt">${reqChips(r)}</div>`);
    if (jogs.length) {
      parts.push(`<div class="opt">${chip('合體', 'jog')}${jogs.map(j => j.startsWith('ANY')
        ? chip(jogName(j), 'dim')
        : `<a class="chip jogp" href="#" data-go="${j}">${esc(jogName(j))}</a>`).join('')}</div>`);
    }
    return `<div class="route"><div class="who"><a href="#" data-go="${t.id}">${esc(t.zh)}</a><small>${STAGE[t.stage]}</small></div><div>${parts.join('<div class="or">── 或 ──</div>')}</div></div>`;
  }).join('');
}
const stageGroup = st => (st === 'I' || st === 'II') ? 'baby' : (st === 'VI+' || st === 'M') ? 'VI' : st;
function renderMonsters() {
  $('#monList').innerHTML = D.monsters.map(m => {
    const stats = [
      m.power != null && `力量 <b>${m.power}</b>`,
      m.energy != null && `${PEN ? 'DP' : '體力'} ${m.energy}`,
      m.sleep && `睡覺 ${m.sleep}`,
      m.loss && `每 ${m.loss} 分掉心`,
      m.heal && `治療 ${m.heal} 次`,
      m.minWeight != null && `最低體重 ${m.minWeight}G`,
      m.tg != null && `遭遇 時間組${m.tg}・對手組${m.og}`,
      m.canJog && `<span style="color:var(--accent)">可合體</span>`,
      m.fragDrop && `<span style="color:var(--gr)">可能留下碎片</span>`
    ].filter(Boolean).join('<i>·</i>');
    return `<article class="card si mon" id="m-${m.id}" data-sg="${stageGroup(m.stage)}" data-alias="${esc(m.en + ' ' + m.alias)}">
      <div class="mhead">${phSlot(m.id)}<div>
      <header><h3>${esc(m.zh)}</h3><span class="en">${esc(m.en)}</span>
        <span class="badges"><span class="badge">${STAGE[m.stage]}</span><span class="badge a-${m.attr}">${ATTR[m.attr]}</span></span></header>
      <div class="stats">${stats}</div></div></div>
      <h4>▶ 可進化成</h4>${m.to.length ? routes(m.to) : '<p class="small sub">最終型態</p>'}
      ${m.from.length ? `<h4>◀ 由誰進化</h4>${routes(m.from)}` : ''}
    </article>`;
  }).join('');
}

/* ---------- 階段篩選 ---------- */
function setStage(st) {
  $$('#stageFilter button').forEach(b => b.classList.toggle('on', b.dataset.st === st));
  $$('.mon').forEach(e => e.classList.toggle('off', st !== 'all' && e.dataset.sg !== st));
  store.set('stage', st);
}

/* ---------- 分頁 ---------- */
const TAB_IDS = $$('.tabs button').map(b => b.dataset.tab);
function showTab(id) {
  if (!TAB_IDS.includes(id)) id = TAB_IDS[0];
  $$('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === id));
  $$('.panel').forEach(p => p.hidden = p.id !== id);
  store.set('tab', id);
}

/* ---------- 搜尋 ---------- */
const q = $('#q');
let autoOpened = [];
const norm = s => s.toLowerCase().replace(/[\s　·・:：()（）\-–.,，、。]/g, '');
function doSearch() {
  const v = norm(q.value);
  $('#qclear').hidden = !q.value;
  autoOpened.forEach(d => d.open = false);
  autoOpened = [];
  const items = $$('.si');
  if (!v) {
    document.body.classList.remove('searching');
    items.forEach(e => e.hidden = false);
    $('#noresult').hidden = true;
    showTab(store.get('tab', TAB_IDS[0]));
    return;
  }
  document.body.classList.add('searching');
  let n = 0;
  items.forEach(e => {
    if (e._s == null) e._s = norm(('sonly' in e.dataset ? '' : e.textContent) + ' ' + (e.dataset.alias || ''));
    const hit = e._s.includes(v);
    e.hidden = !hit;
    if (hit) { n++; if (e.tagName === 'DETAILS' && !e.open) { e.open = true; autoOpened.push(e); } }
  });
  $$('.panel').forEach(p => p.hidden = !p.querySelector('.si:not([hidden])'));
  $('#noresult').hidden = n > 0;
}

/* ---------- 跳到怪獸 ---------- */
function goMon(id) {
  if (q.value) { q.value = ''; doSearch(); }
  setStage('all');
  coll = 'all'; applyColl();
  showTab('t-evo');
  const el = $('#m-' + id);
  if (!el) return;
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - topH() - 8);
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

/* ---------- G細胞 ---------- */
// 彩元祖：藍14→黃10→紅20 分 4 級
const VMAX = {1:13, 2:9, 3:9, 4:10};
const PTS = {1:[0, 8], 2:[112, 12], 3:[232, 12], 4:[352, 12]};
const LV_NAME = {1:'荒野', 2:'海洋', 3:'海邊城市', 4:'城市內部'};
function cellsOf(lv, vis) {
  vis = Math.max(0, Math.min(VMAX[lv], vis | 0));
  if (lv === 1) return {b:vis, y:0, r:0, vis};
  if (lv === 2) return {b:14, y:vis, r:0, vis};
  if (lv === 3) return {b:14, y:10, r:vis, vis};
  return {b:14, y:10, r:10 + vis, vis};
}
function gViewDM(lv, vis) {
  const c = cellsOf(lv, vis);
  const [base, per] = PTS[lv];
  const lo = base + c.vis * per, hi = Math.min(base + (c.vis + 1) * per - 1, 472);
  const full = {1:112, 2:232, 3:352, 4:472}[lv];
  const bar = Array.from({length: 44}, (_, i) => {
    const on = i < 14 ? (i < c.b && 'b') : i < 24 ? (i - 14 < c.y && 'y') : (i - 24 < c.r && 'r');
    return `<i class="${on || ''}"></i>`;
  }).join('');
  const pts = lo === hi ? `${lo}` : `${lo} – ${hi}`;
  const need = lo >= 472 ? '已全滿' : (lv === 4 ? `填滿還差約 ${full - hi}～${full - lo} 點` : `升到${LV_NAME[lv + 1]}還差約 ${full - hi}～${full - lo} 點`);
  return `<div class="gbar" role="img" aria-label="G細胞量表 藍${c.b} 黃${c.y} 紅${c.r}">${bar}</div>` +
    `<div class="gnums"><span>藍 <b>${c.b}</b>/14</span><span>黃 <b>${c.y}</b>/10</span><span>紅 <b>${c.r}</b>/20</span>` +
    `<span class="gpts">G數值 <b>${pts}</b> 點</span></div>` +
    `<p class="small sub" style="margin:4px 0 0">${need}（等級 2～4 不要算左邊預先亮的 4 格）</p>`;
}
// 彩色超代：14 格，8 格以上變紅；每格點數依階段
const PEN_PER = {I:2, II:2, III:4, IV:8, V:16, VI:16, 'VI+':16, M:16};
function gViewPen(stage, n) {
  n = Math.max(0, Math.min(14, n | 0));
  const per = PEN_PER[stage] || 16;
  const red = n >= 8;
  const lo = n === 0 ? 0 : (n - 1) * per + 1, hi = n * per;
  const redAt = 7 * per + 1;
  const bar = Array.from({length: 14}, (_, i) => `<i class="${i < n ? (red ? 'r' : 'b') : ''}"></i>`).join('');
  const note = red ? '已活性化，走「G細胞 紅」的路線' : `還差約 ${Math.max(0, redAt - hi)}～${redAt - lo} 點變紅`;
  return `<div class="gbar" role="img" aria-label="G細胞 ${n} 格">${bar}</div>` +
    `<div class="gnums"><span>G細胞 <b>${n}</b>/14</span>` +
    `<span>${red ? '<b style="color:var(--gr)">紅</b>活性化' : '<b style="color:var(--gb)">藍</b>未活性化'}</span>` +
    `<span class="gpts">G數值 <b>${lo === hi ? lo : lo + ' – ' + hi}</b> 點</span></div>` +
    `<p class="small sub" style="margin:4px 0 0">${STAGE[stage]}每格 ${per} 點・${note}</p>`;
}
function gcRun() {
  if (!$('#gc-out')) return;
  if (PEN) {
    const st = $('#gc-st').value, n = +$('#gc-n').value || 0;
    $('#gc-out').innerHTML = gViewPen(st, n);
    store.set('gc', {st, n});
  } else {
    const lv = +$('#gc-lv').value, inp = $('#gc-vis');
    inp.max = VMAX[lv];
    const c = cellsOf(lv, +inp.value || 0);
    $('#gc-out').innerHTML = gViewDM(lv, c.vis);
    store.set('gc', {lv, vis: c.vis});
  }
}

/* ---------- 進化試算 ---------- */
function evalReq(r, s, cells) {
  const fail = [];
  let chance = 100;
  if (r.frag != null && (!!r.frag) !== s.frag) fail.push(r.frag ? '需要碎片孵化' : '需要非碎片孵化');
  if (r.area != null && (!!r.area) !== s.area) fail.push(r.area ? '需要已通關第7關' : '需要未通關第7關');
  if (r.cm && (s.cm < r.cm[0] || s.cm > r.cm[1])) fail.push(`失誤要 ${rng(r.cm)} 次（現在 ${s.cm}）`);
  if (r.g && cells) { const v = cells[r.g.c]; if (v < r.g.min || v > r.g.max) fail.push(`${GC[r.g.c]}G細胞要 ${rng([r.g.min, r.g.max])} 格（現在 ${v}）`); }
  if (r.gc) {
    const red = s.gcn >= 8;
    if ((r.gc === 'r') !== red) fail.push(r.gc === 'r' ? `G細胞要紅色：8 格以上（現在 ${s.gcn}）` : `G細胞要藍色或空：7 格以下（現在 ${s.gcn}）`);
  }
  if (r.poop && !s.poop) fail.push(`進化時畫面上要有 ${r.poop} 坨便便`);
  if (r.bt && s.bt < r.bt) fail.push(`對戰要 ${r.bt} 場以上（現在 ${s.bt}）`);
  if (r.btAs && s.bt < r.btAs.n) fail.push(`以${M[r.btAs.id].zh}對戰 ${r.btAs.n} 場以上（現在 ${s.bt}）`);
  if (r.life && s.life < r.life) fail.push(`總對戰要 ${r.life} 場以上（現在 ${s.life}）`);
  if (r.win) {
    if (s.win < 40) fail.push(`勝率至少 40%（現在 ${s.win}%）`);
    else if (PEN) { if (s.win < 70) chance = 40; else if (s.win < 80) chance = 70; }
    else { if (s.win < 60) chance = 25; else if (s.win < 80) chance = 50; }
  }
  if (r.rand) chance = chance * r.rand / 100;
  if (r.death) fail.push(`不是時間進化：死亡時 ${r.death}% 機率觸發`);
  if (r.defeat) fail.push(`不是時間進化：擊倒 ${r.defeat} 隻完全體以上的哥吉拉／G侵食／G融合怪獸後立刻進化`);
  if (r.mode) fail.push('戰鬥中的形態變化（力量滿心＋正確搖晃次數）');
  return {fail, chance};
}
const etSel = $('#et-cur');
const ET_KEYS = ['cur', 'cm', 'lv', 'vis', 'gcn', 'area', 'frag', 'poop', 'bt', 'win', 'life'];
function restoreForm(prefix, obj) {
  Object.entries(obj || {}).forEach(([k, v]) => {
    const e = document.getElementById(prefix + k);
    if (!e) return;
    if (e.type === 'checkbox') e.checked = !!v;
    else if (e.tagName === 'SELECT') { if (hasOpt(e, v)) e.value = v; }
    else e.value = v;
  });
}
function etState() {
  const s = {};
  ET_KEYS.forEach(k => {
    const e = document.getElementById('et-' + k);
    if (!e) return;
    s[k] = e.type === 'checkbox' ? e.checked : e.tagName === 'SELECT' && k === 'cur' ? e.value : (e.value === '' ? (k === 'win' ? 100 : 0) : +e.value);
  });
  s.cur = etSel.value;
  return s;
}
function etRun() {
  const s = etState();
  store.set('et', s);
  const m = M[s.cur];
  let cells = null;
  if (PEN) {
    $('#et-cells').innerHTML = gViewPen(m.stage, s.gcn);
  } else {
    $('#et-vis').max = VMAX[s.lv];
    cells = cellsOf(s.lv, s.vis);
    $('#et-cells').innerHTML = gViewDM(s.lv, s.vis);
  }
  const timed = m.to.map(t => ({t: M[t.id], reqs: t.req.filter(r => !r.jog)}));
  const needBattle = timed.some(x => x.reqs.some(r => r.bt || r.win || r.life || r.btAs));
  $$('.bt-f').forEach(e => e.hidden = !needBattle);
  const res = timed.filter(x => x.reqs.length).map(x => {
    let best = null;
    x.reqs.forEach(r => {
      const e = evalReq(r, s, cells);
      if (!best || e.fail.length < best.fail.length || (e.fail.length === best.fail.length && e.chance > best.chance)) best = e;
    });
    return {t: x.t, ...best};
  }).sort((a, b) => a.fail.length - b.fail.length || b.chance - a.chance);
  const jogOnly = timed.filter(x => !x.reqs.length).map(x => x.t);
  let html = `<p class="small sub">${STAGE[m.stage]} 進化到下一階段約 ${NEXT_T[m.stage] || '—'}（冷凍、備份期間不計時）</p>`;
  html += res.map(x => x.fail.length
    ? `<div class="res no"><span class="mk">✕</span><div><a href="#" data-go="${x.t.id}">${esc(x.t.zh)}</a><div class="small">${x.fail.map(esc).join('；')}</div></div></div>`
    : `<div class="res yes"><span class="mk">✓</span><div><a href="#" data-go="${x.t.id}">${esc(x.t.zh)}</a><div class="small">符合條件${x.chance < 100 ? `・進化機率 ${x.chance}%` : ''}</div></div></div>`
  ).join('');
  if (res.length && !res.some(x => !x.fail.length)) {
    html += (m.stage === 'IV' || m.stage === 'V')
      ? `<p class="warn">目前都不符合：時間到就不會再進化；若當時照顧失誤 ≥ 5 次，怪獸會死亡。</p>`
      : `<p class="warn">目前都不符合，請確認輸入是否正確。</p>`;
  }
  if (jogOnly.length) {
    html += `<p class="small">只能靠合體：${jogOnly.map(t => `<a href="#" data-go="${t.id}">${esc(t.zh)}</a>`).join('、')}（見「合體速查」）</p>`;
  }
  $('#et-out').innerHTML = html;
}

/* ---------- 隨機遭遇 ---------- */
const enSel = $('#en-mon');
function oppList(og) {
  return `<ol class="opp">${D.encOpp[og].map(id => id
    ? `<li>${esc(M[id].zh)} <span class="sub small">${STAGE[M[id].stage]}</span></li>`
    : `<li class="none">（無）</li>`).join('')}</ol>`;
}
function enRun() {
  if (!enSel) return;
  const m = M[enSel.value];
  store.set('en', m.id);
  const times = D.encTimes[m.tg];
  const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
  const mins = times.map(t => { const [h, mi] = t.split(':').map(Number); return h * 60 + mi; });
  const next = mins.findIndex(x => x > nowMin);
  $('#en-out').innerHTML =
    `<p>時間組 <b>${m.tg}</b>・對手組 <b>${m.og}</b>（依手機目前時間 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}）</p>` +
    `<h4>每天遭遇時間</h4><div class="times">${times.map((t, i) =>
      `<span class="time ${i === next ? 'next' : (i < next || next < 0 ? 'past' : '')}">${t}${i === next ? ' ← 下一次' : ''}</span>`).join('')}</div>` +
    (next < 0 ? `<p class="small sub">今天的遭遇時間都過了</p>` : '') +
    `<h4>對手順序</h4>${oppList(m.og)}`;
}
function renderEncTables() {
  if (!$('#encTimeTable')) return;
  const maxN = Math.max(...D.encTimes.map(r => r.length));
  let h = `<tr><th>組</th>${Array.from({length: maxN}, (_, i) => `<th>第${i + 1}次</th>`).join('')}</tr>`;
  D.encTimes.forEach((r, g) => {
    h += `<tr><td><b>${g}</b></td>${Array.from({length: maxN}, (_, i) => `<td>${r[i] || '<span class="sub">—</span>'}</td>`).join('')}</tr>`;
  });
  $('#encTimeTable').innerHTML = h;
  $('#encOppCards').innerHTML = D.encOpp.map((_, g) => {
    const users = D.monsters.filter(m => m.og === g).map(m => m.zh).join('、');
    return `<details class="card si" data-alias="對手組${g}"><summary>對手組 ${g}</summary><p class="small sub">使用的怪獸：${esc(users || '—')}</p>${oppList(g)}</details>`;
  }).join('');
}

/* ---------- 關卡 ---------- */
const areaTitle = no => no === 'F' ? '最終關 F' : no === 'Ω' ? '隱藏關 Ω' : `第 ${no} 關`;
const areaAlias = no => no === 'F' ? '最終關 第F關 area f' : no === 'Ω' ? '隱藏關 第Ω關 omega' : `第${no}關 area${no}`;
const patHTML = p => p ? `<span class="pat" aria-label="攻擊模式 ${p}">${[...p].map(c => `<i class="p${c}"></i>`).join('')}</span>` : '';
function renderQuest() {
  if (!$('#questList')) return;
  const hasPat = D.quest.some(a => a.rounds.some(r => r.pat));
  const hasHc = D.quest.some(a => a.rounds.some(r => r.hc));
  $('#questList').innerHTML = D.quest.map(a => {
    const rows = a.rounds.map((r, i) => {
      const boss = i === a.rounds.length - 1;
      return `<tr><td>${boss ? '<b style="color:var(--gr)">BOSS</b>' : i + 1}</td><td><a href="#" data-go="${r.id}">${esc(M[r.id].zh)}</a></td>` +
        `<td><span class="badge a-${r.attr}">${ATTR[r.attr]}</span></td><td><b>${r.p}</b></td>` +
        (hasPat ? `<td>${patHTML(r.pat)}</td>` : '') +
        (hasHc ? `<td>${r.hc ? `<b style="color:var(--gr)">−${r.hc}</b>` : '<span class="sub">—</span>'}</td>` : '') + `</tr>`;
    }).join('');
    return `<div class="card si" data-alias="${esc(areaAlias(a.no))}">
      <h3>${areaTitle(a.no)}</h3>
      <div class="tw"><table><tr><th>回合</th><th>對手</th><th>屬性</th><th>力量</th>${hasPat ? '<th>攻擊模式</th>' : ''}${hasHc ? '<th>命中減</th>' : ''}</tr>${rows}</table></div>
      ${a.unlock ? `<p class="small">首次通關解鎖：<b>${esc(a.unlock)}</b></p>` : ''}
    </div>`;
  }).join('');
}
// 力量加成：[力量滿心, 性格蛋, G細胞紅]
const BONUS = PEN
  ? {III:[5, 5, 5], IV:[8, 8, 8], V:[15, 15, 15], VI:[20, 15, 20], 'VI+':[20, 15, 20], M:[20, 15, 20]}
  : {III:[5, 5], IV:[8, 8], V:[15, 15], VI:[25, 25], 'VI+':[25, 25]};
const ADV_PTS = PEN ? 10 : 5;
const BEATS = {Vaccine:'Virus', Virus:'Data', Data:'Vaccine'};
const adv = (a, b) => BEATS[a] === b ? ADV_PTS : (BEATS[b] === a ? -ADV_PTS : 0);
const hcMon = $('#hc-mon'), hcOpp = $('#hc-opp');
function hcRun() {
  if (!hcMon) return;
  const m = M[hcMon.value];
  const b = BONUS[m.stage] || [0, 0, 0];
  const flags = [$('#hc-full').checked, $('#hc-egg').checked, !!($('#hc-red') && $('#hc-red').checked)];
  const bonus = flags.reduce((sum, f, i) => sum + (f ? (b[i] || 0) : 0), 0);
  const p = m.power + bonus;
  let op, oa, hc = 0;
  const custom = hcOpp.value === 'custom';
  $$('.hc-c').forEach(e => e.hidden = !custom);
  if (custom) { op = +$('#hc-cp').value || 0; oa = $('#hc-ca').value; }
  else { const [, ai, ri] = hcOpp.value.split(':').map(Number); const r = D.quest[ai].rounds[ri]; op = r.p; oa = r.attr; hc = r.hc || 0; }
  const a = adv(m.attr, oa);
  const clamp = x => Math.max(0, Math.min(PEN ? 99 : 100, Math.round(x * 10) / 10));
  let hit = p + op > 0 ? p * 100 / (p + op) + a - hc : 0;
  if (PEN && a > 0) hit = Math.max(5, hit);
  hit = clamp(hit);
  const ohit = p + op > 0 ? clamp(op * 100 / (p + op) - a) : 0;
  const advTxt = a > 0 ? `屬性有利 +${ADV_PTS}` : a < 0 ? `屬性不利 −${ADV_PTS}` : '無相剋';
  $('#hc-out').innerHTML =
    `<div class="kpis"><div class="kpi"><span>我方總力量</span><div class="big">${p}</div></div>` +
    `<div class="kpi"><span>對手力量</span><div class="big">${op}</div></div>` +
    `<div class="kpi"><span>我方命中率</span><div class="big" style="color:var(--ok)">${hit}%</div></div>` +
    `<div class="kpi"><span>對手命中率</span><div class="big" style="color:var(--gr)">${ohit}%</div></div></div>` +
    `<p class="small sub">${ATTR[m.attr]} vs ${ATTR[oa]}：${advTxt}${hc ? `・命中減 ${hc}` : ''}。基礎力量 ${m.power}＋加成 ${bonus}</p>`;
  store.set('hc', {mon: hcMon.value, full: flags[0], egg: flags[1], red: flags[2], opp: hcOpp.value});
}

/* ---------- 合體速查（彩色超代） ---------- */
const shortName = id => M[id].zh.replace('(疫苗種)', '疫').replace('(病毒種)', '病').replace('：G侵食模式', '·G侵食').replace('：G融合模式', '·G融合');
const jcInner = id => `${phURL[id] ? `<img src="${phURL[id]}" alt="">` : ''}<span class="jn">${esc(shortName(id))}</span>`;
const jcell = id => `<span class="jc" data-jc="${id}">${jcInner(id)}</span>`;
function renderJog() {
  if (!D.jogress || !$('#jogTables')) return;
  const meSel = $('#jq-me'), pSel = $('#jq-partner');
  meSel.innerHTML = D.jogress.map((t, ti) => `<optgroup label="${esc(t.title)}">${t.rows.map((id, ri) =>
    `<option value="${ti}:${ri}">${esc(M[id].zh)}</option>`).join('')}</optgroup>`).join('');
  const partnerLabel = (t, id) => id === 'ANY' ? t.anyLabel : M[id].zh;
  function fillPartners() {
    const t = D.jogress[+meSel.value.split(':')[0]];
    const keep = pSel.value;
    pSel.innerHTML = t.cols.map((id, ci) => `<option value="${ci}">${esc(partnerLabel(t, id))}</option>`).join('');
    if (hasOpt(pSel, keep)) pSel.value = keep;
  }
  function jqRun() {
    const [ti, ri] = meSel.value.split(':').map(Number);
    const t = D.jogress[ti], ci = +pSel.value;
    const me = M[t.rows[ri]], res = t.cells[ri][ci];
    const head = res
      ? `<div class="jq-res">${jcell(res)}<div><div class="small sub">${esc(me.zh)} ＋ ${esc(partnerLabel(t, t.cols[ci]))}</div>` +
        `<a href="#" data-go="${res}" class="jq-name">${esc(M[res].zh)}</a><div class="small sub">${STAGE[M[res].stage]}</div></div></div>`
      : `<p class="warn">這個組合不能合體（機器會顯示 MIS MATCH）</p>`;
    const all = t.cols.map((pid, i) => t.cells[ri][i]
      ? `<li><span class="sub">${esc(partnerLabel(t, pid))}</span> → <a href="#" data-go="${t.cells[ri][i]}">${esc(M[t.cells[ri][i]].zh)}</a></li>` : '').join('');
    $('#jq-out').innerHTML = head + `<h4>${esc(me.zh)} 在「${esc(t.title)}」的全部組合</h4><ul class="jq-all">${all}</ul>`;
    store.set('jq', {me: meSel.value, p: pSel.value});
  }
  const saved = store.get('jq', null);
  if (saved && hasOpt(meSel, saved.me)) meSel.value = saved.me;
  fillPartners();
  if (saved && hasOpt(pSel, saved.p)) pSel.value = saved.p;
  meSel.addEventListener('input', () => { fillPartners(); jqRun(); });
  pSel.addEventListener('input', jqRun);
  jqRun();
  $('#jogTables').innerHTML = D.jogress.map((t, ti) => `
    <details class="card si" ${ti === 0 ? 'open' : ''} data-sonly data-alias="${esc(t.title + ' 合體 ジョグレス jogress 速查表')}">
      <summary>${esc(t.title)} <span class="hint">左欄＝目前養的・上排＝合體夥伴</span></summary>
      <div class="tw jtw"><table class="jt">
        <thead><tr><th class="corner">目前＼夥伴</th>${t.cols.map(id => `<th>${id === 'ANY' ? `<span class="jany">${esc(t.anyShort)}</span>` : jcell(id)}</th>`).join('')}</tr></thead>
        <tbody>${t.rows.map((rid, ri) => `<tr><th>${jcell(rid)}</th>${t.cells[ri].map(c =>
          `<td>${c ? `<a href="#" data-go="${c}">${jcell(c)}</a>` : '<span class="sub">—</span>'}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div>
    </details>`).join('');
}

/* ---------- 圖鑑圖片（存在瀏覽器 IndexedDB） ---------- */
const imgDB = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open(D.device, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('img');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const run = (mode, fn) => open().then(db => new Promise((res, rej) => {
    const t = db.transaction('img', mode);
    const req = fn(t.objectStore('img'));
    t.oncomplete = () => res(req.result);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
  return {
    get: k => run('readonly', s => s.get(k)),
    put: (k, v) => run('readwrite', s => s.put(v, k)),
    del: k => run('readwrite', s => s.delete(k)),
    keys: () => run('readonly', s => s.getAllKeys())
  };
})();
const EMPTY_PH = `<span><span class="plus">+</span><span class="lbl">加入圖片</span></span>`;
function phSlot(id) {
  return `<button type="button" class="ph" data-ph="${id}" aria-label="${esc(M[id].zh)}的圖片">${EMPTY_PH}</button>`;
}
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.hidden = true, 2600);
}
function paintSlots(id) {
  const url = phURL[id];
  $$(`[data-ph="${id}"]`).forEach(b => {
    b.classList.toggle('has', !!url);
    b.innerHTML = url ? `<img src="${url}" alt="${esc(M[id].zh)}">` : EMPTY_PH;
  });
  $$(`[data-jc="${id}"]`).forEach(e => e.innerHTML = jcInner(id));
}
function applyColl() {
  $$('#collFilter button').forEach(b => b.classList.toggle('on', b.dataset.coll === coll));
  $$('.mon').forEach(e => {
    const have = !!phURL[e.id.slice(2)];
    e.classList.toggle('off2', coll === 'have' ? !have : coll === 'need' ? have : false);
  });
}
function paintDex() {
  const n = Object.keys(phURL).length, total = D.monsters.length;
  $('#dexCount').textContent = `已收集 ${n} / ${total}`;
  $('#dexBar').style.width = (n * 100 / total) + '%';
  applyColl();
}
function setPhoto(id, blob) {
  if (phURL[id]) URL.revokeObjectURL(phURL[id]);
  if (blob) phURL[id] = URL.createObjectURL(blob); else delete phURL[id];
  paintSlots(id);
  paintDex();
}
function renderDex() {
  $('#dexGrid').innerHTML = D.monsters.map((m, i) =>
    `<div class="dex-tile">${phSlot(m.id)}<span class="no">No.${String(i).padStart(2, '0')}</span><span class="nm"><a href="#" data-go="${m.id}">${esc(m.zh)}</a></span></div>`
  ).join('');
}
async function shrink(file, max = 640) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('無法讀取這張圖')); i.src = url; });
    const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.88));
    if (!blob) throw new Error('圖片轉換失敗');
    return blob;
  } finally { URL.revokeObjectURL(url); }
}
const pv = $('#phView');
function pickPhoto(id) { phTarget = id; const f = $('#phFile'); f.value = ''; f.click(); }
function openViewer(id) {
  phTarget = id;
  $('#pvImg').src = phURL[id];
  $('#pvImg').alt = M[id].zh;
  $('#pvName').textContent = M[id].zh;
  const del = $('#pvDel'); delete del.dataset.arm; del.textContent = '刪除';
  if (!pv.open) pv.showModal();
}

/* ---------- 事件 ---------- */
document.addEventListener('click', e => {
  const go = e.target.closest('[data-go]');
  if (go) { e.preventDefault(); if (pv.open) pv.close(); goMon(go.dataset.go); return; }
  const b = e.target.closest('[data-ph]');
  if (b) { e.preventDefault(); if (phURL[b.dataset.ph]) openViewer(b.dataset.ph); else pickPhoto(b.dataset.ph); }
});
$('#stageFilter').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setStage(b.dataset.st); });
$('#collFilter').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b) return;
  coll = b.dataset.coll; store.set('coll', coll); applyColl();
});
$$('.tabs button').forEach(b => b.addEventListener('click', () => {
  if (q.value) { q.value = ''; doSearch(); }
  showTab(b.dataset.tab);
  b.scrollIntoView({inline: 'nearest', block: 'nearest'});
  window.scrollTo(0, 0);
}));
q.addEventListener('input', doSearch);
q.addEventListener('keydown', e => { if (e.key === 'Enter') q.blur(); });
$('#qclear').addEventListener('click', () => { q.value = ''; doSearch(); q.focus(); });
$('#phFile').addEventListener('change', async e => {
  const file = e.target.files[0], id = phTarget;
  if (!file || !id) return;
  try {
    const blob = await shrink(file);
    await imgDB.put(id, blob);
    setPhoto(id, blob);
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if (pv.open) openViewer(id);
    toast(`已把「${M[id].zh}」加入圖鑑`);
  } catch (err) {
    toast(`圖片沒有存成功：${(err && err.message) || err}。無痕模式無法存圖。`);
  }
});
$('#pvClose').addEventListener('click', () => pv.close());
$('#pvChange').addEventListener('click', () => pickPhoto(phTarget));
$('#pvGo').addEventListener('click', () => { const id = phTarget; pv.close(); goMon(id); });
$('#pvDel').addEventListener('click', async () => {
  const b = $('#pvDel');
  if (!b.dataset.arm) { b.dataset.arm = '1'; b.textContent = '再按一次確定刪除'; return; }
  const id = phTarget;
  try { await imgDB.del(id); } catch (err) {}
  setPhoto(id, null);
  pv.close();
  toast(`已刪除「${M[id].zh}」的圖片`);
});
pv.addEventListener('click', e => { if (e.target === pv) pv.close(); });

/* ---------- 初始化 ---------- */
renderMonsters();
renderDex();
renderJog();
renderEncTables();
renderQuest();
if ($('#fragDropList')) $('#fragDropList').innerHTML = D.monsters.filter(m => m.fragDrop).map(m => `<a href="#" data-go="${m.id}">${esc(m.zh)}</a>`).join('、');

if (etSel) {
  etSel.innerHTML = D.monsters.filter(m => m.to.length).map(monOpt).join('');
  restoreForm('et-', store.get('et', PEN
    ? {cur:'tyrano', cm:1, gcn:9, bt:15, win:85, life:30, poop:false}
    : {cur:'littlegodzilla', cm:1, lv:3, vis:0, area:false, frag:false, bt:15, win:85}));
  $('#evoTool').addEventListener('input', etRun);
  etRun();
}
if ($('#gc-out')) {
  restoreForm('gc-', store.get('gc', PEN ? {st:'IV', n:9} : {lv:1, vis:0}));
  $$('#gc-lv, #gc-vis, #gc-st, #gc-n').forEach(e => e.addEventListener('input', gcRun));
  gcRun();
}
if (enSel) {
  enSel.innerHTML = D.monsters.filter(m => m.tg != null).map(monOpt).join('');
  const en = store.get('en', null);
  if (hasOpt(enSel, en)) enSel.value = en;
  enSel.addEventListener('input', enRun);
  enRun();
  setInterval(() => { if (!$('#t-enc').hidden) enRun(); }, 60000);
}
if (hcMon) {
  hcMon.innerHTML = D.monsters.filter(m => m.power != null && m.stage !== 'I' && m.stage !== 'II').map(monOpt).join('');
  hcOpp.innerHTML = D.quest.map((a, ai) =>
    `<optgroup label="${areaTitle(a.no)}">${a.rounds.map((r, ri) =>
      `<option value="q:${ai}:${ri}">${ri === a.rounds.length - 1 ? 'BOSS ' : `R${ri + 1} `}${esc(M[r.id].zh)}（${ATTR[r.attr]}・${r.p}${r.hc ? `・命中減${r.hc}` : ''}）</option>`).join('')}</optgroup>`
  ).join('') + `<option value="custom">自訂對手…</option>`;
  const hc = store.get('hc', null);
  if (hc) {
    if (hasOpt(hcMon, hc.mon)) hcMon.value = hc.mon;
    $('#hc-full').checked = hc.full !== false;
    $('#hc-egg').checked = !!hc.egg;
    if ($('#hc-red')) $('#hc-red').checked = !!hc.red;
    if (hasOpt(hcOpp, hc.opp)) hcOpp.value = hc.opp;
  }
  hcMon.closest('.tool').addEventListener('input', hcRun);
  hcRun();
}

setStage(store.get('stage', 'all'));
showTab(store.get('tab', TAB_IDS[0]));

(async () => {
  try {
    const keys = await imgDB.keys();
    for (const k of keys) {
      if (!M[k]) continue;
      const blob = await imgDB.get(k);
      if (blob) { phURL[k] = URL.createObjectURL(blob); paintSlots(k); }
    }
  } catch (e) {}
  paintDex();
})();

if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !/claude\.ai|claudeusercontent/.test(location.hostname)) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
})();
