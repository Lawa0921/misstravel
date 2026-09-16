/** Reproducible cold-context resource measurements; not real-user CWV or ranking data. */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
const args=process.argv.slice(2);const option=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1]};
const base=option('--base','http://127.0.0.1:4336');const output=path.resolve(option('--output','test-results/seo-performance'));
const runs=Number(option('--runs','3'));if(!Number.isInteger(runs)||runs<1||runs>5)throw new Error('runs must be 1..5');
const label=option('--label','current');const source=option('--source',execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim());
const origin=new URL(base).origin;if(!/^https?:$/.test(new URL(base).protocol))throw new Error('HTTP(S) base required');
await mkdir(output,{recursive:true});
const browser=await chromium.launch();const cases=[];const errors=[];
async function openContext(width,dpr){
 const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:dpr,reducedMotion:'no-preference'});
 const page=await context.newPage();const tasks=[];const resources=[];
 const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
 await cdp.send('Network.setBlockedURLs',{urls:['*static.cloudflareinsights.com/*','*cloudflareinsights.com/cdn-cgi/*']});
 page.on('pageerror',error=>errors.push({url:page.url(),message:String(error)}));
 page.on('requestfinished',request=>{if(new URL(request.url()).origin!==origin||request.resourceType()!=='image')return;
  tasks.push((async()=>{const response=await request.response();if(!response)return;const sizes=await request.sizes();resources.push({url:request.url().slice(origin.length),status:response.status(),bodyBytes:sizes.responseBodySize,transferredBytes:sizes.responseBodySize+sizes.responseHeadersSize});})());
 });
 await page.addInitScript(()=>{
  const state={lcpMs:null,lcpElement:null,lcpUrl:null,cls:0};window.__seoLab=state;
  try{new PerformanceObserver(list=>{for(const e of list.getEntries()){state.lcpMs=e.startTime;state.lcpElement=e.element?.tagName||null;state.lcpUrl=e.url||null;}}).observe({type:'largest-contentful-paint',buffered:true});}catch{}
  try{new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput)state.cls+=e.value;}).observe({type:'layout-shift',buffered:true});}catch{}
 });
 async function settle(){await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(450);await Promise.all([...tasks]);}
 async function snapshot(){await settle();return {imageBodyBytes:resources.reduce((s,r)=>s+r.bodyBytes,0),imageTransferBytes:resources.reduce((s,r)=>s+r.transferredBytes,0),imageRequests:resources.length,resources:[...resources],page:await page.evaluate(()=>({title:document.title,viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,lab:window.__seoLab,images:[...document.images].filter(i=>i.currentSrc&&i.getBoundingClientRect().width>0&&i.getBoundingClientRect().height>0).map(i=>({src:i.getAttribute('src'),currentSrc:i.currentSrc,srcset:i.getAttribute('srcset'),sizes:i.getAttribute('sizes'),naturalWidth:i.naturalWidth,cssWidth:i.getBoundingClientRect().width,loaded:i.complete&&i.naturalWidth>0}))}))};}
 return {context,page,snapshot,resources,settle};
}
try{
 for(const [width,dpr] of [[390,1],[390,2],[1440,1]])for(const route of ['/','/rooms/','/rooms/suite_1/','/galleries/'])for(let run=1;run<=runs;run++){
  const c=await openContext(width,dpr);
  try{await c.page.goto(base+route,{waitUntil:'networkidle'});const result={kind:'landing',route,width,dpr,run,...await c.snapshot()};cases.push(result);console.log(JSON.stringify({kind:result.kind,route,width,dpr,run,bytes:result.imageBodyBytes,requests:result.imageRequests,lab:result.page.lab}));}
  finally{await c.context.close();}
 }
 for(const [width,dpr] of [[390,2],[1440,1]]){
  const c=await openContext(width,dpr);
  try{
   await c.page.goto(base+'/rooms/suite_1/',{waitUntil:'networkidle'});const initial=await c.snapshot();
   await c.page.locator('.photo-expand').scrollIntoViewIfNeeded();await c.settle();
   await c.page.locator('.photo-expand').click();await c.page.locator('[data-viewer-image]').waitFor({state:'visible'});const first=await c.snapshot();
   const strip=c.page.locator('.viewer-filmstrip');await strip.evaluate(el=>{el.scrollLeft=el.scrollWidth;});await c.settle();
   const thumbs=await c.page.locator('.viewer-thumb img').evaluateAll(es=>es.map(i=>({src:i.getAttribute('src'),currentSrc:i.currentSrc,naturalWidth:i.naturalWidth,cssWidth:i.getBoundingClientRect().width})));
   const thumbnails=await c.snapshot();const thumbUrls=new Set(thumbs.map(t=>t.currentSrc).filter(Boolean).map(u=>u.slice(origin.length)));
   const thumbRequests=thumbnails.resources.filter(r=>thumbUrls.has(r.url));
   await c.page.locator('[data-viewer-index]').last().click();await c.settle();const original=c.page.locator('[data-viewer-image]');
   const full=await original.evaluate(i=>({src:i.getAttribute('src'),currentSrc:i.currentSrc,naturalWidth:i.naturalWidth,loaded:i.complete&&i.naturalWidth>0}));
   cases.push({kind:'viewer',width,dpr,initialImageBytes:initial.imageBodyBytes,openingImageBytes:first.imageBodyBytes-initial.imageBodyBytes,thumbnailImageBytes:thumbRequests.reduce((s,r)=>s+r.bodyBytes,0),thumbnailRequests:thumbRequests,thumbs,full});
   await c.page.screenshot({path:path.join(output,`viewer-${width}.png`)});
   await c.page.keyboard.press('Escape');await c.page.waitForTimeout(450);
  }finally{await c.context.close();}
 }
}finally{await browser.close();}
const summary=cases.filter(r=>r.kind==='landing').map(({route,width,dpr,imageBodyBytes,imageRequests,page,run})=>({route,width,dpr,run,imageBodyBytes,imageRequests,lcpMs:page.lab.lcpMs,cls:page.lab.cls}));
const report={timestamp:new Date().toISOString(),source,label,base,method:{engine:'Chromium',freshContextPerSample:true,cacheDisabled:true,networkThrottling:false,runs,analytics:'Cloudflare beacon blocked for synthetic traffic',limits:'Local laboratory only; LCP timing depends on machine/load; CLS is the observed laboratory sum, not field CWV. Image body bytes from completed same-origin requests, hidden/lazy content only counted if requested. Original images cached in another browsing session are not represented.'},errors,summary,cases};
await writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');console.log('FINAL',JSON.stringify({samples:summary.length,errors:errors.length,output}));if(errors.length)process.exitCode=1;
