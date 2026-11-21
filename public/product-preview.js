// One preview per document, shared by chat products, recipe ingredients and saved items.
export function createProductPreviews(getLanguage) {
  const words = {
    en: { open: 'Enlarge product image', close: 'Close image', unavailable: 'This image could not be loaded.' },
    ar: { open: 'تكبير صورة المنتج', close: 'إغلاق الصورة', unavailable: 'تعذّر تحميل هذه الصورة.' },
    arz: { open: 'Kabbir souret el montaj', close: 'Sakkir el soura', unavailable: 'Ma 2derna n7ammel hal soura.' },
    fr: { open: 'Agrandir la photo du produit', close: 'Fermer la photo', unavailable: 'Impossible de charger cette image.' },
  };
  const text = () => words[getLanguage()] || words.en;
  const nameOf = product => typeof product.name === 'string' ? product.name : product.name?.[getLanguage()] || product.name?.en || '';
  const node = (tag, className) => Object.assign(document.createElement(tag), { className });
  const peek = node('div', 'product-peek');
  peek.hidden = true;
  peek.setAttribute('role', 'tooltip');
  peek.id = 'product-peek';
  const dialog = node('dialog', 'product-image-dialog');
  dialog.setAttribute('aria-labelledby', 'product-image-title');
  dialog.setAttribute('aria-modal', 'true');
  const closeButton = node('button', 'icon-button product-image-close');
  closeButton.type = 'button';
  closeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  const makeFigure = () => {
    const figure = node('figure', 'product-image-figure');
    const image = node('img', 'product-image-large');
    image.referrerPolicy = 'no-referrer';
    image.draggable = false;
    const status = node('p', 'product-image-status');
    status.hidden = true;
    const caption = node('figcaption', 'product-image-caption');
    figure.append(image, status, caption);
    return { figure, image, status, caption };
  };
  const floating = makeFigure(), expanded = makeFigure();
  expanded.caption.id = 'product-image-title';
  peek.append(floating.figure);
  dialog.append(closeButton, expanded.figure);
  document.body.append(peek, dialog);
  let source = null, modalSource = null, mode = '', gesture = null, timer = 0, suppressFocus = false;

  function hidePeek() {
    if (source) source.removeAttribute('aria-describedby');
    peek.hidden = true;
    source = null;
    mode = '';
  }
  function endGesture() {
    clearTimeout(timer);
    timer = 0;
    if (gesture?.held) gesture.suppress();
    gesture = null;
    if (mode === 'hold') hidePeek();
  }
  function close() {
    endGesture();
    hidePeek();
    if (dialog.open) {
      suppressFocus = true;
      dialog.close();
      if (modalSource?.isConnected) modalSource.focus({ preventScroll: true });
      modalSource = null;
      requestAnimationFrame(() => { suppressFocus = false; });
    }
  }
  function fill(target, product, image) {
    target.status.hidden = true;
    target.image.hidden = false;
    target.caption.textContent = nameOf(product);
    target.image.alt = nameOf(product);
    target.image.onerror = () => {
      target.image.hidden = true;
      target.status.textContent = text().unavailable;
      target.status.hidden = false;
      if (target === floating) hidePeek();
    };
    target.image.src = image.currentSrc || image.src;
  }
  function showPeek(button, product, image, kind) {
    if (dialog.open || button.disabled || !button.isConnected) return;
    hidePeek();
    source = button;
    mode = kind;
    fill(floating, product, image);
    peek.classList.toggle('is-holding', kind === 'hold');
    peek.hidden = false;
    button.setAttribute('aria-describedby', peek.id);
    if (kind !== 'hold') {
      const rect = button.getBoundingClientRect(), box = peek.getBoundingClientRect(), gap = 12;
      const x = rect.right + gap + box.width <= innerWidth - gap ? rect.right + gap : rect.left - gap - box.width;
      peek.style.left = Math.max(gap, Math.min(x, innerWidth - box.width - gap)) + 'px';
      peek.style.top = Math.max(gap, Math.min(rect.top - box.height / 3, innerHeight - box.height - gap)) + 'px';
    } else { peek.style.removeProperty('left'); peek.style.removeProperty('top'); }
  }
  function open(button, product, image) {
    endGesture();
    hidePeek();
    if (button.disabled) return;
    fill(expanded, product, image);
    closeButton.setAttribute('aria-label', text().close);
    modalSource = button;
    dialog.showModal();
    closeButton.focus({ preventScroll: true });
  }
  closeButton.addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });
  dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && (dialog.open || !peek.hidden)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      close();
    }
  }, true);
  document.addEventListener('scroll', () => { if (!peek.hidden) { endGesture(); hidePeek(); } }, true);
  // Keyboard dismissal and mobile browser bars resize the frame after a tap.
  // Let the modal reflow instead of unexpectedly closing the shopper's image.
  window.addEventListener('resize', () => { endGesture(); hidePeek(); });
  window.addEventListener('blur', close);
  document.addEventListener('visibilitychange', () => { if (document.hidden) close(); });
  // Do not leave a floating preview behind when streaming or a list update replaces its source.
  new MutationObserver(() => { if (source && !source.isConnected) { endGesture(); hidePeek(); } }).observe(document.body, { childList: true, subtree: true });

  function attach(button, product, image) {
    let suppressUntil = 0;
    const suppress = () => { suppressUntil = Date.now() + 800; };
    button.setAttribute('aria-label', text().open + ': ' + nameOf(product));
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('pointerenter', event => {
      if (event.pointerType === 'mouse') showPeek(button, product, image, 'hover');
    });
    button.addEventListener('pointerleave', event => {
      if (event.pointerType === 'mouse' && source === button && !button.matches(':focus-visible')) hidePeek();
    });
    button.addEventListener('focus', () => {
      if (!suppressFocus && button.matches(':focus-visible')) showPeek(button, product, image, 'focus');
    });
    button.addEventListener('blur', () => { if (source === button && mode !== 'hold') hidePeek(); });
    button.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || !event.isPrimary) return;
      endGesture();
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, held: false, moved: false, suppress };
      timer = setTimeout(() => {
        if (!gesture || gesture.moved) return;
        gesture.held = true;
        suppressUntil = Infinity;
        button.setPointerCapture(event.pointerId);
        showPeek(button, product, image, 'hold');
      }, 350);
    });
    button.addEventListener('pointermove', event => {
      if (!gesture || event.pointerId !== gesture.id || gesture.held) return;
      if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 12) {
        gesture.moved = true;
        clearTimeout(timer);
        suppress();
      }
    });
    button.addEventListener('touchmove', event => { if (gesture?.held && event.cancelable) event.preventDefault(); }, { passive: false });
    const release = event => { if (gesture?.id === event.pointerId) endGesture(); };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('click', event => {
      event.preventDefault();
      if (Date.now() < suppressUntil) return;
      open(button, product, image);
    });
    button.addEventListener('contextmenu', event => event.preventDefault());
  }
  return { attach, close };
}
