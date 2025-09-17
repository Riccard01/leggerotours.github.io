// /system/blocks/whatsapp-card.js
// Card chat WhatsApp: sfondo URL, avatar top-center, typewriter (90% in viewport), CTA abilitata a fine typing.
(() => {
  if (customElements.get('whatsapp-card')) return;

  class WhatsAppCard extends HTMLElement {
    static get observedAttributes() { return ['bg', 'phone', 'text', 'speed', 'avatar', 'name']; }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._typed = false;
      this._typing = false;
      this._speed = 18;
      this._timer = null;
      this._io = null;

      this.shadowRoot.innerHTML = `
        <style>
          :host{
            inline-size: 250px; /* ✅ width fissa */
            display:block;
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
          }
          .card{
            position:relative;               /* ✅ nessuna animazione di ingresso */
            border-radius: var(--radius-lg, 16px);
            overflow:hidden;
            box-shadow: 0 10px 26px rgba(0,0,0,.18);
            background:#111 center/cover no-repeat;
            min-height: 380px;
            display:flex;
            flex-direction:column;
            justify-content:flex-end;
            isolation:isolate;
          }
          .overlay{
            content:""; position:absolute; inset:0;
            background: linear-gradient(180deg, rgba(0,0,0,.10) 0%, rgba(0,0,0,.30) 35%, rgba(0,0,0,.60) 100%);
            z-index:1; pointer-events:none;
          }

          /* ===== Profile top-center ===== */
          .profile{
            position:absolute; top:14px; left:50%; transform:translateX(-50%);
            z-index:2; display:flex; flex-direction:column; align-items:center; gap:6px; text-align:center;
          }
          .avatar{
            width:64px; height:64px; border-radius:999px; overflow:hidden;
            box-shadow: 0 6px 18px rgba(0,0,0,.28), inset 0 0 0 2px rgba(255,255,255,.85);
            background:#0b1220 center/cover no-repeat;
          }
          .avatar img{ width:100%; height:100%; object-fit:cover; display:block; }
          .name{
            font-weight:800; font-size:13px; letter-spacing:.02em;
            color:#ffffff; text-shadow: 0 1px 6px rgba(0,0,0,.45);
            padding:2px 8px; border-radius:999px; background:rgba(0,0,0,.22); border:1px solid rgba(255,255,255,.18);
            backdrop-filter: blur(4px) saturate(120%);
          }

          .inner{ position:relative; z-index:2; padding: 14px; display:flex; flex-direction:column; gap: 10px; }

          /* Bubble */
          .bubble{
            align-self:flex-start;
            max-width: 88%;
            background: #e7fbe9;
            color: #064e3b;
            padding: 10px 12px;
            border-radius: 12px 12px 12px 6px;
            line-height: 1.45;
            font-size: 15px;
            box-shadow: 0 1px 0 rgba(0,0,0,.08);
            min-height: 38px;
          }
          .bubble .tw{ white-space: pre-wrap; word-wrap: break-word; }

          /* CTA */
          .footer{ margin-top: 6px; }
          .footer ds-button{ width:100%; }
          .footer ds-button[disabled]{ opacity: .55; filter: grayscale(.25); }

          @media (min-width: 900px){
            :host{ inline-size: 250px; } /* resta fissa anche su desktop */
          }
        </style>

        <article class="card" part="card">
          <div class="overlay"></div>

          <!-- Avatar + Nome (Lukas di default) -->
          <div class="profile" part="profile">
            <div class="avatar" part="avatar"><img alt="Avatar"></div>
            <div class="name" part="name">Lukas</div>
          </div>

          <div class="inner">
            <div class="bubble" part="bubble" aria-live="polite" aria-atomic="true">
              <span class="tw"></span>
            </div>
            <div class="footer">
              <!-- Inizio: opaco/ghost e disabled; a fine typing -> variant solid-light + enabled -->
              <ds-button class="send" size="md" full variant="with-icon-light" disabled>
                <span slot="text">Invia su WhatsApp</span>
              </ds-button>
            </div>
          </div>
        </article>
      `;
    }

    connectedCallback() {
      this._read();
      this._cache();
      this._applyBG();
      this._applyProfile();
      this._wire();

      // Parte quando è in viewport al 90%
      this._io = new IntersectionObserver((entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.9 && !this._typed && !this._typing) {
            this._startTypewriter();
          }
        }
      }, { threshold: [0, .25, .5, .9, 1] });
      this._io.observe(this);
    }

    disconnectedCallback() {
      this._io?.disconnect();
      if (this._timer) clearTimeout(this._timer);
    }

    attributeChangedCallback() {
      this._read();
      this._applyBG();
      this._applyProfile();
    }

    /* ---------- internals ---------- */
    _read() {
      this._bg = this.getAttribute('bg') || '';
      this._phone = (this.getAttribute('phone') || '').replace(/[^\d]/g,''); // solo numeri
      this._text = this.getAttribute('text') || 'Ciao! Vorrei maggiori informazioni 🙂';
      const sp = parseInt(this.getAttribute('speed') || '', 10);
      this._speed = Number.isFinite(sp) && sp > 0 ? sp : 18;

      this._avatar = this.getAttribute('avatar') || '';     // URL immagine profilo
      this._name = this.getAttribute('name') || 'Lukas';     // label sotto l’avatar
    }

    _cache() {
      this.$card = this.shadowRoot.querySelector('.card');
      this.$tw = this.shadowRoot.querySelector('.tw');
      this.$btn = this.shadowRoot.querySelector('.send');
      this.$avatarImg = this.shadowRoot.querySelector('.avatar img');
      this.$name = this.shadowRoot.querySelector('.name');
    }

    _wire() {
      this.$btn?.addEventListener('ds-select', () => this._openWhatsApp());
    }

    _applyBG() {
      if (this.$card) this.$card.style.backgroundImage = this._bg ? `url("${this._bg}")` : 'none';
    }

    _applyProfile() {
      if (this.$avatarImg) {
        if (this._avatar) this.$avatarImg.src = this._avatar;
        this.$avatarImg.alt = this._name || 'Profilo';
      }
      if (this.$name) this.$name.textContent = this._name || 'Lukas';
    }

    _startTypewriter() {
      this._typing = true;
      const text = this._text;
      let i = 0;
      const step = () => {
        if (i > text.length) {
          this._typing = false;
          this._typed = true;
          // Abilita CTA e passa a solid-light
          this.$btn?.removeAttribute('disabled');
          this.$btn?.setAttribute('variant', 'solid-light');
          return;
        }
        // ✅ Caratteri visibili mentre vengono scritti
        this.$tw.textContent = text.slice(0, i++);
        this._timer = setTimeout(step, this._speed);
      };
      step();
    }

    _openWhatsApp() {
      const phone = this._phone;
      const msg = this._text || '';
      const url = phone
        ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        : `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');
    }
  }

  customElements.define('whatsapp-card', WhatsAppCard);
})();
