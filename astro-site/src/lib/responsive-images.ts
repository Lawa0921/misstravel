import manifestData from '../../.generated/responsive-images.json';
import { getImageMetadata } from './image-metadata';
type Entry = {width:number;height:number;candidates:{src:string;width:number}[]};
const manifest = manifestData as Record<string, Entry>;
export const imageSizes = {
  hero: '(max-width: 767px) calc(100vw - 52px), (min-width: 1387px) 637px, calc(46.48vw)',
  room: '(max-width: 768px) min(calc(100vw - 32px), 672px), min(calc(100vw - 48px), 992px)',
  card: '(max-width: 390px) calc(100vw - 26px), (max-width: 768px) min(calc(100vw - 34px), 670px), min(calc(50vw - 36px), 565px)',
  related: '(max-width: 768px) min(calc(100vw - 34px), 670px), min(calc((100vw - 84px) / 3), 318px)',
  compareTwo: '(max-width: 767px) calc(76.8vw - 26px), min(calc(48vw - 32px), 528px)',
  compareThree: '(max-width: 767px) calc(76.8vw - 26px), min(calc((96vw - 80px) / 3), 347px)',
  gallery: '(max-width: 640px) calc((100vw - 54px) / 2), (max-width: 980px) calc((100vw - 102px) / 3), min(calc((100vw - 136px) / 4), 266px)',
} as const;
export function responsiveImage(src:string, sizes:string, thumbnail=false) {
  const key=decodeURIComponent(src.split(/[?#]/)[0]);
  if(!src.startsWith('/images/') || key.includes('\\') || key.split('/').some(p=>p==='..'||p==='.') || !Object.hasOwn(manifest,key)) throw new Error(`Missing or unsafe responsive image: ${src}. Restore public/images source and run astro sync.`);
  const entry=manifest[key];
  const kind=getImageMetadata(src)?.kind;
  const candidates=thumbnail || !kind || kind==='photo' ? entry.candidates : [];
  const original=src.replace(/ /g,'%20').replace(/,/g,'%2C');
  return {src,width:entry.width,height:entry.height,'data-original-src':src,
    srcset:candidates.length ? [...candidates.map(c=>`${c.src} ${c.width}w`),`${original} ${entry.width}w`].join(', ') : undefined,
    sizes:candidates.length ? sizes : undefined};
}
export function deferredImage(src:string,sizes:string,thumbnail=false) {
  const attrs=responsiveImage(src,sizes,thumbnail);
  return {width:attrs.width,height:attrs.height,'data-original-src':src,'data-src':src,'data-srcset':attrs.srcset,'data-sizes':attrs.sizes};
}
export function thumbnailImage(src:string) {
  const attrs=responsiveImage(src,'72px',true);
  const candidates=manifest[decodeURIComponent(src.split(/[?#]/)[0])].candidates.filter(candidate=>candidate.width<=384);
  // Filmstrip images are decorative thumbnails. Do not let a cached full-size
  // candidate cause later thumbnails to request originals at the same density.
  return {width:attrs.width,height:attrs.height,'data-original-src':src,
    'data-thumb-src':candidates[0]?.src || src,
    'data-srcset':candidates.length ? candidates.map(c=>`${c.src} ${c.width}w`).join(', ') : undefined,
    'data-sizes':candidates.length ? '72px' : undefined};
}
