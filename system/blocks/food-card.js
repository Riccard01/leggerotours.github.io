// /system/blocks/food-card.js  (guards + define)
(() => {
  if (customElements.get('food-card')) return;

  class FoodCard extends HTMLElement {
    static get observedAttributes() { return ['image','title','description','tag','cta','price','diet','diet-label']; }

    constructor(){
      super();
      this.attachShadow({mode:'open'});
      this._mounted = false;

      this._image=''; this._title=''; this._desc=''; this._tag=''; this._cta='Contattaci'; this._price='';
      this._diet=''; this._dietLabel='';

      this.shadowRoot.innerHTML = `
        <style>
          :host{ display:block; width:100%; flex:0 0 220px; aspect-ratio:9/16; position:relative; border-radius:16px;
            overflow:visible; background:#0b1220; color:#fff; box-shadow:0 12px 28px rgba(0,0,0,.35); font-family:system-ui,sans-serif; }
          :host::before{ content:""; position:absolute; inset:0; border-radius:inherit; pointer-events:none; z-index:0;
            box-shadow:0 16px 44px rgba(0,160,255,.42),0 0 0 2px rgba(0,160,255,.48),0 0 110px 26px rgba(0,160,255,.68);
            opacity:0; transform:scale(.98); transition:.35s; }
          :host([data-active])::before{ opacity:1; transform:scale(1); }
          :host::after{ content:""; position:absolute; inset:0; border-radius:inherit; outline:3px solid rgba(255,255,255,.6);
            outline-offset:-3px; mix-blend-mode:overlay; pointer-events:none; z-index:9; }
          .clip{ position:absolute; inset:0; border-radius:inherit; overflow:hidden; z-index:1; }
          .hero{ position:absolute; inset:0; z-index:0; background:center/cover no-repeat; }
          .overlay{ position:absolute; inset:0; z-index:1; pointer-events:none;
            background:linear-gradient(to top,rgba(0,0,0,.72) 0%,rgba(0,0,0,.30) 45%,rgba(0,0,0,0) 80%); }
          .feather{ position:absolute; left:0; right:0; bottom:0; height:42%; z-index:2; pointer-events:none;
            backdrop-filter:blur(14px) saturate(110%); -webkit-backdrop-filter:blur(14px) saturate(110%);
            background:rgba(6,10,22,.12); mask-image:linear-gradient(to top,black 60%,transparent 100%);
            -webkit-mask-image:linear-gradient(to top,black 60%,transparent 100%); }
          .content{ position:absolute; left:0; right:0; bottom:0; z-index:3; padding:12px; display:flex; flex-direction:column; gap:8px; }
          .meta{ display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
          .tag{ display:none; font-size:12px; font-weight:700; letter-spacing:.02em; color:#e2e8f0; background:rgba(37,99,235,.22);
            border:1px solid rgba(255,255,255,.30); padding:2px 10px; border-radius:999px; backdrop-filter:blur(4px); }
          .price{ margin-left:auto; display:none; font-size:13px; font-weight:600; padding:2px 8px; border-radius:8px;
            background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.22); }
          .cta ::slotted(ds-button){ display:inline-block; width:auto; } .cta ::slotted(ds-button[full]){ display:block; width:100%; }
          .diet{ display:none; align-items:center; gap:6px; font-weight:800; font-size:12px; letter-spacing:.02em;
            padding:2px 10px; border-radius:999px; border:1px solid; line-height:1; }
          .diet svg{ width:1.05em; height:1.05em; }
          .diet[data-kind="halal"]{ color:#d1fae5; background:rgba(16,185,129,.18); border-color:rgba(16,185,129,.45); }
          .diet[data-kind="haram"]{ color:#fee2e2; background:rgba(239,68,68,.20); border-color:rgba(239,68,68,.45); }
          h3{ margin:0; font-size:20px; line-height:1.2; } p{ margin:0; font-size:14px; color:#d1d5db; }
          .cta{ margin-top:6px; }
          :host(:hover){ transform:scale(1.02); transition:transform .24s cubic-bezier(.2,.8,.2,1); }
        </style>

        <div class="clip">
          <div class="hero"></div>
          <div class="overlay"></div>
          <div class="feather"></div>

          <div class="content">
            <div class="meta">
              <span class="tag"></span>
              <span class="diet" role="img" aria-label="" hidden>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a1 1 0 0 1 .9.55A9 9 0 1 0 21.45 11a1 1 0 0 1 1.1-.9A11 11 0 1 1 12 2Z"/></svg>
              </span>
              <span class="price"></span>
            </div>

            <h3 class="title"></h3>
            <p class="desc"></p>

            <div class="cta"><slot name="cta"><a href="#" rel="nofollow">Contattaci</a></slot></div>
          </div>
        </div>
      `;
    }

    connectedCallback(){ this._readAll(); this._mount(); this._mounted = true; this._updateUI(); }
    attributeChangedCallback(){ if(!this._mounted) return; this._readAll(); this._updateUI(); }

    _readAll(){
      this._image=this.getAttribute('image')||'';
      this._title=this.getAttribute('title')||'';
      this._desc=this.getAttribute('description')||'';
      this._tag=this.getAttribute('tag')||'';
      this._cta=this.getAttribute('cta')||'Contattaci';
      this._price=this.getAttribute('price')||'';
      const raw=(this.getAttribute('diet')||'').trim().toLowerCase();
      const map={ 'halal':'halal','ḥalāl':'halal','حلال':'halal','haram':'haram','حرام':'haram' };
      this._diet = map[raw] || '';
      this._dietLabel = this.getAttribute('diet-label') || '';
    }

    _mount(){
      const sr=this.shadowRoot;
      this.$hero=sr.querySelector('.hero'); this.$tag=sr.querySelector('.tag');
      this.$diet=sr.querySelector('.diet'); this.$dietTxt=sr.querySelector('.diet-txt');
      this.$price=sr.querySelector('.price'); this.$title=sr.querySelector('.title'); this.$desc=sr.querySelector('.desc');
    }

    _updateUI(){
      if (!this.$hero || !this.$title || !this.$desc || !this.$price || !this.$tag || !this.$diet) return;

      this.$hero.style.backgroundImage=this._image?`url("${this._image}")`:'none';

      if(this._tag){ this.$tag.textContent=this._tag; this.$tag.style.display='inline-flex'; }
      else this.$tag.style.display='none';

      if(this._diet){
        const label = this._dietLabel || (this._diet === 'halal' ? 'Halal' : 'Haram');
        this.$diet.hidden=false; this.$diet.dataset.kind=this._diet; this.$diet.setAttribute('aria-label',label);
        this.$diet.style.display='inline-flex';
      } else { this.$diet.hidden=true; this.$diet.style.display='none'; }

      if(this._price){ this.$price.textContent=this._price; this.$price.style.display='inline-flex'; }
      else this.$price.style.display='none';

      this.$title.textContent=this._title||''; this.$desc.textContent=this._desc||'';
    }
  }

  customElements.define('food-card', FoodCard);
})();
