import assert from 'node:assert/strict';
import {BASE,browser,phone,action} from './helpers.mjs';
// Hub box links open /?v=<edition>; the new room starts on that edition.
const b=await browser();try{for(const v of ['uprising','base']){const c=await phone(b),p=await c.newPage();
await p.goto(BASE+'?v='+v);await action(p,'create');await p.waitForSelector(`[data-version="${v}"][aria-pressed="true"]`);
assert.equal(new URL(p.url()).searchParams.get('v'),null);assert.match(p.url(),/\?r=[A-Z0-9]{4}$/);
await p.reload();await p.waitForSelector(`[data-version="${v}"][aria-pressed="true"]`);
console.log('PASS preselect',v);await c.close();}}finally{await b.close();}
