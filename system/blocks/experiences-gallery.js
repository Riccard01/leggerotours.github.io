// /system/blocks/experiences-gallery.js
// (snap center, active tracking + dynamic spacers gap-aware + continuous scale + early uniform shine)
(() => {
  if (customElements.get('experiences-gallery')) return;

  class ExperiencesGallery extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._onScroll = this._onScroll.bind(this);
      this._raf = null;

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            /* Tuning effetto */
            --falloff: 260px;         /* raggio di influenza dal centro */
            --scale-min: 0.92;
            --scale-max: 1.06;
            --opacity-min: 0.85;
            --gap: 32px;
            --pad: 16px;
            --peek: 110px;

            display: flex;
            justify-content: center;
            flex-direction: row;
            gap: var(--gap);
            padding: var(--pad);
            width: 100%;
          }

          /* fuori mobile gli spacer non servono */
          .spacer { display: none; }

          /* Effetti applicati solo alle card (non agli spacer) */
          :host > :not(.spacer) {
            position: relative;
            transform: scale(var(--_scale, 1));
            opacity: var(--_opacity, 1);
            transition: transform 0s, opacity 0s; /* tutto legato allo scroll */
            will-change: transform, opacity;
            z-index: var(--_z, 0);
          }

          /* Shine semplice e uniforme: una striscia diagonale morbida */
          :host > :not(.spacer)::after {
            content: "";
            position: absolute;
            inset: 0;
            pointer-events: none;
            /* linea diagonale molto ampia e diffusa */
            background-image:
              linear-gradient(
                60deg,
                rgba(255,255,255,0) 0%,
                rgba(255,255,255,0.06) 40%,
                rgba(255,255,255,0.14) 50%,
                rgba(255,255,255,0.06) 60%,
                rgba(255,255,255,0) 100%
              );
            opacity: calc(var(--_shine, 0) * 0.45); /* intensità controllata da JS */
            mix-blend-mode: screen; /* uniforme su immagini scure/chiare */
            border-radius: inherit;
          }

          @media (max-width: 500px) {
            :host {
              display: flex;
              flex-direction: row;
              align-items: stretch;
              gap: var(--gap);
              /* richiesto: non rimuovere il padding-top */
              padding: 7rem 0;
              box-sizing: border-box;
              width: 100%;
              overflow-x: auto;
              overflow-y: hidden;
              -webkit-overflow-scrolling: touch;
              scroll-snap-type: x mandatory;
              overscroll-behavior-x: contain;
            }
            :host::-webkit-scrollbar { display: none; }

            :host > * {
              flex: 0 0 auto;
              scroll-snap-align: center;
              /* “always” elimina micro riposizionamenti quando già sull’estremo */
              scroll-snap-stop: always;
            }

            /* Spacer dinamici: aggiornati dal JS
               Importante: NON devono diventare target di snap */
            .spacer {
              display: block;
              flex: 0 0 12px;         /* base, il JS la aggiorna */
              scroll-snap-align: none;
              pointer-events: none;
            }
          }
        </style>

        <div class="spacer" aria-hidden="true"></div>

        <experience-card
          id="exp-2"
          price="€570 per group"
          image="./assets/images/portofino.jpg"
          title="The Rainbow Tour"
          description="Esplora luoghi selvaggi e baie segrete, da Punta Chiappa a Portofino.">
          <ds-button slot="cta" value="rainbow-2" variant="with-icon-light" size="md" full>
            <span slot="text">Configura</span>
          </ds-button>
        </experience-card>

        <experience-card
          id="exp-3"
          price="€390 per group"
          image="./assets/images/genovese.jpg"
          title="Gourmet Sunset Cruise"
          description="Un'esperienza al tramonto con degustazione di piatti tipici.">
          <ds-button slot="cta" value="gourmet" variant="with-icon-light" size="md" full>
            <span slot="text">Configura</span>
          </ds-button>
        </experience-card>

        <experience-card
          id="exp-5"
          price="€1200 per group"
          image="./assets/images/special.jpg"
          title="Stella Maris"
          description="Camogli e San Fruttuoso con aperitivo a bordo.">
          <ds-button slot="cta" value="stella-maris" variant="with-icon-light" size="md" full>
            <span slot="text">Configura</span>
          </ds-button>
        </experience-card>

        <experience-card
          id="exp-6"
          price="€1200 per group"
          image="./assets/images/fireworks.jpg"
          title="Recco Fireworks"
          description="Sentieri panoramici con viste mozzafiato.">
          <ds-button slot="cta" value="fireworks" variant="with-icon-light" size="md" full>
            <span slot="text">Configura</span>
          </ds-button>
        </experience-card>

        <experience-card
          id="exp-6b"
          price="€1200 per group"
          image="./assets/images/amerigo.jpg"
          title="Amerigo Vespucci"
          description="Sentieri panoramici con viste mozzafiato.">
          <ds-button slot="cta" value="fireworks" variant="with-icon-light" size="md" full>
            <span slot="text">Configura</span>
          </ds-button>
          <story-badge src="/assets/images/camogli.jpg" label="Tappe" size="56" duration="2600"></story-badge>
        </experience-card>

        <div class="spacer" aria-hidden="true"></div>
      `;
    }

    connectedCallback() {
      this.addEventListener('scroll', this._onScroll, { passive: true });

      this._ro = new ResizeObserver(() => this._queueUpdate());
      this._ro.observe(this);

      this._mo = new MutationObserver(() => this._queueUpdate());
      this._mo.observe(this.shadowRoot, { childList: true });

      this._queueUpdate();
    }

    disconnectedCallback() {
      this.removeEventListener('scroll', this._onScroll);
      if (this._ro) this._ro.disconnect();
      if (this._mo) this._mo.disconnect();
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    _onScroll() { this._queueUpdate(); }

    _queueUpdate() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._updateSpacers();        // elimina wiggle ai bordi
        this._updateVisuals();        // scale + shine + active
      });
    }

    _updateSpacers() {
      const items = Array.from(this.shadowRoot.children)
        .filter(el => el.tagName && el.tagName.includes('-')); // solo custom elements top-level
      if (!items.length) return;

      const hostRect = this.getBoundingClientRect();
      if (hostRect.width === 0) return;

      const firstRect = items[0].getBoundingClientRect();
      const lastRect  = items[items.length - 1].getBoundingClientRect();
      if (firstRect.width === 0 || lastRect.width === 0) return;

      // Gap reale in px (considera anche il caso con unità non px)
      const cs = getComputedStyle(this);
      const gapPx = this._toPx(cs.getPropertyValue('gap') || cs.getPropertyValue('--gap') || '0');

      // Spazio necessario per centrare prima/ultima card
      // Nota: sottraiamo il gap tra spacer e card per evitare "avanzi" che causano micro-scroll.
      const leftNeeded  = Math.max(12, (hostRect.width / 2) - (firstRect.width / 2) - gapPx);
      const rightNeeded = Math.max(12, (hostRect.width / 2) - (lastRect.width  / 2) - gapPx);

      const left  = Math.max(12, Math.round(leftNeeded));
      const right = Math.max(12, Math.round(rightNeeded));

      const spacers = Array.from(this.shadowRoot.querySelectorAll('.spacer'));
      if (spacers[0]) spacers[0].style.flexBasis = `${left}px`;
      if (spacers[1]) spacers[1].style.flexBasis = `${right}px`;
    }

    _updateVisuals() {
      const hostRect = this.getBoundingClientRect();
      const hostCenterX = hostRect.left + hostRect.width / 2;

      const cs = getComputedStyle(this);
      const falloff = parseFloat(cs.getPropertyValue('--falloff')) || 260;
      const sMin = parseFloat(cs.getPropertyValue('--scale-min')) || 0.92;
      const sMax = parseFloat(cs.getPropertyValue('--scale-max')) || 1.06;
      const oMin = parseFloat(cs.getPropertyValue('--opacity-min')) || 0.85;

      const children = Array.from(this.shadowRoot.children)
        .filter(el => el.tagName && el.tagName.includes('-'));

      let best = null, bestDist = Infinity;

      for (const el of children) {
        const r = el.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - hostCenterX);

        // t: 0..1 dove 1 = centro, 0 = oltre falloff
        const t = 1 - Math.min(dist / falloff, 1);

        // Easing per scala/opacity (morbido)
        const eased = 1 - (1 - t) * (1 - t);

        // Shine "anticipato" e uniforme: parte prima e cresce dolcemente
        // curva più anticipata: clamp((t * 1.25) + 0.15, 0, 1)
        const shineT = Math.max(0, Math.min(1, t * 1.25 + 0.15));

        const scale = sMin + (sMax - sMin) * eased;
        const opacity = oMin + (1 - oMin) * eased;

        el.style.setProperty('--_scale', scale.toFixed(4));
        el.style.setProperty('--_opacity', opacity.toFixed(4));
        el.style.setProperty('--_z', (Math.round(eased * 100)).toString());
        el.style.setProperty('--_shine', shineT.toFixed(4));

        if (dist < bestDist) { bestDist = dist; best = el; }
      }

      // data-active sulla card più centrale (utile per stili extra)
      if (best) {
        for (const el of children) {
          if (el === best) el.setAttribute('data-active', '');
          else el.removeAttribute('data-active');
        }
      }
    }

    _toPx(val) {
      // Converte valori CSS (px, rem, etc.) in px
      const num = parseFloat(val);
      if (String(val).includes('rem')) {
        return num * parseFloat(getComputedStyle(document.documentElement).fontSize || 16);
      }
      if (String(val).includes('px') || !isNaN(num)) return num || 0;
      return 0; // fallback
    }
  }

  customElements.define('experiences-gallery', ExperiencesGallery);
})();
