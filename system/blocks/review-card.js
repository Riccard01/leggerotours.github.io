// /system/blocks/review-card.js  (static card: no stories, no avatar)
(() => {
  if (customElements.get('review-card')) return;

  class ReviewCard extends HTMLElement {
    static get observedAttributes() {
      return [
        'image','safe-bottom','title','description','tag','cta','price',
        'slogan','type-speed','bubble-position','slogan-loop',
        'platform-logo','platform-alt'
      ];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._mounted = false;

      this._safeBottom = 64;
      this._typeTimer = null; this._typedChars = 0; this._typingPaused = false;

      this._render();
    }

    connectedCallback() {
      this._readAll();
      this._mount();
      this._mounted = true;
      this._updateUI();
      this._onKB = (e) => { /* nessuna navigazione storie */ };
      window.addEventListener('keydown', this._onKB);
    }

    disconnectedCallback() {
      this._stopTyping();
      window.removeEventListener('keydown', this._onKB);
    }

    attributeChangedCallback() {
      if (!this._mounted) return;
      this._readAll();
      this._updateUI();
    }

    // --- Lettura attributi (niente "stories")
    _readAll() {
      this._image = this.getAttribute('image') || '';
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

      // Badge piattaforma
      this._platformLogo = this.getAttribute('platform-logo') || '';
      this._platformAlt  = this.getAttribute('platform-alt')  || 'Logo piattaforma recensione';
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host{
            --glow-dur:.30s; --glow-rgb:0,160,255;
            display:flex; flex:0 0 220px; width:200px; aspect-ratio:9/16; border-radius:16px; overflow:visible; position:relative;
            transform:scale(var(--s,1)); transition:transform .24s cubic-bezier(.2,.8,.2,1); background:#0b1220; color:#fff; font-family:system-ui,sans-serif;
            box-shadow:0 10px 30px rgba(0,0,0,.35);
          }
          *{ font-family:'Plus Jakarta Sans', system-ui, sans-serif !important; }

          /* Glow robusto (sempre visibile quando host ha [data-active]) */
          :host::before{
            content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
            z-index:3; opacity:1;
            background:radial-gradient(85% 75% at 50% 108%, rgba(var(--glow-rgb),.40) 0%, rgba(var(--glow-rgb),.20) 42%, rgba(0,0,0,0) 72%);
            box-shadow:
              0 34px 70px -18px rgba(var(--glow-rgb), .60),
              0 0 0 1.5px       rgba(var(--glow-rgb), .44),
              inset 0 -16px 32px     rgba(var(--glow-rgb), .32);
            transition:opacity var(--glow-dur), transform var(--glow-dur), box-shadow var(--glow-dur), background var(--glow-dur);
          }

          :host::after{
            content:""; position:absolute; inset:0; border-radius:inherit; outline:2px solid rgba(255,255,255,.3); outline-offset:-2px; mix-blend-mode:overlay; pointer-events:none; z-index:8;
          }

          .bubble{ position:absolute; max-width:72%; top:16px; right:16px; padding:10px 12px; border-radius:14px; background:rgba(255,255,255,.96); color:#0b1220;
            font-size:14px; line-height:1.3; z-index:7; box-shadow:0 8px 24px rgba(0,0,0,.25); transform:translateY(0); opacity:1; }
          :host([data-bubble-pos="tl"]) .bubble{ top:16px; left:16px; right:auto; }
          :host([data-bubble-pos="bl"]) .bubble{ bottom:16px; left:16px; top:auto; right:auto; }
          :host([data-bubble-pos="br"]) .bubble{ bottom:16px; right:16px; top:auto; }
          .caret{ display:inline-block; width:1ch; height:1em; vertical-align:-0.1em; border-right:2px solid currentColor; margin-left:2px; animation:blink 1s steps(1) infinite; }
          @keyframes blink{ 50%{ opacity:0 } }

          .clip{ position:absolute; inset:0; overflow:hidden; border-radius:inherit; }
          .price-badge{ position:absolute; top:-2rem; left:35%; padding:.28rem .6rem; z-index:9; font-size:1rem; letter-spacing:.0375rem; text-transform:uppercase;
            background:linear-gradient(180deg,#FFF 10%,#999 80%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; opacity:1; }

          .bg{ position:absolute; inset:0; background-size:cover; background-position:center; z-index:0; }
          .overlay{ position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,.65) 0%,rgba(0,0,0,.35) 35%,rgba(0,0,0,.10) 60%,rgba(0,0,0,0) 85%); z-index:2; pointer-events:none; }
          .feather{ position:absolute; left:0; right:0; bottom:0; height:42%; backdrop-filter:blur(14px) saturate(110%); -webkit-backdrop-filter:blur(14px) saturate(110%);
            background:rgba(6,10,22,.12); mask-image:linear-gradient(to top,black 60%,transparent 100%); -webkit-mask-image:linear-gradient(to top,black 60%,transparent 100%); z-index:2; pointer-events:none; }

          .content{ position:absolute; left:0; right:0; bottom:0; display:flex; flex-direction:column; gap:8px; padding:12px; z-index:5; }
          .tag{ font-size:12px; font-weight:600; color:#e2e8f0; background:rgba(37,99,235,.18); border:1px solid rgba(255,235,221,.45); padding:2px 8px; border-radius:999px; width:fit-content; }
          h3{ font-size:18px; margin:0; font-weight:700; line-height:1.2; }
          p{ font-size:14px; margin:0; color:#d1d5db; }

          :host, .content{ -webkit-touch-callout:none; user-select:none; -webkit-user-select:none; touch-action:manipulation; }

          /* Badge piattaforma (logo in alto a destra) */
          .platform-badge{
            position:absolute; top:10px; right:10px;
            width:28px; height:28px;
            z-index:6;

            backdrop-filter:blur(8px) saturate(120%);
            -webkit-backdrop-filter:blur(8px) saturate(120%);
            overflow:hidden; display:flex; align-items:center; justify-content:center;
            pointer-events:none;
            
          }
          .platform-badge img{
            display:block; width:100%; height:100%; object-fit:contain;
            filter: drop-shadow(0 1px 2px rgba(0,0,0,.25));
          }
        </style>

        <div class="price-badge" hidden></div>
        <div class="clip">
          <div class="bubble" part="bubble" aria-live="polite" hidden>
            <span class="tw"></span><i class="caret" aria-hidden="true"></i>
          </div>

          <div class="platform-badge" part="platform-badge" aria-hidden="true" hidden>
            <img alt="" />
          </div>

          <div class="bg" part="bg"></div>
          <div class="overlay"></div>
          <div class="feather"></div>

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
      this.$bg = sr.querySelector('.bg');
      this.$tag = sr.querySelector('.tag'); this.$title = sr.querySelector('h3'); this.$desc = sr.querySelector('p');
      this.$bubble = sr.querySelector('.bubble'); this.$tw = sr.querySelector('.bubble .tw');
      this.$platform = sr.querySelector('.platform-badge');
      this.$platformImg = this.$platform?.querySelector('img') || null;

      this.style.setProperty('--safe-bottom', `${this._safeBottom}px`);
    }

    _updateUI() {
      if (!this.$bg || !this.$title || !this.$desc || !this.$tag || !this.$price) return;

      // tag
      if (this._tag && String(this._tag).trim()) { this.$tag.style.display='inline-block'; this.$tag.textContent=this._tag; }
      else this.$tag.style.display='none';

      // testo
      this.$title.textContent = this._title;
      this.$desc.textContent  = this._desc;

      // prezzo
      const v = (this._price||'').trim(); this.$price.textContent=v; this.$price.hidden=!v;

      // immagine singola
      const url = this._image || '';
      this.$bg.style.backgroundImage = url ? `url("${url}")` : 'none';

      // bubble typing
      this.setAttribute('data-bubble-pos', this._bubblePos);
      if (this._slogan && this._slogan.trim()) {
        this.$bubble.hidden=false; this.setAttribute('data-bubble-visible','true');
        if (!this._typeTimer) this._startTyping(true);
      } else {
        this._stopTyping(true); this.$bubble.hidden=true; this.removeAttribute('data-bubble-visible');
      }

      // badge piattaforma
      if (this.$platform && this.$platformImg) {
        const hasLogo = !!(this._platformLogo && this._platformLogo.trim());
        this.$platform.hidden = !hasLogo;
        if (hasLogo) {
          this.$platformImg.src = this._platformLogo;
          this.$platformImg.alt = this._platformAlt || 'Logo piattaforma recensione';
          this.$platform.setAttribute('aria-hidden', 'false');
          this.$platformImg.decoding = 'async';
          this.$platformImg.loading = 'lazy';
        } else {
          this.$platformImg.removeAttribute('src');
          this.$platform.setAttribute('aria-hidden', 'true');
        }
      }
    }

    // --- typing per slogan (rimane)
    _startTyping(reset=false){
      if (!this.$tw) return;
      this._stopTyping(!reset);
      if (reset){ this.$tw.textContent=''; this._typedChars=0; }
      else { this._typedChars = this.$tw.textContent ? Math.min(this.$tw.textContent.length, this._slogan.length) : 0; }
      const step = () => {
        if (this._typedChars < this._slogan.length) {
          this.$tw.textContent += this._slogan[this._typedChars++];
          this._typeTimer = setTimeout(step, this._typeSpeed);
        } else if (this._sloganLoop) {
          this._typeTimer = setTimeout(()=>{ this.$tw.textContent=''; this._typedChars=0; step(); },1200);
        } else {
          this._typeTimer=null;
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
