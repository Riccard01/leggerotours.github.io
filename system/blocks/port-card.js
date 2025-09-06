// /system/blocks/port-card.js  (guards + define)
(() => {
  if (customElements.get('port-card')) return;

  class PortCard extends HTMLElement {
    static get observedAttributes() { return ['image','title','description','cta','tag']; }

    constructor(){
      super();
      this.attachShadow({ mode:'open' });
      this._mounted = false;

      this._image=''; this._title=''; this._desc=''; this._cta='Contattaci'; this._tag='';

      this.shadowRoot.innerHTML = `
        <style>
          :host{ display:block; width:100%; flex:0 0 220px; aspect-ratio:9/16; position:relative; border-radius:16px;
            overflow:visible; background:#0b1220; color:#fff; box-shadow:0 12px 28px rgba(0,0,0,.35);
            font-family:system-ui,sans-serif; transition:transform .24s cubic-bezier(.2,.8,.2,1); }
          :host(:hover){ transform:scale(1.02); }
          :host::before{ content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:0;
            box-shadow:0 16px 44px rgba(0,160,255,.42),0 0 0 2px rgba(0,160,255,.48),0 0 110px 26px rgba(0,160,255,.68);
            opacity:0; transform:scale(.98); transition:opacity .35s, transform .35s; }
          :host([data-active])::before{ opacity:1; transform:scale(1); }
          :host::after{ content:""; position:absolute; inset:0; border-radius:inherit; outline:3px solid rgba(255,255,255,.6);
            outline-offset:-3px; mix-blend-mode:overlay; pointer-events:none; z-index:9; }
          .clip{ position:absolute; inset:0; border-radius:inherit; overflow:hidden; z-index:1; }
          .bg{ position:absolute; inset:0; background-size:cover; background-position:center; z-index:0; }
          .overlay{ position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,.65) 0%,rgba(0,0,0,.35) 40%,rgba(0,0,0,.10) 70%,rgba(0,0,0,0) 100%);
            z-index:1; pointer-events:none; }
          .feather{ position:absolute; left:0; right:0; bottom:0; height:42%;
            backdrop-filter:blur(14px) saturate(110%); -webkit-backdrop-filter:blur(14px) saturate(110%);
            background:rgba(6,10,22,.12); mask-image:linear-gradient(to top,black 60%,transparent 100%);
            -webkit-mask-image:linear-gradient(to top,black 60%,transparent 100%); z-index:2; pointer-events:none; }
          .content{ position:absolute; left:0; right:0; bottom:0; z-index:3; display:flex; flex-direction:column; gap:8px; padding:12px; }
          h3{ margin:0; font-size:20px; line-height:1.2; font-weight:800; }
          p{ margin:0; font-size:14px; color:#d1d5db; }
          .tag{ position:absolute; top:10px; left:10px; z-index:4; font-size:12px; font-weight:700; color:#e2e8f0;
            background:rgba(37,99,235,.18); border:1px solid rgba(255,255,255,.45); padding:2px 10px; border-radius:999px; }
          .cta{ margin-top:8px; }
          .cta ::slotted(ds-button){ display:inline-block; width:auto; }
          .cta ::slotted(ds-button[full]){ display:block; width:100%; }
          .cta a, .cta button{ appearance:none; border:0; border-radius:12px; text-decoration:none; cursor:pointer;
            background:#fff; color:#111827; padding:.6rem .9rem; font-weight:700; font-size:14px;
            display:inline-flex; align-items:center; gap:.5rem; }
          @media (prefers-reduced-motion:reduce){ :host, :host::before{ transition:none; } }
        </style>

        <div class="clip">
          <div class="bg" part="bg"></div>
          <span class="tag" part="tag" hidden></span>
          <div class="overlay"></div>
          <div class="feather"></div>
          <div class="content">
            <h3 part="title"></h3>
            <p part="description"></p>
            <div class="cta"><slot name="cta"><a href="#" rel="nofollow">Contattaci</a></slot></div>
          </div>
        </div>
      `;
    }

    connectedCallback(){ this._readAll(); this._mounted = true; this._updateUI(); }
    attributeChangedCallback(){ if (!this._mounted) return; this._readAll(); this._updateUI(); }

    _readAll(){
      this._image = this.getAttribute('image') || '';
      this._title = this.getAttribute('title') || '';
      this._desc  = this.getAttribute('description') || '';
      this._cta   = this.getAttribute('cta') || 'Contattaci';
      this._tag   = this.getAttribute('tag') || '';
    }

    _updateUI(){
      const sr=this.shadowRoot;
      if (!sr) return;
      sr.querySelector('.bg').style.backgroundImage = this._image ? `url("${this._image}")` : 'none';
      sr.querySelector('h3').textContent = this._title;
      sr.querySelector('p').textContent  = this._desc;
      const fallback = sr.querySelector('.cta a, .cta button'); if (fallback) fallback.textContent = this._cta || 'Contattaci';
      const tagEl = sr.querySelector('.tag');
      if (this._tag && this._tag.trim()){ tagEl.textContent = this._tag.trim(); tagEl.hidden = false; }
      else tagEl.hidden = true;
    }
  }

  customElements.define('port-card', PortCard);
})();
