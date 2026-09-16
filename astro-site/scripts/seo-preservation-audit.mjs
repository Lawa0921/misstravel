import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';import {load} from 'cheerio';import {createHash} from 'node:crypto';import path from 'node:path';
const args=process.argv.slice(2);const arg=(name,fallback)=>{const i=args.indexOf(name);return i<0?fallback:args[i+1]};
const before=arg('--before');const after=arg('--after','dist');const output=arg('--output','test-results/seo-preservation.json');if(!before)throw new Error('--before is required');
const files=(await readdir(before,{recursive:true})).filter(f=>f.endsWith('.html')).sort();const afterFiles=(await readdir(after,{recursive:true})).filter(f=>f.endsWith('.html')).sort();
const hash=x=>createHash('sha256').update(x).digest('hex');const norm=x=>x.replace(/\s+/g,' ').trim();
const allowedDescriptions=new Set(['404.html','index.html','infos/index.html','infos/guide/index.html','infos/menu/index.html','infos/map/index.html']);
const changes=[];const failures=[];const pages=[];
if(JSON.stringify(files)!==JSON.stringify(afterFiles))failures.push('page inventory changed');
function extract(html){const $=load(html);const body=$('body').clone();body.find('script,style,noscript').remove();
 const meta={};$('meta[name],meta[property]').each((_,e)=>{const key=$(e).attr('name')||$(e).attr('property');if(key!=='generator')meta[key]=$(e).attr('content')});
 return {title:$('title').text(),body:norm(body.text()),headings:$('h1,h2,h3,h4,h5,h6').map((_,e)=>e.tagName+':'+norm($(e).text())).get(),links:$('a[href]').map((_,e)=>$(e).attr('href')).get(),canonical:$('link[rel="canonical"]').attr('href'),meta,schemas:$('script[type="application/ld+json"]').map((_,e)=>JSON.parse($(e).text())).get(),imageOriginals:$('img').map((_,e)=>({src:$(e).attr('data-original-src')||$(e).attr('src')||$(e).attr('data-src')||$(e).attr('data-thumb-src')||'',alt:$(e).attr('alt')||''})).get()};}
for(const file of files){const old=extract(await readFile(path.join(before,file),'utf8'));const now=extract(await readFile(path.join(after,file),'utf8'));const page={file,body:old.body===now.body,title:old.title===now.title,canonical:old.canonical===now.canonical,headings:JSON.stringify(old.headings)===JSON.stringify(now.headings),links:JSON.stringify(old.links)===JSON.stringify(now.links),imageOriginals:JSON.stringify(old.imageOriginals)===JSON.stringify(now.imageOriginals)};
 for(const [key,value] of Object.entries(page))if(key!=='file'&&!value)failures.push(`${file}: ${key} changed`);
 for(const key of new Set([...Object.keys(old.meta),...Object.keys(now.meta)]))if(old.meta[key]!==now.meta[key]){
  const allowed=allowedDescriptions.has(file)&&['description','og:description','twitter:description'].includes(key);
  changes.push({file,key,before:old.meta[key],after:now.meta[key],allowed});if(!allowed)failures.push(`${file}: unexpected metadata ${key}`);
 }
 if(file==='index.html'){const a=old.schemas.find(s=>s['@type']==='WebSite');const b=now.schemas.find(s=>s['@type']==='WebSite');if(a&&b){changes.push({file,key:'WebSite.description',before:a.description,after:b.description,allowed:true});a.description=b.description;}}
 page.schemas=JSON.stringify(old.schemas)===JSON.stringify(now.schemas);if(!page.schemas)failures.push(`${file}: schema changed`);pages.push(page);
}
const assets=[];for(const file of ['robots.txt','sitemap-index.xml','sitemap-0.xml','image-sitemap.xml','feed.xml','feed.json']){const same=hash(await readFile(path.join(before,file)))===hash(await readFile(path.join(after,file)));assets.push({file,same});if(!same)failures.push(`${file}: changed`);}
await mkdir(path.dirname(output),{recursive:true});const result={timestamp:new Date().toISOString(),before,after,pages,assets,changes,failures,ok:failures.length===0};await writeFile(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({pages:pages.length,metadataChanges:changes.length,failures}));process.exitCode=failures.length?1:0;
