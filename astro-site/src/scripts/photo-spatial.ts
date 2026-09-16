import { originalPhoto } from './responsive-photo';
/** Decorative only: dialog state and focus never depend on an animation. */
type Rect = { x: number; y: number; width: number; height: number };
export type PhotoGeometry = { src: string; original: string | null; frame: Rect; photo: Rect; element: HTMLImageElement };
let cancelCurrent: (() => void) | undefined;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
export function cancelPhotoFlight() { cancelCurrent?.(); }
for (const event of ['resize', 'pagehide', 'pageswap', 'pointerdown', 'keydown']) window.addEventListener(event, cancelPhotoFlight, { capture: true });
reduced.addEventListener('change', cancelPhotoFlight);
window.addEventListener('scroll', cancelPhotoFlight, { passive: true });
document.addEventListener('visibilitychange', cancelPhotoFlight);

export function photoGeometry(image: HTMLImageElement | null, justClosed = false): PhotoGeometry | null {
  if (!image?.isConnected || image.hidden || !image.complete || !image.naturalWidth || !image.currentSrc) return null;
  const style = getComputedStyle(image);
  if (style.display === 'none' || (!justClosed && style.visibility === 'hidden')) return null;
  const box = image.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return null;
  // Current photos have centered object positioning and no padding/borders. Unknown layouts degrade safely.
  if (style.objectPosition !== '50% 50%' || ['paddingLeft','paddingRight','paddingTop','paddingBottom','borderLeftWidth','borderRightWidth','borderTopWidth','borderBottomWidth'].some(key => parseFloat(style[key as keyof CSSStyleDeclaration] as string) > 0)) return null;
  const ratio = image.naturalWidth / image.naturalHeight;
  let width = box.width, height = box.height;
  if (style.objectFit === 'contain' || style.objectFit === 'cover') {
    const scale = style.objectFit === 'contain' ? Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight) : Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight);
    width = image.naturalWidth * scale; height = image.naturalHeight * scale;
  } else if (Math.abs(width / height - ratio) > .02) return null;
  const photo = { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height };
  let left = Math.max(box.left, photo.x), top = Math.max(box.top, photo.y);
  let right = Math.min(box.right, photo.x + width), bottom = Math.min(box.bottom, photo.y + height);
  for (let parent = image.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
    const css = getComputedStyle(parent), bounds = parent.getBoundingClientRect();
    if (['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowX)) { left = Math.max(left, bounds.left); right = Math.min(right, bounds.right); }
    if (['hidden', 'clip', 'auto', 'scroll'].includes(css.overflowY)) { top = Math.max(top, bounds.top); bottom = Math.min(bottom, bounds.bottom); }
  }
  // Crop to the actually visible fragment, including subpixel viewport edges.
  // Never scroll a page just to turn an offscreen photograph into an endpoint.
  const headerBottom = image.closest('[data-photo-viewer]') ? 0 : (document.getElementById('header')?.getBoundingClientRect().bottom || 0);
  left = Math.max(0, left); top = Math.max(0, top, headerBottom);
  right = Math.min(innerWidth, right); bottom = Math.min(innerHeight, bottom);
  if (right - left < 24 || bottom - top < 24) return null;
  return { src: image.currentSrc, original: originalPhoto(image), frame: { x: left, y: top, width: right - left, height: bottom - top }, photo, element: image };
}

export function flyPhoto(from: PhotoGeometry | null, to: PhotoGeometry | null, direction: 'open' | 'close') {
  cancelPhotoFlight();
  if (reduced.matches || !from || !to || !from.original || from.original !== to.original || Math.abs(from.photo.width / from.photo.height - to.photo.width / to.photo.height) > .02 || !Element.prototype.animate) return;
  const frame = document.createElement('div');
  frame.dataset.photoFlight = direction;
  frame.setAttribute('aria-hidden', 'true'); frame.inert = true;
  frame.style.cssText = 'position:fixed;left:0;top:0;z-index:10001;overflow:hidden;pointer-events:none;contain:layout style;';
  const photo = new Image(); photo.src = from.src; photo.dataset.originalSrc = from.original; photo.alt = ''; photo.draggable = false;
  photo.style.cssText = 'position:absolute;max-width:none;max-height:none;pointer-events:none;';
  // Reuse the loaded source URL; a cached responsive bitmap may still need a
  // decoder turn. No full-resolution source is requested just for decoration.
  frame.append(photo);
  const frameKey = (g: PhotoGeometry) => ({ left: `${g.frame.x}px`, top: `${g.frame.y}px`, width: `${g.frame.width}px`, height: `${g.frame.height}px` });
  const photoKey = (g: PhotoGeometry) => ({ left: `${g.photo.x - g.frame.x}px`, top: `${g.photo.y - g.frame.y}px`, width: `${g.photo.width}px`, height: `${g.photo.height}px` });
  const options = { duration: 320, easing: 'cubic-bezier(.22,.72,.22,1)', fill: 'both' as FillMode };
  const previousOpacity = to.element.style.opacity;
  let animation: Animation | undefined, crop: Animation | undefined;
  let cleaned = false;
  let decoderDeadline: ReturnType<typeof setTimeout> | undefined;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearTimeout(decoderDeadline);
    frame.remove();
    if (to.element.style.opacity === '0') to.element.style.opacity = previousOpacity;
    animation?.cancel(); crop?.cancel();
    if (cancelCurrent === cleanup) cancelCurrent = undefined;
  };
  cancelCurrent = cleanup;
  const start=()=>{
    if(cleaned||reduced.matches||!photo.complete||!photo.naturalWidth)return cleanup();
    clearTimeout(decoderDeadline);
    document.body.append(frame);
    try {
      animation = frame.animate([frameKey(from), frameKey(to)], { ...options, id: `photo-spatial-${direction}` });
      crop = photo.animate([photoKey(from), photoKey(to)], { ...options, id: `photo-spatial-${direction}-crop` });
      to.element.style.opacity = '0';
      animation.finished.then(cleanup, cleanup);
    } catch { cleanup(); }
  };
  if(photo.complete&&photo.naturalWidth)start();
  else {
    decoderDeadline=setTimeout(cleanup,180);
    photo.decode().then(start,cleanup);
  }
}
