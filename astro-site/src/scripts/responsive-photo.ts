/** Identity comes only from server-authored original attributes; queries remain significant. */
export function originalPhoto(image: HTMLImageElement | null): string | null {
  const original=image?.dataset.originalSrc;
  if(!original?.startsWith('/images/')) return null;
  try { const url=new URL(original,document.baseURI);return url.origin===location.origin ? url.href : null; } catch { return null; }
}
export function activatePhoto(image:HTMLImageElement, thumb=false) {
  const src=thumb ? image.dataset.thumbSrc : image.dataset.src;
  if(!src)return;
  if(image.getAttribute('src')===src && image.srcset===(image.dataset.srcset || '') && image.sizes===(image.dataset.sizes || ''))return;
  if(image.dataset.sizes)image.sizes=image.dataset.sizes;
  if(image.dataset.srcset)image.srcset=image.dataset.srcset;
  image.src=src;
  if(thumb)delete image.dataset.thumbSrc;
  else delete image.dataset.src;
}
