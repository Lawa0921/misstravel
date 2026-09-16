import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {load} from 'cheerio';
import sharp from 'sharp';

describe('Uncropped guest media reserve their actual intrinsic aspect ratio',()=>{
  it.each(['menu','map'])('%s width/height match the unchanged original',async slug=>{
    const $=load(readFileSync(join(process.cwd(),'dist/infos',slug,'index.html'),'utf8'));
    const image=$(`.info-content img[src="/images/${slug}.webp"]`);
    const meta=await sharp(join(process.cwd(),'public/images',`${slug}.webp`)).metadata();
    expect(image).toHaveLength(1);
    expect(Number(image.attr('width'))).toBe(meta.width);
    expect(Number(image.attr('height'))).toBe(meta.height);
    expect(image.attr('loading')).toBe('lazy');
    expect($('.media-action').attr('href')).toBe(`/images/${slug}.webp`);
  });
});
