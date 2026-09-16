import { createHash, randomUUID } from 'node:crypto';
import { readdir, readFile, writeFile, mkdir, realpath, lstat, unlink, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
const config = {version:1,widths:[96,192,384,640,960,1280],quality:80,effort:4,sharp:sharp.versions};
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export async function localImagePath(root, src) {
  if (!src.startsWith('/images/')) throw new Error(`Responsive image must be local /images/: ${src}`);
  const pathname = decodeURIComponent(src.split(/[?#]/)[0]);
  if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(p => p === '..' || p === '.')) throw new Error(`Unsafe image path: ${src}`);
  if ((await lstat(path.join(root,'public/images'))).isSymbolicLink()) throw new Error('public/images must not be a symlink');
  const base = await realpath(path.join(root,'public/images'));
  const file = path.join(root,'public',pathname);
  let resolved;
  try { resolved = await realpath(file); } catch { throw new Error(`Missing referenced image: ${src}. Restore it under public/images.`); }
  if (!resolved.startsWith(base + path.sep)) throw new Error(`Image escapes public/images: ${src}`);
  return resolved;
}
async function atomicWrite(file, bytes, scratch=path.dirname(file)) {
  const temporary=path.join(scratch,`.ri-write-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary,bytes,{flag:'wx'});
    await rename(temporary,file);
  } finally {
    // Best-effort cleanup in the non-public cache cannot mask the original error.
    await unlink(temporary).catch(()=>{});
  }
}
export async function generateImages(root) {
  const canonicalRoot=await realpath(root);
  const publicPath=path.join(root,'public');
  if((await lstat(publicPath)).isSymbolicLink() || !(await realpath(publicPath)).startsWith(canonicalRoot+path.sep))throw new Error('public must stay inside the project and cannot be a symlink');
  const out = path.join(root,'public/generated-images'), cache = path.join(root,'.generated');
  for (const dir of [out,cache]) {
    await mkdir(dir,{recursive:true});
    if ((await lstat(dir)).isSymbolicLink()) throw new Error(`Generated output must not be a symlink: ${dir}`);
  }
  const manifestPath=path.join(cache,'responsive-images.json');
  try { if ((await lstat(manifestPath)).isSymbolicLink()) throw new Error(`Manifest must not be a symlink: ${manifestPath}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let old = {};
  try { old = JSON.parse(await readFile(path.join(cache,'responsive-images.json'),'utf8')); } catch {}
  const manifest = {}, owned = new Set();
  async function walk(dir) {
    for (const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))) {
      const file=path.join(dir,entry.name);
      if(entry.isSymbolicLink()) throw new Error(`Image symlinks are unsupported: ${file}`);
      if(entry.isDirectory()){await walk(file);continue;}
      if(!/\.(webp|png|jpe?g|avif)$/i.test(entry.name))continue;
      const src='/'+path.relative(path.join(root,'public'),file).split(path.sep).join('/');
      const bytes=await readFile(await localImagePath(root,src));
      const key=hash(Buffer.concat([bytes,Buffer.from(JSON.stringify(config))]));
      const meta=await sharp(bytes).metadata();
      const rotated=[5,6,7,8].includes(meta.orientation);
      const item={width:rotated?meta.height:meta.width,height:rotated?meta.width:meta.height,candidates:[]};
      if(!meta.width || !meta.height || (meta.pages || 1)>1 || (meta.orientation || 1)!==1){manifest[src]=item;continue;}
      for(const width of config.widths.filter(w=>w<meta.width)) {
        const name=`ri-${key}-${width}.webp`, url=`/generated-images/${name}`, target=path.join(out,name);
        try { if ((await lstat(target)).isSymbolicLink()) throw new Error(`Generated file must not be a symlink: ${target}`); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        let valid=false;
        const prior=old[src]?.candidates?.find(c=>c.src===url);
        if(prior)try{const cached=await readFile(target);valid=hash(cached)===prior.hash;}catch{}
        if(!valid)await atomicWrite(target,await sharp(bytes).resize({width,withoutEnlargement:true}).webp({quality:config.quality,effort:config.effort}).toBuffer(),cache);
        const output=await readFile(target);
        // Keep only derivatives that actually reduce bytes; native original is always the largest candidate.
        if(output.length < bytes.length){item.candidates.push({src:url,width,hash:hash(output),bytes:output.length});owned.add(name);}
        else await unlink(target);
      }
      manifest[src]=item;
    }
  }
  await walk(path.join(root,'public/images'));
  // Only this pipeline's exact filename namespace is owned; leave all other files alone.
  for(const name of await readdir(out))if(/^ri-[a-f0-9]{64}-\d+\.webp$/.test(name)&&!owned.has(name))await unlink(path.join(out,name));
  const serialized=JSON.stringify(manifest,null,2)+'\n';
  let previous='';try{previous=await readFile(manifestPath,'utf8');}catch{}
  if(previous!==serialized)await atomicWrite(manifestPath,serialized);
  return manifest;
}
export default function responsiveImages() {
  return {name:'local-responsive-images',hooks:{'astro:config:setup':async({config,logger})=>{
    const manifest=await generateImages(fileURLToPath(config.root));
    const candidates=Object.values(manifest).flatMap(item=>item.candidates);
    logger.info(`${Object.keys(manifest).length} originals; ${candidates.length} derivatives; ${(candidates.reduce((n,c)=>n+c.bytes,0)/1048576).toFixed(2)} MiB`);
  }}};
}
