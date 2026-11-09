// Dune: Imperium table helper. One phone runs the round flow; everyone checks their own final score.
// Rules and validation live in logic.js (shared with the server); this file only draws screens and sends actions.
import {VERSIONS,EXPANSIONS,PHASES,target,maxRounds,participants,scoringPlayers,total,standings,gameKey} from './logic.js';
import {setupList,phaseList,TIE_ROWS} from './steps.js';

const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local = {get(k){try{return localStorage.getItem(k);}catch{return null;}}, set(k,v){try{localStorage.setItem(k,v);}catch{}}};

let actor = local.get('dune-actor') || crypto.randomUUID(); local.set('dune-actor', actor);
let code = new URLSearchParams(location.search).get('r'), S = null, ws = null, online = false;
let want = new URLSearchParams(location.search).get('v'); // hub box link: ?v=base|uprising preselects the edition

// UI state that a re-render must not wipe
const ui = {tab:'flow', rooms:[], error:'', mine:local.get('dune-player')||'p0', scores:{}, battle:{}, concessions:{}, ties:false, special:false, busy:false, review:{stars:5,text:'',sent:false}, end:false, checklist:true};

const SHORT = {base:'基础版', uprising:'起义'};
const EXP_NOTE = {ix:'科技板块、无畏舰、货运轨；史诗模式必需', immortality:'特莱拉轨、研究与基因样本', bloodlines:'萨多卡指挥官、新领袖与科技'};
const DIFFICULTY = [['novice','佣兵'],['veteran','萨多卡'],['expert','门泰特'],['expertplus','魁萨茨']];
const TEAMS = {A:'穆阿迪布', B:'沙达姆'};

const host = () => !!S?.isHost;
const locked = () => !host() || !online;
const dis = (extra=false) => locked() || extra ? 'disabled' : '';
const opts = (values, value) => values.map(([k,v]) => `<option value="${esc(k)}" ${String(k)===String(value)?'selected':''}>${esc(v)}</option>`).join('');
const btn = (label, act, extra='', cls='') => `<button type="button" class="${cls}" data-act="${act}" ${extra}>${label}</button>`;
const meta = c => [SHORT[c.version], c.n===6 ? '6 人组队' : c.n+' 人', c.epic ? '史诗' : '标准', ...Object.entries(EXPANSIONS).filter(([k]) => c[k]).map(([,v]) => v)].join(' · ');
// 定先手用总入口的手指轮盘 / 抽签，点「返回」回到这里
const orderUrl = n => `https://boardgame.leisurecat.cloud/?order=${n}&back=${encodeURIComponent(location.href)}`;
const src = x => `<a class="src" href="${x.url}" target="_blank" rel="noopener">${esc(x.tag)} p${x.page}</a>`;
// segmented control: one row of buttons, the chosen one highlighted
const seg = (act, items, value, attrs='') => `<div class="seg" style="--n:${items.length}">${items.map(([k,v]) => `<button type="button" data-act="${act}" data-v="${esc(k)}" ${attrs} aria-pressed="${String(k)===String(value)}" class="${String(k)===String(value)?'on':''}">${v}</button>`).join('')}</div>`;
const stepper = (input) => `<div class="stepper"><button type="button" data-step="-1" aria-label="减一">−</button>${input}<button type="button" data-step="1" aria-label="加一">+</button></div>`;

const ICON = {
  book:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5a2.5 2.5 0 0 0-2.5 2.5zM4 20.5V5.5M8 7h8M8 10.5h6"/></svg>',
  scroll:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h11a2 2 0 0 1 2 2v2h-4M7 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7M7 3a2 2 0 0 1 2 2v2M9 11h6M9 15h6"/></svg>',
  undo:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/></svg>',
};

// ---------- rendering ----------
function morph(a,b){
 const ac=[...a.childNodes],bc=[...b.childNodes];bc.forEach((y,i)=>{const x=ac[i];if(!x){a.appendChild(y);return;}
 if(x.nodeType!==y.nodeType||x.nodeName!==y.nodeName||(x.nodeType===1&&x.dataset.k!==y.dataset.k)){a.replaceChild(y,x);return;}
 if(x.nodeType!==1){if(x.nodeValue!==y.nodeValue)x.nodeValue=y.nodeValue;return;}
 for(const at of [...x.attributes])if(!y.hasAttribute(at.name))x.removeAttribute(at.name);
 for(const at of [...y.attributes])if(x.getAttribute(at.name)!==at.value)x.setAttribute(at.name,at.value);
 if(x.tagName==='INPUT'||x.tagName==='TEXTAREA'){if(x!==document.activeElement)x.value=y.value;if(x.type==='checkbox')x.checked=y.checked;return;}
 morph(x,y);if(x.tagName==='SELECT'&&x!==document.activeElement)x.value=y.value;
 });while(a.childNodes.length>bc.length)a.lastChild.remove();
}
function render(){const t=document.createElement('div');t.innerHTML=view();morph($('#app'),t);}
function notify(text){$('#notice').textContent=text;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#notice').textContent='',4000);}
function send(action){if(!online)return notify('连接断了，这一步没发出去。恢复后再点一次。');ws.send(JSON.stringify({action,revision:S.revision}));}

function connect(){
 if(!/^[A-Z0-9]{4}$/.test(code||'')){ui.error='房间码是四位字母或数字';render();return;}
 ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/room/${code}/ws?actor=${actor}`);
 ws.onopen=()=>{online=true;render();};
 ws.onmessage=e=>{if(e.data==='pong')return;const m=JSON.parse(e.data);
  if(m.type==='state'){const old=S;S=m.state;
   if(old?.round!==S.round){ui.end=false;ui.battle={};ui.concessions={};ui.special=false;}
   if(old?.stage!==S.stage){ui.tab=S.stage==='over'?'result':S.stage==='score'?'score':'flow';}
   if(!S.hasHost)send({t:'claim'});
   if(want&&host()&&S.stage==='setup'){const v=want;want=null;history.replaceState(null,'','/?r='+code);if(VERSIONS[v]&&S.config.version!==v)setVersion(v);}
   render();
  }else{ui.error=m.error;notify(m.error);render();}};
 ws.onclose=()=>{online=false;render();setTimeout(()=>{if(code)connect();},2500);};
 ws.onerror=()=>notify('连不上房间，检查一下网络');
}
setInterval(()=>{if(ws?.readyState===1)ws.send('ping');},25000);

function setVersion(v){const c={...S.config,version:v};if(c.version==='base'){c.choam=false;if(c.n===6)c.n=4;}send({t:'config',config:c});}
function setConfig(patch){const c={...S.config,...patch};if(c.n===6)c.choam=true;if(c.n===1)c.epic=false;if(c.epic)c.ix=true;if(!c.bloodlines)c.tech=false;send({t:'config',config:c});}

function view(){return code?room():landing();}

// ---------- landing ----------
function landing(){
 const rooms=ui.rooms.map(r=>`<a class="room-row" href="/?r=${r.code}" data-k="r-${r.code}"><b>${r.code}</b><span class="room-info"><span class="chip">${SHORT[r.config.version]||''}</span>${esc(r.players.join('、'))}</span><span class="state ${r.stage==='over'?'done':''}">${r.stage==='over'?'已结算':r.stage==='setup'?'准备中':'第 '+r.round+' 轮'}</span></a>`).join('');
 const rate=(k,t)=>`<a class="back-nav" href="https://boardgame.leisurecat.cloud/?rate=${k}&back=${encodeURIComponent(location.href)}">★ ${t}</a>`;
 return `<header class="hero">
  <div class="hero-nav"><a class="back-nav" href="https://boardgame.leisurecat.cloud">‹ 全部游戏</a>${want==='base'?rate('dune-imperium','写评价'):want==='uprising'?rate('dune-uprising','写评价'):rate('dune-imperium','评基础版')+rate('dune-uprising','评起义')}</div>
  <div class="covers"><img src="/img/base.jpg" alt="沙丘：帝国 官方封面"><img src="/img/uprising.jpg" alt="沙丘：帝国 起义 官方封面"></div>
  <h1>沙丘：帝国 小助手</h1>
  <p class="tagline">准备不漏 · 冲突好算 · 终局不错</p>
 </header>
 <main class="landing">
  <div class="card start">
   ${btn(ui.busy?'正在创建…':'创建新房间','create',ui.busy?'disabled':'','primary big')}
   <div class="or"><span>或输入房间码加入</span></div>
   <form id="join" class="join"><label class="sr-only" for="joinCode">房间码</label><input id="joinCode" maxlength="4" placeholder="房间码" autocapitalize="characters" autocomplete="off" required><button class="dark">加入</button></form>
  </div>
  <div class="tiles">
   <a class="tile" href="/guide.html">${ICON.book}<span><b>新手教程</b><small>教程 + 常见问题</small></span></a>
   <a class="tile" href="/history.html">${ICON.scroll}<span><b>往期对局</b><small>战绩与存档</small></span></a>
  </div>
  <section class="plain"><div class="row-head"><h2>房间</h2><small>${ui.rooms.length?ui.rooms.length+' 个':''}</small></div>
   ${rooms||'<p class="muted">还没有房间，开一个邀朋友加入。</p>'}
  </section>
  <p class="foot">一台手机带流程，每人在自己手机上核分。需要实体游戏。<br>非官方工具 · 规则依据官方中英文规则书与 2025-01-13 FAQ</p>
 </main>`;
}

// ---------- room ----------
function room(){
 const head=`<header class="bar">
  <a class="back-nav" href="/">‹ 首页</a>
  <span class="bar-title">沙丘助手</span>
  <button type="button" class="code-chip" data-act="share" aria-label="复制邀请链接"><small>房间</small><b>${esc(code)}</b><small>邀请</small></button>
  <i class="dot ${online?'on':''}" title="${online?'已连接':'连接中'}"></i>
 </header>`;
 if(!S)return `${head}<main><p class="muted center">${esc(ui.error||'正在连接房间…')}</p></main>`;
 const sub=`<div class="subline"><span>${esc(meta(S.config))}</span>${S.prev&&host()?`<button type="button" class="link" data-act="undo" ${dis()}>${ICON.undo}撤销</button>`:''}</div>`;
 return `${head}<main>${sub}${S.stage==='setup'?setup():play()}${links()}</main>`;
}
const links=()=>`<nav class="links"><a href="/guide.html${code?'?r='+code:''}">新手教程</a><a href="/guide.html${code?'?r='+code:''}#faq">规则速查</a><a href="/history.html">往期对局</a></nav>`;

function setup(){
 const c=S.config, u=c.version==='uprising';
 const counts=(u?[1,2,3,4,6]:[1,2,3,4]).map(n=>[n,n===6?'6 组队':n+' 人']);
 const toggles=[...Object.entries(EXPANSIONS).map(([k,v])=>toggle(k,v,EXP_NOTE[k],k==='ix'&&c.epic)),
  ...(u?[toggle('choam','宇联商会合约',c.n===6?'六人必选':'起义自带的 CHOAM 模组',c.n===6)]:[]),
  ...(c.bloodlines?[toggle('tech','血脉 · 科技模组','加入血脉的科技板块')]:[])].join('');
 const items=setupList(c), done=items.filter(x=>S.checks[x.id]).length;
 return `<section>
  <h2>版本</h2>
  <div class="versions">${Object.keys(VERSIONS).map(k=>`<button type="button" class="version ${c.version===k?'on':''}" data-act="version" data-version="${k}" aria-pressed="${c.version===k}" ${dis()}><img src="/img/${k}.jpg" alt=""><span>${SHORT[k]}</span></button>`).join('')}</div>
  <h3>人数</h3>${seg('n',counts,c.n,dis())}
  ${c.n<=2?`<p class="hint">${c.n===1?'单人':'双人'}要加劲敌，由实物牌或<a href="https://www.direwolfdigital.com/game-room/" target="_blank" rel="noopener">官方 App</a>驱动，这里只记结果。<a href="/guide.html#rivals">怎么设置</a></p>`:''}
  ${c.n===1?`<h3>难度</h3>${seg('difficulty',DIFFICULTY,c.difficulty,dis())}`:''}
  ${c.n===2&&u?`<h3>劲敌</h3>${seg('rival',[['regular','常规 · 计分'],['streamlined','精简 · 不计分']],c.rival,dis())}`:''}
  ${c.n>1?`<h3>模式</h3>${seg('mode',[['standard','标准 · 10 分'],['epic','史诗 · 12 分']],c.epic?'epic':'standard',dis())}${c.epic?'<p class="hint">史诗模式会自动加入伊克斯崛起。</p>':''}`:''}
  <h3>扩展</h3><div class="toggles">${toggles}</div>
 </section>
 <section>
  <div class="row-head"><h2>座位</h2><small>顺时针</small></div>
  ${participants(S).map((p,i)=>seat(p,i,c)).join('')}
  ${c.n===6?'<p class="hint">两队交替坐，两位领队面对面。领队用专属的穆阿迪布／沙达姆领袖。'+src({tag:'六人',page:8,url:'https://d19y2ttatozxjp.cloudfront.net/pdfs/SCN_DUNE_IMPERIUM_UPRISING_Rules_Supplements.pdf#page=8'})+'</p>':''}
 </section>
 <section id="checklist">
  <div class="row-head"><h2>准备清单</h2><button type="button" class="link" data-act="checklist">${ui.checklist?'收起':'展开'} · ${done}/${items.length}</button></div>
  ${ui.checklist?list(items,true):''}
 </section>
 <div class="sticky">${btn(host()?'开始第一轮':'等主持人开始','begin',dis(),'primary big')}</div>`;
}
function toggle(k,label,note,force=false){
 return `<label class="toggle ${S.config[k]?'on':''}"><input type="checkbox" data-config="${k}" ${S.config[k]?'checked':''} ${dis(force)}><span><b>${label}</b><small>${note}</small></span></label>`;
}
function seat(p,i,c){
 const six=c.n===6;
 return `<div class="seat" data-k="${p.id}">
  <span class="badge ${six?'team-'+p.team:''}">${i+1}</span>
  <div class="seat-fields">
   <div class="pair"><input data-player="${p.id}" data-field="name" value="${esc(p.name)}" maxlength="24" aria-label="${p.rival?'劲敌名称':'玩家名'}" placeholder="${p.rival?'劲敌':'玩家名'}" ${dis()}>
   <input data-player="${p.id}" data-field="leader" value="${esc(p.leader)}" aria-label="领袖" placeholder="领袖（选填）" ${dis()}></div>
   ${p.rival?'<small class="muted">劲敌</small>':''}
   ${six?`<div class="pair">${seg('team-'+p.id,Object.entries(TEAMS),p.team,dis())}${seg('role-'+p.id,[['true','领队'],['false','盟友']],String(p.commander),dis())}</div>`:''}
  </div>
 </div>`;
}
function list(items,check=false){
 return `<ul class="steps">${items.map(x=>`<li data-k="${x.id}">${check?`<input type="checkbox" aria-label="${esc(x.id)}" data-check="${x.id}" ${S.checks[x.id]?'checked':''} ${dis()}>`:'<i class="bullet"></i>'}<div><p>${esc(x.text)}</p>${src(x)}${x.order?` <a class="src" href="${orderUrl(S.config.n)}">手指轮盘定先手 ›</a>`:''}</div></li>`).join('')}</ul>`;
}

function play(){
 const tabs=[['flow','流程'],['battle','冲突'],['score','计分'],['result','结算']];
 return `<nav class="tabs">${tabs.map(([k,v])=>btn(v,'tab',`data-tab="${k}" aria-pressed="${ui.tab===k}"`,ui.tab===k?'on':'')).join('')}</nav>
 <div data-k="tab-${ui.tab}">${ui.tab==='flow'?flow():ui.tab==='battle'?battle():ui.tab==='score'?score():result()}</div>`;
}

function flow(){
 const playing=S.stage==='play', last=S.phase===PHASES.length-1;
 let action='';
 if(!playing) action=btn('去计分','tab','data-tab="score"','primary big');
 else if(last) action=`<label class="confirm"><input type="checkbox" id="end-condition" ${ui.end?'checked':''}><span>实物上已有人到 ${target(S.config)} 分，或冲突牌用完了</span></label>
  ${btn(ui.end?'进入终局计分':'没结束，开始下一轮','next',dis(),'primary big')}`;
 else action=btn(S.phase===2?'战斗结算完了 →':'下一阶段：'+PHASES[S.phase+1]+' →','next',dis(),'primary big');
 return `<section>
  <div class="status"><span>第 <strong>${S.round}</strong> 轮</span><small>最多 ${maxRounds(S.config)} 轮 · ${target(S.config)} 分结束</small></div>
  <ol class="phases">${PHASES.map((p,i)=>`<li class="${i===S.phase&&playing?'on':i<S.phase||!playing?'past':''}"><b>${i+1}</b>${p}</li>`).join('')}</ol>
  <h2>${playing?PHASES[S.phase]:S.stage==='over'?'已结算':'等大家核分'}</h2>
  ${playing?list(phaseList(S.config,S.phase)):''}
  ${playing&&S.phase===2?`<p class="hint">战力算不清？${btn('用冲突计算器','tab','data-tab="battle"','link')}</p>`:''}
  ${playing&&last?`<p class="hint">先到 ${target(S.config)} 分的人不一定赢，结束后比总分。</p>`:''}
 </section>
 <div class="sticky">${action}</div>`;
}

function battle(){
 const c=S.config, ps=participants(S).filter(p=>c.n!==6||!p.commander), u=c.version==='uprising';
 return `<section>
  <h2>冲突计算器</h2>
  <p class="hint">先打完战斗密谋牌，再把每人的最终战力填进来。随时可以跳过。</p>
  <div class="battle-head ${u?'':'no-worm'}"><span></span><small>战力</small>${u?'<small>沙虫</small>':''}</div>
  ${ps.map(p=>{const d=ui.battle[p.id]||{strength:0,worms:0};return `<div class="battle-row ${u?'':'no-worm'}" data-k="b-${p.id}"><b>${esc(p.name)}${p.rival?'<small>劲敌</small>':''}</b>
   ${stepper(`<input type="number" inputmode="numeric" min="0" max="999" data-battle="${p.id}" data-field="strength" value="${d.strength}" aria-label="${esc(p.name)} 战力">`)}
   ${u?stepper(`<input type="number" inputmode="numeric" min="0" max="4" data-battle="${p.id}" data-field="worms" value="${d.worms}" aria-label="${esc(p.name)} 沙虫">`):''}</div>`;}).join('')}
  ${c.n===6?`<p class="hint">只比较四名盟友，领队的效果先算进盟友。同队两位盟友打平时，可以把高档奖励让给队友。</p>
   ${['A','B'].map(t=>`<label class="field">${TEAMS[t]}队打平时，高档给<select data-concession="${t}">${opts([['','不让，按平局算'],...ps.filter(p=>p.team===t).map(p=>[p.id,p.name])],ui.concessions[t]||'')}</select></label>`).join('')}
   ${c.bloodlines?`<label class="confirm"><input type="checkbox" id="special" ${ui.special?'checked':''}><span>还有没核清的萨多卡指挥官效果</span></label>`:''}`:''}
  <div class="actions">${btn('算奖励','calculate','','primary')}${btn('跳过','tab','data-tab="flow"')}</div>
  ${S.conflict?`<div class="battle-result" role="status">${S.conflict.manual?`<p class="warn">${esc(S.conflict.reason)}</p>`:S.conflict.results.map(r=>`<div class="reward"><b>${esc(S.players.find(p=>p.id===r.id)?.name)}</b><span class="tier t${r.commander?0:r.tier||0}">${r.commander?'领队 · 不参与':r.tier?'第 '+r.tier+' 档奖励'+(r.multiplier===2?' ×2':''):'无奖励'}${r.winner?' · 胜者':''}</span></div>`).join('')}<small class="muted">${esc(S.conflict.source)}</small></div>`:''}
  ${u?'<p class="hint">沙虫只让奖励翻倍一次；控制权和作战图标不翻倍；要付费的奖励，翻倍那份也要再付。</p>':''}
  <button type="button" class="link" data-act="ties">${ui.ties?'收起平局规则':'平局怎么算？'}</button>
  ${ui.ties?`<table class="ties">${TIE_ROWS.map(([a,b])=>`<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table><small class="muted">基础版 p12 · 起义 p14 · 六人补充 p11</small>`:''}
 </section>`;
}

function score(){
 if(!['score','over'].includes(S.stage))return '<section><h2>还没到终局</h2><p class="hint">召回阶段确认游戏结束后，每人在自己的手机上填分。</p></section>';
 const ps=scoringPlayers(S);if(!ps.some(p=>p.id===ui.mine))ui.mine=ps[0].id;
 const p=ps.find(p=>p.id===ui.mine), q={...p.score,...ui.scores[p.id]};
 const tied=standings(S).some((x,i,a)=>a.some((o,j)=>j!==i&&o.total===x.total));
 const num=(name,v,max=999)=>stepper(`<input name="${name}" type="number" inputmode="numeric" min="0" max="${max}" required value="${v}">`);
 return `<section>
  <h2>终局计分</h2>
  <h3>替谁填</h3>
  <div class="who">${ps.map(x=>`<button type="button" data-act="mine" data-id="${x.id}" class="${x.id===ui.mine?'on':''}" aria-pressed="${x.id===ui.mine}">${esc(x.name)}${x.score.confirmed?'<i>✓</i>':''}</button>`).join('')}</div>
  <form id="score-form" data-k="score-${p.id}">
   <div class="score-grid"><label class="field">分轨上的分数${num('track',q.track)}</label><label class="field">还没加上的终局分${num('extra',q.extra)}</label></div>
   <div class="total">合计 <b id="score-total">${(+q.track||0)+(+q.extra||0)}</b> 分</div>
   <label class="field">加分来源（选填）<input name="note" maxlength="500" value="${esc(q.note)}" placeholder="例：终局密谋牌 +2"></label>
   <p class="hint">购牌、派系、作战图标配对的分已经在分轨上，别重复加。记得看终局密谋牌和科技。分数可以超过 12。</p>
   <label class="confirm"><input type="checkbox" name="checked" ${q.checked?'checked':''}><span>我核对过：上面的终局分还没加到分轨上</span></label>
   ${tied?`<div class="tie-fields"><h3>有人同分，补填资源</h3><p class="hint">按顺序比较：${S.config.ix?'Chaumurky → ':''}香料 → 宇宙索 → 水 → 驻军，再比最后一轮谁揭示得晚。${S.config.n===6?'六人按全队合计。':''}</p>
    <div class="score-grid">${[['spice','香料'],['solari','宇宙索'],['water','水'],['garrison','驻军'],['reveal','揭示顺序（越晚越大）']].map(([k,v])=>`<label class="field">${v}<input name="${k}" type="number" inputmode="numeric" min="0" max="999" value="${q[k]}"></label>`).join('')}</div>
    ${S.config.ix?`<label class="confirm"><input name="chaumurky" type="checkbox" ${q.chaumurky?'checked':''}><span>手上有 Chaumurky</span></label>`:''}</div>`:''}
   <div class="actions"><button name="save" value="draft">先存着</button><button class="primary" name="save" value="confirm">确认分数</button></div>
  </form>
 </section>
 <section>
  <h2>全桌进度</h2>
  ${ps.map(x=>`<div class="reward" data-k="pr-${x.id}"><span>${esc(x.name)}</span><span><b>${total(x)}</b> 分 <em class="${x.score.confirmed?'ok':''}">${x.score.confirmed?'已确认':'待确认'}</em></span></div>`).join('')}
 </section>
 <div class="sticky">${btn(ps.every(x=>x.score.confirmed)?'全部确认，结算':'等所有人确认','finish',dis(),'primary big')}</div>`;
}

function result(){
 if(S.stage!=='over')return '<section><h2>等大家确认</h2><p class="hint">所有人确认分数后，由主持人结算。</p></section>';
 const rs=standings(S), six=S.config.n===6;
 const stars=[1,2,3,4,5].map(n=>`<button type="button" data-act="star" data-n="${n}" aria-label="${n} 星" class="${n<=ui.review.stars?'on':''}">★</button>`).join('');
 return `<section id="shot" class="result">
  <p class="eyebrow">本局结果</p>
  <h2>${esc(VERSIONS[S.config.version])}</h2>
  <p class="muted">${esc(meta(S.config))} · 第 ${S.round} 轮结束 · 房间 ${esc(code)}</p>
  ${rs.map(p=>`<div class="rank ${p.place===1?'first':''}"><span class="place">${p.place}</span><div><b>${esc(p.name)}</b><small>${six?'三人总分':esc(p.leader||'')}</small></div><strong>${p.total}<small>分</small></strong></div>`).join('')}
  ${rs.some((p,i)=>i&&p.place===rs[i-1].place)?'<p class="warn">还有并列：补填资源和揭示顺序前，按并列记录。</p>':''}
  ${six?`<div class="team-detail">${scoringPlayers(S).map(p=>`<p><span class="badge team-${p.team}">${p.team==='A'?'穆':'沙'}</span>${esc(p.name)} · ${p.commander?'领队':'盟友'}${p.leader?' · '+esc(p.leader):''}<b>${total(p)} 分</b></p>`).join('')}</div>`:''}
  <p class="stamp">沙丘：帝国 小助手 · 线下对局记录</p>
 </section>
 <div class="actions">${btn('保存长图','image','','primary')}${btn('修改分数','reopen',dis())}<a class="button" href="/history.html">往期对局</a></div>
 <section class="review">
  <h2>给这款游戏打分</h2>
  <div class="stars">${stars}</div>
  <label class="field">评价人<select id="review-name">${opts(scoringPlayers(S).map(p=>[p.id,p.name]),ui.mine)}</select></label>
  <label class="field">一句话评价<textarea id="review-text" maxlength="500" placeholder="选填">${esc(ui.review.text)}</textarea></label>
  ${btn(ui.review.sent?'已提交 · 再提交会覆盖':'提交评价','review',ui.busy?'disabled':'','primary')}
  <p class="muted">评价会显示在桌游小助手首页，不会出现在长图里。</p>
 </section>`;
}

// ---------- events ----------
$('#app').addEventListener('click',async e=>{
 const st=e.target.closest('[data-step]');
 if(st){const input=st.parentElement.querySelector('input');const max=+input.max||999;input.value=Math.min(max,Math.max(0,(+input.value||0)+Number(st.dataset.step)));input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return;}
 const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
 try{
  if(a==='create'){ui.busy=true;render();const r=await fetch('/api/room',{method:'POST'});if(!r.ok)throw Error('房间没建成，再试一次');const d=await r.json();location.href='/?r='+d.code+(VERSIONS[want]?'&v='+want:'');return;}
  if(a==='version')setVersion(b.dataset.version);
  if(a==='n')setConfig({n:Number(b.dataset.v)});
  if(a==='mode')setConfig({epic:b.dataset.v==='epic'});
  if(a==='difficulty'||a==='rival')setConfig({[a]:b.dataset.v});
  if(a.startsWith('team-'))send({t:'player',id:a.slice(5),team:b.dataset.v});
  if(a.startsWith('role-'))send({t:'player',id:a.slice(5),commander:b.dataset.v==='true'});
  if(a==='checklist'){ui.checklist=!ui.checklist;render();}
  if(a==='begin')send({t:'begin'});
  if(a==='undo')send({t:'undo'});
  if(a==='next')send({t:'next',...(S.phase===4?{end:ui.end}:{})});
  if(a==='tab'){ui.tab=b.dataset.tab;render();scrollTo(0,0);}
  if(a==='ties'){ui.ties=!ui.ties;render();}
  if(a==='mine'){ui.mine=b.dataset.id;local.set('dune-player',ui.mine);render();}
  if(a==='star'){ui.review.stars=Number(b.dataset.n);render();}
  if(a==='calculate'){const rows=participants(S).map(p=>({...p,strength:0,worms:0,...ui.battle[p.id],special:!!$('#special')?.checked}));send({t:'conflict',rows,concessions:ui.concessions});}
  if(a==='finish')send({t:'finish'});
  if(a==='reopen'){ui.scores={};send({t:'reopen'});}
  if(a==='share'){await navigator.clipboard.writeText(location.origin+'/?r='+code);notify('邀请链接已复制，发给同桌就能加入');}
  if(a==='image'){
   const canvas=await html2canvas($('#shot'),{scale:2,backgroundColor:'#faf5e8',useCORS:true});
   $('#image-dialog').innerHTML=`<div class="overlay"><div><button type="button" id="close-image">关闭</button><p>长按图片保存，或点下面下载</p><img alt="本局结算长图" src="${canvas.toDataURL('image/png')}"><a class="button primary" download="dune_${code}.png" href="${canvas.toDataURL('image/png')}">下载长图</a></div></div>`;
   $('#close-image').onclick=()=>$('#image-dialog').innerHTML='';
  }
  if(a==='review'){
   const p=S.players.find(p=>p.id===$('#review-name').value);ui.busy=true;render();
   const r=await fetch('https://boardgame.leisurecat.cloud/api/reviews',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({game:gameKey(S.config),room:code,name:p.name,stars:Number(ui.review.stars),text:ui.review.text})});
   if(!r.ok)throw Error('评价没提交上，再试一次');ui.review.sent=true;notify('评价已提交，谢谢');
  }
 }catch(err){notify(err.message);}finally{if(ui.busy){ui.busy=false;render();}}
});
$('#app').addEventListener('change',e=>{
 const x=e.target;
 if(x.dataset.config)setConfig({[x.dataset.config]:x.checked});
 if(x.dataset.player)send({t:'player',id:x.dataset.player,[x.dataset.field]:x.value});
 if(x.dataset.check)send({t:'check',id:x.dataset.check,value:x.checked});
 if(x.dataset.battle){const id=x.dataset.battle;ui.battle[id]={strength:0,worms:0,...ui.battle[id],[x.dataset.field]:Number(x.value)};}
 if(x.dataset.concession)ui.concessions[x.dataset.concession]=x.value;
 if(x.id==='end-condition'){ui.end=x.checked;render();}
 if(x.id==='special')ui.special=x.checked;
 if(x.id==='review-name')ui.mine=x.value;
});
$('#app').addEventListener('input',e=>{
 if(e.target.id==='review-text')ui.review.text=e.target.value;
 if(e.target.closest('#score-form')){const p=S.players.find(p=>p.id===ui.mine);const q=ui.scores[p.id]=readScore(p,false);const t=$('#score-total');if(t)t.textContent=(q.track||0)+(q.extra||0);}
});
function readScore(p,confirmed){const f=$('#score-form'),q={...p.score,...ui.scores[p.id]};for(const k of ['track','extra','spice','solari','water','garrison','reveal'])if(f.elements[k])q[k]=Number(f.elements[k].value);q.note=f.elements.note.value;q.checked=f.elements.checked.checked;q.confirmed=confirmed;if(f.elements.chaumurky)q.chaumurky=f.elements.chaumurky.checked;return q;}
$('#app').addEventListener('submit',e=>{e.preventDefault();
 if(e.target.id==='join'){const v=$('#joinCode').value.trim().toUpperCase();if(!/^[A-Z0-9]{4}$/.test(v))return notify('房间码是四位字母或数字');location.href='/?r='+v;}
 if(e.target.id==='score-form'){const p=S.players.find(p=>p.id===ui.mine),q=readScore(p,e.submitter?.value==='confirm');delete ui.scores[p.id];send({t:'score',id:p.id,score:q});}
});
async function loadRooms(){try{const r=await fetch('/api/rooms');if(!r.ok)throw Error('房间列表读不出来');ui.rooms=await r.json();render();}catch(e){notify(e.message);}}
render();if(code)connect();else loadRooms();
