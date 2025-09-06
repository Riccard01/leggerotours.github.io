(() => {
  if (customElements.get('free-palestine-banner')) return;

  class FPBanner extends HTMLElement {
    static get observedAttributes(){ return ['title','subtitle','href','accent','compact','glow']; }
    constructor(){
      super();
      this.attachShadow({mode:'open'});
      this.shadowRoot.innerHTML = `
        <style>
          :host{ display:block; margin:8px 0; }
          .box{
            display:flex; align-items:center; gap:12px; padding:10px 14px;
            border-radius:12px; background:#0b1220; color:#fff; border:2px solid var(--accent,#1f7aff);
            box-shadow: 0 0 0 0 rgba(31,122,255,.0);
          }
          :host([glow="false"]) .box{ box-shadow:none; }
          .flag{ display:flex; width:44px; height:24px; position:relative; }
          .flag::before{ content:""; width:100%; height:100%;
            background: linear-gradient(#000 33%, #fff 33% 66%, #e11 0);
            clip-path: polygon(0 0, 60% 0, 60% 100%, 0 100%, 0 50%);
          }
          .txt{ line-height:1.1; }
          .t{ font-weight:800; }
          .s{ font-size:12px; opacity:.8; }
          a{ color:inherit; text-decoration:underline; }
          :host([compact]) .s{ display:none; }
        </style>
        <div class="box">
          <div class="flag" aria-hidden="true"></div>
          <div class="txt">
            <div class="t"></div>
            <div class="s"></div>
          </div>
        </div>
      `;
    }
    connectedCallback(){ this._update(); }
    attributeChangedCallback(){ if (!this.isConnected) return; this._update(); }
    _update(){
      const t = this.getAttribute('title') || 'FREE PALESTINE';
      const s = this.getAttribute('subtitle') || '';
      const href = this.getAttribute('href');
      const accent = this.getAttribute('accent') || '#1f7aff';
      this.style.setProperty('--accent', accent);
      const $t = this.shadowRoot.querySelector('.t');
      const $s = this.shadowRoot.querySelector('.s');
      if (href){ $t.innerHTML = `<a href="${href}" target="_blank" rel="noopener">${t}</a>`; }
      else { $t.textContent = t; }
      $s.textContent = s;
    }
  }

  customElements.define('free-palestine-banner', FPBanner);
})();
