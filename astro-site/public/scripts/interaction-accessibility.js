(() => {
  const FOCUSABLE = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  let activeDialog = null;
  let returnFocus = null;

  function focusableElements(dialog) {
    return [...dialog.querySelectorAll(FOCUSABLE)].filter((element) => {
      return !element.hasAttribute('hidden') && element.getAttribute('aria-hidden') !== 'true';
    });
  }

  function activateDialog(dialog, trigger) {
    if (!(dialog instanceof HTMLElement)) return;
    returnFocus = trigger instanceof HTMLElement ? trigger : document.activeElement;
    activeDialog = dialog;
    dialog.setAttribute('aria-hidden', 'false');
    dialog.querySelectorAll('.modal-close, .lightbox-close').forEach((button) => {
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', '關閉對話框');
    });
    requestAnimationFrame(() => {
      const focusables = focusableElements(dialog);
      (focusables[0] || dialog).focus({ preventScroll: true });
    });
  }

  function deactivateDialog(dialog) {
    if (!(dialog instanceof HTMLElement)) return;
    dialog.setAttribute('aria-hidden', 'true');
    if (activeDialog === dialog) activeDialog = null;
    if (returnFocus instanceof HTMLElement && document.contains(returnFocus)) {
      returnFocus.focus({ preventScroll: true });
    }
    returnFocus = null;
  }

  function currentlyOpenDialog() {
    return document.querySelector('.modal.active, .lightbox-overlay.active');
  }

  document.querySelectorAll('.modal, .lightbox-overlay').forEach((dialog) => {
    dialog.setAttribute('aria-hidden', dialog.classList.contains('active') ? 'false' : 'true');
    if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
  });

  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;

    const modalTrigger = target.closest('[data-modal]');
    if (modalTrigger) {
      const modalId = modalTrigger.getAttribute('data-modal');
      const dialog = modalId ? document.getElementById(modalId) : null;
      if (dialog) setTimeout(() => activateDialog(dialog, modalTrigger), 0);
      return;
    }

    const lightboxTrigger = target.closest('[data-lightbox]');
    if (lightboxTrigger) {
      setTimeout(() => {
        const dialog = currentlyOpenDialog();
        if (dialog) activateDialog(dialog, lightboxTrigger);
      }, 0);
      return;
    }

    const closeControl = target.closest('.modal-close, .lightbox-close');
    if (closeControl) {
      const dialog = closeControl.closest('.modal, .lightbox-overlay');
      if (dialog) setTimeout(() => deactivateDialog(dialog), 0);
    }
  });

  const dialogObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      const dialog = mutation.target;
      if (!(dialog instanceof HTMLElement)) return;
      if (dialog.classList.contains('active')) {
        if (activeDialog !== dialog) activateDialog(dialog, returnFocus);
      } else if (dialog.getAttribute('aria-hidden') !== 'true') {
        deactivateDialog(dialog);
      }
    });
  });

  document.querySelectorAll('.modal, .lightbox-overlay').forEach((dialog) => {
    dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['class'] });
  });

  document.addEventListener('keydown', (event) => {
    const dialog = activeDialog || currentlyOpenDialog();
    if (!(dialog instanceof HTMLElement)) return;

    if (event.key === 'Escape') {
      setTimeout(() => deactivateDialog(dialog), 0);
      return;
    }

    if (event.key !== 'Tab') return;
    const focusables = focusableElements(dialog);
    if (focusables.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  function enhanceCarousel(carousel) {
    if (!(carousel instanceof HTMLElement) || carousel.dataset.a11yReady === 'true') return;
    carousel.dataset.a11yReady = 'true';
    carousel.setAttribute('role', 'region');
    carousel.setAttribute('aria-roledescription', '輪播');
    if (!carousel.getAttribute('aria-label')) carousel.setAttribute('aria-label', '圖片輪播');

    const slides = [...carousel.querySelectorAll('.carousel-slide, .carousel-item')];
    const controls = [...carousel.querySelectorAll('.dot, .indicator')];

    function currentIndex() {
      const activeSlide = slides.findIndex((slide) => slide.classList.contains('active'));
      if (activeSlide >= 0) return activeSlide;
      const activeControl = controls.findIndex((control) => control.classList.contains('active'));
      return Math.max(activeControl, 0);
    }

    function sync() {
      const index = currentIndex();
      slides.forEach((slide, slideIndex) => {
        slide.setAttribute('role', 'group');
        slide.setAttribute('aria-roledescription', '投影片');
        slide.setAttribute('aria-label', `第 ${slideIndex + 1} 張，共 ${slides.length} 張`);
        slide.setAttribute('aria-hidden', slideIndex === index ? 'false' : 'true');
      });
      controls.forEach((control, controlIndex) => {
        if (control instanceof HTMLElement && control.tagName === 'SPAN') {
          control.setAttribute('role', 'button');
          control.setAttribute('tabindex', '0');
        }
        control.setAttribute('aria-label', `顯示第 ${controlIndex + 1} 張圖片`);
        control.setAttribute('aria-current', controlIndex === index ? 'true' : 'false');
      });
    }

    carousel.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        carousel.querySelector('.prev, .carousel-prev, .lightbox-prev')?.click();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        carousel.querySelector('.next, .carousel-next, .lightbox-next')?.click();
      } else if ((event.key === 'Enter' || event.key === ' ') && event.target instanceof HTMLElement && event.target.matches('.indicator')) {
        event.preventDefault();
        event.target.click();
      }
      setTimeout(sync, 0);
    });

    carousel.addEventListener('click', () => setTimeout(sync, 0));
    new MutationObserver(sync).observe(carousel, { attributes: true, subtree: true, attributeFilter: ['class', 'style'] });
    sync();
  }

  document.querySelectorAll('.carousel').forEach(enhanceCarousel);
})();
