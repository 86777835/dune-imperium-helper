import assert from 'node:assert/strict';
import {initialState,configError,reduce,conflict,standings,participants,scoringPlayers,maxRounds,target,gameKey} from '../public/logic.js';
import {setupList,phaseList} from '../public/steps.js';
let count=0;const test=(name,fn)=>{fn();count++;console.log('PASS',name);};
const base=initialState().config;
// Sources are official PDF physical pages; supplements six-player p5 = PDF p11.
for(const version of ['base','uprising'])for(const n of version==='base'?[1,2,3,4]:[1,2,3,4,6])for(let mask=0;mask<8;mask++)for(const epic of [false,true])for(const tech of [false,true]){
 const c={...base,version,n,ix:!!(mask&1),immortality:!!(mask&2),bloodlines:!!(mask&4),epic,tech,choam:n===6};if(configError(c))continue;
 test(`${version}/${n}/${mask}/epic=${epic}/tech=${tech} 设置：主规则 p4–6，起义 p18，扩展设置`,()=>{
  const list=setupList(c);assert(list.every(x=>x.page&&x.tag&&x.url));assert.equal(new Set(list.map(x=>x.id)).size,list.length);
  const has=k=>list.some(x=>x.id===k);
  assert.equal(has('ix-board'),c.ix);assert.equal(has('imm-board'),c.immortality);assert.equal(has('blood-setup'),c.bloodlines);assert.equal(has('tech'),c.tech);assert.equal(has('epic-deck'),epic);assert.equal(has('blood-exclude'),version==='base'&&c.bloodlines);
  assert.equal(has('rivals'),n<=2);assert.equal(has('choam'),n===6);assert.equal(maxRounds(c),n===6&&!epic?9:10);assert.equal(target(c),epic?12:10);
 });
}
test('史诗 + 不朽放弃牌堆，不替换实验（不朽 p12）',()=>{const text=setupList({...base,ix:true,immortality:true,epic:true}).map(x=>x.text).join('');assert.match(text,/初始弃牌堆/);assert.doesNotMatch(text,/替换一张实验/);});
test('禁止基础六人、无伊克斯史诗、单人史诗、六人无合约、无血脉技术',()=>{for(const c of [{...base,n:6},{...base,epic:true},{...base,n:1,ix:true,epic:true},{...base,version:'uprising',n:6},{...base,tech:true}])assert(configError(c));});
const rows=(ss,w=[])=>ss.map((strength,i)=>({id:'p'+i,strength,worms:w[i]||0,team:i%2?'B':'A',commander:false}));
const cases=[
 ['4人独立名次',[8,6,4,2],4,[1,2,3,0]],['3人第三无奖',[8,6,4],3,[1,2,0]],['3人第一平局',[8,8,4],3,[2,2,0]],['4人第一两人平局',[8,8,4,2],4,[2,2,3,0]],['4人第一三人平局',[8,8,8,2],4,[2,2,2,0]],['全员第一平局',[8,8,8,8],4,[2,2,2,2]],['3人第二平局',[8,4,4],3,[1,3,3]],['4人第二三人平局',[8,4,4,4],4,[1,3,3,3]],['第三平局',[8,6,4,4],4,[1,2,0,0]],['双第一双第三',[8,8,4,4],4,[2,2,0,0]],['全零',[0,0,0,0],4,[0,0,0,0]],['零无奖',[3,0,0],3,[1,0,0]],['单人含两个劲敌',[8,8,4],1,[2,2,0]],['双人含一个劲敌',[8,4,4],2,[1,3,3]]
];
for(const version of ['base','uprising'])for(const [name,ss,n,expected]of cases)test(`${version} ${name}（基础 p12 / 起义 p14 / FAQ p1）`,()=>assert.deepEqual(conflict({...base,version,n},rows(ss)).results.map(r=>r.tier),expected));
test('沙虫一只和多只都只翻倍一次，零战力无奖（起义 p14）',()=>{const r=conflict({...base,version:'uprising',n:4},rows([8,5,2,0],[1,2,0,1]));assert.deepEqual(r.results.map(r=>r.multiplier),[2,2,1,2]);assert.equal(r.results[3].tier,0);assert.equal(r.results.filter(r=>r.winner).length,1);});
const six={...base,version:'uprising',n:6,choam:true};
test('六人两名同队平第一可让出，各获1/2（六人 p5 / PDF p11）',()=>{const r=rows([8,8,4,2]);r[1].team='A';r[2].team=r[3].team='B';assert.deepEqual(conflict(six,r,{A:'p1'}).results.map(r=>r.tier),[2,1,3,0]);assert.deepEqual(conflict(six,r).results.map(r=>r.tier),[2,2,3,0]);});
test('六人同队平第三让出者无奖（六人 p5）',()=>{const r=rows([8,6,4,4]);r[2].team=r[3].team='A';assert.deepEqual(conflict(six,r,{A:'p2'}).results.map(r=>r.tier),[1,2,3,0]);});
test('六人跨队平局遵循普通平局（起义 p14）',()=>assert.deepEqual(conflict(six,rows([8,8,4,2])).results.map(r=>r.tier),[2,2,3,0]));
test('六人跨队多人并同队让出转人工（起义 p14 + 六人 p5）',()=>assert.equal(conflict(six,rows([8,8,8,2]),{A:'p0'}).manual,true));
test('领队不能直接填战力；血脉特殊效果须人工（六人 p3–5；血脉 p10）',()=>{const r=rows([8,6,4,2]);assert(conflict(six,[...r,{id:'c',strength:2,worms:0,commander:true}]).manual);r[0].special=true;assert(conflict({...six,bloodlines:true},r).manual);});
test('六人团队得分/资源相加和毒香茶优先（六人 p5、7 / PDF p11、13）',()=>{const s=initialState();s.config=six;s.players.forEach((p,i)=>{p.score.track=[4,8,7,5,9,7][i];p.score.spice=i;});const r=standings(s);assert.equal(r[0].total,20);assert.equal(r[0].id,'B');s.players[0].score.chaumurky=true;assert.equal(standings(s)[0].id,'A');});
test('单双人劲敌记录过滤（基础 PDF p19–20，起义补充 PDF p3、6）',()=>{let s=initialState();s.host='host';s=reduce(s,{t:'config',config:{...base,n:2}},'host');assert.equal(participants(s).length,3);assert.equal(scoringPlayers(s).length,2);s=reduce(s,{t:'config',config:{...base,n:1}},'host');assert.equal(scoringPlayers(s).length,3);s=reduce(s,{t:'config',config:{...base,version:'uprising',n:2}},'host');assert.equal(scoringPlayers(s).length,3);});
test('服务端主持人权限、起始分、阶段、终局防重与撤销',()=>{
 let s=initialState();s=reduce(s,{t:'claim'},'host');assert.throws(()=>reduce(s,{t:'begin'},'guest'));
 s=reduce(s,{t:'config',config:six},'host');s=reduce(s,{t:'begin'},'host');assert.deepEqual(s.players.map(p=>p.score.track),[4,1,1,4,1,1]);
 for(let i=0;i<4;i++)s=reduce(s,{t:'next'},'host');assert.throws(()=>reduce(s,{t:'next'},'host'));s=reduce(s,{t:'next',end:true},'host');assert.equal(s.stage,'score');
 assert.throws(()=>reduce(s,{t:'finish'},'host'));
 const q={...s.players[0].score,track:15,extra:2,note:'终局密谋牌',confirmed:true,checked:false};assert.throws(()=>reduce(s,{t:'score',id:'p0',score:q},'guest'));q.checked=true;s=reduce(s,{t:'score',id:'p0',score:q},'guest');assert.equal(s.players[0].score.track,15);s=reduce(s,{t:'undo'},'host');assert.equal(s.players[0].score.track,4);
});
test('评价 game key 随版本',()=>{assert.equal(gameKey(base),'dune-imperium');assert.equal(gameKey(six),'dune-uprising');});
test('五阶段均有出处与版本，六人有特殊提示',()=>{for(let p=0;p<5;p++)assert(phaseList(six,p).every(x=>x.tag&&x.page));});
test('六人座位必须交替、领队相对（补充册 PDF p8）',()=>{const s=initialState();s.host='host';s.config=six;s.players[3].commander=false;s.players[1].commander=true;assert.throws(()=>reduce(s,{t:'begin'},'host'),/相对/);});
test('六人9轮/史诗10轮牌库耗尽自动进入核对（补充册 PDF p8、13）',()=>{for(const epic of [false,true]){const s=initialState();s.host='host';s.stage='play';s.config={...six,ix:epic,epic};s.round=epic?10:9;s.phase=4;assert.equal(reduce(s,{t:'next',end:false},'host').stage,'score');}});
console.log(`ALL PASS: ${count} tests`);
