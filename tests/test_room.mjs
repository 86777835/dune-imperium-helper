import assert from 'node:assert/strict';
import {BASE,OUT,browser,phone,action,shot,setup,score} from './helpers.mjs';
const b=await browser();try{
 for(const [version,six]of [['base',false],['uprising',false],['uprising',true]]){
 const c1=await phone(b),c2=await phone(b),p=await c1.newPage(),q=await c2.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));q.on('pageerror',e=>errors.push(e.message));
 await setup(p,version,six);const url=p.url(),code=new URL(url).searchParams.get('r');await q.goto(url);await q.waitForSelector('[data-act="begin"]:disabled');
 for(const k of ['ix','immortality','bloodlines','tech']){await p.check(`[data-config="${k}"]`);await p.waitForTimeout(220);}
 await p.fill('[data-player="p0"][data-field="name"]','沙海旅人');await p.locator('h2').first().click();await q.waitForFunction(()=>document.querySelector('[data-player="p0"][data-field="name"]').value==='沙海旅人');
 await p.check('[data-check="deck"]');await q.waitForSelector('[data-check="deck"]:checked');
 await shot(p,`setup_${six?'six':version}`);
 await action(p,'begin');await q.waitForSelector('.status');assert(await q.locator('[data-act="next"]').isDisabled());
 await action(p,'next');await action(p,'next');await shot(p,'flow_'+(six?'six':version));
 await p.click('[data-tab="battle"]');
 const fighters=six?[1,2,4,5]:[0,1,2];
 for(const [i,id] of fighters.entries()){await p.fill(`[data-battle="p${id}"][data-field="strength"]`,String([10,7,7,2][i]));await p.locator('h2').click();}
 if(version==='uprising'){await p.fill(`[data-battle="p${fighters[0]}"][data-field="worms"]`,'2');await p.locator('h2').click();}
 await action(p,'calculate');await p.waitForSelector('.battle-result');assert.match(await p.locator('.battle-result').textContent(),/第 1 档奖励/);
 if(version==='uprising')assert.match(await p.locator('.battle-result').textContent(),/×2/);
 await action(p,'ties');await shot(p,'conflict_'+(six?'six':version));
 await q.click('[data-tab="battle"]');await q.waitForSelector('.battle-result');assert.match(await q.locator('.battle-result').textContent(),/第 1 档奖励/);
 await p.click('[data-tab="flow"]');await action(p,'next');await action(p,'next');await action(p,'next'); // advance to round 2 without end
 await p.waitForFunction(()=>document.querySelector('.status strong').textContent==='2');
 for(let i=0;i<4;i++)await action(p,'next');await p.check('#end-condition');await action(p,'next');await p.waitForSelector('#score-form');await q.waitForSelector('#score-form');
 await score(p,'p0',12);await score(q,'p1',8);
 for(let i=2;i<(six?6:3);i++)await score(p,'p'+i,7+i);
 await shot(p,'score_'+(six?'six':version));await action(p,'finish');await p.waitForSelector('#shot');await q.waitForSelector('#shot');
 assert.match(await p.locator('#shot').textContent(),six?/三人总分/:/沙海旅人/);await shot(p,'result_'+(six?'six':version));
 await action(p,'image');await p.waitForSelector('.overlay img');assert((await p.locator('.overlay img').getAttribute('src')).startsWith('data:image/png;base64,'));await shot(p,'long_'+(six?'six':version));await p.click('#close-image');
 await p.goto(new URL('history.html',BASE).href);await p.fill('[name="q"]',code);await p.click('form button');await p.waitForSelector('.history-card');assert.match(await p.locator('#records').textContent(),new RegExp(code));
 await p.click('.history-card a');await p.waitForSelector('#shot');await action(p,'reopen');await p.waitForSelector('#score-form');await score(p,'p0',15);await action(p,'finish');await p.waitForSelector('#shot');assert.match(await p.locator('#shot').textContent(),six?/三人总分/:/16/);
 await c2.setOffline(true);await q.waitForTimeout(600);await c2.setOffline(false);await q.waitForTimeout(3200);await q.reload();await q.waitForSelector('#shot');assert.deepEqual(errors,[]);
 console.log('PASS 双手机',version,six?'六人':'三人','配置→流程→冲突→核对→结算→长图→存档→修订→重连');await c1.close();await c2.close();
 }
}finally{await b.close();}
