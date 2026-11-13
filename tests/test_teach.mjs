// Teach page: entry on the landing page, base game / Uprising scripts, every term opens its note with a picture,
// the 「问」 buttons ask the rules assistant that exact question (with the edition in front), 注意事项, the icon guide,
// phone width. /api/chat is mocked, so this never asks a real model.
// Usage: node tests/test_teach.mjs <base-url> <shots-dir>   (safe against the live site too: it writes nothing)
import { chromium } from 'playwright-core';
const [base, out] = process.argv.slice(2);
let fails = 0;
const eq = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', name, ok ? '' : `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); };

const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
const asked = [];
await page.route('**/api/chat', async r => {
  const q = JSON.parse(r.request().postData()).messages.at(-1).content; asked.push(q);
  await r.fulfill({ contentType: 'text/event-stream', body: `data: ${JSON.stringify({ choices: [{ delta: { content: `答：${q}` } }] })}\n\ndata: [DONE]\n\n` });
});
const url = p => new URL(p, base).href;

// the hub's Uprising box: landing → teach page in Uprising
await page.goto(url('/?v=uprising')); await page.waitForSelector('.teachgo');
eq('landing shows the teach entry', await page.textContent('.teachgo b'), '第一次玩？6 分钟讲规则');
eq('entry keeps the edition', await page.getAttribute('.teachgo', 'href'), '/teach?v=uprising');
await page.goto(url('/?v=base')); await page.waitForSelector('.teachgo');
eq('base entry', [await page.textContent('.teachgo b'), await page.getAttribute('.teachgo', 'href')], ['第一次玩？5 分钟讲规则', '/teach?v=base']);
await page.click('.teachgo'); await page.waitForSelector('.tpart');
eq('teach page opened', new URL(page.url()).pathname, '/teach');
const modeOn = () => page.$eval('.tmode [aria-pressed="true"]', x => x.textContent);
const script = () => page.$$eval('.tline', l => l.map(p => p.textContent).join(''));
const noteCount = () => page.$$eval('#later details', l => l.length);
eq('?v=base opens the base game', [await modeOn(), await page.textContent('#ttl')], ['基础版', '5 分钟讲规则']);
eq('eight parts plus 注意事项', await page.$$eval('.tpart h2 span', l => l.map(h => h.textContent.replace(/^[\d!]/, ''))),
  ['怎么赢', '你面前有什么', '一轮五步', '特使回合', '资源和军队', '揭示回合', '战斗和冲突', '密谋牌和结束', '注意事项']);

// every important element is at least named
const BOTH = ['胜利点数', '冲突', '四大派系', '密谋牌', '领袖牌', '印戒', '起始牌库', '特使', '剑术大师', '军队', '军营', '先手', '造物主', '特使图标', '地点',
  '结盟标记', '白箭头', '最高委员会', '香料', '宇宙索', '水', '征兵', '战斗地点', '冲突区', '揭示', '招募点数', '帝国牌', '储备区', '剑刃', '战力', '战斗密谋牌', '控制标记', '冲突牌库'];
const B_ONLY = ['门泰特'], U_ONLY = ['间谍', '目标牌', '沙虫', '沙地钩', '屏蔽场城墙', '作战图标', '翻倍'];
const bRead = await script(), bNotes = await noteCount();
console.log(`  base: ${bRead.length} characters, ${bNotes} notes`);
eq('base script about five minutes (under 1400 characters)', bRead.length < 1400, true);
for (const w of [...BOTH, ...B_ONLY]) if (!bRead.includes(w)) { fails++; console.log('FAIL base script mentions', w); }
eq('base script has nothing from Uprising', U_ONLY.filter(w => bRead.includes(w)), []);
eq('base: 15+ notes, none tagged 起义, no Uprising icons', [bNotes >= 15, await page.$$eval('#later .tnw', l => l.length), await page.$$eval('.tic[data-t="sandworm"]', l => l.length)], [true, 0, 0]);
eq('base: asks carry the edition', await page.$$eval('[data-q]', l => l.filter(x => !x.dataset.q.startsWith('（版本：基础版）')).length), 0);

await page.click('.tmode [data-mode="u"]');
const uRead = await script(), uNotes = await noteCount();
console.log(`  Uprising: ${uRead.length} characters, ${uNotes} notes`);
eq('Uprising title', await page.textContent('#ttl'), '6 分钟讲规则');
eq('Uprising script about six minutes (under 1600 characters)', uRead.length < 1600, true);
for (const w of [...BOTH, ...U_ONLY]) if (!uRead.includes(w)) { fails++; console.log('FAIL Uprising script mentions', w); }
eq('Uprising script has no mentat', B_ONLY.filter(w => uRead.includes(w)), []);
eq('Uprising: more notes, the Uprising ones tagged', [uNotes > bNotes, await page.$$eval('#later .tnw', l => l.length) >= 5], [true, true]);
eq('Uprising: asks carry the edition', await page.$$eval('[data-q]', l => l.filter(x => !x.dataset.q.startsWith('（版本：起义）')).length), 0);
eq('「去建房间」 and 返回 follow the edition', [await page.getAttribute('.tgo', 'href'), await page.getAttribute('#back', 'href')], ['/?v=uprising', '/?v=uprising']);
await page.screenshot({ path: out + '/dune_teach_top.png' });

// every term in the script and every icon in the guide opens a note with a name, a picture and both texts, in both editions
for (const m of ['u', 'b']) {
  await page.click(`.tmode [data-mode="${m}"]`);
  const ids = await page.$$eval('[data-t]', l => [...new Set(l.map(x => x.dataset.t))]);
  const bad = [];
  for (const id of ids) {
    await page.evaluate(id => document.querySelector(`[data-t="${id}"]`).click(), id);
    await page.evaluate(() => { const i = document.querySelector('.tshd img'); return i && !i.complete ? new Promise(r => { i.onload = i.onerror = r; }) : 0; });
    const n = await page.$eval('.tsheet', s => ({ open: !s.classList.contains('hidden'), name: s.querySelector('.tshd b')?.textContent, pic: s.querySelector('.tshd img')?.naturalWidth > 0, ps: [...s.querySelectorAll('p')].map(p => p.textContent.length) }));
    if (!n.open || !n.name || !n.pic || n.ps.length !== 2 || n.ps.some(x => x < 8)) bad.push([id, n]);
    await page.click('.tsx');
  }
  console.log(`  ${m}: ${ids.length} terms checked`);
  eq(`${m}: every term opens a note with its picture and text`, bad, []);
}
eq('the note closes', await page.$eval('.tsheet', s => s.classList.contains('hidden')), true);
await page.click('.tmode [data-mode="u"]');
const term = page.locator('#p5 .term[data-t="sandworm"]');
await term.scrollIntoViewIfNeeded(); await term.click();
await page.screenshot({ path: out + '/dune_teach_note.png' });

// asking from a note: closes the note, opens the assistant, sends the question
await page.click('.tsask'); await page.waitForSelector('.cm.a:not(:has(.cdots))');
eq('note → assistant asked about that term', [asked.at(-1), await page.isVisible('.cpanel'), await page.$eval('.tsheet', s => s.classList.contains('hidden'))],
  ['（版本：起义）「沙虫」是什么，怎么用？', true, true]);
await page.screenshot({ path: out + '/dune_teach_ask.png' });
await page.click('.cx');

// a 「问」 button sends exactly its question and the answer shows
const q = await page.$eval('#p4 .tq', x => x.dataset.q);
await page.locator('#p4 .tq').first().click(); await page.waitForFunction(n => document.querySelectorAll('.cm.a').length > n && !document.querySelector('.cm.a:last-child .cdots'), 1);
eq('「问」 sends its question', [asked.at(-1), await page.$$eval('.cm.a', l => l.at(-1).textContent)], [q, `答：${q}`]);
eq('first 「问」 in 特使回合', q, '（版本：起义）没有可以派的地点怎么办？');
await page.click('.cx');

// 注意事项: after the script, each a title and a written answer, closed until tapped; the button asks about that item
const notes = await page.$$eval('#later details', l => l.map(d => ({ open: d.open, t: d.querySelector('summary i').nextSibling.textContent, a: d.querySelector('p').textContent.length, q: d.querySelector('.tq')?.dataset.q })));
eq('every note has a title and a 2–4 sentence answer, closed at first', notes.filter(n => n.open || n.t.length < 2 || n.a < 40 || n.a > 260), []);
eq('every note asks about its own title', notes.filter(n => n.q !== `（版本：起义）「${n.t}」这一条我还有疑问，请再讲讲。`), []);
eq('注意事项 comes after the script and ends with the AI hint', await page.$eval('#later', s => [!!s.previousElementSibling?.matches('#p8'), s.lastElementChild.textContent]),
  [true, '注意事项里没有的，点右下角「规则」问 AI，本站资料查不到会联网找。']);
const n3 = page.locator('#later details').nth(2);
await n3.locator('summary').click();
eq('tapping a note opens it', [await n3.evaluate(d => d.open), await n3.locator('p').isVisible(), await n3.locator('.tq').isVisible()], [true, true, true]);
await n3.scrollIntoViewIfNeeded(); await page.screenshot({ path: out + '/dune_teach_notes.png' });
await n3.locator('.tq').click(); await page.waitForFunction(n => document.querySelectorAll('.cm.a').length > n && !document.querySelector('.cm.a:last-child .cdots'), 2);
eq('「还有疑问？」 sends that note\'s question', asked.at(-1), notes[2].q);
await page.click('.cx');
eq('no button inside a button', await page.$$eval('button button', l => l.length), 0);

// icon guide: every picture loads and has a name
await page.evaluate(() => Promise.all([...document.querySelectorAll('.tic img')].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))));
const tiles = await page.$$eval('.tic', l => l.map(t => [t.dataset.t, t.querySelector('img')?.naturalWidth > 0, t.textContent.trim().length > 0]));
eq('icon guide: every picture loads', tiles.filter(t => !t[1] || !t[2]), []);
console.log(`  icon guide: ${tiles.length} icons`);
await page.locator('#icons').scrollIntoViewIfNeeded(); await page.screenshot({ path: out + '/dune_teach_icons.png' });
eq('no sideways scrolling at 375 px', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);

// without ?v the phone's last choice is used; ?v wins over it
await page.goto(url('/teach')); await page.waitForSelector('.tpart');
eq('last choice remembered without ?v', await modeOn(), '起义');
await page.click('.tmode [data-mode="b"]'); await page.reload(); await page.waitForSelector('.tpart');
eq('base remembered after reload', [await modeOn(), await noteCount()], ['基础版', bNotes]);
await page.goto(url('/teach?v=uprising')); await page.waitForSelector('.tpart');
eq('?v=uprising wins over the remembered choice', await modeOn(), '起义');
eq('no page errors', errs, []);
await b.close();
console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
