(() => {
  const script = document.currentScript;
  const origin = new URL(script.src).origin;
  const lang = script.dataset.lang === 'ar' ? 'ar' : 'en';
  const tag = 'al-makhazen-assistant-widget';
  if (document.querySelector(tag)) return;

  const host = document.createElement(tag);
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = [
    ':host{position:fixed;right:max(18px,env(safe-area-inset-right));bottom:max(19px,env(safe-area-inset-bottom));z-index:2147483000;font:700 15px system-ui,sans-serif;}',
    'button{display:flex;align-items:center;gap:9px;margin-inline-start:auto;color:white;background:#a42b23;border:1px solid #ffffff35;border-radius:100px;padding:12px 15px;min-height:50px;cursor:pointer;box-shadow:0 7px 24px #69201956;font:inherit;}',
    'button:hover{background:#87211c;}button:focus-visible{outline:3px solid #64845e;outline-offset:4px;}',
    'button svg{height:22px;width:22px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}',
    'iframe{position:absolute;bottom:62px;right:0;width:min(424px,calc(100vw - 36px));height:min(645px,calc(100dvh - 99px));border:1px solid #d5c8bd;border-radius:17px;background:#fcf9f4;box-shadow:0 15px 55px #3c211d42;}',
    'iframe[hidden]{display:none;}',
  ].join('');
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'makhazen-chat-frame');
  const icon = document.createElement('span');
  icon.setAttribute('aria-hidden', 'true');
  const bubble = '<svg viewBox="0 0 24 24"><path d="M21 11a8 8 0 0 1-8 8h-2l-6 2 1.6-4A8 8 0 1 1 21 11Z"/><path d="M9 11h6m-3-3v6"/></svg>';
  const close = '<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  icon.innerHTML = bubble;
  const label = document.createElement('span');
  label.textContent = lang === 'ar' ? 'اسأل المخازن' : 'Ask Co-op';
  trigger.append(icon, label);
  const iframe = document.createElement('iframe');
  iframe.id = 'makhazen-chat-frame';
  iframe.title = lang === 'ar' ? 'مساعد التسوّق من المخازن' : 'Co-op shopping assistant';
  iframe.allow = 'clipboard-write';
  iframe.hidden = true;
  let ready = false;
  let pending = '';
  function sendPending() {
    if (!ready || !pending) return;
    iframe.contentWindow.postMessage({ type: 'makhazen-prompt', prompt: pending }, origin);
    pending = '';
  }
  function setOpen(open) {
    if (open && !iframe.hasAttribute('src')) {
      iframe.src = origin + '/assistant.html?widget=1&lang=' + lang + '&parent=' + encodeURIComponent(location.origin);
    }
    iframe.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    trigger.setAttribute('aria-label', open ? (lang === 'ar' ? 'سكّر المحادثة' : 'Close Co-op chat') : label.textContent);
    icon.innerHTML = open ? close : bubble;
    if (!open) trigger.focus();
  }
  trigger.addEventListener('click', () => setOpen(iframe.hidden));
  trigger.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !iframe.hidden) setOpen(false);
  });
  window.addEventListener('makhazen:open', event => {
    pending = typeof event.detail?.prompt === 'string' ? event.detail.prompt.slice(0, 600) : '';
    setOpen(true);
    sendPending();
  });
  window.addEventListener('message', event => {
    if (event.origin !== origin || event.source !== iframe.contentWindow) return;
    if (event.data?.type === 'makhazen-close-widget') setOpen(false);
    if (event.data?.type === 'makhazen-list-changed') window.dispatchEvent(new Event('makhazen:list'));
    if (event.data?.type === 'makhazen-ready') {
      ready = true;
      sendPending();
    }
  });
  shadow.append(style, iframe, trigger);
  document.body.append(host);
})();
