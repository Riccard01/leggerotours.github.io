// /system/blocks/ds-button.js (FIXED v2: solid event dispatch + a11y + overlay variant)
(() => {
  if (customElements.get('ds-button')) return;

  class DSButton extends HTMLElement {
    static get observedAttributes() {
      return ['variant','size','icon','full','value','disabled','debug'];
    }

    constructor(){
      super();
      this.attachShadow({ mode:'open' });
      this._render();
    }

    get variant(){
      const v = (this.getAttribute('variant')||'solid-dark').toLowerCase();
      return [
        'solid-dark','solid-light','outline','ghost',
        'with-icon-light','with-icon-ghost',
        'overlay' // <--- nuovo variant
      ].includes(v) ? v : 'solid-dark';
    }
    get size(){
      const s = (this.getAttribute('size')||'md').toLowerCase();
      return ['sm','md','lg'].includes(s) ? s : 'md';
    }
    get icon(){ return this.hasAttribute('icon'); }
    get full(){ return this.hasAttribute('full'); }
    get value(){ return this.getAttribute('value') ?? null; }
    get disabled(){ return this.hasAttribute('disabled'); }
    get debug(){ return this.hasAttribute('debug'); }

    connectedCallback(){
      this._applyAttrsToButton();

      const btn = this.shadowRoot.querySelector('.btn');

      btn.addEventListener('click', (e) => {
        if (this.disabled) return;
        const ev = new CustomEvent('ds-select', {
          bubbles: true,
          composed: true,
          cancelable: true,
          detail: {
            value: this.value,
            variant: this.variant,
            size: this.size,
            originalEvent: e
          }
        });
        this.dispatchEvent(ev);
        if (this.debug) console.log('[ds-button] ds-select fired', ev.detail);
      });

      btn.addEventListener('keydown', (e) => {
        if (this.disabled) return;
        if (e.key === ' ') e.preventDefault();
      });
    }

    attributeChangedCallback(){
      this._applyAttrsToButton();
    }

    _applyAttrsToButton(){
      const btn = this.shadowRoot?.querySelector('.btn');
      if (!btn) return;
      btn.dataset.variant = this.variant;
      btn.dataset.size    = this.size;
      btn.dataset.icon    = this.icon ? 'true' : 'false';
      btn.style.width     = this.full ? '100%' : 'auto';
      btn.disabled        = this.disabled;
      btn.setAttribute('aria-disabled', this.disabled ? 'true' : 'false');
    }

    _render(){
      this.shadowRoot.innerHTML = `
        <style>
          :host { display:inline-block; }
          .btn {
            display:inline-flex;
            align-items:center;
            justify-content:center;
            width:100%;
            gap: var(--space-2, 8px);
            border-radius: var(--radius-md, 12px);
            border: 1px solid transparent;
            cursor: pointer;
            user-select: none;
            white-space: nowrap;
            text-decoration: none;
            font-family: var(--font-sans, 'Plus Jakarta Sans', system-ui, sans-serif);
            font-weight: 700;
            font-size: var(--font-md, 16px);
            line-height: 1;
            transition: transform .04s linear, background-color .15s ease, color .15s ease, border-color .15s ease, opacity .15s ease, box-shadow .2s ease;
          }
          .btn:active { transform: translateY(1px); }
          .btn[disabled],
          .btn[aria-disabled="true"]{
            opacity:.55;
            cursor: not-allowed;
            transform: none !important;
          }

          /* sizes */
          .btn[data-size="sm"] { padding: 8px 12px; font-size: var(--font-sm,14px); }
          .btn[data-size="md"] { padding: 12px 16px; font-size: var(--font-md,16px); }
          .btn[data-size="lg"] { padding: 14px 18px; font-size: var(--font-lg,18px); }

          /* icon-only */
          .btn[data-icon="true"][data-size="sm"] { width: 36px; height: 36px; padding: 0; }
          .btn[data-icon="true"][data-size="md"] { width: 44px; height: 44px; padding: 0; }
          .btn[data-icon="true"][data-size="lg"] { width: 52px; height: 52px; padding: 0; }

          /* variants */
          .btn[data-variant="solid-dark"]{ color:#fff; background:#2563eb; border-color:#1d4ed8; }
          .btn[data-variant="solid-dark"]:hover:not([disabled]){ background:#1d4ed8; border-color:#1e40af; }

          .btn[data-variant="solid-light"]{ color:#0b1220; background:#fff; border-color:#e5e7eb; }
          .btn[data-variant="solid-light"]:hover:not([disabled]){ background:#f9fafb; border-color:#d1d5db; }

          .btn[data-variant="outline"]{ color:#0b1220; background:transparent; border-color:#cbd5e1; }
          .btn[data-variant="outline"]:hover:not([disabled]){ background:#f3f4f6; }

          .btn[data-variant="ghost"]{ color:#0b1220; background:transparent; border-color:transparent; }
          .btn[data-variant="ghost"]:hover:not([disabled]){ background:#f3f4f6; }

          .btn[data-variant="with-icon-light"]{ color:#0b1220; background:#fff; border-color:#e5e7eb; }
          .btn[data-variant="with-icon-light"]:hover:not([disabled]){ background:#f9fafb; border-color:#d1d5db; }

          .btn[data-variant="with-icon-ghost"]{ color:#0b1220; background:transparent; border-color:#d1d5db; }
          .btn[data-variant="with-icon-ghost"]:hover:not([disabled]){ background:#f3f4f6; border-color:#cbd5e1; }

          /* NEW: overlay (semi-trasparente, interattivo) */
          .btn[data-variant="overlay"]{
            color:#fff;
            background: rgba(15, 23, 42, .55); /* ~55% opaco su sfondo scuro */
            border-color: rgba(255,255,255,.25);
            box-shadow: 0 6px 18px rgba(0,0,0,.25);
            backdrop-filter: saturate(140%) blur(8px);
          }
          .btn[data-variant="overlay"]:hover:not([disabled]){
            background: rgba(15, 23, 42, .75);
            border-color: rgba(255,255,255,.35);
          }
          .btn[data-variant="overlay"]:focus-visible{
            outline: none;
            box-shadow: 0 0 0 3px rgba(99,102,241,.6);
          }

          .inner { display:inline-flex; align-items:center; gap:8px; }
          ::slotted([slot="text"]){ line-height:1; }
          ::slotted([slot="icon"]){ display:inline-flex; }
        </style>
        <button class="btn" type="button" part="button">
          <span class="inner">
            <slot name="icon"></slot>
            <slot name="text"><slot></slot></slot>
          </span>
        </button>
      `;
    }
  }

  customElements.define('ds-button', DSButton);
})();
