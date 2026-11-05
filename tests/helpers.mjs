import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {mkdir} from 'node:fs/promises';
export const BASE=process.argv[2]||'http://localhost:8911/';
export const OUT=process.argv[3]||'/tmp/claude-501/codex_tasks/shots';
assert(['localhost','127.0.0.1'].includes(new URL(BASE).hostname),'Only run complete games locally');
export async function browser(){await mkdir(OUT,{recursive:true});return chromium.launch({channel:'chrome'});}
export async function phone(b){const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await c.route('https://boardgame.leisurecat.cloud/**',r=>r.fulfill({json:{ok:true}}));return c;}
export async function action(page,act){await page.locator(`[data-act="${act}"]`).click();await page.waitForTimeout(180);}
export async function shot(p,name){await p.screenshot({path:`${OUT}/dune_${name}.png`,fullPage:true});}
export async function setup(p,version='base',six=false){
 await p.goto(BASE);await action(p,'create');await p.waitForSelector('[data-act="begin"]:not(:disabled)');
 if(version==='uprising'){await p.click('[data-version="uprising"]');await p.waitForSelector('[data-version="uprising"][aria-pressed="true"]');}
 if(six){await p.selectOption('[data-config="n"]','6');await p.waitForSelector('[data-player="p5"]');}
}
export async function endRound(p){await action(p,'begin');for(let i=0;i<4;i++)await action(p,'next');await p.check('#end-condition');await action(p,'next');await p.waitForSelector('#score-form');}
export async function score(p,id,value){await p.selectOption('#mine',id);await p.fill('[name="track"]',String(value));await p.fill('[name="extra"]','1');await p.fill('[name="note"]','已核实的终局密谋牌');await p.check('[name="checked"]');await p.click('[value="confirm"]');await p.waitForTimeout(220);}
