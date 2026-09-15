/* Progressive enhancement for native cross-document navigation.
 * Register in head before pagereveal. No click interception, fetch, route rewrite,
 * timer that delays navigation, history mutation or DOM replacement.
 */
(() => {
  const key = 'misstravel:room-transition:v1';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const canonicalPath = (url) => {
    try { const value = new URL(url, location.href); return value.origin === location.origin ? value.pathname : null; }
    catch { return null; }
  };
  const roomPath = (path) => typeof path === 'string' && /^\/rooms\/[a-z0-9_]+\/$/.test(path);
  const pair = (from, to) => from === '/rooms/' && roomPath(to)
    ? { path: to, direction: 'open' }
    : roomPath(from) && to === '/rooms/' ? { path: from, direction: 'return' } : null;
  const eligibleImage = (path) => {
    const image = [...document.querySelectorAll('img[data-room-photo]')]
      .find((item) => item.dataset.roomPhoto === path && !item.closest('[aria-hidden="true"]'));
    if (!image || !image.complete || image.naturalWidth === 0) return null;
    const box = image.getBoundingClientRect();
    const top = document.getElementById('header')?.getBoundingClientRect().bottom || 0;
    const visibleHeight = Math.min(box.bottom, innerHeight) - Math.max(box.top, top);
    if (box.width <= 0 || box.height <= 0 || visibleHeight < Math.min(box.height * 0.5, 120)
      || box.right <= 0 || box.left >= innerWidth) return null;
    return image;
  };
  const read = () => {
    try { const value = sessionStorage.getItem(key); sessionStorage.removeItem(key); return value ? JSON.parse(value) : null; }
    catch { return null; }
  };
  const clear = () => { try { sessionStorage.removeItem(key); } catch {} };
  const namePhoto = (image, transition) => {
    image.style.viewTransitionName = 'room-photo';
    // Both success and skipped transitions must leave BFCache documents clean.
    transition.finished.then(() => { image.style.removeProperty('view-transition-name'); },
      () => { image.style.removeProperty('view-transition-name'); });
  };
  // On a native back navigation the selected list image can still be marked
  // lazy when scroll restoration runs. Promote only that already-viewed image
  // as it is parsed; never prefetch a page, all rooms or an external resource.
  try {
    const pending = JSON.parse(sessionStorage.getItem(key) || 'null');
    if (!motion.matches && pending?.to === location.pathname
      && pair(pending.from, pending.to)?.direction === 'return'
      && Date.now() - pending.at < 5000) {
      const observer = new MutationObserver(() => {
        const image = [...document.querySelectorAll('img[data-room-photo]')]
          .find((item) => item.dataset.roomPhoto === pending.from && item.src === pending.src);
        if (!image) return;
        image.loading = 'eager';
        observer.disconnect();
      });
      observer.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener('DOMContentLoaded', () => observer.disconnect(), { once: true });
    }
  } catch { /* Storage is optional; ordinary navigation remains usable. */ }
  window.addEventListener('pageswap', (event) => {
    clear();
    const transition = event.viewTransition;
    if (!transition || motion.matches) return;
    const to = canonicalPath(event.activation?.entry?.url);
    const selection = pair(location.pathname, to);
    if (!selection) return;
    const image = eligibleImage(selection.path);
    if (!image) return;
    try {
      // A single-use same-tab handshake avoids animating an off-screen, stale,
      // different-carousel-slide or not-yet-loaded destination photograph.
      sessionStorage.setItem(key, JSON.stringify({from: location.pathname, to,
        src: image.currentSrc || image.src, at: Date.now(), direction: selection.direction}));
    } catch { return; }
    namePhoto(image, transition);
  });
  window.addEventListener('pagereveal', (event) => {
    const transition = event.viewTransition;
    const pending = read();
    if (!transition || motion.matches) return;
    // Make first-screen content immediately readable, not another staggered fade.
    document.querySelectorAll('[data-reveal]').forEach((item) => {
      const rect = item.getBoundingClientRect();
      if (rect.top < innerHeight + 80 && rect.bottom > 0) {
        item.setAttribute('data-route-ready', '');
        item.classList.add('is-revealed');
      }
    });
    if (!pending || pending.to !== location.pathname || Date.now() - pending.at > 5000) return;
    const from = canonicalPath(window.navigation?.activation?.from?.url);
    if (from && from !== pending.from) return;
    const selection = pair(pending.from, pending.to);
    const image = selection && eligibleImage(selection.path);
    // Do not wait for an image or fly between different views. Native navigation
    // is always the fallback, even on a slow connection or a deep-scroll return.
    if (!image || (image.currentSrc || image.src) !== pending.src) {
      transition.skipTransition();
      return;
    }
    namePhoto(image, transition);
  });
})();
