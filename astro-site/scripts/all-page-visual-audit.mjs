import {chromium} from '@playwright/test';
import {readdir,readFile,writeFile,mkdir} from 'node:fs/promises';
import sharp from 'sharp';
import {execFileSync} from 'node:child_process';
const out=process.env.AUDIT_OUTPUT || '/tmp/misstravel-visual-signoff-20260915/pages';
await mkdir(out,{recursive:true});
const base=process.env.AUDIT_BASE_URL || 'http://127.0.0.1:4336';
const files=(await readdir('dist',{recursive:true})).filter(f=>f.endsWith('.html')).sort();
const routes=files.map(f=>f==='index.html'?'/':f==='404.html'?'/404.html':'/'+f.replace(/index\.html$/,''));
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const browser=await chromium.launch();const results=[];const errors=[];
for(const width of [1440,390,360,768]){
 const c=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
 await c.route('**/beacon.min.js*',r=>r.fulfill({contentType:'text/javascript',body:''}));
 const p=await c.newPage();p.on('pageerror',e=>errors.push({width,path:new URL(p.url()).pathname,error:String(e)}));
 for(const route of routes){
  const name=route==='/'?'home':route.replaceAll('/','-').replace(/^-|-$/g,'');
  try{
   const response=await p.goto(base+route,{waitUntil:'domcontentloaded',timeout:20000});
   await p.waitForLoadState('networkidle',{timeout:8000}).catch(()=>{});
   await p.evaluate(()=>document.fonts.ready);
   await p.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=800){scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,25));}scrollTo({top:0,behavior:'instant'});});
   await p.evaluate(async()=>{await Promise.all([...document.images].filter(i=>i.getAttribute('src')&&i.getClientRects().length).map(i=>Promise.race([i.decode().catch(()=>{}),new Promise(r=>setTimeout(r,1800))])));});
   // Full-page screenshots need actual rasterization, not only a successful decode.
   // Visit each visible image as a guest would; never change loading/CSS for the capture.
   if ([390,1440].includes(width)) {
     for (const image of await p.locator('main img[src]').all()) {
       if (!(await image.isVisible())) continue;
       await image.scrollIntoViewIfNeeded();
       await image.evaluate(e=>e.decode().catch(()=>{}));
       await p.waitForTimeout(85);
     }
     await p.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
     await p.waitForTimeout(300);
   }
   const metrics=await p.evaluate(()=>({h1:document.querySelector('h1')?.textContent?.trim(),h1Count:document.querySelectorAll('h1').length,mainCount:document.querySelectorAll('main').length,width:innerWidth,scrollWidth:document.documentElement.scrollWidth,background:getComputedStyle(document.body).backgroundColor,broken:[...document.images].filter(i=>i.getAttribute('src')&&i.getClientRects().length&&(!i.complete||!i.naturalWidth)).map(i=>i.getAttribute('src'))}));
   const status=response?.status();const ok=(route==='/404.html'?[200,404].includes(status):status===200)&&metrics.h1Count===1&&metrics.mainCount===1&&metrics.scrollWidth<=width+1&&metrics.broken.length===0;
   let screenshots=[];
   if([390,1440].includes(width)){
    await p.screenshot({path:out+'/'+name+'-'+width+'-full.png',fullPage:true});
    await p.screenshot({path:out+'/'+name+'-'+width+'-top.png'});screenshots.push(name+'-'+width+'-full.png');
    if(/^\/rooms\/.+\/$/.test(route)){
     await p.locator('.room-content').screenshot({path:out+'/'+name+'-'+width+'-content.png'});
     screenshots.push(name+'-'+width+'-content.png');
    }
   }
   results.push({route,width,status,ok,...metrics,screenshots});console.log(JSON.stringify({route,width,status,ok,h1:metrics.h1,broken:metrics.broken,overflow:metrics.scrollWidth-width}));
  }catch(e){results.push({route,width,ok:false,error:String(e)});console.log('ERROR',route,width,String(e));}
 }
 await c.close();
}
await browser.close();
const report={head,time:new Date().toISOString(),base,routes,pageCount:routes.length,summary:{cases:results.length,passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,scriptExceptions:errors.length},results,errors};
await writeFile(out+'/report.json',JSON.stringify(report,null,2));
for(const width of [1440,390]){
 for(let start=0;start<routes.length;start+=4){
  const group=routes.slice(start,start+4), tiles=[];
  for(let i=0;i<group.length;i++){
   const name=group[i]==='/'?'home':group[i].replaceAll('/','-').replace(/^-|-$/g,'');
   const img=await sharp(out+'/'+name+'-'+width+'-top.png').resize({width:width===1440?640:390}).png().toBuffer();
   const col=i%2,row=Math.floor(i/2),tw=width===1440?640:390,th=width===1440?445:1000;
   tiles.push({input:img,left:col*(tw+12),top:row*(th+44)});
   const label=Buffer.from('<svg width="'+tw+'" height="32"><rect width="100%" height="100%" fill="#242943"/><text x="8" y="23" fill="white" font-size="19">'+group[i]+'</text></svg>');
   tiles.push({input:label,left:col*(tw+12),top:row*(th+44)+th});
  }
  const tw=width===1440?640:390,th=width===1440?445:1000;
  await sharp({create:{width:tw*2+12,height:(th+44)*2,channels:3,background:'#242943'}}).composite(tiles).png().toFile(out+'/overview-'+width+'-'+Math.floor(start/4)+'.png');
 }
}
console.log('SUMMARY',JSON.stringify(report.summary));process.exitCode=report.summary.failed||errors.length?1:0;
