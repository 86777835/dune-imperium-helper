// Transport-level validation, rather than relying on disabled browser controls.
import assert from 'node:assert/strict';
import {BASE} from './helpers.mjs';
const {code}=await (await fetch(new URL('api/room',BASE),{method:'POST'})).json();
const actor=crypto.randomUUID(),guest=crypto.randomUUID();
function open(id){return new Promise((resolve,reject)=>{const ws=new WebSocket(`${BASE.replace('http','ws')}api/room/${code}/ws?actor=${id}`);ws.onerror=reject;ws.onmessage=e=>resolve({ws,state:JSON.parse(e.data).state});});}
function receive(ws){return new Promise(resolve=>ws.addEventListener('message',e=>resolve(JSON.parse(e.data)),{once:true}));}
const h=await open(actor),g=await open(guest);
try{
let wait=receive(h.ws);h.ws.send(JSON.stringify({revision:0,action:{t:'claim'}}));let s=(await wait).state;assert.equal(s.host,undefined);assert.equal(s.isHost,true);
let reject=receive(g.ws);g.ws.send(JSON.stringify({revision:s.revision,action:{t:'begin'}}));assert.match((await reject).error,/主持人/);
await new Promise(r=>setTimeout(r,50));
reject=receive(g.ws);g.ws.send(JSON.stringify({revision:0,action:{t:'claim'}}));assert.match((await reject).error,/更新/);
console.log('PASS WebSocket authority: guest cannot advance; stale revision rejected');
}finally{h.ws.close();g.ws.close();}
