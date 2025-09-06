// /system/blocks/boat-card.js  (MIN + guards)
(() => {
  if (customElements.get('boat-card')) return;

  class BoatCard extends HTMLElement {
    static get observedAttributes() { return ['image','title','description','tag','price']; }

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
      this._tag   = this.getAttribute('tag') || '';
      this._price = this.getAttribute('price') || '';
    }

    _render() {
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            --glow-delay:.30s; --glow-dur:.62s; --glow-rgb:0,160,255;
            display:flex; flex:0 0 220px; width:auto; aspect-ratio:9/16;
            border-radius:16px; position:relative; overflow:visible;
            transform:scale(var(--s,1)); transition:transform .24s cubic-bezier(.2,.8,.2,1);
            background:#0b1220; color:#fff; font-family:system-ui, sans-serif;
            box-shadow:0 10px 30px rgba(0,0,0,.35);
          }
          :host(:hover){ transform:scale(1.03); }
          :host::before{ content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:0;
            opacity:0; transform:scale(.9); box-shadow:0 0 0 0 rgba(var(--glow-rgb),0);
            transition:opacity var(--glow-dur) .0s, transform var(--glow-dur) .0s, box-shadow var(--glow-dur) .0s;
          }
          :host([data-active])::before{
            opacity:1; transform:scale(1);
            box-shadow:0 16px 44px rgba(var(--glow-rgb),.42),0 0 0 2px rgba(var(--glow-rgb),.48),0 0 110px 26px rgba(var(--glow-rgb),.68);
          }
          :host::after{ content:""; position:absolute; inset:0; border-radius:inherit; outline:3px solid rgba(255,255,255,.6);
            outline-offset:-3px; mix-blend-mode:overlay; pointer-events:none; z-index:6; }
          .clip{ position:absolute; inset:0; overflow:hidden; border-radius:inherit; }
          .shine{ position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:12; }
          .shine::before{ content:""; position:absolute; top:-150%; left:-50%; width:200%; height:150%;
            background:linear-gradient(120deg,transparent 20%,rgba(255,255,255,.55) 50%,transparent 80%);
            transform:rotate(25deg); opacity:0; }
          :host([data-active]) .shine::before{ animation:shine-slide 1.6s ease-in-out .28s forwards; }
          @keyframes shine-slide{ 0%{top:-150%;opacity:0} 25%{opacity:.85} 55%{top:0%;opacity:.95} 100%{top:150%;opacity:0} }
          .price-badge{ position:absolute; top:-2rem; left:0; right:0; display:flex; justify-content:center; pointer-events:none; z-index:7;
            font:400 .9rem/1 system-ui; letter-spacing:.0375rem; text-transform:uppercase; text-shadow:0 0 4px rgba(255,255,255,.2);
            background:linear-gradient(180deg,#FFF 0%,#999 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
            opacity:0; transition:opacity .18s ease; }
          :host([data-active]) .price-badge{ opacity:1; }
          .bg{ position:absolute; inset:0; background-size:cover; background-position:center; z-index:0; }
          .overlay{ position:absolute; inset:0; pointer-events:none; z-index:2;
            background:linear-gradient(to top,rgba(0,0,0,.65) 0%,rgba(0,0,0,.35) 35%,rgba(0,0,0,.10) 60%,rgba(0,0,0,0) 85%); }
          .feather{ position:absolute; left:0; right:0; bottom:0; height:42%;
            backdrop-filter:blur(14px) saturate(110%); -webkit-backdrop-filter:blur(14px) saturate(110%);
            background:rgba(6,10,22,.12); mask-image:linear-gradient(to top,black 60%,transparent 100%);
            -webkit-mask-image:linear-gradient(to top,black 60%,transparent 100%); z-index:2; pointer-events:none; }
          .content{ position:absolute; left:0; right:0; bottom:0; display:flex; flex-direction:column; gap:8px; padding:12px; z-index:5; }
          .tag{ font-size:12px; font-weight:600; color:#e2e8f0; background:rgba(37,99,235,.18); border:1px solid rgba(255,255,255,.45);
            padding:2px 8px; border-radius:999px; width:fit-content; display:none; }
          h3{ font-size:18px; margin:0; font-weight:700; line-height:1.2; }
          p{ font-size:14px; margin:0; color:#d1d5db; }
          .cta{ margin-top:8px; }
          .cta ::slotted(ds-button){ display:inline-block; width:auto; }
          .cta ::slotted(ds-button[full]){ display:block; width:100%; }
        </style>

        <div class="price-badge" hidden></div>
        <div class="clip">
          <div class="bg" part="bg"></div>
          <div class="overlay"></div>
          <div class="feather"></div>
          <div class="content">
            <span class="tag" part="tag"></span>
            <h3 part="title"></h3>
            <p part="description"></p>
            <div class="cta" part="cta">
              <slot name="cta"><ds-button variant="with-icon-light" size="md"><img class="icon" src="/assets/icons/brands/whatsapp.svg" alt=""></ds-button></slot>
            </div>
          </div>
          <div class="shine"></div>
        </div>
      `;
    }

    _mount() {
      this.$price = this.shadowRoot.querySelector('.price-badge');
      this.$bg    = this.shadowRoot.querySelector('.bg');
      this.$tag   = this.shadowRoot.querySelector('.tag');
      this.$title = this.shadowRoot.querySelector('h3');
      this.$desc  = this.shadowRoot.querySelector('p');
    }

    _updateUI() {
      if (!this.$bg || !this.$title || !this.$desc || !this.$price || !this.$tag) return;
      this.$bg.style.backgroundImage = this._image ? `url("${this._image}")` : 'none';
      this.$title.textContent = this._title;
      this.$desc.textContent  = this._desc;
      if (this._tag && this._tag.trim()) { this.$tag.textContent = this._tag; this.$tag.style.display = 'inline-block'; }
      else this.$tag.style.display = 'none';
      const v = (this._price || '').trim();
      this.$price.textContent = v; this.$price.hidden = !v;
    }
  }

  customElements.define('boat-card', BoatCard);
})();
