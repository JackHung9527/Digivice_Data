// 網站自動檢查：node tools/check_site.mjs
// 不需要安裝套件（Node 22+ 內建 WebSocket），會用本機的 Chrome / Edge 無頭模式實際開網頁。
//   1. 靜態檢查：JS 語法、sw.js 快取清單與 docs/ 檔案一致、build_data.py 重新產生沒有差異、
//      docs/ 有改動時 sw.js 的 CACHE 版本有更新
//   2. 線上：每個頁面載入沒有 JS 錯誤，分頁、搜尋、各試算工具、怪獸連結都正常
//   3. 斷網：關掉伺服器、封鎖所有網路後重開頁面，靠離線快取仍能顯示，點陣字型（DotGothic16）仍在
// 全部通過 exit 0；有問題 exit 1，並列出原因。
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOCS = path.join(ROOT, 'docs');
const PAGES = ['index.html', 'dmgz.html', 'pengz.html', 'penc.html', 'dm20.html'];
const fails = [];
const ng = msg => { fails.push(msg); console.log('  NG ' + msg); };
const ok = msg => console.log('  OK ' + msg);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------------- 1. 靜態檢查 ---------------- */
function staticChecks() {
  console.log('[靜態檢查]');
  // JS 語法
  const jsFiles = ['app.js', 'sw.js', ...fs.readdirSync(path.join(DOCS, 'data')).map(f => 'data/' + f)];
  for (const f of jsFiles) {
    const r = spawnSync(process.execPath, ['--check', path.join(DOCS, f)], { encoding: 'utf8' });
    if (r.status !== 0) ng(`docs/${f} 語法錯誤：${(r.stderr || '').split('\n').find(l => /Error/.test(l)) || r.stderr}`);
  }
  ok(`JS 語法檢查 ${jsFiles.length} 個檔`);

  // sw.js 快取清單
  const sw = fs.readFileSync(path.join(DOCS, 'sw.js'), 'utf8');
  const listed = [...sw.matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
  const walk = d => fs.readdirSync(path.join(DOCS, d), { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walk(path.posix.join(d, e.name)) : [path.posix.join(d, e.name)]);
  const actual = walk('').filter(f => f !== 'sw.js');
  const missing = listed.filter(f => !fs.existsSync(path.join(DOCS, f)));
  const unlisted = actual.filter(f => !listed.includes(f));
  if (missing.length) ng(`sw.js 快取清單裡有不存在的檔：${missing.join(', ')}`);
  if (unlisted.length) ng(`docs/ 有檔案沒列進 sw.js 快取清單（離線會缺）：${unlisted.join(', ')}`);
  if (!missing.length && !unlisted.length) ok(`sw.js 快取清單與 docs/ 一致（${listed.length} 個檔）`);

  // build_data.py 重新產生
  const dataDir = path.join(DOCS, 'data');
  const before = Object.fromEntries(fs.readdirSync(dataDir).map(f => [f, fs.readFileSync(path.join(dataDir, f))]));
  const py = spawnSync(process.platform === 'win32' ? 'python' : 'python3', [path.join(ROOT, 'tools', 'build_data.py')],
    { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  if (py.status !== 0) ng(`build_data.py 執行失敗：${(py.stderr || py.stdout || '').trim().split('\n').pop()}`);
  else {
    const after = fs.readdirSync(dataDir);
    const diff = after.filter(f => !before[f] || !before[f].equals(fs.readFileSync(path.join(dataDir, f))));
    const gone = Object.keys(before).filter(f => !after.includes(f));
    // 還原，檢查本身不改動檔案
    for (const f of after) if (!before[f]) fs.rmSync(path.join(dataDir, f));
    for (const [f, buf] of Object.entries(before)) fs.writeFileSync(path.join(dataDir, f), buf);
    if (diff.length || gone.length) ng(`docs/data 和 build_data.py 產生的結果不同（有人手改了資料檔，或改了原始資料沒重新產生）：${[...diff, ...gone].join(', ')}`);
    else ok('build_data.py 重新產生的資料與現有檔案相同');
  }

  // CACHE 版本
  const cacheOf = s => (s.match(/const CACHE = '([^']+)'/) || [])[1];
  const cur = cacheOf(sw);
  if (!cur) ng('sw.js 找不到 CACHE 版本字串');
  const base = spawnSync('git', ['-C', ROOT, 'show', 'main:docs/sw.js'], { encoding: 'utf8' });
  const changed = spawnSync('git', ['-C', ROOT, 'diff', 'main', '--name-only', '--', 'docs'], { encoding: 'utf8' });
  if (base.status !== 0 || changed.status !== 0) console.log('  -- 讀不到 main 分支，略過 CACHE 版本檢查');
  else {
    const files = changed.stdout.trim().split('\n').filter(Boolean);
    if (files.length && cacheOf(base.stdout) === cur) ng(`docs/ 和 main 相比有改動（${files.join(', ')}），但 sw.js 的 CACHE 還是 '${cur}'，手機不會更新`);
    else ok(files.length ? `docs/ 有改動，CACHE 已從 '${cacheOf(base.stdout)}' 改成 '${cur}'` : 'docs/ 和 main 相同');
  }
}

/* ---------------- 本機伺服器 ---------------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.svg': 'image/svg+xml' };
function startServer() {
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(DOCS, p);
    if (!f.startsWith(DOCS) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

/* ---------------- Chrome（DevTools Protocol） ---------------- */
function findBrowser() {
  const c = [process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
  return c.find(p => p && fs.existsSync(p));
}
async function launch(exe, profile, extra = []) {
  const portFile = path.join(profile, 'DevToolsActivePort');
  fs.rmSync(portFile, { force: true });
  const proc = spawn(exe, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--disable-sync', '--disable-gpu', '--mute-audio',
    '--window-size=412,915', ...extra, 'about:blank'], { stdio: 'ignore' });
  for (let i = 0; i < 150 && !fs.existsSync(portFile); i++) await sleep(100);
  if (!fs.existsSync(portFile)) { proc.kill(); throw new Error('Chrome 沒有啟動（找不到 DevToolsActivePort）'); }
  await sleep(100);
  const [port, wsPath] = fs.readFileSync(portFile, 'utf8').trim().split('\n');
  const ws = new WebSocket(`ws://127.0.0.1:${port}${wsPath}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('連不上 Chrome DevTools')); });
  return new CDP(ws, proc);
}
class CDP {
  constructor(ws, proc) {
    this.ws = ws; this.proc = proc; this.id = 0; this.pending = new Map(); this.handlers = new Set();
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id) { const p = this.pending.get(m.id); if (p) { this.pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); } }
      else this.handlers.forEach(h => h(m));
    };
  }
  send(method, params = {}, sessionId, timeout = 60000) {
    const id = ++this.id;
    this.ws.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }));
    return new Promise((res, rej) => {
      const t = setTimeout(() => { this.pending.delete(id); rej(new Error(`${method} 逾時`)); }, timeout);
      this.pending.set(id, { res: v => { clearTimeout(t); res(v); }, rej: e => { clearTimeout(t); rej(e); } });
    });
  }
  waitFor(method, sessionId, timeout = 30000) {
    return new Promise((res, rej) => {
      const t = setTimeout(() => { this.handlers.delete(h); rej(new Error(`等 ${method} 逾時`)); }, timeout);
      const h = m => { if (m.method === method && m.sessionId === sessionId) { clearTimeout(t); this.handlers.delete(h); res(m.params); } };
      this.handlers.add(h);
    });
  }
  async close() {
    try { await this.send('Browser.close', {}, undefined, 5000); } catch (e) {}
    await Promise.race([new Promise(r => this.proc.once('exit', r)), sleep(5000)]);
    if (this.proc.exitCode == null) this.proc.kill();
  }
}
async function openPage(cdp, origin) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const errors = [];
  cdp.handlers.add(m => {
    if (m.sessionId !== sessionId) return;
    const p = m.params;
    if (m.method === 'Runtime.exceptionThrown') errors.push('JS 例外：' + ((p.exceptionDetails.exception && p.exceptionDetails.exception.description) || p.exceptionDetails.text).split('\n')[0]);
    if (m.method === 'Runtime.consoleAPICalled' && p.type === 'error') errors.push('console.error：' + p.args.map(a => a.value ?? a.description).join(' '));
    if (m.method === 'Log.entryAdded' && p.entry.level === 'error' && (!p.entry.url || p.entry.url.startsWith(origin))) errors.push(`${p.entry.text}${p.entry.url ? ' ' + p.entry.url : ''}`);
  });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Log.enable', {}, sessionId);
  const page = {
    errors, sessionId,
    async goto(url) { const l = cdp.waitFor('Page.loadEventFired', sessionId); await cdp.send('Page.navigate', { url }, sessionId); await l; },
    async reload() { const l = cdp.waitFor('Page.loadEventFired', sessionId); await cdp.send('Page.reload', {}, sessionId); await l; },
    async eval(expression, timeout = 120000) {
      const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId, timeout);
      if (r.exceptionDetails) throw new Error(((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text).split('\n')[0]);
      return r.result.value;
    },
    close: () => cdp.send('Target.closeTarget', { targetId })
  };
  return page;
}

/* ---------------- 頁面內的操作測試（在瀏覽器裡執行） ---------------- */
async function smoke() {
  const P = [];
  let ctx = '初始';
  window.addEventListener('error', e => P.push(`[${ctx}] JS 錯誤：${e.message}`));
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const fire = el => el.dispatchEvent(new Event('input', { bubbles: true }));
  const shown = el => !!el && el.getClientRects().length > 0;
  const seenBad = new Set();
  const bad = sel => {
    const e = $(sel);
    if (!e) return;
    const t = e.textContent;
    const m = t.match(/undefined|NaN|null|\[object [A-Za-z]+\]/);
    if (m && !seenBad.has(sel + m[0])) { seenBad.add(sel + m[0]); P.push(`[${ctx}] ${sel} 顯示了「${m[0]}」`); }
    if (!t.trim() && !seenBad.has(sel + 'empty')) { seenBad.add(sel + 'empty'); P.push(`[${ctx}] ${sel} 沒有輸出`); }
  };
  const each = (sel, fn) => {
    const e = $(sel);
    if (!e || e.tagName !== 'SELECT') return;
    const orig = e.value;
    for (const v of [...e.options].map(o => o.value)) { e.value = v; ctx = `${sel}=${v}`; fire(e); if (fn) fn(v); }
    if ([...e.options].some(o => o.value === orig)) { e.value = orig; fire(e); }
  };
  const nums = (sel, vals, out) => {
    const e = $(sel);
    if (!e) return;
    const orig = e.value;
    for (const v of vals) { e.value = v; ctx = `${sel}=${v === '' ? '(空白)' : v}`; fire(e); bad(out); }
    e.value = orig; fire(e);
  };
  const goIds = new Set();

  // 分頁
  const tabs = $$('.tabs button');
  if (!tabs.length) P.push('沒有分頁按鈕');
  for (const b of tabs) {
    ctx = `分頁 ${b.dataset.tab}`;
    b.click();
    const p = document.getElementById(b.dataset.tab);
    if (!shown(p)) P.push(`[${ctx}] 按了之後沒有顯示`);
    else if (!p.textContent.trim()) P.push(`[${ctx}] 內容是空的`);
  }
  if (tabs[0]) tabs[0].click();

  // 搜尋
  const q = $('#q');
  const card = $$('.mon').find(shown);
  if (!card) P.push('進化條件分頁沒有任何看得到的怪獸卡');
  else {
    for (const term of [card.querySelector('h3').textContent, card.querySelector('.en').textContent]) {
      ctx = `搜尋「${term}」`;
      q.value = term; fire(q);
      if (!shown(card)) P.push(`[${ctx}] 結果裡沒有 ${card.id}`);
      if (shown($('#noresult'))) P.push(`[${ctx}] 顯示了「找不到」`);
    }
  }
  ctx = '搜尋不存在的字';
  q.value = 'zzqqxx不存在'; fire(q);
  if (!shown($('#noresult'))) P.push(`[${ctx}] 沒有顯示「找不到」`);
  if ($$('.si').some(shown)) P.push(`[${ctx}] 仍有項目顯示`);
  ctx = '清除搜尋';
  $('#qclear').click();
  if (!$$('.mon').some(shown)) P.push(`[${ctx}] 清除後看不到怪獸卡`);

  // 篩選
  for (const sel of ['#stageFilter button', '#collFilter button']) {
    const bs = $$(sel);
    for (const b of bs) { ctx = `${sel} ${b.textContent.trim()}`; b.click(); }
    if (bs[0]) bs[0].click();
  }
  each('#eggSel');

  // 各試算工具
  const tools = () => {
    each('#et-egg', () => bad('#et-out'));
    each('#et-cur', () => bad('#et-out'));
    for (const inp of $$('#evoTool input[type=number]')) nums('#' + inp.id, ['', '0', '1', '15', '999', '-3'], '#et-out');
    for (const c of $$('#evoTool input[type=checkbox]')) { ctx = `#${c.id} 切換`; c.click(); bad('#et-out'); c.click(); }
    each('#hc-mon', () => bad('#hc-out'));
    each('#hc-opp', () => bad('#hc-out'));
    const opp = $('#hc-opp');
    if (opp) {
      const orig = opp.value;
      opp.value = 'custom'; fire(opp);
      nums('#hc-cp', ['', '0', '50', '999'], '#hc-out');
      each('#hc-ca', () => bad('#hc-out'));
      opp.value = orig; fire(opp);
    }
    for (const c of $$('#hc-full, #hc-egg, #hc-red, #hc-shake')) { ctx = `#${c.id} 切換`; c.click(); bad('#hc-out'); c.click(); }
    each('#jq-me', () => each('#jq-partner', () => bad('#jq-out')));
    each('#en-mon', () => bad('#en-out'));
    each('#gc-lv', () => nums('#gc-vis', ['', '0', '5', '13', '99'], '#gc-out'));
    each('#gc-st', () => nums('#gc-n', ['', '0', '7', '8', '14', '99'], '#gc-out'));
    $$('[data-go]').forEach(a => goIds.add(a.dataset.go));
  };
  if ($('.verSel')) each('.verSel', tools); else tools();

  // 怪獸連結：每個連結點下去都要跳到看得到的卡片
  const dead = [], hidden = [];
  for (const id of goIds) {
    ctx = `點連結 ${id}`;
    if (!document.getElementById('m-' + id)) { dead.push(id); continue; }
    const a = document.createElement('a');
    a.href = '#'; a.dataset.go = id; a.hidden = true;
    document.body.appendChild(a); a.click(); a.remove();
    if (!shown(document.getElementById('m-' + id))) hidden.push(id);
  }
  if (dead.length) P.push(`有 ${dead.length} 個怪獸連結找不到對應卡片，點了沒反應：${dead.slice(0, 10).join(', ')}`);
  if (hidden.length) P.push(`有 ${hidden.length} 個怪獸連結點了之後卡片沒顯示：${hidden.slice(0, 10).join(', ')}`);

  // 蛋按鈕（元祖20th）
  for (const b of $$('[data-egg]')) {
    ctx = `蛋按鈕 ${b.dataset.egg}`;
    b.click();
    if (!$$('.mon').some(shown)) P.push(`[${ctx}] 按了之後沒有任何怪獸卡`);
  }
  each('#eggSel');
  const eggSel = $('#eggSel');
  if (eggSel) { eggSel.value = 'all'; fire(eggSel); }
  if (tabs[0]) tabs[0].click();
  return { problems: P, links: goIds.size };
}

const fontCheck = `(async () => {
  await document.fonts.ready;
  await Promise.allSettled([document.fonts.load('16px "DotGothic16"', '對打機'), document.fonts.load('700 16px "Noto Sans TC"', '對打機')]);
  const st = fam => [...document.fonts].filter(f => f.family.replace(/["']/g, '') === fam).map(f => f.status);
  return { dot: st('DotGothic16'), noto: st('Noto Sans TC') };
})()`;

/* ---------------- 2、3. 瀏覽器檢查 ---------------- */
async function browserChecks() {
  const exe = findBrowser();
  if (!exe) { ng('找不到 Chrome / Edge（可用環境變數 CHROME_PATH 指定）'); return; }
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'digivice-check-'));
  const srv = await startServer();
  const origin = `http://127.0.0.1:${srv.address().port}`;
  let cdp;
  try {
    console.log('[線上：頁面與功能]');
    cdp = await launch(exe, profile);
    const page = await openPage(cdp, origin);
    await page.goto(origin + '/index.html');
    const swOk = await page.eval(`Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise(r => setTimeout(() => r(false), 20000))])`);
    if (!swOk) ng('首頁的 Service Worker 沒有安裝成功');
    await page.reload();
    if (!(await page.eval('!!navigator.serviceWorker.controller'))) ng('重新整理後頁面沒有被 Service Worker 接管');
    let onlineFont = null;
    for (const p of PAGES) {
      page.errors.length = 0;
      await page.goto(`${origin}/${p}`);
      const f = await page.eval(fontCheck);
      if (p === 'index.html') onlineFont = f;
      if (p !== 'index.html') {
        const t0 = Date.now();
        const r = await page.eval(`(${smoke.toString()})()`, 300000);
        r.problems.forEach(x => ng(`${p}：${x}`));
        if (!r.problems.length) ok(`${p} 分頁、搜尋、試算工具、${r.links} 個怪獸連結都正常（${((Date.now() - t0) / 1000).toFixed(1)} 秒）`);
      }
      await sleep(300);
      const errs = [...new Set(page.errors)];
      errs.forEach(e => ng(`${p}：${e}`));
      if (!errs.length) ok(`${p} 沒有錯誤訊息`);
    }
    if (!onlineFont.dot.includes('loaded')) console.log(`  -- 線上就載不到 DotGothic16（${JSON.stringify(onlineFont)}），可能是網路連不到 Google Fonts，離線字型結果僅供參考`);
    await sleep(2000); // 讓 Service Worker 把背景抓到的檔寫進快取
    await cdp.close(); cdp = null;
    await new Promise(r => srv.close(r));

    console.log('[斷網：離線快取]');
    // 清掉瀏覽器的 HTTP 快取（Google Fonts 的 CSS 只快取 1 天），只留 Service Worker 的快取，
    // 模擬「離線超過一天」的手機
    for (const d of ['Cache', 'Code Cache']) fs.rmSync(path.join(profile, 'Default', d), { recursive: true, force: true });
    cdp = await launch(exe, profile, ['--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND']);
    const off = await openPage(cdp, origin);
    for (const p of PAGES) {
      off.errors.length = 0;
      try { await off.goto(`${origin}/${p}`); } catch (e) { ng(`離線 ${p}：打不開（${e.message}）`); continue; }
      const info = await off.eval(`({ ctl: !!(navigator.serviceWorker && navigator.serviceWorker.controller), title: document.title, cards: document.querySelectorAll('.mon, .dev').length })`);
      const f = await off.eval(fontCheck);
      const errs = [...new Set(off.errors)];
      const bad = [];
      if (!info.ctl) bad.push('沒有被 Service Worker 接管');
      if (!info.cards) bad.push('畫面沒有內容');
      if (!f.dot.includes('loaded')) bad.push(`點陣字型 DotGothic16 沒載入（${f.dot.length ? f.dot.join('/') : '連字型設定都沒有'}）`);
      if (!f.noto.includes('loaded')) bad.push(`Noto Sans TC 沒載入（${f.noto.length ? f.noto.join('/') : '連字型設定都沒有'}）`);
      errs.forEach(e => bad.push(e));
      if (bad.length) bad.forEach(b => ng(`離線 ${p}：${b}`));
      else ok(`離線 ${p} 正常顯示，字型都在`);
    }
  } catch (e) {
    ng('瀏覽器檢查中斷：' + e.message);
  } finally {
    if (cdp) await cdp.close();
    srv.close();
    for (let i = 0; i < 10; i++) { try { fs.rmSync(profile, { recursive: true, force: true }); break; } catch (e) { await sleep(500); } }
  }
}

const t0 = Date.now();
staticChecks();
await browserChecks();
console.log(`\n耗時 ${((Date.now() - t0) / 1000).toFixed(1)} 秒`);
if (fails.length) { console.log(`未通過：${fails.length} 項`); process.exit(1); }
console.log('全部通過');
