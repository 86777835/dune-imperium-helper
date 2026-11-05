/* THESIS: a shared tabletop field guide. OWN-WORLD: night-blue masthead, sand reading surface, spice controls.
 STORY: choose an edition, prepare the physical table, follow five phases, verify results.
 FIRST VIEWPORT: two official covers and one create action. FORM: series conventions and user-pinned palette. */
import {VERSIONS,EXPANSIONS,PHASES,target,maxRounds,participants,scoringPlayers,total,standings,gameKey} from './logic.js';
import {setupList,phaseList,TIE_ROWS} from './steps.js';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local={get(k){try{return localStorage.getItem(k);}catch{return null;}},set(k,v){try{localStorage.setItem(k,v);}catch{}}};
let actor=local.get('dune-actor')||crypto.randomUUID();local.set('dune-actor',actor);
let code=new URLSearchParams(location.search).get('r'),S=null,ws=null,online=false;
let want=new URLSearchParams(location.search).get('v');// hub box link: ?v=base|uprising preselects the edition
const ui={tab:'flow',rooms:[],error:'',mine:local.get('dune-player')||'p0',scores:{},battle:{},concessions:{},ties:false,special:false,busy:false,review:{stars:5,text:'',sent:false},end:false};
const host=()=>!!S?.isHost;
const disabled=()=>!host()||!online?'disabled':'';
const opts=(values,value)=>values.map(([k,v])=>`<option value="${esc(k)}" ${String(k)===String(value)?'selected':''}>${esc(v)}</option>`).join('');
const btn=(label,act,extra='',cls='')=>`<button class="${cls}" data-act="${act}" ${extra}>${label}</button>`;
const meta=c=>[VERSIONS[c.version],c.n+' 人',c.epic?'史诗':'标准',...Object.entries(EXPANSIONS).filter(([k])=>c[k]).map(([,v])=>v)].join(' · ');
const links=()=>`<nav class="links"><a href="/guide.html${code?'?r='+code:''}">新手教程</a><a href="/guide.html${code?'?r='+code:''}#faq">规则速查</a><a href="/history.html">往期对局</a></nav>`;
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
function setVersion(v){const c={...S.config,version:v};if(c.version==='base'){c.choam=false;if(c.n===6)c.n=4;}send({t:'config',config:c});}
function render(){const t=document.createElement('div');t.innerHTML=view();morph($('#app'),t);}
function notify(text){$('#notice').textContent=text;clearTimeout(notify.timer);notify.timer=setTimeout(()=>$('#notice').textContent='',5000);}
function send(action){if(!online)return notify('连接中断，操作未发送。恢复连接后请重试。');ws.send(JSON.stringify({action,revision:S.revision}));}
function connect(){
 if(!/^[A-Z0-9]{4}$/.test(code||'')){ui.error='房间码应为四位字母或数字';render();return;}
 ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/room/${code}/ws?actor=${actor}`);
 ws.onopen=()=>{online=true;render();};
 ws.onmessage=e=>{if(e.data==='pong')return;const m=JSON.parse(e.data);if(m.type==='state'){const old=S;S=m.state;if(old?.round!==S.round){ui.end=false;ui.battle={};ui.concessions={};ui.special=false;}if(old?.stage!==S.stage){ui.tab=S.stage==='over'?'result':S.stage==='score'?'score':'flow';}if(!S.hasHost)send({t:'claim'});if(want&&host()&&S.stage==='setup'){const v=want;want=null;history.replaceState(null,'','/?r='+code);if(VERSIONS[v]&&S.config.version!==v)setVersion(v);}render();}else{ui.error=m.error;notify(m.error);render();}};
 ws.onclose=()=>{online=false;render();setTimeout(()=>{if(code)connect();},2500);};ws.onerror=()=>notify('无法连接房间，请检查网络');
}
setInterval(()=>{if(ws?.readyState===1)ws.send('ping');},25000);
function view(){
 if(!code)return landing();
 return `<header><a class="back-nav" href="/">‹ 首页</a><div class="room-line"><span>沙丘 · 桌边助手</span><b>${esc(code)}</b><span class="conn">${online?'已同步':'连接中…'}</span></div></header><main>${!S?`<p>${esc(ui.error||'正在连接房间…')}</p>`:`<p class="caption">${esc(meta(S.config))}</p><div class="toolbar">${btn('分享房间','share')}${S.prev?btn('撤销上一步','undo',disabled()):''}${host()?'<span>你是流程主持人</span>':'<span>由主持人推进流程</span>'}</div>${S.stage==='setup'?setup():play()}`}${links()}</main>`;
}
function landing(){return `<header class="landing-head"><a class="back-nav" href="https://boardgame.leisurecat.cloud">‹ 全部游戏</a><p class="eyebrow">DUNE · TABLE COMPANION</p><h1>沙丘：帝国助手</h1><p>从落座准备，到最后一分。</p><div class="covers"><figure><img src="/img/base.jpg" alt="沙丘帝国官方平面封面"><figcaption>基础版</figcaption></figure><figure><img src="/img/uprising.jpg" alt="沙丘帝国起义官方平面封面"><figcaption>起义</figcaption></figure></div></header><main class="landing-main">${btn('创建一桌新对局','create',ui.busy?'disabled':'','primary wide')}<form id="join" class="join"><label class="sr-only" for="joinCode">房间码</label><input id="joinCode" maxlength="4" placeholder="四位房间码" autocapitalize="characters" required><button>加入房间</button></form>${links()}<p class="note">一人推进流程，每人在自己的手机核对分数。<br>需要实体游戏；本站不代管手牌或资源。</p><section><h2>桌上的对局</h2>${ui.rooms.length?ui.rooms.map(r=>`<a class="room-row" href="/?r=${r.code}"><b>${r.code}</b><span>${esc(meta(r.config))}<small>${esc(r.players.join('、'))} · ${r.stage==='over'?'已结算':'第 '+r.round+' 轮'}</small></span><span>›</span></a>`).join(''):'<p class="muted">还没有对局，邀朋友开一桌。</p>'}</section><footer>非官方线下辅助 · 游戏版权归 Dire Wolf / Legendary<br>规则依据官方 EN / SCN 与 2025-01-13 FAQ</footer></main>`;}
function toggle(k,label,locked=false){return `<label class="check"><input type="checkbox" data-config="${k}" ${S.config[k]?'checked':''} ${disabled()} ${locked?'disabled':''}><span>${label}</span></label>`;}
function setup(){const c=S.config;return `<section><p class="eyebrow">01 / 选择版本</p><h2>今天，哪一个帝国？</h2><div class="version-grid">${Object.entries(VERSIONS).map(([k,v])=>btn(`<img src="/img/${k}.jpg" alt=""><span>${v}</span>`,'version',`data-version="${k}" ${disabled()} aria-pressed="${c.version===k}"`,'version '+(c.version===k?'on':''))).join('')}</div></section><section><p class="eyebrow">02 / 人数与模式</p><div class="form-grid"><label>真人玩家<select data-config="n" ${disabled()}>${opts((c.version==='base'?[1,2,3,4]:[1,2,3,4,6]).map(n=>[n,n===6?'6 人 · 两队各三人':n+' 人']),c.n)}</select></label><label>对局模式<select data-config="mode" ${disabled()}>${opts([['standard','标准 · 10 分'],...(c.n>1?[['epic','史诗 · 12 分（需伊克斯）']]:[])],c.epic?'epic':'standard')}</select></label></div>${c.n<=2?`<aside>劲敌由实物牌或 <a href="https://www.direwolfdigital.com/game-room/" target="_blank" rel="noopener">官方 Game Room</a> 驱动，本站只记录结果。<a href="/guide.html#rivals">查看单/双人设置</a></aside>${c.n===1?`<label>难度<select data-config="difficulty" ${disabled()}>${opts([['novice','佣兵'],['veteran','萨多卡'],['expert','门泰特'],['expertplus','魁萨茨·哈德拉克']],c.difficulty)}</select></label>`:''}${c.n===2&&c.version==='uprising'?`<label>劲敌<select data-config="rival" ${disabled()}>${opts([['regular','常规（计分）'],['streamlined','精简（不计分）']],c.rival)}</select></label>`:''}`:''}</section><section><p class="eyebrow">03 / 扩展与模组</p>${Object.entries(EXPANSIONS).map(([k,v])=>toggle(k,v,k==='ix'&&c.epic)).join('')}${c.version==='uprising'?toggle('choam','宇联商会 CHOAM 合约'+(c.n===6?' · 六人必选':''),c.n===6):''}${c.bloodlines?toggle('tech','血脉永续 · 技术模组'):''}<p class="note">两个主版本都兼容这三个扩展；准备差异见下方清单。自由混牌暂不开放。</p></section><section><h2>落座与领袖</h2><p class="note">按顺时针填写。领袖按实物手选填写；起义先手由目标卡决定。</p>${participants(S).map((p,i)=>`<div class="player-setup" data-k="${p.id}"><span class="seat">${i+1}</span><div><label>${p.rival?'劲敌名称':'玩家名'}<input data-player="${p.id}" data-field="name" value="${esc(p.name)}" maxlength="24" ${disabled()}></label><label>实物领袖<input data-player="${p.id}" data-field="leader" value="${esc(p.leader)}" placeholder="填写领袖正式名称" ${disabled()}></label>${c.n===6?`<div class="form-grid"><label>队伍<select data-player="${p.id}" data-field="team" ${disabled()}>${opts([['A','穆阿迪布队'],['B','沙达姆队']],p.team)}</select></label><label>身份<select data-player="${p.id}" data-field="commander" ${disabled()}>${opts([['true','指挥官'],['false','盟友']],String(p.commander))}</select></label></div>`:''}</div></div>`).join('')}${c.n===6?'<aside>每队三人、一名指挥官。交替座位，两位指挥官相对。指挥官使用对应的穆阿迪布／沙达姆专属领袖。〔起义补充册 PDF p8〕</aside>':''}</section><section id="checklist"><h2>把桌面准备好</h2><p class="note">按本局组合生成 · 点击勾选，全桌同步</p>${list(setupList(c),true)}${btn('准备好了，开始第一轮','begin',disabled(),'primary wide')}</section>`;}
function list(items,check=false){return `<ul class="steps">${items.map(x=>`<li>${check?`<input type="checkbox" aria-label="${esc(x.id)}" data-check="${x.id}" ${S.checks[x.id]?'checked':''} ${disabled()}>`:'<span class="dot">·</span>'}<div>${esc(x.text)}<a class="source" href="${x.url}" target="_blank" rel="noopener">${x.tag} · p${x.page} ↗</a></div></li>`).join('')}</ul>`;}
function play(){return `<nav class="tabs">${[['flow','流程'],['battle','冲突'],['score','终局核对'],['result','结算']].map(([k,v])=>btn(v,'tab',`data-tab="${k}" aria-pressed="${ui.tab===k}"`,ui.tab===k?'on':'')).join('')}</nav><div data-k="tab-${ui.tab}">${ui.tab==='flow'?flow():ui.tab==='battle'?battle():ui.tab==='score'?score():result()}</div>`;}
function flow(){return `<section><div class="status"><span>第 <strong>${S.round}</strong> / ${maxRounds(S.config)} 轮</span><b>${S.stage==='play'?PHASES[S.phase]:S.stage==='over'?'已结算':'等待终局核对'}</b></div><div class="phase-track">${PHASES.map((p,i)=>`<span class="${i===S.phase?'on':''}">${i+1}<small>${p}</small></span>`).join('')}</div><h2>${PHASES[S.phase]}，别漏这几件事</h2>${list(phaseList(S.config,S.phase))}${S.stage==='play'?(S.phase===4?`<aside>请看实物分轨：有人达到 ${target(S.config)} 分，或牌库用完才结束。不是先达到的人自动获胜。</aside><label class="check"><input type="checkbox" id="end-condition" ${ui.end?'checked':''}>已在实物上确认达到结束条件</label>${btn('核对完成，继续','next',disabled(),'primary wide')}`:btn(S.phase===2?'战斗已在线下结算，继续':'完成本阶段 →','next',disabled(),'primary wide')):btn('去终局核对','tab','data-tab="score"','primary wide')}</section>`;}
function battle(){const ps=participants(S).filter(p=>S.config.n!==6||!p.commander);return `<section><p class="eyebrow">可选 / 随时跳过</p><h2>冲突奖励计算器</h2><p>只填实物上已算好的最终战力。先完成战斗密谋牌，再计算。</p>${ps.map(p=>{const d=ui.battle[p.id]||{strength:0,worms:0};return `<div class="battle-row"><b>${esc(p.name)}${p.rival?' · 劲敌':''}</b><label>最终战力<input type="number" min="0" max="999" data-battle="${p.id}" data-field="strength" value="${d.strength}"></label>${S.config.version==='uprising'?`<label>沙虫数<input type="number" min="0" max="4" data-battle="${p.id}" data-field="worms" value="${d.worms}"></label>`:''}</div>`;}).join('')}${S.config.n===6?`<aside>仅四名盟友比较；指挥官效果先计入盟友。两位同队盟友平局可让出较高奖励。〔六人 p5 / PDF p11〕</aside>${['A','B'].map(t=>`<label>${t} 队同队平局：获得较高档位者<select data-concession="${t}">${opts([['','不让出，按平局'],...ps.filter(p=>p.team===t).map(p=>[p.id,p.name])],ui.concessions[t]||'')}</select></label>`).join('')}${S.config.bloodlines?`<label class="check"><input type="checkbox" id="special" ${ui.special?'checked':''}>有尚未核清的萨多卡指挥官特殊效果</label>`:''}`:''}<div class="actions">${btn('计算奖励档位','calculate','','primary')}${btn('跳过，返回流程','tab','data-tab="flow"')}</div>${S.conflict?`<div class="battle-result" role="status">${S.conflict.manual?`<aside>${esc(S.conflict.reason)}</aside>`:S.conflict.results.map(r=>`<div class="reward"><b>${esc(S.players.find(p=>p.id===r.id)?.name)}</b><span>${r.commander?'指挥官 · 不参排名':r.tier?'第 '+r.tier+' 档奖励'+(r.multiplier===2?' ×2':''):'无奖励'}${r.winner?' · 冲突胜者':''}</span></div>`).join('')}<small>${S.conflict.source}</small></div>`:''}${S.config.version==='uprising'?'<p class="note">沙虫奖励翻倍最多一次；控制权、作战图标不翻倍。付费奖励需再支付一次成本。〔起义 p14〕</p>':''}${btn(ui.ties?'收起平局速查':'展开平局速查','ties')} ${ui.ties?`<table><caption>基础版 p12 / 起义 p14 / 六人 p5（PDF p11）</caption>${TIE_ROWS.map(([a,b])=>`<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table>`:''}</section>`;}
function score(){if(!['score','over'].includes(S.stage))return '<section><h2>终局还没到</h2><p>召回阶段核对结束条件后，每人在自己的手机上填写分数。</p></section>';
 const ps=scoringPlayers(S);if(!ps.some(p=>p.id===ui.mine))ui.mine=ps[0].id;const p=ps.find(p=>p.id===ui.mine),q=ui.scores[p.id]||p.score;
 const tied=standings(S).some((p,i,a)=>a.some((o,j)=>j!==i&&o.total===p.total));
 return `<section><h2>我的终局核对</h2><label>我正在填写（也可代填）<select id="mine">${opts(ps.map(p=>[p.id,p.name+(p.rival?' · 劲敌':'')]),ui.mine)}</select></label><form id="score-form" data-k="score-${p.id}"><div class="form-grid"><label>终局效果前的分轨分数<input name="track" type="number" min="0" max="999" required value="${q.track}"></label><label>本次尚未计入的终局加分<input name="extra" type="number" min="0" max="999" required value="${q.extra}"></label></div><label>额外加分来自哪里<textarea name="note" maxlength="500" placeholder="如：终局密谋牌 +2；没有则留空">${esc(q.note)}</textarea></label><aside>已加到分轨的购牌分、派系分、作战图标配对分不要再填。检查终局密谋牌、技术与百搭图标；配对顺序由玩家决定。分数可超过 12。〔起义 p15、20；FAQ p4〕</aside><label class="check"><input type="checkbox" name="checked" ${q.checked?'checked':''}>我已核对：上述加分尚未计入分轨</label>${tied?`<div class="tie-fields"><h3>有同分，请补核资源</h3><p class="note">六人按团队总量。先查Chaumurky，再按香料、宇宙索、水、驻军；最终比较最近揭示。〔起义 p15；FAQ p1–2；六人 PDF p11、13〕</p><div class="form-grid">${[['spice','香料'],['solari','宇宙索'],['water','水'],['garrison','驻军'],['reveal','最后一轮揭示次序（越大越晚）']].map(([k,v])=>`<label>${v}<input name="${k}" type="number" min="0" max="999" value="${q[k]}"></label>`).join('')}</div>${S.config.ix?`<label class="check"><input name="chaumurky" type="checkbox" ${q.chaumurky?'checked':''}>拥有Chaumurky（按实物核对）</label>`:''}</div>`:''}<div class="actions"><button name="save" value="draft">保存，稍后确认</button><button class="primary" name="save" value="confirm">核对无误，确认分数</button></div></form></section><section><h2>全桌核对进度</h2>${ps.map(p=>`<div class="reward"><span>${esc(p.name)} <small>${p.score.confirmed?'已确认':'待核对'}</small></span><b>${total(p)} 分</b></div>`).join('')}${btn('所有人已确认，结算','finish',disabled(),'primary wide')}</section>`;
}
function result(){if(S.stage!=='over')return '<section><h2>等待大家完成核对</h2><p>所有计分玩家确认后，由主持人结算。</p></section>';const rs=standings(S);return `<section id="shot"><p class="eyebrow">DUNE · 本局记录</p><h2>帝国落幕，战绩留存</h2><p>${esc(meta(S.config))}</p><p class="note">房间 ${code} · 第 ${S.round} 轮结束</p>${rs.map(p=>`<div class="rank"><span>${p.place}</span><div><b>${esc(p.name)}</b><small>${S.config.n===6?'三人总分':esc(p.leader||'未记录领袖')}</small></div><strong>${p.total}<small>分</small></strong></div>`).join('')}${rs.some((p,i)=>i&&p.place===rs[i-1].place)?'<aside>仍有并列：请补核资源及最终揭示次序；未裁定前保持并列。〔FAQ p2〕</aside>':''}${S.config.n===6?scoringPlayers(S).map(p=>`<p>${esc(p.name)} · ${p.team} 队 · ${p.commander?'指挥官':'盟友'} · ${esc(p.leader)}：${total(p)} 分</p>`).join(''):''}<footer>沙丘：帝国助手 · 线下对局记录</footer></section><div class="actions">${btn('保存结算长图','image','','primary')}${btn('修订本局','reopen',disabled())}<a class="button" href="/history.html">查看存档</a></div><section class="review"><h2>给这款游戏打个分</h2><label>评价玩家<select id="review-name">${opts(scoringPlayers(S).map(p=>[p.id,p.name]),ui.mine)}</select></label><label>评分<select id="stars">${opts([5,4,3,2,1].map(n=>[n,'★'.repeat(n)]),ui.review.stars)}</select></label><label>一句评价<textarea id="review-text" maxlength="500">${esc(ui.review.text)}</textarea></label>${btn(ui.review.sent?'已提交 · 再次提交会覆盖':'提交评价','review',ui.busy?'disabled':'','primary')}<p class="note">提交到桌游小助手总入口。不会进入长图。</p></section>`;}
$('#app').addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
 try{
 if(a==='create'){ui.busy=true;render();const r=await fetch('/api/room',{method:'POST'});if(!r.ok)throw Error('创建房间失败');const d=await r.json();location.href='/?r='+d.code+(VERSIONS[want]?'&v='+want:'');}
 if(a==='version')setVersion(b.dataset.version);
 if(a==='begin')send({t:'begin'});
 if(a==='undo')send({t:'undo'});
 if(a==='next')send({t:'next',...(S.phase===4?{end:ui.end}:{})});
 if(a==='tab'){ui.tab=b.dataset.tab;render();}
 if(a==='ties'){ui.ties=!ui.ties;render();}
 if(a==='calculate'){const rows=participants(S).map(p=>({...p,strength:0,worms:0,...ui.battle[p.id],special:!!$('#special')?.checked}));send({t:'conflict',rows,concessions:ui.concessions});}
 if(a==='finish')send({t:'finish'});
 if(a==='reopen'){ui.scores={};send({t:'reopen'});}
 if(a==='share'){await navigator.clipboard.writeText(location.href);notify('房间链接已复制，可发给同桌朋友');}
 if(a==='image'){
   const canvas=await html2canvas($('#shot'),{scale:2,backgroundColor:'#faf5e8',useCORS:true});
   $('#image-dialog').innerHTML=`<div class="overlay"><div><button id="close-image">关闭</button><p>长按图片保存，或下载到设备</p><img alt="本局结算长图" src="${canvas.toDataURL('image/png')}"><a class="button" download="dune_${code}.png" href="${canvas.toDataURL('image/png')}">下载长图</a></div></div>`;$('#close-image').onclick=()=>$('#image-dialog').innerHTML='';
 }
 if(a==='review'){
   const p=S.players.find(p=>p.id===$('#review-name').value);ui.busy=true;render();
   const r=await fetch('https://boardgame.leisurecat.cloud/api/reviews',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({game:gameKey(S.config),room:code,name:p.name,stars:Number(ui.review.stars),text:ui.review.text})});
   if(!r.ok)throw Error('评价提交失败，请重试');ui.review.sent=true;notify('评价已提交');
 }
 }catch(err){notify(err.message);}finally{ui.busy=false;render();}
});
$('#app').addEventListener('change',e=>{
 const x=e.target;
 if(x.dataset.config){const k=x.dataset.config,c={...S.config};if(k==='mode'){c.epic=x.value==='epic';if(c.epic)c.ix=true;}else c[k]=x.type==='checkbox'?x.checked:k==='n'?Number(x.value):x.value;
  if(c.n===6)c.choam=true;if(c.n===1)c.epic=false;if(!c.bloodlines)c.tech=false;
  send({t:'config',config:c});
 }
 if(x.dataset.player)send({t:'player',id:x.dataset.player,[x.dataset.field]:x.dataset.field==='commander'?x.value==='true':x.value});
 if(x.dataset.check)send({t:'check',id:x.dataset.check,value:x.checked});
 if(x.dataset.battle){const id=x.dataset.battle;ui.battle[id]={strength:0,worms:0,...ui.battle[id],[x.dataset.field]:Number(x.value)};}
 if(x.dataset.concession)ui.concessions[x.dataset.concession]=x.value;
 if(x.id==='mine'){ui.mine=x.value;local.set('dune-player',x.value);render();}
 if(x.id==='end-condition')ui.end=x.checked;
 if(x.id==='special')ui.special=x.checked;
 if(x.id==='stars')ui.review.stars=Number(x.value);
 if(x.id==='review-name')ui.mine=x.value;
});
$('#app').addEventListener('input',e=>{
 if(e.target.id==='review-text')ui.review.text=e.target.value;
 if(e.target.closest('#score-form')){const p=S.players.find(p=>p.id===ui.mine);ui.scores[p.id]=readScore(p,false);}
});
function readScore(p,confirmed){const f=$('#score-form'),q={...p.score,...ui.scores[p.id]};for(const k of ['track','extra','spice','solari','water','garrison','reveal'])if(f.elements[k])q[k]=Number(f.elements[k].value);q.note=f.elements.note.value;q.checked=f.elements.checked.checked;q.confirmed=confirmed;if(f.elements.chaumurky)q.chaumurky=f.elements.chaumurky.checked;return q;}
$('#app').addEventListener('submit',e=>{e.preventDefault();if(e.target.id==='join'){const v=$('#joinCode').value.toUpperCase();if(!/^[A-Z0-9]{4}$/.test(v))return notify('请输入四位房间码');location.href='/?r='+v;}
 if(e.target.id==='score-form'){const p=S.players.find(p=>p.id===ui.mine),q=readScore(p,e.submitter?.value==='confirm');delete ui.scores[p.id];send({t:'score',id:p.id,score:q});}
});
async function loadRooms(){try{const r=await fetch('/api/rooms');if(!r.ok)throw Error('无法读取房间列表');ui.rooms=await r.json();render();}catch(e){notify(e.message);}}
render();if(code)connect();else loadRooms();
