// /system/blocks/story-badge.js
// Badge da inserire DENTRO <experience-card>. Al termine animazione apre overlay "stories" full-viewport.
// Slides = figli con slot numerici "1","2","3"... (IMG/VIDEO). I video usano la durata reale.
// PATCH: modalità ICONA -> l'immagine (es. SVG) non viene scalata a cover, ma centrata alla dimensione richiesta.

class StoryBadge extends HTMLElement {
  static get observedAttributes() { return ['src','emoji','alt','label','size','duration','mode','icon-size']; }

  constructor(){
    super();
    this._size=56; this._durationMs=2200;
    this._r=44; this._C=2*Math.PI*this._r; this._N=14;
    this._playing=false; this._raf=null; this._t0=0;

    // refs
    this._card=null; this._clip=null;
    this._overlay=null; this._row=null; this._wrap=null;
    this._solid=null; this._dashed=null;
    this._img=null; this._txt=null; this._label=null; this._media=null;
  }

  connectedCallback(){
    this._card = this.closest('experience-card');
    if (!this._card || !this._card.shadowRoot) return;
    this._clip = this._card.shadowRoot.querySelector('.clip');
    if (!this._clip) return;

    if (!this._overlay) this._injectUI();
    this._applyAll();

    const btn = this._row.querySelector('.sb-dot');
    btn.addEventListener('pointerdown', e=>{ e.stopPropagation(); this._startAnim(); });
    btn.addEventListener('keydown', e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); this._startAnim(); }});
  }

  disconnectedCallback(){ if (this._overlay?.parentNode) this._overlay.remove(); this._stop(false); }
  attributeChangedCallback(){ this._applyAll(); }

  /* ------------ UI inside card ------------ */
  _injectUI(){
    const style = document.createElement('style');
    style.textContent = `
      .sb-overlay{ position:absolute; inset:0; z-index:9; pointer-events:none; display:block; }
      .sb-row{ position:absolute; top:10px; left:10px; display:inline-flex; align-items:center; gap: var(--space-3,12px); pointer-events:auto; }
      .sb-label{
        max-width:160px; font-family: var(--font-body,"Plus Jakarta Sans",system-ui,sans-serif);
        font-size: var(--font-sm,14px); font-weight: var(--weight-bold,700); line-height:1.25;
        color: var(--text-on-inverse,#fff); padding:6px 10px; border-radius: var(--radius-md,10px);
        background: color-mix(in srgb, var(--neutral-950,#0b1220) 72%, transparent);
        border:1px solid var(--border-on-inverse,rgba(255,255,255,.22)); box-shadow: var(--shadow-xs,0 1px 2px rgba(0,0,0,.08));
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
      }

      .sb-dot{ width: var(--sb-size,56px); height: var(--sb-size,56px); border:0; background:transparent; padding:0; cursor:pointer; }
      .sb-wrap{ position:relative; width:100%; height:100%; border-radius:999px; filter: drop-shadow(0 6px 18px rgba(0,0,0,.35)); }
      .sb-ring{ position:absolute; inset:0; }
      .sb-ring svg{ width:100%; height:100%; display:block; transform-origin:50% 50%; }

      /* anello pieno default */
      .sb-solid{ stroke:url(#sbGrad); stroke-width: var(--sb-sw,6.5px); stroke-linecap:round; fill:none; opacity:1; transition:opacity .15s ease; }
      /* dashed solo durante animazione */
      .sb-dashed{ stroke:url(#sbGrad); stroke-width: var(--sb-sw,6.5px); stroke-linecap:round; fill:none; opacity:0; }

      .sb-wrap.sb-playing .sb-ring svg{ animation: sb-spin 2.4s linear infinite; }
      .sb-wrap.sb-playing .sb-solid{ opacity:0; }
      .sb-wrap.sb-playing .sb-dashed{ opacity:1; }
      @keyframes sb-spin{ to{ transform: rotate(360deg); } }

      /* gap scuro SOLO interno all'anello */
      .sb-backdrop{ position:absolute; inset: var(--sb-sw,6.5px); border-radius:999px; background: var(--neutral-950,#0b1220); z-index:0; }

      /* media standard (cover) */
      .sb-media{ position:absolute; inset: calc(var(--sb-sw,6.5px) + var(--sb-gap,3.5px)); border-radius:999px; overflow:hidden; background:#0b0f16; z-index:1; }
      .sb-media img{ width:100%; height:100%; object-fit:cover; display:block; }
      .sb-media span{ display:grid; place-items:center; width:100%; height:100%; font-size: calc(var(--sb-size,56px)*.42); color:#fff; text-shadow:0 1px 2px rgba(0,0,0,.55); }

      /* --- MODALITÀ ICONA (patch) --- */
      .sb-media.icon{ display:grid; place-items:center; }
      .sb-media.icon img{ width: var(--sb-icon-size,20px); height: var(--sb-icon-size,20px); object-fit:contain; }
    `;

    const overlay = document.createElement('div');
    overlay.className = 'sb-overlay';
    overlay.innerHTML = `
      <div class="sb-row" part="story-badge">
        <button class="sb-dot" aria-label="Apri anteprima" tabindex="0">
          <div class="sb-wrap">
            <div class="sb-ring" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="sbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%"   stop-color="#2f8bff"/>
                    <stop offset="50%"  stop-color="#00a4ff"/>
                    <stop offset="100%" stop-color="#0064ff"/>
                  </linearGradient>
                </defs>
                <circle class="sb-solid"  cx="50" cy="50" r="44"></circle>
                <circle class="sb-dashed" cx="50" cy="50" r="44"></circle>
              </svg>
            </div>
            <div class="sb-backdrop"></div>
            <div class="sb-media"><img alt="" hidden><span hidden></span></div>
          </div>
        </button>
        <span class="sb-label"></span>
      </div>
    `;
    this._clip.appendChild(style);
    this._clip.appendChild(overlay);

    // refs
    this._overlay=overlay; this._row=overlay.querySelector('.sb-row');
    this._wrap=overlay.querySelector('.sb-wrap');
    this._solid=overlay.querySelector('.sb-solid');
    this._dashed=overlay.querySelector('.sb-dashed');
    this._media=overlay.querySelector('.sb-media');
    this._img=overlay.querySelector('.sb-media img');
    this._txt=overlay.querySelector('.sb-media span');
    this._label=overlay.querySelector('.sb-label');
  }

  _applyAll(){
    if (!this._row) return;
    const size=Math.max(40, parseInt(this.getAttribute('size')||this._size,10)||56);
    this._row.style.setProperty('--sb-size',`${size}px`);
    this._row.style.setProperty('--sb-sw',`${size*0.12}px`);
    this._row.style.setProperty('--sb-gap',`${size*0.06}px`);

    // media (img o emoji)
    const src=this.getAttribute('src') || this._card?.getAttribute('badge-image') || '';
    const emoji=this.getAttribute('emoji')||'';
    const alt=this.getAttribute('alt')||'';
    if (src){ this._img.src=src; this._img.alt=alt; this._img.hidden=false; this._txt.hidden=true; }
    else     { this._txt.textContent=emoji||'★'; this._img.hidden=true; this._txt.hidden=false; }

    // ---- Modalità ICONA ----
    const forceIcon = (this.getAttribute('mode')||'').toLowerCase()==='icon';
    const looksSvg  = /\.svg(\?|$)/i.test(src||'');
    const isIcon    = forceIcon || looksSvg;
    this._media.classList.toggle('icon', isIcon);
    if (isIcon){
      const iSz = Math.max(8, parseInt(this.getAttribute('icon-size')||'20',10) || 20);
      this._media.style.setProperty('--sb-icon-size', `${iSz}px`);
    } else {
      this._media.style.removeProperty('--sb-icon-size');
    }

    // label
    const lab=this.getAttribute('label') || this._card?.getAttribute('badge-desc') || this._card?.getAttribute('badge-label') || '';
    this._label.textContent=lab; this._label.style.display= lab ? 'inline-block':'none';
    this._row.querySelector('.sb-dot').setAttribute('aria-label', lab || 'Apri anteprima');

    // durata badge anim
    const ms=parseInt(this.getAttribute('duration')||'',10);
    if (Number.isFinite(ms) && ms>200) this._durationMs=ms;

    this._setupDashStart();
  }

  _setupDashStart(){
    const seg=this._C/this._N, dash=seg*0.42, gap=seg-dash;
    this._dashed.setAttribute('stroke-dasharray', `${dash.toFixed(3)} ${gap.toFixed(3)}`);
    this._dashed.setAttribute('stroke-dashoffset','0');
  }

  /* ---------- anim badge ---------- */
  _startAnim(){
    this._stop(false);
    this._playing=true; this._t0=performance.now(); this._wrap.classList.add('sb-playing');

    const C=this._C, seg=C/this._N, dash0=seg*0.42, gap0=seg-dash0, gapMin=0.0001;
    const ease=t=> t<.5 ? 2*t*t : 1-((-2*t+2)**2)/2;

    const tick=now=>{
      if(!this._playing) return;
      const p=Math.min(1,(now-this._t0)/this._durationMs), e=ease(p);
      const dash=dash0 + (C-dash0)*e; const gap=Math.max(gapMin, gap0*(1-e));
      this._dashed.setAttribute('stroke-dasharray', `${dash.toFixed(3)} ${gap.toFixed(3)}`);
      if(p>=1){ this._stop(true); return; }
      this._raf=requestAnimationFrame(tick);
    };
    this._raf=requestAnimationFrame(tick);

    this.dispatchEvent(new CustomEvent('storybadge-animationstart',{bubbles:true,composed:true,detail:{durationMs:this._durationMs}}));
  }

  _stop(finished){
    if(this._raf) cancelAnimationFrame(this._raf);
    this._raf=null; this._playing=false; this._wrap?.classList.remove('sb-playing');
    if (finished) {
      const slides = this._collectSlides();
      if (slides.length) StoryViewerOverlay.open(slides);
      this._card?.dispatchEvent(new CustomEvent('storybadge-animationend',{bubbles:true,composed:true,detail:{elapsedMs:this._durationMs}}));
    }
  }

  _collectSlides(){
    const nodes = Array.from(this.querySelectorAll('[slot]'))
      .filter(n => /^\d+$/.test(n.getAttribute('slot')||''))
      .sort((a,b)=>parseInt(a.getAttribute('slot'))-parseInt(b.getAttribute('slot')));
    const slides = [];
    for (const n of nodes){
      if (n.tagName === 'IMG') {
        slides.push({ type:'image', src:n.getAttribute('src'), ms: parseInt(n.getAttribute('data-ms')||'',10) || 3000 });
      } else if (n.tagName === 'VIDEO') {
        const src = n.getAttribute('src') || (n.querySelector('source')?.getAttribute('src')) || '';
        slides.push({ type:'video', src, ms: 0 }); // durata da video
      }
    }
    return slides;
  }
}

/* ====================== Overlay full-viewport ====================== */
class StoryViewerOverlay extends HTMLElement {
  constructor(){
    super(); this.attachShadow({mode:'open'});
    this._slides=[]; this._i=0; this._raf=null; this._dur=3000;
    this.shadowRoot.innerHTML = `
      <style>
        :host{ position:fixed; inset:0; z-index:10000; display:none; }
        .back{ position:absolute; inset:0; background: rgba(0,0,0,.86); }
        .wrap{ position:absolute; inset:0; display:grid; place-items:center; overflow:hidden; }
        .stage{ position:relative; width:100%; height:100%; }
        .stage img, .stage video{ position:absolute; inset:0; width:100%; height:100%; object-fit:cover; }
        .progress{ position:absolute; top:12px; left:12px; right:12px; display:grid; grid-auto-flow:column; gap:6px; z-index:2; }
        .bar{ height:3px; background: rgba(255,255,255,.30); border-radius:999px; overflow:hidden; }
        .bar i{ display:block; height:100%; width:0%; background:#fff; }
        .hit{ position:absolute; top:0; bottom:0; width:50%; z-index:3; }
        .hit.left{ left:0; } .hit.right{ right:0; }
        .btn-close{ position:absolute; top:10px; right:10px; z-index:4; border:0; background: rgba(255,255,255,.12); color:#fff; border-radius:999px; width:36px; height:36px; cursor:pointer; }
      </style>
      <div class="back"></div>
      <div class="wrap">
        <div class="progress"></div>
        <button class="btn-close" aria-label="Chiudi">✕</button>
        <div class="stage"></div>
        <div class="hit left"  aria-label="Prev"></div>
        <div class="hit right" aria-label="Next"></div>
      </div>
    `;
    this.$prog=this.shadowRoot.querySelector('.progress');
    this.$stage=this.shadowRoot.querySelector('.stage');
    this.$left=this.shadowRoot.querySelector('.hit.left');
    this.$right=this.shadowRoot.querySelector('.hit.right');
    this.$close=this.shadowRoot.querySelector('.btn-close');

    this._onLeft=()=>this.prev();
    this._onRight=()=>this.next();
    this._onKey=(e)=>{ if(e.key==='ArrowLeft')this.prev(); if(e.key==='ArrowRight')this.next(); if(e.key==='Escape')this.close(); };
  }
  connectedCallback(){
    this.$left.addEventListener('click',this._onLeft);
    this.$right.addEventListener('click',this._onRight);
    this.$close.addEventListener('click',()=>this.close());
    window.addEventListener('keydown',this._onKey);
  }
  disconnectedCallback(){
    this.$left.removeEventListener('click',this._onLeft);
    this.$right.removeEventListener('click',this._onRight);
    window.removeEventListener('keydown',this._onKey);
  }

  static open(slides){
    if (!StoryViewerOverlay._instance){
      StoryViewerOverlay._instance = document.createElement('story-viewer-overlay');
      document.body.appendChild(StoryViewerOverlay._instance);
    }
    StoryViewerOverlay._instance._open(slides);
  }

  _open(slides){
    this._slides = slides.filter(s=>s && s.src);
    if (!this._slides.length) return;
    this.style.display='block';
    document.documentElement.style.overflow='hidden';
    this._buildBars();
    this._i=0; this._show();
  }
  close(){ cancelAnimationFrame(this._raf); this._raf=null; this.$stage.innerHTML=''; this.style.display='none'; document.documentElement.style.overflow=''; }
  prev(){ if(!this._slides.length) return; this._i=(this._i-1+this._slides.length)%this._slides.length; this._show(); }
  next(){ if(!this._slides.length) return; this._i=(this._i+1)%this._slides.length; this._show(); }

  _buildBars(){ this.$prog.innerHTML=''; for(let i=0;i<this._slides.length;i++){ const b=document.createElement('div'); b.className='bar'; const f=document.createElement('i'); b.appendChild(f); this.$prog.appendChild(b); } }

  _show(){
    cancelAnimationFrame(this._raf); this._raf=null; this.$stage.innerHTML='';
    const bars=[...this.$prog.querySelectorAll('.bar i')]; bars.forEach((i,idx)=>{ i.style.width = idx < this._i ? '100%' : '0%'; });

    const s=this._slides[this._i];
    if (s.type==='video'){
      const v=document.createElement('video');
      v.src=s.src; v.muted=true; v.playsInline=true; v.preload='auto';
      v.addEventListener('loadedmetadata', ()=>{ this._dur=Math.max(300,(v.duration||0)*1000); v.play().catch(()=>{}); this._runProgressVideo(v); }, {once:true});
      v.addEventListener('ended', ()=> this.next());
      this.$stage.appendChild(v);
    } else {
      const img=document.createElement('img'); img.src=s.src; this.$stage.appendChild(img);
      this._dur=s.ms||3000; this._runProgressTimer();
    }
  }

  _runProgressTimer(){
    const bars=[...this.$prog.querySelectorAll('.bar i')]; const active=bars[this._i];
    const start=performance.now();
    const tick=(t)=>{ const pct=Math.min(1,(t-start)/this._dur); active.style.width=`${pct*100}%`; if(pct>=1){ this.next(); return; } this._raf=requestAnimationFrame(tick); };
    this._raf=requestAnimationFrame(tick);
  }
  _runProgressVideo(video){
    const bars=[...this.$prog.querySelectorAll('.bar i')]; const active=bars[this._i];
    const step=()=>{ if(video.duration>0){ const pct=Math.min(1,video.currentTime/video.duration); active.style.width=`${pct*100}%`; if(pct>=1){ this.next(); return; } } this._raf=requestAnimationFrame(step); };
    this._raf=requestAnimationFrame(step);
  }
}
customElements.define('story-viewer-overlay', StoryViewerOverlay);

/* ========= registra il badge ========= */
customElements.define('story-badge', StoryBadge);
