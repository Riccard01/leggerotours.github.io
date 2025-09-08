// /system/blocks/review-card.js  (glow robusto: z-index sopra overlay, gradient interno + shadow)
(() => {
  if (customElements.get('review-card')) return;

  class ReviewCard extends HTMLElement {
    static get observedAttributes() {
      return ['image','images','index','autoplay','duration','safe-bottom','title','description','tag','cta','price','slogan','type-speed','bubble-position','slogan-loop'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._mounted = false;

      this._images = []; this._index = 0; this._autoplay = false; this._duration = 5000;
      this._progressRAF = null; this._startedAt = 0; this._activeFillPct = 0; this._safeBottom = 64;
      this._typeTimer = null; this._typedChars = 0; this._typingPaused = false;

      this._render();
    }

    connectedCallback() {
      this._readAll();
      this._mount();
      this._mounted = true;
      this._updateUI();
      this._startIfNeeded();
      this._onKB = (e) => {
        if (!this.isConnected) return;
        if (e.key === 'ArrowLeft')  { e.preventDefault(); this.prev(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
      };
      window.addEventListener('keydown', this._onKB);
    }

    disconnectedCallback() {
      cancelAnimationFrame(this._progressRAF);
      this._stopTyping();
      window.removeEventListener('keydown', this._onKB);
    }

    attributeChangedCallback() {
      if (!this._mounted) return;
      this._readAll();
      this._updateUI();
      this._startIfNeeded();
    }

    next(){ if (!this._images.length) return; this._index=(this._index+1)%this._images.length; this.setAttribute('index',String(this._index)); this._emitChange(); this._restartAutoplay(); }
    prev(){ if (!this._images.length) return; this._index=(this._index-1+this._images.length)%this._images.length; this.setAttribute('index',String(this._index)); this._emitChange(); this._restartAutoplay(); }
    pause(){ cancelAnimationFrame(this._progressRAF); this._progressRAF=null; this._typingPaused=true; this._stopTyping(false); }
    resume(){ this._startIfNeeded(true); if (this._slogan && this.$tw && this._typedChars < this._slogan.length){ this._typingPaused=false; this._continueTyping(); } }

    _readAll() {
      this._images = this._parseImages(this.getAttribute('images') || '');
      if (!this._images.length) { const single = this.getAttribute('image') || ''; this._images = single ? [single] : []; }
      const i = parseInt(this.getAttribute('index') || '0', 10);
      this._index = Number.isFinite(i) ? Math.max(0, Math.min(i, Math.max(0, this._images.length - 1))) : 0;
      this._autoplay = this.hasAttribute('autoplay');
      const d = parseInt(this.getAttribute('duration') || '5000', 10);
      this._duration = Number.isFinite(d) && d > 300 ? d : 5000;
      const sb = parseInt(this.getAttribute('safe-bottom') || '64', 10);
      this._safeBottom = Number.isFinite(sb) ? Math.max(0, sb) : 64;
      this._title = this.getAttribute('title') || 'Titolo esperienza';
      this._desc  = this.getAttribute('description') || 'Descrizione breve...';
      this._tag   = this.getAttribute('tag') || '';
      this._cta   = this.getAttribute('cta') || 'Scopri di più';
      this._price = this.getAttribute('price') || '';
      this._slogan = this.getAttribute('slogan') || '';
      const spd = parseInt(this.getAttribute('type-speed') || '60', 10);
      this._typeSpeed = Number.isFinite(spd) && spd >= 10 ? spd : 60;
      this._bubblePos = (this.getAttribute('bubble-position') || 'tr').toLowerCase();
      if (!['tl','tr','bl','br'].includes(this._bubblePos)) this._bubblePos = 'tr';
      this._sloganLoop = this.hasAttribute('slogan-loop');
    }

    _parseImages(raw){ if(!raw) return []; try{ const p=JSON.parse(raw); return Array.isArray(p)?p.filter(Boolean):[]; } catch{ return raw.split(',').map(s=>s.trim()).filter(Boolean); } }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host{
            --glow-delay:.30s; --glow-dur:.30s; --glow-rgb:0,160,255;
            display:flex; flex:0 0 220px; width:200px; aspect-ratio:9/16; border-radius:16px; overflow:visible; position:relative;
            transform:scale(var(--s,1)); transition:transform .24s cubic-bezier(.2,.8,.2,1); background:#0b1220; color:#fff; font-family:system-ui,sans-serif;
            box-shadow:0 10px 30px rgba(0,0,0,.35);
          }

          /* Glow robusto e sempre visibile (anche dentro la card) */
          :host::before{
            content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
            /* sopra .bg (z=0) e sopra overlay/feather (z=2), sotto contenuti (z=5) e outline (z=8) */
            z-index:3;
            opacity:0; transform:scale(1);
            /* doppio: gradient interno + shadow esterno verso il basso */
            background:
              radial-gradient(80% 70% at 50% 105%, rgba(var(--glow-rgb),.35) 0%, rgba(var(--glow-rgb),.18) 40%, rgba(0,0,0,0) 70%);
            box-shadow:
              0 28px 56px -16px rgba(var(--glow-rgb), .55),
              0 0 0 1.5px       rgba(var(--glow-rgb), .40),
              inset 0 -14px 28px     rgba(var(--glow-rgb), .28);
            transition:opacity var(--glow-dur), transform var(--glow-dur), box-shadow var(--glow-dur), background var(--glow-dur);
          }
          :host([data-active])::before{
            opacity:1; transform:scale(1);
            background:
              radial-gradient(85% 75% at 50% 108%, rgba(var(--glow-rgb),.40) 0%, rgba(var(--glow-rgb),.20) 42%, rgba(0,0,0,0) 72%);
            box-shadow:
              0 34px 70px -18px rgba(var(--glow-rgb), .60),
              0 0 0 1.5px       rgba(var(--glow-rgb), .44),
              inset 0 -16px 32px     rgba(var(--glow-rgb), .32);
          }

          :host::after{
            content:""; position:absolute; inset:0; border-radius:inherit; outline:2px solid rgba(255,255,255,.3); outline-offset:-2px; mix-blend-mode:overlay; pointer-events:none; z-index:8;
          }

          .bubble{ position:absolute; max-width:72%; top:16px; right:16px; padding:10px 12px; border-radius:14px; background:rgba(255,255,255,.96); color:#0b1220;
            font-size:14px; line-height:1.3; z-index:7; box-shadow:0 8px 24px rgba(0,0,0,.25); transform:translateY(-6px); opacity:0; transition:transform .25s, opacity .25s; }
          :host([data-bubble-pos="tl"]) .bubble{ top:16px; left:16px; right:auto; }
          :host([data-bubble-pos="bl"]) .bubble{ bottom:16px; left:16px; top:auto; right:auto; }
          :host([data-bubble-pos="br"]) .bubble{ bottom:16px; right:16px; top:auto; }
          :host([data-bubble-visible="true"]) .bubble{ transform:translateY(0); opacity:1; }
          .bubble::after{ content:""; position:absolute; width:0; height:0; border:8px solid transparent; border-top-color:rgba(255,255,255,.96); bottom:-14px; right:18px; transform:translateY(-2px); }
          :host([data-bubble-pos="tl"]) .bubble::after{ left:18px; right:auto; }
          :host([data-bubble-pos="bl"]) .bubble::after{ border-top-color:transparent; border-bottom-color:rgba(255,255,255,.96); top:-14px; bottom:auto; left:18px; }
          :host([data-bubble-pos="br"]) .bubble::after{ border-top-color:transparent; border-bottom-color:rgba(255,255,255,.96); top:-14px; bottom:auto; right:18px; }

          .caret{ display:inline-block; width:1ch; height:1em; vertical-align:-0.1em; border-right:2px solid currentColor; margin-left:2px; animation:blink 1s steps(1) infinite; }
          @keyframes blink{ 50%{ opacity:0 } }

          .clip{ position:absolute; inset:0; overflow:hidden; border-radius:inherit; }
          .price-badge{ position:absolute; top:-2rem; left:35%; padding:.28rem .6rem; z-index:9; font-size:1rem; letter-spacing:.0375rem; text-transform:uppercase;
            background:linear-gradient(180deg,#FFF 10%,#999 80%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; opacity:0; transition:opacity .18s; }
          :host([data-active]) .price-badge{ opacity:1; }

          .bg{ position:absolute; inset:0; background-size:cover; background-position:center; z-index:0; }
          .progress{ position:absolute; top:8px; left:8px; right:8px; display:grid; grid-auto-flow:column; gap:6px; z-index:4; pointer-events:none; }
          .bar{ height:3px; background:rgba(212, 39, 39, 0.35); border-radius:999px; overflow:hidden; }
          .bar>i{ display:block; height:100%; width:0%; background:rgba(255,255,255,.95); transition:width .2s linear; }
          .bar[data-done="true"]>i{ width:100%; }

          .overlay{ position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,.65) 0%,rgba(0,0,0,.35) 35%,rgba(0,0,0,.10) 60%,rgba(0,0,0,0) 85%); z-index:2; pointer-events:none; }
          .feather{ position:absolute; left:0; right:0; bottom:0; height:42%; backdrop-filter:blur(14px) saturate(110%); -webkit-backdrop-filter:blur(14px) saturate(110%);
            background:rgba(6,10,22,.12); mask-image:linear-gradient(to top,black 60%,transparent 100%); -webkit-mask-image:linear-gradient(to top,black 60%,transparent 100%); z-index:2; pointer-events:none; }

          .hit{ position:absolute; top:0; height:calc(100% - var(--safe-bottom,64px)); width:50%; z-index:3; }
          .hit.left{ left:0 } .hit.right{ right:0 }

          .content{ position:absolute; left:0; right:0; bottom:0; display:flex; flex-direction:column; gap:8px; padding:12px; z-index:5; }
          .tag{ font-size:12px; font-weight:600; color:#e2e8f0; background:rgba(37,99,235,.18); border:1px solid rgba(255,235,221,.45); padding:2px 8px; border-radius:999px; width:fit-content; }
          h3{ font-size:18px; margin:0; font-weight:700; line-height:1.2; }
          p{ font-size:14px; margin:0; color:#d1d5db; }

          .cta ::slotted(ds-button){ display:inline-block; width:auto; }
          .cta ::slotted(ds-button[full]){ display:block; width:100%; }

          :host, .hit{ -webkit-touch-callout:none; user-select:none; -webkit-user-select:none; touch-action:manipulation; }
        </style>

        <div class="price-badge" hidden></div>
        <div class="clip">
          <div class="bubble" part="bubble" aria-live="polite" hidden>
            <span class="tw"></span><i class="caret" aria-hidden="true"></i>
          </div>
          <div class="bg" part="bg"></div>
          <div class="progress" part="progress"></div>
          <div class="overlay"></div>
          <div class="feather"></div>
          <div class="hit left"  aria-label="Previous"></div>
          <div class="hit right" aria-label="Next"></div>
          <div class="content">
            <span class="tag" part="tag" style="display:none;"></span>
            <h3 part="title"></h3>
            <p part="description"></p>
          </div>
        </div>
      `;
    }

    _mount() {
      const sr = this.shadowRoot;
      this.$price = sr.querySelector('.price-badge');
      this.$bg = sr.querySelector('.bg'); this.$prog = sr.querySelector('.progress');
      this.$left = sr.querySelector('.hit.left'); this.$right = sr.querySelector('.hit.right');
      this.$tag = sr.querySelector('.tag'); this.$title = sr.querySelector('h3'); this.$desc = sr.querySelector('p');
      this.$bubble = sr.querySelector('.bubble'); this.$tw = sr.querySelector('.bubble .tw');

      this.$left.addEventListener('click', () => this.prev());
      this.$right.addEventListener('click', () => this.next());
      const down = () => this.pause(); const up = () => this.resume();
      this.$left.addEventListener('pointerdown', down);
      this.$right.addEventListener('pointerdown', down);
      window.addEventListener('pointerup', up);

      this.style.setProperty('--safe-bottom', `${this._safeBottom}px`);
    }

    _updateUI() {
      if (!this.$bg || !this.$prog || !this.$title || !this.$desc || !this.$tag || !this.$price) return;

      if (this._tag && String(this._tag).trim()) { this.$tag.style.display='inline-block'; this.$tag.textContent=this._tag; }
      else this.$tag.style.display='none';

      this.$title.textContent = this._title; this.$desc.textContent = this._desc;

      const v = (this._price||'').trim(); this.$price.textContent=v; this.$price.hidden=!v;

      const url = this._images[this._index] || ''; this.$bg.style.backgroundImage = url ? `url("${this._imageOr(url)}")` : 'none';

      // progress bars
      this.$prog.innerHTML = '';
      if (this._images.length > 1) {
        this._images.forEach((_, i) => {
          const bar = document.createElement('div'); bar.className='bar'; if (i < this._index) bar.dataset.done='true';
          const fill=document.createElement('i'); fill.style.width=(i===this._index && this._autoplay)?`${this._activeFillPct||0}%`:(i<this._index?'100%':'0%');
          bar.appendChild(fill); this.$prog.appendChild(bar);
        });
        this.$prog.style.display='grid';
      } else { this.$prog.style.display='none'; }

      if (this.$bubble) {
        this.setAttribute('data-bubble-pos', this._bubblePos);
        if (this._slogan && this._slogan.trim()) { this.$bubble.hidden=false; this.setAttribute('data-bubble-visible','true'); if (!this._typeTimer) this._startTyping(true); }
        else { this._stopTyping(true); this.$bubble.hidden=true; this.removeAttribute('data-bubble-visible'); }
      }
    }

    _imageOr(url){ return url; }

    _startIfNeeded() {
      cancelAnimationFrame(this._progressRAF); this._progressRAF=null; this._activeFillPct=0;
      if (!this._autoplay || this._images.length <= 1) { this._updateUI(); return; }
      const fills = Array.from(this.shadowRoot.querySelectorAll('.bar > i')); const active = fills[this._index]; if (!active) return;
      const duration = this._duration; const start = performance.now(); this._startedAt = start;
      const tick = (t) => {
        const pct = Math.min(1, (t - start) / duration); this._activeFillPct = pct * 100; active.style.width = `${this._activeFillPct}%`;
        if (pct >= 1) this.next(); else this._progressRAF = requestAnimationFrame(tick);
      };
      this._progressRAF = requestAnimationFrame(tick);
    }

    _restartAutoplay(){ this._updateUI(); this._startIfNeeded(); }

    _emitChange(){ this.dispatchEvent(new CustomEvent('change', { detail:{ index:this._index, total:this._images.length }, bubbles:true, composed:true })); }

    _startTyping(reset=false){
      if (!this.$tw) return;
      this._stopTyping(!reset);
      if (reset){ this.$tw.textContent=''; this._typedChars=0; }
      else { this._typedChars = this.$tw.textContent ? Math.min(this.$tw.textContent.length, this._slogan.length) : 0; }
      const step = () => {
        if (this._typingPaused) { this._typeTimer=null; return; }
        if (this._typedChars < this._slogan.length) { this.$tw.textContent += this._slogan[this._typedChars++]; this._typeTimer=setTimeout(step, this._typeSpeed); }
        else if (this._sloganLoop) { this._typeTimer=setTimeout(()=>{ this.$tw.textContent=''; this._typedChars=0; step(); },1200); }
        else { this._typeTimer=null; }
      };
      step();
    }

    _continueTyping(){
      if (!this.$tw || this._typeTimer) return;
      const step = () => {
        if (this._typingPaused) { this._typeTimer=null; return; }
        if (this._typedChars < this._slogan.length) {
          this.$tw.textContent += this._slogan[this._typedChars++];
          this._typeTimer = setTimeout(step, this._typeSpeed);
        } else if (this._sloganLoop) {
          this._typeTimer = setTimeout(() => { this.$tw.textContent=''; this._typedChars=0; step(); }, 1200);
        } else {
          this._typeTimer = null;
        }
      };
      step();
    }

    _stopTyping(clear=false){
      if (this._typeTimer){ clearTimeout(this._typeTimer); this._typeTimer=null; }
      if (clear && this.$tw){ this.$tw.textContent=''; this._typedChars=0; }
    }
  }

  customElements.define('review-card', ReviewCard);
})();
