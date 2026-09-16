// Local verification harness only: executes Vercel's compiled redirects, then proxies Astro preview.
// This does not model Vercel SSO/CDN and is not a production server.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {getTransformedRoutes} from '@vercel/routing-utils';
const config=JSON.parse(readFileSync(new URL('../../../vercel.json',import.meta.url),'utf8'));
export async function startEdgePreview(upstream='http://127.0.0.1:4340',port=0){
 const {routes,error}=getTransformedRoutes({redirects:config.redirects,trailingSlash:config.trailingSlash});
 if(error||!routes)throw new Error(JSON.stringify(error));
 const server=createServer(async(req,res)=>{
  try{
   if(!['GET','HEAD'].includes(req.method||'')){res.writeHead(405);res.end();return;}
   const url=new URL(req.url||'/','http://'+req.headers.host);
   for(const route of routes){
    if(!route.src||!route.headers?.Location)continue;
    if(route.has?.some(h=>h.type==='host'&&h.value!==url.hostname))continue;
    const match=new RegExp(route.src,route.caseSensitive?'':'i').exec(url.pathname);if(!match)continue;
    const target=route.headers.Location.replace(/\$(\d+)/g,(_,n)=>match[Number(n)]||'');
    const dest=new URL(target,url);if(!dest.search)dest.search=url.search;
    res.writeHead(route.status||308,{Location:target.startsWith('http')?dest.href:dest.pathname+dest.search});res.end();return;
   }
   const response=await fetch(new URL(url.pathname+url.search,upstream),{method:req.method,redirect:'manual',signal:AbortSignal.timeout(15000)});
   const headers={};for(const key of ['content-type','cache-control','location']){const value=response.headers.get(key);if(value)headers[key]=value;}
   res.writeHead(response.status,headers);res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
  }catch(error){res.writeHead(502,{'content-type':'text/plain'});res.end('Local routing test failed: '+String(error));}
 });
 await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
 return {server,origin:`http://127.0.0.1:${server.address().port}`};
}
