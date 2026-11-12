import assert from 'node:assert/strict';
import {BASE,browser,phone,shot} from './helpers.mjs';
if(process.argv.includes('--mock-web'))await mockWeb();else{
assert(process.argv.includes('--no-key'),'This test requires --no-key');const b=await browser();try{const c=await phone(b),p=await c.newPage();await p.goto(BASE);await p.click('.cfab');await p.fill('.cin textarea','起义冲突平局如何处理？');await p.click('.cin button');await p.waitForFunction(()=>document.querySelector('.clog').textContent.includes('还没有配置好'));assert.doesNotMatch(await p.locator('.clog').textContent(),/DeepSeek|Qwen|Flash|Pro/);await shot(p,'chat_no_key');await p.click('.cx');assert(await p.locator('.cfab').isVisible());console.log('PASS chat --no-key, explicit error, no model label');}finally{await b.close();}}

// Web search when the tutorial and FAQ don't cover a question. Needs:
//   wrangler dev --port 8911 --var DEEPSEEK_API_KEY:fake --var DEEPSEEK_BASE:http://127.0.0.1:8912 --var CHAT_CF_MODEL:@cf/none/missing
// The mock model asks to search for questions containing 「网上」 (Uprising words when the question says 起义); the mock search API answers per `search`.
async function mockWeb(){
 const {createServer}=await import('node:http');
 let search='ok',asked=[],stall=null;   // search: 'ok' | 'empty' | 'fail'; asked: search queries received; stall: model that stalls mid-answer
 const ev=t=>`data: ${JSON.stringify({choices:[{delta:{content:t}}]})}\n\n`,sse=t=>ev(t)+'data: [DONE]\n\n';
 const srv=createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{
  const j=JSON.parse(body);
  if(req.url==='/v1/tools/search'){
   asked.push(j.query);
   if(search==='fail'){res.writeHead(500);return res.end('{}');}
   res.writeHead(200,{'content-type':'application/json'});
   return res.end(JSON.stringify({results:search==='empty'?[]:[
    {title:'Conflict tie question <b>',url:'https://boardgamegeek.com/thread/1',site_name:'BoardGameGeek',summary:'Designer: both get second place.'},
    {title:'沙丘讨论',url:'https://example.cn/a',site_name:null,snippet:'网友说可以。'}]}));
  }
  const sys=j.messages[0].content,q=j.messages.at(-1).content;
  res.writeHead(200,{'content-type':'text/event-stream'});
  if(j.model===stall){res.write(ev('答了一半'));const t=setInterval(()=>res.write(': keep-alive\n\n'),1000);return res.on('close',()=>clearInterval(t));}
  if(sys.includes('联网搜索到的网页摘要')){
   const ver=(sys.match(/玩家问的是(起义|基础版)的规则/)||[])[1]||(sys.includes('玩家没说是基础版还是起义')?'未说':'?');
   return res.end(sse(`依据网上说法：都拿第二名奖励 [1]（摘要 ${(sys.match(/^\[\d\] /gm)||[]).length} 条，版本 ${ver}）`));
  }
  const words=q.includes('起义')?'Dune Imperium Uprising sandworm':'Dune Imperium conflict tie';
  if(q.includes('先解释')){res.write(ev('资料里没有提到这一点。'));return setTimeout(()=>res.end(sse('\n\n【需联网】'+words)),300);}
  if(q.includes('网上')){res.write(ev('【需'));return setTimeout(()=>res.end(sse('联网】'+words)),200);}   // the marker split over two chunks
  res.end(sse(q.includes('无关')?'我只解答沙丘规则。':'资料里的回答'));
 });}).listen(8912);
 const b=await browser();let fails=0;
 const eq=(name,got,want)=>{const ok=JSON.stringify(got)===JSON.stringify(want);if(!ok)fails++;console.log(ok?'PASS':'FAIL',name,ok?'':`got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);};
 try{
  const page=await (await phone(b)).newPage();
  page.on('pageerror',e=>{fails++;console.log('FAIL page error',e.message);});
  const bodies=[];page.on('request',r=>r.url().endsWith('/api/chat')&&bodies.push(JSON.parse(r.postData())));
  await page.goto(BASE);await page.click('.cfab');
  const askOnce=async(q,s,st=null)=>{
   search=s;asked=[];stall=st;
   await page.fill('.cin textarea',q);await page.press('.cin textarea','Enter');
   await page.waitForFunction(()=>!document.querySelector('.cin button').disabled,null,{timeout:40000});
   return page.$$eval('.cm.a',l=>{const a=l.at(-1);return{err:a.className.includes('err'),label:!!a.querySelector('.cweb'),
    text:[...a.childNodes].filter(n=>!n.classList?.contains('cweb')&&!n.classList?.contains('csrc')).map(n=>n.textContent).join(''),
    src:[...a.querySelectorAll('.csrc a')].map(x=>[x.textContent,x.getAttribute('href'),x.target])};});
  };
  const SRC=[['[1] Conflict tie question <b>BoardGameGeek','https://boardgamegeek.com/thread/1','_blank'],['[2] 沙丘讨论example.cn','https://example.cn/a','_blank']];
  const webAns=v=>({err:false,label:true,text:`依据网上说法：都拿第二名奖励 [1]（摘要 2 条，版本 ${v}）`,src:SRC});
  const BASEQ=['Dune Imperium conflict tie site:boardgamegeek.com','Dune Imperium conflict tie'],UPQ=['Dune Imperium Uprising sandworm site:boardgamegeek.com','Dune Imperium Uprising sandworm'];
  eq('panel subtitle',await page.textContent('.chd span:not(.cav)'),'依据规则书作答，查不到会联网找');
  eq('covered by the notes: answered directly, no search',[await askOnce('冲突平局怎么领奖？','ok'),asked],[{err:false,label:false,text:'资料里的回答',src:[]},[]]);
  eq('not covered, marker split over chunks: searched, labelled, sources listed, version unsaid',[await askOnce('网上怎么说冲突平局？','ok'),asked],[webAns('未说'),BASEQ]);
  await shot(page,'chat_web');
  eq('the search request never reaches the page as text',(await page.$$eval('.cm.a',l=>l.map(x=>x.textContent).join(''))).includes('需联网'),false);
  eq('hub tag 基础版 → web answer told the version',[await askOnce('（版本：基础版）网上冲突平局？','ok'),asked],[webAns('基础版'),BASEQ]);
  eq('Uprising words → Uprising search, web answer told 起义',[await askOnce('网上起义沙虫奖励？','ok'),asked],[webAns('起义'),UPQ]);
  eq('nothing found: says so, no label, nothing made up',[await askOnce('网上还有啥？','empty'),asked.length],
   [{err:false,label:false,text:'本站资料里没有这一条，网上也没找到可靠的说法。建议翻一下规则书，或者问问桌上的老玩家。',src:[]},2]);
  eq('web answer goes back as plain history (no label, no sources)',bodies.at(-1).messages.slice(-3).map(m=>m.content),
   ['网上起义沙虫奖励？','依据网上说法：都拿第二名奖励 [1]（摘要 2 条，版本 起义）','网上还有啥？']);
  eq('search API down: says so',(await askOnce('网上第三问？','fail')).text,'本站资料里没有这一条，联网查找也失败了，请过一会儿再问，或者翻一下规则书。');
  eq('off-topic: no search',[(await askOnce('无关的问题','ok')).text,asked],['我只解答沙丘规则。',[]]);
  await new Promise(r=>setTimeout(r,61000));   // eight questions so far: stay under the server's 8-per-minute limit
  eq('search asked for at the end of an explanation: explanation dropped, searched',[await askOnce('先解释再查','ok'),asked],[webAns('未说'),BASEQ]);
  eq('flash stalls mid-answer → v4-pro answers from the start, can still search',[await askOnce('网上第四问？','ok','deepseek-flash'),asked],[webAns('未说'),BASEQ]);
  eq('stalled partial dropped',(await page.$$eval('.cm.a',l=>l.at(-1).textContent)).includes('答了一半'),false);
 }finally{await b.close();srv.close();}
 console.log(fails?`${fails} FAILED`:'ALL PASS');process.exit(fails?1:0);
}
