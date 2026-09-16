/** Decoration only: never delay selection, load another image, or move the viewport. */
export function createCompareMotion() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let flight: HTMLImageElement | undefined;
  let animations: Animation[] = [];
  function cancel() {
    animations.forEach(animation => animation.cancel());
    animations = [];
    flight?.remove();
    flight = undefined;
  }
  function visible(element: HTMLElement) {
    if (typeof element.checkVisibility !== 'function') return false;
    const rect = element.getBoundingClientRect();
    if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) || element.closest('[hidden], [inert]') || rect.width <= 0 || rect.height <= 0 || rect.top < 0 || rect.left < 0 || rect.bottom > innerHeight || rect.right > innerWidth) return false;
    // Hit-testing also rejects clipping inside a horizontally scrolled chip tray.
    return [[rect.left + 8, rect.top + 8], [rect.right - 8, rect.bottom - 8]].every(([x, y]) => {
      const top = document.elementFromPoint(x, y);
      return top === element || !!top && element.contains(top);
    });
  }
  function collect(source: HTMLImageElement | null, chip: HTMLElement, button: HTMLElement, count: HTMLElement) {
    cancel();
    if (reduced.matches || typeof chip.animate !== 'function') return;
    [button, count].forEach(element => {
      const animation = element.animate([{ opacity: .65 }, { opacity: 1 }], { duration: 220 });
      animation.id = 'compare-selection-response';
      animations.push(animation);
    });
    const target = chip.querySelector('img');
    if (!source || !target || !source.complete || !source.naturalWidth || source.currentSrc !== target.src || !visible(source) || !visible(chip)) return;
    const from = source.getBoundingClientRect();
    const to = target.getBoundingClientRect();
    const clone = new Image();
    clone.src = source.currentSrc;
    clone.alt = '';
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.dataset.compareDecoration = 'flight';
    const width = 72, height = 54;
    const x = from.left + (from.width - width) / 2;
    const y = from.top + (from.height - height) / 2;
    Object.assign(clone.style, { position: 'fixed', left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px`, objectFit: 'cover', borderRadius: '8px', pointerEvents: 'none', zIndex: '1102', transformOrigin: 'top left', boxShadow: '0 6px 20px #0a0e2650' });
    document.body.append(clone);
    flight = clone;
    const animation = clone.animate([
      { transform: 'translate(0, 0) scale(1)', opacity: .95 },
      { transform: `translate(${to.left - x}px, ${to.top - y}px) scale(${to.width / width}, ${to.height / height})`, opacity: .85 },
    ], { duration: 360, easing: 'cubic-bezier(.22,.65,.3,1)' });
    animation.id = 'compare-collect';
    animations.push(animation);
    animation.onfinish = () => { clone.remove(); if (flight === clone) flight = undefined; };
    animation.oncancel = () => clone.remove();
  }
  window.addEventListener('resize', cancel);
  window.addEventListener('scroll', cancel, { capture: true, passive: true });
  window.addEventListener('pagehide', cancel);
  window.addEventListener('pageswap', cancel);
  document.addEventListener('visibilitychange', cancel);
  reduced.addEventListener('change', cancel);
  return { collect, cancel };
}
