(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const cards = [...document.querySelectorAll('[data-motion-card]')];
  const revealItems = [...document.querySelectorAll('[data-reveal]')];
  const scenes = [...document.querySelectorAll('[data-motion-scene]')];
  const root = document.documentElement;

  root.dataset.motion = reducedMotion.matches ? 'reduced' : 'ready';

  if (reducedMotion.matches) {
    revealItems.forEach((item) => item.classList.add('is-revealed'));
    return;
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.12 });
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add('is-revealed'));
  }

  window.setTimeout(() => {
    revealItems.forEach((item) => item.classList.add('is-revealed'));
  }, 1200);

  if (!finePointer.matches) return;

  let pointerFrame = 0;
  let pendingPointerUpdate;
  const schedulePointerUpdate = (update) => {
    pendingPointerUpdate = update;
    if (pointerFrame) return;
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      pendingPointerUpdate?.();
    });
  };

  cards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const { clientX, clientY } = event;
      schedulePointerUpdate(() => {
        const rect = card.getBoundingClientRect();
        const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
        const y = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1);
        card.style.setProperty('--motion-x', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--motion-y', `${(y * 100).toFixed(1)}%`);
        card.style.setProperty('--motion-rotate-x', `${((0.5 - y) * 5).toFixed(2)}deg`);
        card.style.setProperty('--motion-rotate-y', `${((x - 0.5) * 6).toFixed(2)}deg`);
      });
    });

    card.addEventListener('pointerleave', () => {
      schedulePointerUpdate(() => {
        card.style.setProperty('--motion-x', '50%');
        card.style.setProperty('--motion-y', '50%');
        card.style.setProperty('--motion-rotate-x', '0deg');
        card.style.setProperty('--motion-rotate-y', '0deg');
      });
    });
  });

  scenes.forEach((scene) => {
    scene.addEventListener('pointermove', (event) => {
      const { clientX, clientY } = event;
      schedulePointerUpdate(() => {
        const rect = scene.getBoundingClientRect();
        const x = (clientX - rect.left) / rect.width - 0.5;
        const y = (clientY - rect.top) / rect.height - 0.5;
        scene.style.setProperty('--scene-x', `${(x * -12).toFixed(1)}px`);
        scene.style.setProperty('--scene-y', `${(y * -8).toFixed(1)}px`);
        scene.style.setProperty('--scene-pointer-x', `${((x + 0.5) * 100).toFixed(1)}%`);
        scene.style.setProperty('--scene-pointer-y', `${((y + 0.5) * 100).toFixed(1)}%`);
      });
    });

    scene.addEventListener('pointerleave', () => {
      schedulePointerUpdate(() => {
        scene.style.setProperty('--scene-x', '0px');
        scene.style.setProperty('--scene-y', '0px');
        scene.style.setProperty('--scene-pointer-x', '50%');
        scene.style.setProperty('--scene-pointer-y', '45%');
      });
    });
  });
})();
