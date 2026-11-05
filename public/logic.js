// Shared by the browser and authoritative Room reducer. Sources: steps.js and tests/test_logic.mjs.
export const VERSIONS = {base:'沙丘：帝国（基础版）',uprising:'沙丘：帝国 – 起义'};
export const EXPANSIONS = {ix:'伊克斯崛起',immortality:'不朽之躯',bloodlines:'血脉永续'};
export const PHASES = ['轮初','玩家回合','战斗','造物主','召回'];
export const target = c => c.epic ? 12 : 10;
export const maxRounds = c => c.n === 6 && !c.epic ? 9 : 10;
export const gameKey = c => c.version === 'base' ? 'dune-imperium' : 'dune-uprising';
export const participants = s => s.players.slice(0, s.config.n < 3 ? 3 : s.config.n);
export const scoringPlayers = s => participants(s).filter(p => !(p.rival && s.config.n === 2 && (s.config.version === 'base' || s.config.rival === 'streamlined')));
export const total = p => p.score.track + p.score.extra;
const int = (x,min=0,max=999) => Number.isInteger(x) && x >= min && x <= max;
export function configError(c) {
  if (!c || !Object.hasOwn(VERSIONS,c.version) || ![1,2,3,4,6].includes(c.n)) return '请选择有效的版本和人数';
  if (c.n === 6 && c.version !== 'uprising') return '六人组队仅适用于起义';
  if (['ix','immortality','bloodlines','choam','tech','epic'].some(k=>typeof c[k] !== 'boolean')) return '配置开关格式不正确';
  if (c.epic && (!c.ix || c.n === 1)) return '史诗为伊克斯崛起的多人模式，请启用扩展并选择至少两人';
  if (c.choam && c.version !== 'uprising') return 'CHOAM 合约仅用于起义';
  if (c.n === 6 && !c.choam) return '六人必须启用 CHOAM 合约（补充册 PDF p8）';
  if (c.tech && !c.bloodlines) return '技术模组需要血脉永续';
  if (!['regular','streamlined'].includes(c.rival)) return '请选择劲敌类型';
  if (!['novice','veteran','expert','expertplus'].includes(c.difficulty)) return '请选择单人难度';
  return '';
}
export function initialState() {
  return {revision:0,stage:'setup',round:1,phase:0,host:null,config:{version:'base',n:3,ix:false,immortality:false,bloodlines:false,choam:false,tech:false,epic:false,rival:'regular',difficulty:'veteran'},checks:{},players:Array.from({length:6},(_,i)=>({id:'p'+i,name:'玩家'+(i+1),leader:'',team:i%2?'B':'A',commander:i===0||i===3,rival:false,score:{track:0,extra:0,note:'',checked:false,confirmed:false,spice:0,solari:0,water:0,garrison:0,chaumurky:false,reveal:0}})),conflict:null,prev:null,gid:null};
}
// Uprising p14; base p12. Reward tiers are not numeric reward amounts.
export function conflict(c, rows, concessions={}) {
  const source = c.n === 6 ? '起义补充册 六人 p5（PDF p11）；血脉永续 p10' : c.version === 'base' ? '基础版 p12；FAQ 2025-01-13 p1' : '起义 p14';
  if (!Array.isArray(rows) || rows.some(p=>!int(p.strength,0,999)||!int(p.worms,0,4))) throw Error('请填写每人的最终战力与沙虫数');
  if (new Set(rows.map(p=>p.id)).size !== rows.length) throw Error('玩家不能重复');
  let active=rows.filter(p=>!p.commander || c.n!==6).filter(p=>p.strength>0).sort((a,b)=>b.strength-a.strength);
  const results=rows.map(p=>({id:p.id,strength:p.strength,tier:0,rank:null,multiplier:c.version==='uprising' && p.worms>0?2:1,winner:false,commander:c.n===6 && !!p.commander}));
  const manual = reason => ({results:[],manual:true,reason,source});
  if(c.n===6 && rows.some(p=>p.commander && (p.strength || p.worms))) return manual('领队不参排名；请把效果计入被激活盟友。请按起义补充册六人 p3–5（PDF p9–11）人工核对。');
  if(c.n===6 && c.bloodlines && rows.some(p=>p.special)) return manual('萨多卡指挥官特殊交互需先在线下处理。请按《血脉永续》p10 人工裁定后，重新填盟友最终战力。');
  let pos=1;
  while(active.length){
    const same=active.filter(p=>p.strength===active[0].strength);active=active.slice(same.length);
    if(c.n===6 && same.length>2 && new Set(same.map(p=>p.team)).size<same.length) return manual('同队让出与跨队多人平局交叠，本站不推定次序。请按起义主规则 p14、六人 p5（PDF p11）人工裁定。');
    let conceding=false;
    if(c.n===6 && same.length===2 && same[0].team===same[1].team){
      const winner=concessions[same[0].team];
      if(winner && same.some(p=>p.id===winner)){same.sort((a)=>a.id===winner?-1:1);conceding=true;}
    }
    same.forEach((p,i)=>{
      const r=results.find(r=>r.id===p.id);r.rank=conceding?pos+i:pos;
      const tier=conceding?pos+i:same.length>1?pos+1:pos;
      r.tier=tier<=3? tier:0;
      if(c.n<=3 && pos>=3)r.tier=0;
      r.winner=r.tier===1;
    });
    pos+=same.length;
  }
  return {results,manual:false,source};
}
export function standings(s){
  let rows=scoringPlayers(s).map(p=>({...p,total:total(p),members:[p.id]}));
  if(s.config.n===6) rows=['A','B'].map(team=>{
    const ps=rows.filter(p=>p.team===team);const score={};
    for(const k of ['spice','solari','water','garrison'])score[k]=ps.reduce((n,p)=>n+p.score[k],0);
    score.chaumurky=ps.some(p=>p.score.chaumurky);score.reveal=Math.max(...ps.map(p=>p.score.reveal));
    return {id:team,name:team==='A'?'穆阿迪布队':'沙达姆队',total:ps.reduce((n,p)=>n+p.total,0),score,members:ps.map(p=>p.id)};
  });
  const compare=(a,b)=> b.total-a.total || Number(b.score.chaumurky)-Number(a.score.chaumurky) || b.score.spice-a.score.spice || b.score.solari-a.score.solari || b.score.water-a.score.water || b.score.garrison-a.score.garrison || b.score.reveal-a.score.reveal;
  rows.sort(compare);rows.forEach((p,i)=>{p.place=i&&compare(p,rows[i-1])===0?rows[i-1].place:i+1;});return rows;
}
export function reduce(s,a,actor){
  if(!a || typeof a.t!=='string')throw Error('无效操作');
  if(a.t==='claim'){
    if(s.host && s.host!==actor)throw Error('已有流程主持人');
    return {...s,host:actor,revision:s.revision+1};
  }
  if(['config','player','check','begin','next','finish','reopen','undo','transfer'].includes(a.t)&&s.host!==actor)throw Error('只有流程主持人可以执行此操作');
  const n=structuredClone(s); n.prev={...s,prev:null};n.revision++;
  switch(a.t){
    case 'transfer': if(typeof a.actor!=='string'||a.actor.length>80)throw Error('接替身份无效');n.host=a.actor;break;
    case 'config': {
      if(s.stage!=='setup')throw Error('游戏开始后不能改配置');
      const e=configError(a.config);if(e)throw Error(e);
      n.config={...a.config};n.checks={};
      n.players.forEach((p,i)=>{p.rival=n.config.n<3 && i>=n.config.n; p.score.confirmed=false;});break;
    }
    case 'player':{
      const p=n.players.find(p=>p.id===a.id);if(!p)throw Error('玩家不存在');
      if(typeof a.name==='string')p.name=a.name.trim().slice(0,24)||p.name;
      if(s.stage==='setup'){
        if(typeof a.leader==='string')p.leader=a.leader.slice(0,60);
        if(['A','B'].includes(a.team))p.team=a.team;
        if(typeof a.commander==='boolean')p.commander=a.commander;
      }break;
    }
    case 'check':if(s.stage!=='setup'||typeof a.id!=='string')throw Error('无效清单');n.checks[a.id]=!!a.value;break;
    case 'begin':{
      if(s.stage!=='setup')throw Error('已开局');const e=configError(s.config);if(e)throw Error(e);
      if(s.config.n===6 && ['A','B'].some(t=>s.players.filter(p=>p.team===t).length!==3||s.players.filter(p=>p.team===t&&p.commander).length!==1))throw Error('每队必须三人，且恰好一名领队');
      if(s.config.n===6){const seats=s.players;if(seats.some((p,i)=>p.team===seats[(i+1)%6].team))throw Error('双方队伍需要交替落座（六人 PDF p8）');const cs=seats.map((p,i)=>p.commander?i:-1).filter(i=>i>=0);if(cs[1]-cs[0]!==3)throw Error('两位领队需要相对而坐（六人 PDF p8）');}
      n.stage='play';n.gid=Date.now()+'-'+crypto.randomUUID();
      n.players.forEach(p=>{p.score.track=s.config.n===6?(p.commander?4:1):s.config.n===4?1:0;});break;
    }
    case 'next':
      if(s.stage!=='play')throw Error('不在流程中');
      if(s.phase===4){
        if(typeof a.end!=='boolean')throw Error('请在实物上核对结束条件');
        if(a.end || s.round>=maxRounds(s.config)){n.stage='score';}else{n.phase=0;n.round++;n.conflict=null;}
      }else n.phase++;
      break;
    case 'conflict':
      if(s.stage!=='play')throw Error('不在游戏中');
      if(!Array.isArray(a.rows)||a.rows.length!==participants(s).length||participants(s).some(p=>!a.rows.some(r=>r.id===p.id)))throw Error('请填写本局每个参与者');
      n.conflict=conflict(s.config,a.rows.map(r=>{const p=s.players.find(p=>p.id===r.id);return {...r,team:p.team,commander:p.commander};}),a.concessions);break;
    case 'score':{
      if(!['score','over'].includes(s.stage))throw Error('请先进入终局核对');
      const p=n.players.find(p=>p.id===a.id);if(!p||!scoringPlayers(s).some(x=>x.id===a.id))throw Error('不计分的玩家');
      const q=a.score;
      if(!q||['track','extra','spice','solari','water','garrison','reveal'].some(k=>!int(q[k]))||typeof q.note!=='string'||q.note.length>500||['checked','confirmed','chaumurky'].some(k=>typeof q[k]!=='boolean'))throw Error('请填非负整数，附加分上限不是12');
      if(q.confirmed && !q.checked)throw Error('请先确认未重复计分');
      if(q.extra>0 && !q.note.trim())throw Error('请注明本次额外加分的来源');
      if(q.chaumurky && !s.config.ix)throw Error('Chaumurky来自伊克斯崛起');
      p.score={...q};if(s.stage==='over')n.stage='score';break;
    }
    case 'finish':if(s.stage!=='score'||scoringPlayers(s).some(p=>!p.score.confirmed))throw Error('请等待所有计分玩家确认');n.stage='over';break;
    case 'reopen':if(s.stage!=='over')throw Error('尚未结算');n.stage='score';break;
    case 'undo':if(!s.prev)throw Error('没有可撤销操作');return {...s.prev,revision:s.revision+1,host:s.host,prev:null};
    default:throw Error('未知操作');
  }return n;
}
export function gameRecord(s){return {gid:s.gid,config:s.config,round:s.round,players:scoringPlayers(s),results:standings(s),ended:Date.now()};}
