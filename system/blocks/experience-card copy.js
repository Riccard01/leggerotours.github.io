// /system/blocks/experience-card.js
class ExperienceCard extends HTMLElement {
  static get observedAttributes() {
    // reagisce ai cambi di immagine singola e alle stories + testo + prezzo
    return [
      'image', 'images', 'index', 'autoplay', 'duration', 'safe-bottom',
      'title', 'description', 'tag', 'cta', 'price'
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // stato interno
    this._images = [];         // lista immagini per "storia"
    this._index = 0;           // immagine corrente
    this._autoplay = false;    // scorrimento automatico
    this._duration = 5000;     // ms per slide
    this._progressRAF = null;  // requestAnimationFrame id
    this._startedAt = 0;       // timestamp inizio slide corrente
    this._activeFillPct = 0;   // % riempimento barra corrente
    this._safeBottom = 64;     // px area non interattiva in basso (CTA/testo)

    this._render();
  }

  // --- lifecycle ---
  connectedCallback() {
    this._upgradeProps();
    this._readAll();
    this._mount();
    this._updateUI();
    this._startIfNeeded();

    // opzionale: frecce tastiera
    this._bindKB = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.prev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); this.next(); }
    };
    window.addEventListener('keydown', this._bindKB);
  }

  disconnectedCallback() {
    cancelAnimationFrame(this._progressRAF);
    window.removeEventListener('keydown', this._bindKB);
  }

  attributeChangedCallback() {
    if (!this.isConnected) return;
    this._readAll();
    this._updateUI();
    this._startIfNeeded();
  }

  // --- API pubblica ---
  next() {
    if (!this._images.length) return;
    this._index = (this._index + 1) % this._images.length;
    this.setAttribute('index', String(this._index));
    this._emitChange();
    this._restartAutoplay();
  }

  prev() {
    if (!this._images.length) return;
    this._index = (this._index - 1 + this._images.length) % this._images.length;
    this.setAttribute('index', String(this._index));
    this._emitChange();
    this._restartAutoplay();
  }

  pause()  { cancelAnimationFrame(this._progressRAF); this._progressRAF = null; }
  resume() { this._startIfNeeded(true); }

  // --- internal: lettura attributi/stato ---
  _upgradeProps() {
    // supporta set di proprietà prima del define
    ['image','images','index','autoplay','duration','safe-bottom','title','description','tag','cta','price'].forEach((p) => {
      if (Object.prototype.hasOwnProperty.call(this, p)) {
        const v = this[p]; delete this[p]; this[p] = v;
      }
    });
  }

  _readAll() {
    // immagini stories: "images" (CSV o JSON). Se assente → usa "image" singola.
    this._images = this._parseImages(this.getAttribute('images') || '');
    // fallback a singola immagine
    if (!this._images.length) {
      const single = this.getAttribute('image') || '';
      this._images = single ? [single] : [];
    }

    // index
    const i = parseInt(this.getAttribute('index') || '0', 10);
    const max = Math.max(0, this._images.length - 1);
    this._index = Number.isFinite(i) ? Math.max(0, Math.min(i, max)) : 0;

    // autoplay
    this._autoplay = this.hasAttribute('autoplay');

    // durata
    const d = parseInt(this.getAttribute('duration') || '5000', 10);
    this._duration = Number.isFinite(d) && d > 300 ? d : 5000;

    // safe-bottom
    const sb = parseInt(this.getAttribute('safe-bottom') || '64', 10);
    this._safeBottom = Number.isFinite(sb) ? Math.max(0, sb) : 64;

    // variabili testo/CTA
    this._title = this.getAttribute('title') || 'Titolo esperienza';
    this._desc  = this.getAttribute('description') || 'Descrizione breve...';
    this._tag   = this.getAttribute('tag') || '';
    this._cta   = this.getAttribute('cta') || 'Scopri di più';

    // prezzo (stringa libera: es. "€570", "da €570", "€ 570 a persona")
    this._price = this.getAttribute('price') || '';
  }

  _parseImages(raw) {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // --- render/mount ---
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        /* ====== Glow animato con delay ed espansione ====== */
        :host {
          /* timing */
          --glow-delay: .30s;   /* parte poco dopo la scala */
          --glow-dur:   .62s;   /* durata del glow */
          --glow-rgb:   0,160,255; /* colore RGB del glow */

          display: flex;
          flex: 0 0 220px;
          width: auto;
          height: auto;
          aspect-ratio: 9 / 16;
          border-radius: var(--radius-lg,16px);
          overflow: visible;
          position: relative;

          transform: scale(var(--s, 1));
          transition: transform .24s cubic-bezier(.2,.8,.2,1);
          will-change: transform;

          background: var(--neutral-950,#0b1220);
          font-family: var(--font-sans, 'Plus Jakarta Sans', system-ui, sans-serif);
          color: var(--text-on-inverse,#fff);
          box-shadow: var(--shadow-xl, 0 10px 30px rgba(0,0,0,.35)); /* ombra base */
          
        }
        /* layer glow */
        :host::before{
          content: "";
          position: absolute;
          inset: 0;                /* non sborda */
          border-radius: inherit;
          pointer-events: none;
          z-index: 0;

          opacity: 0;
          transform: scale(.9);
          box-shadow: 0 0 0 0 rgba(var(--glow-rgb), 0);

          transition:
            opacity    var(--glow-dur) cubic-bezier(.2,.8,.2,1) var(--glow-delay),
            transform  var(--glow-dur) cubic-bezier(.2,.8,.2,1) var(--glow-delay),
            box-shadow var(--glow-dur) cubic-bezier(.2,.8,.2,1) var(--glow-delay);
        }
        :host([data-active])::before{
          opacity: 1;
          transform: scale(1);
          box-shadow:
            0 16px 44px rgba(var(--glow-rgb), .42),
            0 0 0 2px rgba(var(--glow-rgb), .48),
            0 0 110px 26px rgba(var(--glow-rgb), .68);
        }
        @media (prefers-reduced-motion: reduce){
          :host, :host::before { transition: none; }
        }

        /* contenitore che mantiene il clipping dei bordi */
        .clip {
          position: absolute;
          inset: 0;
          overflow: hidden;
          border-radius: inherit;
        }

        /* Bordo overlay sopra a tutto (rimane coerente con i bordi) */
        :host::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          outline: 3px solid rgba(255,255,255,0.6);
          outline-offset: -3px;
          mix-blend-mode: overlay;
          pointer-events: none;
          z-index: 6;
        }
        :host(:hover) { transform: scale(1.03); }
/* --- Effetto SHINE riflesso --- */
.shine {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  overflow: hidden;
  pointer-events: none;
  z-index: 12;
}

.shine::before {
  content: "";
  position: absolute;
  top: -150%;
  left: -50%;
  width: 200%;
  height: 150%;
  background: linear-gradient(
    120deg,
    transparent 20%,
    rgba(255,255,255,0.6) 50%,
    transparent 80%
  );
  transform: rotate(25deg);
  opacity: 0;
}

/* animazione shine solo quando attiva */
:host([data-active]) .shine::before {
  animation: shine-slide var(--shine-dur, 2.2s) ease-in-out var(--shine-delay, 0.35s) forwards;
}

@keyframes shine-slide {
  0%   { top: -150%; opacity: 0; }
  20%  { opacity: 1; }
  50%  { top: 0%;    opacity: .9; }
  80%  { opacity: 1; }
  100% { top: 150%;  opacity: 0; }
}

        /* --- BADGE PREZZO (top-left, solo quando attiva) --- */
        .price-badge {
          display: flex;
          justify-content: center;
          width: 100%;
          position: absolute;
          top: -2rem;
          pointer-events: none;
          z-index: 7;

          font-size: .9rem;
          font-style: normal;
          font-weight: 400;
          line-height: normal;
          letter-spacing: 0.0375rem;
          text-transform: uppercase;
          text-shadow: 0 0 4px rgba(255, 255, 255, 0.20);

          background: linear-gradient(180deg, #FFF 100%, #999 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;

          opacity: 0;
          transition: opacity .18s ease;
        }
        :host([data-active]) .price-badge { opacity: 1; }
/* Normalizza lo slot della CTA quando usi <ds-button> */
.cta ::slotted(ds-button){ display:inline-block; width:auto; }   /* fit-content */
.cta ::slotted(ds-button[full]){ display:block; width:100%; }    /* fill */

        /* Sfondo immagine */
        .bg {
          position:absolute; inset:0;
          background-image: none;
          background-size: cover;
          background-position: center;
          z-index: 0;
        }

        /* Layer di overlay e feather (non bloccano click) */
        .overlay {
          position:absolute; inset:0;
          background: linear-gradient(to top,
            rgba(0,0,0,.65) 0%,
            rgba(0,0,0,.35) 35%,
            rgba(0,0,0,.10) 60%,
            rgba(0,0,0,0) 85%);
          z-index: 2;
          pointer-events: none;
        }
        .feather {
          position:absolute; left:0; right:0; bottom:0;
          height:42%;
          backdrop-filter: blur(14px) saturate(110%);
          -webkit-backdrop-filter: blur(14px) saturate(110%);
          background: rgba(6,10,22,.12);
          mask-image: linear-gradient(to top, black 60%, transparent 100%);
          -webkit-mask-image: linear-gradient(to top, black 60%, transparent 100%);
          z-index: 2;
          pointer-events: none;
        }

        /* Contenuto */
        .content {
          position:absolute; left:0; right:0; bottom:0;
          display:flex; flex-direction:column;
          gap: var(--space-2,8px);
          padding: var(--space-3,12px);
          z-index: 5; /* sopra overlay e progress */
        }
        .tag {
          font-size: var(--font-xs,12px);
          font-weight: 600;
          color: var(--neutral-200,#e2e8f0);
          background: rgba(37,99,235,.18);
          border: 1px solid rgba(255, 235, 221, 0.45);
          padding: 2px 8px;
          border-radius: 999px;
          width: fit-content;
        }
        h3 {
          font-size: var(--font-lg,18px);
          margin: 0;
          font-weight: 700;
          line-height: 1.2;
        }
        p {
          font-size: var(--font-sm,14px);
          margin: 0;
          flex-grow:1;
          color: var(--neutral-300,#d1d5db);
        }
        .cta { margin-top: var(--space-2,8px); }

        /* Progress bar “stories” in alto */
        .progress {
          position:absolute; top:8px; left:8px; right:8px;
          display:grid; grid-auto-flow:column; gap:6px;
          z-index: 4; /* sotto al contenuto, sopra overlay */
          pointer-events: none;
        }
        .bar {
          height: 3px;
          background: rgba(255,255,255,.35);
          border-radius: 999px;
          overflow: hidden;
        }
        .bar > i {
          display:block;
          height:100%;
          width:0%;
          background: rgba(255,255,255,.95);
          transition: width .2s linear;
        }
        .bar[data-done="true"] > i { width:100%; }

        /* Zone touch/click 50/50 – non coprono la fascia bassa (safe-bottom) */
        .hit {
          position:absolute;
          top:0;
          height: calc(100% - var(--safe-bottom, 64px));
          width:50%;
          z-index: 3;
        }
        .hit.left  { left:0; }
        .hit.right { right:0; }

        /* Evita selezioni/testi durante tap */
        :host, .hit {
          -webkit-touch-callout: none;
          user-select: none;
          -webkit-user-select: none;
          touch-action: manipulation;
        }
      </style>

      <!-- Badge prezzo (fuori dal clipping per poter “uscire” dai bordi -->
      <div class="price-badge" hidden></div>

      <!-- Tutto il resto viene “clippato” ai bordi -->
      <div class="clip">
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
          <div class="cta" part="cta">
            <slot name="cta">
              <ds-button variant="with-icon-light" size="md">
                <img class="icon" src="/assets/icons/brands/whatsapp.svg" alt="" />
              </ds-button>
            </slot>
          </div>
        </div>
        <div class="shine"></div>

      </div>
    `;
  }

  _mount() {
    this.$price = this.shadowRoot.querySelector('.price-badge');
    this.$bg    = this.shadowRoot.querySelector('.bg');
    this.$prog  = this.shadowRoot.querySelector('.progress');
    this.$left  = this.shadowRoot.querySelector('.hit.left');
    this.$right = this.shadowRoot.querySelector('.hit.right');
    this.$tag   = this.shadowRoot.querySelector('.tag');
    this.$title = this.shadowRoot.querySelector('h3');
    this.$desc  = this.shadowRoot.querySelector('p');

    // click/tap
    this.$left.addEventListener('click',  () => this.prev());
    this.$right.addEventListener('click', () => this.next());

    // hold to pause / resume
    const down = () => this.pause();
    const up   = () => this.resume();
    this.$left.addEventListener('pointerdown', down);
    this.$right.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);

    // imposta safe-bottom CSS var
    this.style.setProperty('--safe-bottom', `${this._safeBottom}px`);
  }

  // --- UI update ---
  _updateUI() {
    // tag
    if (this.$tag) {
      if (this._tag && String(this._tag).trim()) {
        this.$tag.style.display = 'inline-block';
        this.$tag.textContent = this._tag;
      } else {
        this.$tag.style.display = 'none';
      }
    }

    // titolo/descrizione
    if (this.$title) this.$title.textContent = this._title;
    if (this.$desc)  this.$desc.textContent  = this._desc;

    // prezzo
    this._renderPrice();

    // immagine corrente
    const url = this._images[this._index] || '';
    if (this.$bg) this.$bg.style.backgroundImage = url ? `url("${url}")` : 'none';

    // progress bars
    this.$prog.innerHTML = '';
    if (this._images.length > 1) {
      this._images.forEach((_, i) => {
        const bar = document.createElement('div');
        bar.className = 'bar';
        if (i < this._index) bar.dataset.done = 'true';
        const fill = document.createElement('i');
        fill.style.width = (i === this._index && this._autoplay)
          ? `${this._activeFillPct || 0}%`
          : (i < this._index ? '100%' : '0%');
        bar.appendChild(fill);
        this.$prog.appendChild(bar);
      });
      this.$prog.style.display = 'grid';
    } else {
      this.$prog.style.display = 'none';
    }
  }

  _renderPrice() {
    if (!this.$price) return;
    const v = (this._price || '').trim();
    if (v) {
      this.$price.textContent = v;
      this.$price.hidden = false;
    } else {
      this.$price.hidden = true;
    }
  }

  // --- autoplay/progress ---
  _startIfNeeded() {
    cancelAnimationFrame(this._progressRAF);
    this._progressRAF = null;
    this._activeFillPct = 0;

    if (!this._autoplay || this._images.length <= 1) {
      this._updateUI(); // reset width a 0/100
      return;
    }

    // (ri)avvia la progress bar della slide corrente
    const fills = Array.from(this.shadowRoot.querySelectorAll('.bar > i'));
    const active = fills[this._index];
    if (!active) return;

    const duration = this._duration;
    const start = performance.now();
    this._startedAt = start;

    const tick = (t) => {
      const elapsed = t - start;
      const pct = Math.min(1, elapsed / duration);
      this._activeFillPct = pct * 100;
      active.style.width = `${this._activeFillPct}%`;
      if (pct >= 1) {
        this.next();
      } else {
        this._progressRAF = requestAnimationFrame(tick);
      }
    };
    this._progressRAF = requestAnimationFrame(tick);
  }

  _restartAutoplay() {
    this._updateUI();
    this._startIfNeeded();
  }

  _emitChange() {
    this.dispatchEvent(new CustomEvent('change', {
      detail: { index: this._index, total: this._images.length },
      bubbles: true, composed: true
    }));
  }
}

customElements.define('experience-card', ExperienceCard);
