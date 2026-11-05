import {DurableObject} from 'cloudflare:workers';
import {initialState,reduce,gameRecord} from '../public/logic.js';
import {chat} from './chat.js';
const lobby=env=>env.LOBBY.get(env.LOBBY.idFromName('lobby'));
const archive=env=>env.ARCHIVE.get(env.ARCHIVE.idFromName('archive'));
export default {async fetch(req,env){
 const u=new URL(req.url);
 if(u.pathname==='/api/chat'&&req.method==='POST')return chat(req,env);
 if(u.pathname==='/api/chat-log')return new Response(null,{status:204});
 if(u.pathname==='/api/room'&&req.method==='POST'){
  for(let i=0;i<6;i++){
   const code=Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>'ABCDEFGHJKMNPQRSTUVWXYZ23456789'[n%30]).join('');
   const res=await env.ROOM.get(env.ROOM.idFromName(code)).fetch('https://room/init',{method:'POST',body:code});
   if(res.ok)return Response.json({code});
  }return Response.json({error:'建房失败，请重试'},{status:503});
 }
 if(u.pathname==='/api/rooms')return lobby(env).fetch('https://lobby/list');
 if(u.pathname==='/api/games')return archive(env).fetch('https://archive/list'+u.search);
 const m=u.pathname.match(/^\/api\/room\/([A-Z0-9]{4})\/ws$/);
 if(m){if(req.headers.get('Upgrade')!=='websocket')return new Response('需要 WebSocket',{status:426});return env.ROOM.get(env.ROOM.idFromName(m[1])).fetch(req);}
 return new Response('Not found',{status:404});
}};
export class Lobby extends DurableObject {
 async fetch(req){
  const rooms=await this.ctx.storage.get('rooms')||{};
  if(req.method==='POST'){const r=await req.json();rooms[r.code]={...r,updated:Date.now()};}
  for(const [k,r]of Object.entries(rooms))if(Date.now()-r.updated>7*86400000)delete rooms[k];
  await this.ctx.storage.put('rooms',rooms);return Response.json(Object.values(rooms).sort((a,b)=>b.updated-a.updated).slice(0,30));
 }
}
export class Archive extends DurableObject {
 async fetch(req){
  const u=new URL(req.url);
  if(u.pathname==='/put'){const r=await req.json();await this.ctx.storage.put('g:'+r.gid,r);return new Response('ok');}
  if(u.pathname==='/del'){await this.ctx.storage.delete('g:'+await req.text());return new Response('ok');}
  const rows=Array.from((await this.ctx.storage.list({prefix:'g:',reverse:true,limit:1000})).values());
  const q=(u.searchParams.get('q')||'').toLowerCase(),v=u.searchParams.get('version'),mode=u.searchParams.get('mode'),exp=u.searchParams.get('exp'),n=u.searchParams.get('n');
  return Response.json(rows.filter(r=>(!exp||r.config[exp]===true)&&(!n||String(r.config.n)===n)&&(!v||r.config.version===v)&&(!mode||(mode==='six'?r.config.n===6:mode==='epic'?r.config.epic:!r.config.epic&&r.config.n!==6))&&(!q||r.code.toLowerCase().includes(q)||r.players.some(p=>(p.name+' '+p.leader).toLowerCase().includes(q)))));
 }
}
export class Room extends DurableObject {
 constructor(ctx,env){super(ctx,env);ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping','pong'));ctx.blockConcurrencyWhile(async()=>{this.s=await ctx.storage.get('s');this.code=await ctx.storage.get('code');});}
 async fetch(req){
  if(new URL(req.url).pathname==='/init'){
   if(this.s)return new Response('exists',{status:409});this.s=initialState();this.code=await req.text();await this.ctx.storage.put({s:this.s,code:this.code});await this.report();return new Response('ok');
  }
  const actor=new URL(req.url).searchParams.get('actor');if(!/^[a-zA-Z0-9-]{12,80}$/.test(actor||''))return new Response('身份无效',{status:400});
  const [client,ws]=Object.values(new WebSocketPair());this.ctx.acceptWebSocket(ws);ws.serializeAttachment({actor});
  ws.send(JSON.stringify(this.s?{type:'state',state:this.view(ws)}:{type:'error',error:'房间不存在'}));return new Response(null,{status:101,webSocket:client});
 }
 view(ws){const {host,...publicState}=this.s;return {...publicState,prev:!!this.s.prev,hasHost:!!host,isHost:host===ws.deserializeAttachment().actor};}
 async webSocketMessage(ws,msg){
  if(!this.s||typeof msg!=='string'||msg.length>12000)return;
  try{
   const {action,revision}=JSON.parse(msg),actor=ws.deserializeAttachment().actor;
   if(revision!==this.s.revision)throw Error('房间刚有更新，请检查后重试');
   const before=this.s;this.s=reduce(this.s,action,actor);await this.ctx.storage.put('s',this.s);
   for(const w of this.ctx.getWebSockets())w.send(JSON.stringify({type:'state',state:this.view(w)}));
   if(this.s.stage==='over')await archive(this.env).fetch('https://archive/put',{method:'POST',body:JSON.stringify({...gameRecord(this.s),code:this.code})});
   else if(before.stage==='over')await archive(this.env).fetch('https://archive/del',{method:'POST',body:before.gid});
   await this.report();
  }catch(e){ws.send(JSON.stringify({type:'error',error:e.message}));ws.send(JSON.stringify({type:'state',state:this.view(ws)}));}
 }
 async report(){await lobby(this.env).fetch('https://lobby/update',{method:'POST',body:JSON.stringify({code:this.code,stage:this.s.stage,round:this.s.round,config:this.s.config,players:this.s.players.slice(0,this.s.config.n).map(p=>p.name)})});}
 async webSocketClose(ws,code){ws.close(code,'closed');}
}
