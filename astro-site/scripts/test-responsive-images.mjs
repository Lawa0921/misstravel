import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, unlink, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { generateImages, localImagePath } from './responsive-images.mjs';
export async function testResponsivePipeline() {
const root = await mkdtemp(path.join(tmpdir(), 'responsive-images-'));
await mkdir(path.join(root, 'public/images'), {recursive:true});
const file = path.join(root, 'public/images/a photo.png');
const source = await sharp({create:{width:700,height:350,channels:3,background:'#123456'}}).png().toBuffer();
await writeFile(file, source);
const first = await generateImages(root);
const item = first['/images/a photo.png'];
assert.equal(item.width,700); assert.equal(item.height,350);
assert.deepEqual(item.candidates.map(c=>c.width),[96,192,384,640]);
for(const c of item.candidates){const m=await sharp(path.join(root,'public',c.src)).metadata();assert.equal(m.width,c.width);assert.equal(m.height,c.width/2);}
assert.deepEqual(await generateImages(root),first);
await unlink(path.join(root,'public',item.candidates[0].src));
assert.deepEqual(await generateImages(root),first);
await writeFile(path.join(root,'public',item.candidates[0].src),'broken');
assert.deepEqual(await generateImages(root),first);
assert.deepEqual(await readFile(file),source);
const outputPath=path.join(root,'public',item.candidates[0].src);
const outside=path.join(root,'unrelated.txt');await writeFile(outside,'untouched');
await unlink(outputPath);await symlink(outside,outputPath);
await assert.rejects(()=>generateImages(root),/symlink/);assert.equal(await readFile(outside,'utf8'),'untouched');
await unlink(outputPath);await generateImages(root);
const manifestPath=path.join(root,'.generated/responsive-images.json');
await unlink(manifestPath);await symlink(outside,manifestPath);
await assert.rejects(()=>generateImages(root),/symlink/);assert.equal(await readFile(outside,'utf8'),'untouched');
await unlink(manifestPath);await generateImages(root);

assert.equal(await localImagePath(root,'/images/a%20photo.png?v=2'),file);
await assert.rejects(()=>localImagePath(root,'/images/missing.png'),/Missing referenced image/);
await writeFile(path.join(root,'public/images/tiny.png'),await sharp({create:{width:64,height:32,channels:3,background:'#123456'}}).png().toBuffer());
assert.deepEqual((await generateImages(root))['/images/tiny.png'].candidates,[]);
for(const url of ['/images/../secret.png','/images/%2e%2e/secret.png','https://example.com/a.png','/images/a%2f..%2fsecret.png']) await assert.rejects(()=>localImagePath(root,url));
await symlink('/tmp',path.join(root,'public/images/escape'));
await assert.rejects(()=>localImagePath(root,'/images/escape/a.png'));
await unlink(path.join(root,'public/images/escape'));
await writeFile(file,await sharp({create:{width:700,height:350,channels:3,background:'#654321'}}).png().toBuffer());
assert.notEqual((await generateImages(root))['/images/a photo.png'].candidates[0].src,item.candidates[0].src);
console.log('responsive pipeline: dimensions, no upscaling, cache repair/invalidation, original bytes and path guards passed');

}
if (process.argv[1]?.endsWith('/test-responsive-images.mjs')) await testResponsivePipeline();
