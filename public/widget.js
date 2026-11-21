(() => {
  const script = document.currentScript;
  const origin = new URL(script.src).origin;
  const lang = script.dataset.lang === 'ar' ? 'ar' : 'en';
  const tag = 'al-makhazen-assistant-widget';
  if (document.querySelector(tag)) return;
  const host = document.createElement(tag);
  const shadow = host.attachShadow({mode:'open'});
  for (const type of ['copy','cut','paste','selectstart','dragstart','contextmenu']) shadow.addEventListener(type,event=>event.preventDefault());
  const style = document.createElement('style');
  style.textContent = `
    :host{position:fixed;right:max(22px,env(safe-area-inset-right));bottom:max(22px,env(safe-area-inset-bottom));z-index:2147483000;font:600 14px system-ui,sans-serif}
    button{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;display:flex;align-items:center;gap:11px;margin-inline-start:auto;padding:7px 20px 7px 7px;border:1px solid #ffffff90;border-radius:22px;background:#fffdf7;color:#59352a;box-shadow:0 8px 35px #532b2430;cursor:pointer;font:inherit;min-height:64px}
    button:focus-visible{outline:3px solid #408561;outline-offset:4px}.mark{position:relative;display:flex}.mark img{width:48px;height:48px;border-radius:16px}.mark:after{content:'';position:absolute;width:9px;height:9px;border:3px solid #fffdf7;border-radius:50%;background:#4d9863;right:-3px;bottom:-2px}
    .label{display:flex;flex-direction:column;gap:3px;text-align:left}.label strong{font-size:15px}.label small{font-size:10px;font-weight:400;color:#8d877a}
    button:hover{transform:translateY(-2px)}button svg{width:23px;height:23px;fill:none;stroke:currentColor;stroke-width:1.8}button .close{display:none}
    :host([data-open]) button{padding:0;width:48px;min-height:48px;justify-content:center;border-radius:50%;background:#fff}
    :host([data-open]) button .mark,:host([data-open]) button .label{display:none}:host([data-open]) button .close{display:block}
    iframe{position:absolute;bottom:63px;right:0;width:min(470px,calc(100vw - 44px));height:min(760px,calc(100dvh - 110px));border:1px solid #e1e6df;border-radius:25px;background:#fff;box-shadow:0 24px 80px #223a3233}
    :host([data-expanded]) iframe{width:min(900px,calc(100vw - 44px))}iframe[hidden]{display:none}
    @media(max-width:600px), (max-height:500px) and (max-width:950px){:host{right:15px;bottom:max(15px,env(safe-area-inset-bottom))}iframe,:host([data-expanded]) iframe{position:fixed;inset:0;width:100vw;height:var(--viewport-height,100dvh);border:0;border-radius:0}:host([data-open]) button{display:none}}
    @media(prefers-reduced-motion:reduce){button{transform:none!important}}
  `;
  const trigger=document.createElement('button'); trigger.type='button'; trigger.setAttribute('aria-expanded','false'); trigger.setAttribute('aria-controls','makhazen-chat-frame');
  const mark=document.createElement('span'); mark.className='mark'; mark.setAttribute('aria-hidden','true');
  const image=document.createElement('img'); image.src=origin+'/coop-mark.svg'; image.alt=''; mark.append(image);
  const label=document.createElement('span'); label.className='label';
  const title=document.createElement('strong'); title.textContent=lang==='ar'?'اسأل COOP':'Ask COOP';
  const subtitle=document.createElement('small'); subtitle.textContent=lang==='ar'?'رفيقك بالتسوّق':'A little help. A better shop.'; label.append(title,subtitle);
  const close=document.createElement('span'); close.className='close'; close.setAttribute('aria-hidden','true'); close.innerHTML='<svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  trigger.append(mark,label,close);
  const iframe=document.createElement('iframe'); iframe.id='makhazen-chat-frame'; iframe.title='COOP shopping assistant'; iframe.allow='clipboard-write'; iframe.hidden=true;
  let ready=false, pending='', pendingView='chat',previousFocus;
  function sendPending(){
    if(!ready)return;
    iframe.contentWindow.postMessage({type:'makhazen-view',view:pendingView},origin);
    if(pending)iframe.contentWindow.postMessage({type:'makhazen-prompt',prompt:pending},origin);
    pending='';
  }
  function setOpen(open){
    if(open){previousFocus=document.activeElement;host.setAttribute('data-open','');}
    else host.removeAttribute('data-open');
    if(open&&!iframe.hasAttribute('src')){
      iframe.src = origin + '/assistant.html?widget=1&lang=' + lang + '&parent=' + encodeURIComponent(location.origin);
    }
    iframe.hidden=!open;trigger.setAttribute('aria-expanded',String(open));trigger.setAttribute('aria-label',open?'Close COOP chat':title.textContent);
    if(!open)(previousFocus?.focus?previousFocus:trigger).focus();
  }
  trigger.addEventListener('click',()=>{pendingView='chat';setOpen(iframe.hidden);sendPending();});
  window.addEventListener('makhazen:close',()=>setOpen(false));
  trigger.addEventListener('keydown',event=>{if(event.key==='Escape'&&!iframe.hidden)setOpen(false);});
  window.addEventListener('makhazen:open',event=>{
    pending=typeof event.detail?.prompt==='string'?event.detail.prompt.slice(0,600):'';
    pendingView=event.detail?.view==='list'?'list':'chat';setOpen(true);sendPending();
  });
  window.addEventListener('message',event=>{
    if(event.origin!==origin||event.source!==iframe.contentWindow)return;
    if(event.data?.type==='makhazen-close-widget')setOpen(false);
    if(event.data?.type==='makhazen-list-changed')window.dispatchEvent(new Event('makhazen:list'));
    if(event.data?.type==='makhazen-list-visibility')host.toggleAttribute('data-expanded',Boolean(event.data.open));
    if(event.data?.type==='makhazen-ready'){ready=true;sendPending();}
  });
  window.visualViewport?.addEventListener('resize',()=>host.style.setProperty('--viewport-height',window.visualViewport.height+'px'));
  shadow.append(style,iframe,trigger);document.body.append(host);
})();
