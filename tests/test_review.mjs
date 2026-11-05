import assert from 'node:assert/strict';
import {browser,phone,setup,endRound,score,action} from './helpers.mjs';
const b=await browser();try{for(const version of ['base','uprising']){const c=await phone(b),p=await c.newPage();let payload;
await c.route('https://boardgame.leisurecat.cloud/api/reviews',async r=>{payload=r.request().postDataJSON();await r.fulfill({json:{ok:true}});});
await setup(p,version);await endRound(p);for(let i=0;i<3;i++)await score(p,'p'+i,10-i);await action(p,'finish');await p.waitForSelector('.review');await p.fill('#review-text','测试评价，仅拦截');await action(p,'review');assert.equal(payload.game,version==='base'?'dune-imperium':'dune-uprising');assert.equal(payload.text,'测试评价，仅拦截');assert.equal(await p.locator('#shot .review').count(),0);console.log('PASS review',payload.game);await c.close();}}finally{await b.close();}
