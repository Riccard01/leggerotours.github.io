// /system/blocks/experiences-gallery.js (flex, snap center, active tracking + continuous scaling)
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
            /* Tuning */
            --falloff: 260px;         /* raggio di influenza (px) dal centro */
            --scale-min: 0.92;        /* scala minima quando lontano dal centro */
            --scale-max: 1.06;        /* scala massima al centro */
            --opacity-min: 0.7;       /* opzionale: opacità minima ai bordi */
            --gap: 32px;
            --pad: 16px;
            --peek: 110px;

            display: flex;
            justify-content: center;
            flex-direction: row;
            gap: var(--gap);
            padding: var(--pad);
            width: 100%;
            position: relative;
          }

          /* gli spacer non servono su desktop */
          .spacer { display: none; }

          :host > * {
            /* Effetto continuo */
            transform: scale(var(--_scale, 1));
            opacity: var(--_opacity, 1);
            transition: transform 0s, opacity 0s; /* niente "salti": tutto pilotato via JS */
            will-change: transform, opacity;
            /* stacking: card più grande sopra */
            z-index: var(--_z, 0);
          }

          /* Se vuoi un bonus glow sulla active */
          :host ::slotted([data-active]),
          [data-active] {
            /* lascia pure vuoto se non ti serve */
          }

          @media (max-width: 500px) {
            :host {
              display: flex;
              flex-direction: row;
              align-items: stretch;
              gap: var(--gap);
              padding: 7rem 0;
              box-sizing: border-box;
              width: 100%;
              overflow-x: auto;
              overflow-y: hidden;
              -webkit-overflow-scrolling: touch;
              scroll-snap-type: x mandatory;
            }
            :host::-webkit-scrollbar { display: none; }

            :host > * {
              flex: 0 0 auto;
              scroll-snap-align: center;
              scroll-snap-stop: always;
            }

            /* padding ai lati + centratura prima/ultima */
            .spacer {
              display: block;
              flex: 0 0 max(12px, calc(50% - var(--peek)));
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
      this._queueUpdate();
    }

    disconnectedCallback() {
      this.removeEventListener('scroll', this._onScroll);
      if (this._ro) this._ro.disconnect();
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    _onScroll() { this._queueUpdate(); }

    _queueUpdate() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._updateScalesAndActive();
      });
    }

    _updateScalesAndActive() {
      const hostRect = this.getBoundingClientRect();
      const hostCenterX = hostRect.left + hostRect.width / 2;

      // lettura variabili CSS (fallback sensati)
      const cs = getComputedStyle(this);
      const falloff = parseFloat(cs.getPropertyValue('--falloff')) || 260;
      const sMin = parseFloat(cs.getPropertyValue('--scale-min')) || 0.92;
      const sMax = parseFloat(cs.getPropertyValue('--scale-max')) || 1.06;
      const oMin = parseFloat(cs.getPropertyValue('--opacity-min')) || 0.7;

      // solo custom elements (experience-card, story-badge, ecc.)
      const children = Array.from(this.shadowRoot.children)
        .filter(el => el.tagName && el.tagName.includes('-'));

      let best = null, bestDist = Infinity;

      for (const el of children) {
        const r = el.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - hostCenterX);

        // Normalizza 0..1 dove 1 = al centro, 0 = oltre il falloff
        let t = 1 - Math.min(dist / falloff, 1);

        // Easing morbido (easeOutQuad)
        const eased = 1 - (1 - t) * (1 - t);

        // Interpola scala e opacità
        const scale = sMin + (sMax - sMin) * eased;
        const opacity = oMin + (1 - oMin) * eased;

        el.style.setProperty('--_scale', scale.toFixed(4));
        el.style.setProperty('--_opacity', opacity.toFixed(4));
        // z-index proporzionale per evitare sovrapposizioni “piatte”
        el.style.setProperty('--_z', (Math.round(eased * 100)).toString());

        if (dist < bestDist) { bestDist = dist; best = el; }
      }

      // Mantieni un concetto di "active" per la card più centrale
      if (best) {
        for (const el of children) {
          if (el === best) el.setAttribute('data-active', '');
          else el.removeAttribute('data-active');
        }
      }
    }
  }

  customElements.define('experiences-gallery', ExperiencesGallery);
})();
