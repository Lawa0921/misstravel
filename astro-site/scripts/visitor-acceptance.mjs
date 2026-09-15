import { chromium } from '@playwright/test';
import { load } from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const base = process.env.ACCEPTANCE_BASE_URL || 'http://127.0.0.1:4336';
const original = 'https://www.misstravel.me';
const out = process.env.ACCEPTANCE_OUTPUT || path.resolve('test-results/visitor-acceptance');
await mkdir(out, { recursive: true });
const results = [];
const record = (name, ok, detail = '') => { results.push({name, ok: Boolean(ok), detail}); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ': '+detail : ''}`); };
const compact = s => s.replace(/\s+/g,' ').trim();
const get = async url => { const r=await fetch(url,{signal:AbortSignal.timeout(20000)});return {status:r.status,html:await r.text(),url:r.url}; };
const sitemap=await get(base+'/sitemap-0.xml');
const xml=load(sitemap.html,{xml:true});
const paths=xml('loc').map((_,e)=>new URL(xml(e).text()).pathname).get();
record('Sitemap: 25 unique pages',sitemap.status===200&&paths.length===25&&new Set(paths).size===25);
const pages=new Map();const titles=[],descriptions=[];const policySelectors=['.room-content','.booking-notice','.day-definition'];
const restorePublicEmailText = $ => {
  $('[data-cfemail]').each((_, el) => {
    const hex = $(el).attr('data-cfemail');
    if (!hex || !/^[0-9a-f]+$/i.test(hex) || hex.length % 2) return;
    const key = parseInt(hex.slice(0, 2), 16);
    const bytes = [];
    for (let i = 2; i < hex.length; i += 2) bytes.push(parseInt(hex.slice(i, i + 2), 16) ^ key);
    $(el).text(new TextDecoder().decode(new Uint8Array(bytes)));
  });
};
for(const p of paths){
  try{
    const r=await get(base+p);const $=load(r.html);pages.set(p,$);
    record(`HTML ${p}`,r.status===200&&$('h1').length===1&&$('main').length===1&&Boolean($('title').text())&&Boolean($('meta[name="description"]').attr('content')));
    record(`Canonical ${p}`,$('link[rel="canonical"]').attr('href')===original+p);
    titles.push($('title').text());descriptions.push($('meta[name="description"]').attr('content'));
    let schemas=[];try{schemas=$('script[type="application/ld+json"]').map((_,e)=>JSON.parse($(e).text())).get();record(`JSON-LD ${p}`,schemas.length>0);}catch(e){record(`JSON-LD ${p}`,false,String(e));}
    if(/^\/rooms\/.+\/$/.test(p)){
      const serialized=JSON.stringify(schemas);
      record(`No misleading booking schema ${p}`,!/(AggregateOffer|FAQPage|checkinTime|checkoutTime)/.test(serialized)&&!schemas.some(s=>s['@type']==='Product'));
      const old=load((await get(original+p)).html);restorePublicEmailText(old);
      for(const selector of policySelectors)record(`Unchanged policy ${p} ${selector}`,compact($(selector).text())===compact(old(selector).text())&&$(selector).length===1);
    }
    if(['/infos/account/','/infos/roles/','/infos/contact-method/'].includes(p)){
      const old=load((await get(original+p)).html);restorePublicEmailText(old);
      record(`Unchanged guest information ${p}`,compact($('.info-content').text())===compact(old('.info-content').text()));
    }
  }catch(e){record(`HTML ${p}`,false,String(e));}
}
record('Unique titles',new Set(titles).size===25);
record('Unique descriptions',new Set(descriptions).size===25);
const internal=new Set();
for(const [p,$] of pages){$('a[href]').each((_,e)=>{const href=$(e).attr('href');try{const u=new URL(href,original+p);if(u.origin===original&&!u.pathname.startsWith('/images/'))internal.add(u.pathname+(u.search||''));}catch{record(`Invalid link ${p}`,false,href);}});}
for(const p of internal){try{record(`Internal destination ${p}`,(await get(base+p)).status===200);}catch(e){record(`Internal destination ${p}`,false,String(e));}}
const browser=await chromium.launch({headless:true});
const screenshots=[];const browserErrors=[];
const routes=['/','/rooms/','/rooms/suite_1/','/rooms/campsite_1/','/infos/guide/','/galleries/','/infos/account/','/infos/roles/','/infos/','/sale_items/'];
async function context(options={}){
 const c=await browser.newContext(options);
 // Keep synthetic acceptance traffic out of the production analytics account.
 await c.route('**/beacon.min.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
 return c;
}
async function settle(page){
 await page.evaluate(()=>document.fonts.ready);
 await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=600){window.scrollTo({top:y,behavior:"instant"});await new Promise(r=>setTimeout(r,75));}window.scrollTo({top:0,behavior:"instant"});});
 await page.waitForTimeout(250);
}
for(const viewport of [{width:1440,height:1000},{width:390,height:844},{width:360,height:800},{width:768,height:1024}]){
 const c=await context({viewport,reducedMotion:'reduce'});const page=await c.newPage();
 page.on('pageerror',e=>browserErrors.push({viewport:viewport.width,url:page.url(),error:String(e)}));
 for(const p of ([1440,390].includes(viewport.width) ? paths : routes)){
  try{
    await page.goto(base+p,{waitUntil:'networkidle'});await settle(page);
    const overflow=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth}));
    record(`No horizontal overflow ${viewport.width} ${p}`,overflow.width<=overflow.viewport+1,JSON.stringify(overflow));
    const images=await page.locator('img[src]').evaluateAll(imgs=>imgs.filter(i=>i.getAttribute('src')&&i.getBoundingClientRect().width>0&&i.getBoundingClientRect().height>0).map(i=>({src:i.getAttribute('src'),ok:i.complete&&i.naturalWidth>0})));
    record(`Visible image loading ${viewport.width} ${p}`,images.every(i=>i.ok),images.filter(i=>!i.ok).map(i=>i.src).join(','));
    const pageHeading=page.locator('h1');record(`Heading visible ${viewport.width} ${p}`,await pageHeading.isVisible());
    if([1440,390].includes(viewport.width)&&['/','/rooms/','/rooms/suite_1/','/galleries/','/infos/guide/'].includes(p)){
      const file=`${p==='/'?'home':p.replaceAll('/','-').replace(/^-|-$/g,'')}-${viewport.width}.png`;
      await page.screenshot({path:path.join(out,file),fullPage:true});screenshots.push(file);
    }
  }catch(e){record(`Browser ${viewport.width} ${p}`,false,String(e));}
 }
 // New visitor journey, using visible controls rather than implementation functions.
 try{
  await page.goto(base+'/',{waitUntil:'networkidle'});
  const tile=page.locator('#tiles .tile').nth(1);
  await tile.scrollIntoViewIfNeeded();const tileBox=await tile.boundingBox();
  await page.mouse.click(tileBox.x+tileBox.width/2,tileBox.y+50);
  await page.waitForURL('**/rooms/');record(`Whole photo card click ${viewport.width}`,new URL(page.url()).pathname==='/rooms/');
  await page.goto(base+'/');
  await page.getByRole('link',{name:'查看房型',exact:true}).click();await page.waitForURL('**/rooms/');
  record(`Visitor finds accommodation ${viewport.width}`,await page.getByRole('heading',{name:'房型展示',exact:true}).isVisible());
  const suiteLink=page.locator('a[href="#suite"]');await suiteLink.click();record(`Suite category navigation ${viewport.width}`,page.url().endsWith('#suite'));
  await page.locator('a.room-card[href="/rooms/suite_1/"]').click();await page.waitForURL('**/rooms/suite_1/');
  record(`Visitor sees suite price and breakfast conditions ${viewport.width}`,await page.locator('.room-content').getByText('此房型平日無附早餐',{exact:true}).isVisible()&&await page.locator('.room-content').getByText('此房型假日、連續假期附早餐',{exact:true}).isVisible()&&(await page.locator('.room-content').innerText()).includes('2400'));
  const booking=page.locator('.availability-cta');record(`Query CTA keeps booking destination ${viewport.width}`,await booking.getAttribute('href')==='https://roomcloud.cc/hotels/misstravel/booking');
  const box=await booking.boundingBox();record(`Booking touch target ${viewport.width}`,box&&box.height>=44&&box.width>=44,JSON.stringify(box));
  await page.getByRole('link',{name:'訂房流程',exact:true}).click();await page.waitForURL('**/infos/account/');
  record(`Visitor reaches original booking instructions ${viewport.width}`,(await page.locator('.info-content').innerText()).includes('線上訂房系統提供目前空房查詢'));
 }catch(e){record(`Visitor journey ${viewport.width}`,false,String(e));}
 // Closed menu, keyboard opening, escape and focus restoration.
 try{
  await page.goto(base+'/');const toggle=page.locator('#menu-toggle');await toggle.focus();await page.keyboard.press('Enter');
  await page.waitForTimeout(400);record(`Menu keyboard open ${viewport.width}`,await toggle.getAttribute('aria-expanded')==='true');
  await page.keyboard.press('Escape');await page.waitForTimeout(400);
  record(`Menu closes and restores focus ${viewport.width}`,await toggle.getAttribute('aria-expanded')==='false'&&await toggle.evaluate(e=>e===document.activeElement));
 }catch(e){record(`Menu interaction ${viewport.width}`,false,String(e));}
 // Real gallery selection, preserving descriptive alt text across lightbox.
 try{
  await page.goto(base+'/galleries/');const link=page.locator('a[data-lightbox="photos"]').nth(12);const alt=await link.locator('img').getAttribute('alt');
  await link.click();const image=page.locator('#lightbox-image');await image.waitFor({state:'visible'});
  record(`Lightbox preserves selected image description ${viewport.width}`,await image.getAttribute('alt')===alt);
  await page.keyboard.press('ArrowRight');await page.waitForTimeout(200);
  record(`Lightbox advances ${viewport.width}`,(await image.getAttribute('src')).includes('gallery_14.webp'));
  await page.keyboard.press('Escape');await image.waitFor({state:'hidden',timeout:3000});
  record(`Lightbox escape ${viewport.width}`,!(await image.isVisible()));
 }catch(e){record(`Gallery interaction ${viewport.width}`,false,String(e));}
 await c.close();
}
// Motion-enabled visitors must not be left with invisible content after scrolling.
for(const width of [390,1440]){
 const c=await context({viewport:{width,height:900},reducedMotion:'no-preference'});const p=await c.newPage();
 for(const route of ['/','/rooms/','/galleries/']){
  await p.goto(base+route,{waitUntil:'networkidle'});await settle(p);await p.waitForTimeout(600);
  const hidden=await p.locator('[data-reveal]').evaluateAll(es=>es.filter(e=>Number(getComputedStyle(e).opacity)<0.99).length);
  record(`Motion-enabled reveal ${width} ${route}`,hidden===0,String(hidden));
 }
 await c.close();
}
// No JavaScript must retain the essential content and navigation.
const nojs=await context({viewport:{width:390,height:844},javaScriptEnabled:false});const nj=await nojs.newPage();
for(const p of ['/','/rooms/','/rooms/suite_1/','/infos/account/','/infos/roles/','/galleries/']){
 try{await nj.goto(base+p);record(`No-JS essential content ${p}`,await nj.locator('h1').isVisible()&&await nj.locator('main').isVisible());
 if(p==='/rooms/')record('No-JS all ten room choices',await nj.locator('a.room-card').count()===10);
 if(p==='/rooms/suite_1/')record('No-JS complete room rules',await nj.locator('.room-content').isVisible()&&await nj.locator('.booking-notice').isVisible());
 }catch(e){record(`No-JS ${p}`,false,String(e));}
}
await nojs.close();await browser.close();
record('No application JavaScript exceptions',browserErrors.length===0,JSON.stringify(browserErrors));
let head='unknown';try{head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{}
const report={timestamp:new Date().toISOString(),base,head,reviewer:'Separate black-box visitor acceptance harness (automated; not a human user study)',analytics:'Cloudflare beacon suppressed for synthetic visits only',summary:{checks:results.length,passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length},results,screenshots};
await writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));
process.exitCode=report.summary.failed?1:0;
