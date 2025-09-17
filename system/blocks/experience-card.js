// /system/blocks/experience-card.js
(() => {
  if (customElements.get('experience-card')) return;

  class ExperienceCard extends HTMLElement {
    static get observedAttributes() {
      return ['image','title','description','price','time','filters','tag'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._mounted = false;
      this._render();
    }

    connectedCallback() {
      this._readAll();
      this._mount();
      this._mounted = true;
      this._updateUI();
      this._observeResize();
    }

    disconnectedCallback() {
      if (this._ro) this._ro.disconnect();
    }

    attributeChangedCallback() {
      if (!this._mounted) return;
      this._readAll();
      this._updateUI();
    }

    _readAll() {
      this._image = this.getAttribute('image') || '';
      this._title = this.getAttribute('title') || 'Titolo esperienza';
      this._desc  = this.getAttribute('description') || 'Descrizione breve...';

      // meta pills (2): prezzo + orario
      this._price = this.getAttribute('price') || 'Prezzo su richiesta';
      this._time  = this.getAttribute('time')  || 'Orario variabile';

      // filtri/chips (sopra al titolo): "filters" comma-separated o fallback "tag"
      const raw = this.getAttribute('filters') || this.getAttribute('tag') || '';
      this._filters = raw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 4); // max 4 chip
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host{
            --glow-dur:.30s;
            --glow-rgb:0,160,255;

            inline-size: var(--card-w, 220px);
            display:flex; border-radius:16px;
            position:relative; overflow:visible;
            transform:scale(var(--s,1));
            transform-origin:center center;
            transition:transform .28s cubic-bezier(.22,.61,.36,1);
            background:#0b1220; color:#fff;
            font-family:system-ui, sans-serif; box-shadow:0 10px 30px rgba(0,0,0,.35);
            will-change: transform;
            aspect-ratio:9/16;
            width: 260px;
          }
* {
  font-family: 'Plus Jakarta Sans' !important;
}
          @media (hover: hover) and (pointer: fine){
            :host(:hover){ transform: scale(1.07); }
          }
          @media (hover: none) and (pointer: coarse){
            :host([data-active]){ transform: scale(1.08); }
          }

          /* Glow */
          :host::before{
            content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none;
            z-index:3; opacity:0; transform:scale(1);
            background:
              radial-gradient(82% 72% at 50% 106%, rgba(var(--glow-rgb),.34) 0%, rgba(var(--glow-rgb),.16) 40%, rgba(0,0,0,0) 70%);
            box-shadow:
              0 28px 56px -16px rgba(var(--glow-rgb), .55),
              0 0 0 1.5px       rgba(var(--glow-rgb), .40),
              inset 0 -14px 28px     rgba(var(--glow-rgb), .28);
            transition: opacity var(--glow-dur), transform var(--glow-dur), box-shadow var(--glow-dur), background var(--glow-dur);
          }
          :host([data-active])::before{
            opacity:1; transform:scale(1);
            background:
              radial-gradient(86% 76% at 50% 109%, rgba(var(--glow-rgb),.40) 0%, rgba(var(--glow-rgb),.20) 42%, rgba(0,0,0,0) 72%);
            box-shadow:
              0 34px 70px -18px rgba(var(--glow-rgb), .60),
              0 0 0 1.5px       rgba(var(--glow-rgb), .44),
              inset 0 -16px 32px     rgba(var(--glow-rgb), .32);
          }

          /* Outline */
          :host::after{
            content:""; position:absolute; inset:0; border-radius:inherit; outline:2px solid rgba(255,255,255,.3);
            outline-offset:-2px; mix-blend-mode:overlay; pointer-events:none; z-index:6;
          }

          .clip{ position:absolute; inset:0; overflow:hidden; border-radius:inherit; }
          .shine{ position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:12; }
          .shine::before{ content:""; position:absolute; top:-150%; left:-50%; width:200%; height:150%;
            background:linear-gradient(120deg,transparent 20%,rgba(255,255,255,.55) 50%,transparent 80%);
            transform:rotate(25deg); opacity:0; }
          :host([data-active]) .shine::before{ animation:shine-slide 1.6s ease-in-out .28s forwards; }
          @keyframes shine-slide{ 0%{top:-150%;opacity:0} 25%{opacity:.85} 55%{top:0%;opacity:.95} 100%{top:150%;opacity:0} }

          .bg{ position:absolute; inset:0; background-size:cover; background-position:center; z-index:0; }
          .overlay{ position:absolute; inset:0; pointer-events:none; z-index:2;
            background:linear-gradient(to top,rgba(0,0,0,.65) 0%,rgba(0,0,0,.35) 35%,rgba(0,0,0,.10) 60%,rgba(0,0,0,0) 85%); }
          .feather{ position:absolute; left:0; right:0; bottom:0; height:42%;
            backdrop-filter:blur(14px) saturate(110%); -webkit-backdrop-filter:blur(14px) saturate(110%);
            background:rgba(6,10,22,.12); mask-image:linear-gradient(to top,black 60%,transparent 100%);
            -webkit-mask-image:linear-gradient(to top,black 60%,transparent 100%); z-index:2; pointer-events:none; }

          .content{
            position:absolute; left:0; right:0; bottom:0;
            display:flex; flex-direction:column; gap:6px; /* gap ridotto */
            padding:12px; z-index:5;
          }

          /* RIGHE TAG: no wrap + shrink */
          .filters, .meta{
            display:flex; align-items:center; gap:6px;
            flex-wrap:nowrap; overflow:hidden;
            margin:0; padding:0;
            /* la dimensione testo dei tag viene controllata via --tag-fs */
            --tag-fs: 11px;
          }

          /* ordine: prima filtri, poi meta, poi titolo, poi descrizione */
          .filters{ margin-bottom:2px; }
          .meta{ margin-bottom:4px; }

          .chip, .pill{
            font-size: var(--tag-fs);
            font-weight:700;
            line-height:1;
            white-space:nowrap;
            flex: 0 1 auto;  /* permetti shrink */
            min-width:0;
            padding:6px 8px;
            border-radius:999px;
            border:1px solid rgba(255,255,255,.28);
            letter-spacing:.02em;
            width: fit-content;
          }
          .chip{
            color:#bfe6ff;
            background:rgba(0,160,255,.10);
          }
          .pill{
            color:#e2f2ff;
            background:rgba(37,99,235,.18);
            border-color:rgba(255,255,255,.35);
          }

          h3{ font-size:18px; margin:0; font-weight:700; line-height:1.18; }
          p{ font-size:14px; margin:0; color:#d1d5db; }

          .cta{ margin-top:8px; }
          .cta ::slotted(ds-button){ display:inline-block; width:auto; }
          .cta ::slotted(ds-button[full]){ display:block; width:100%; }
        </style>

        <div class="clip">
          <div class="bg" part="bg"></div>
          <div class="overlay"></div>
          <div class="feather"></div>

          <div class="content">
            <!-- TAG sopra al titolo -->
            <div class="filters" part="filters" hidden></div>
            <div class="meta">
              <span class="pill pill-price" part="price"></span>
              <span class="pill pill-time"  part="time"></span>
            </div>

            <h3 part="title"></h3>
            <p part="description"></p>

            <div class="cta" part="cta">
              <slot name="cta">
                <ds-button variant="with-icon-light" size="md">
                  <img class="icon" src="/assets/icons/brands/whatsapp.svg" alt="">
                </ds-button>
              </slot>
            </div>
          </div>

          <div class="shine"></div>
        </div>
      `;
    }

    _mount() {
      this.$bg    = this.shadowRoot.querySelector('.bg');
      this.$title = this.shadowRoot.querySelector('h3');
      this.$desc  = this.shadowRoot.querySelector('p');
      this.$filters = this.shadowRoot.querySelector('.filters');
      this.$meta = this.shadowRoot.querySelector('.meta');
      this.$pillPrice = this.shadowRoot.querySelector('.pill-price');
      this.$pillTime  = this.shadowRoot.querySelector('.pill-time');
    }

    _updateUI() {
      if (!this.$bg || !this.$title || !this.$desc) return;

      this.$bg.style.backgroundImage = this._image ? `url("${this._image}")` : 'none';
      this.$title.textContent = this._title;
      this.$desc.textContent  = this._desc;

      // FILTRI
      if (this._filters && this._filters.length){
        this.$filters.hidden = false;
        this.$filters.innerHTML = '';
        this._filters.forEach(f => {
          const s = document.createElement('span');
          s.className = 'chip';
          s.textContent = f;
          this.$filters.appendChild(s);
        });
      } else {
        this.$filters.hidden = true;
        this.$filters.innerHTML = '';
      }

      // META (2 tag): prezzo + orario
      this.$pillPrice.textContent = this._price || 'Prezzo su richiesta';
      this.$pillTime.textContent  = this._time  || 'Orario variabile';

      // Fit su una sola riga per i contenitori tag
      this._fitRow(this.$filters);
      this._fitRow(this.$meta);
    }

    _fitRow(row){
      if (!row || row.hidden) return;
      // reset a dimensione base
      row.style.setProperty('--tag-fs', '11px');
      const max = 11, min = 9;
      // se non sta su una riga, riduci font-size gradualmente
      let fs = max, guard = 0;
      while (row.scrollWidth > row.clientWidth && fs > min && guard < 8) {
        fs -= 0.5;
        row.style.setProperty('--tag-fs', fs + 'px');
        guard++;
      }
      // come ulteriore protezione, nascondi l’eventuale overflow visuale
      row.style.overflow = 'hidden';
    }

    _observeResize(){
      if (this._ro) this._ro.disconnect();
      this._ro = new ResizeObserver(() => {
        this._fitRow(this.$filters);
        this._fitRow(this.$meta);
      });
      this._ro.observe(this);
    }
  }

  customElements.define('experience-card', ExperienceCard);
})();
