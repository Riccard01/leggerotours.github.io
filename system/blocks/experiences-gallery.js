// /system/blocks/experiences-gallery.js (flex, snap center, active tracking)
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
            display: flex;
            justify-content: center;
            flex-direction: row;
            gap: var(--gap, 32px);
            padding: var(--pad, 16px);
            width: 100%;
    }




@media (max-width: 500px) {
          :host {
            display: flex;
            flex-direction: row;
            align-items: stretch;
            gap: var(--gap, 32px);
            padding: var(--pad, 16px);
            box-sizing: border-box;
            width: 100%;
            padding: 4rem 0;
            /* scroller */
            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;

            /* snap */
            scroll-snap-type: x mandatory;
          }
          :host::-webkit-scrollbar { display: none; }

          :host > * {
            flex: 0 0 auto;
            scroll-snap-align: center;
            scroll-snap-stop: always;  
          }
            .spacer{ 
  flex: 0 0 max(8px, calc(50% - var(--peek, 110px)));
}

}


































        </style>

      <experience-card
        id="exp-1"
        price="€570 per group"
        image="./assets/images/boccadasse.jpg"
        title="The Rainbow Tour"
        description="Esplora luoghi selvaggi e baie segrete, da Punta Chiappa a Portofino."
        tag="Tutto il giorno"
        cta="Configura"
        badge-image="/assets/thumbs/portofino.jpg">
        <ds-button slot="cta" value="rainbow" variant="with-icon-light" size="md" full>
          <span slot="text">Configura</span>
        </ds-button>
        <story-badge src="/assets/icons/map.svg" label="Scopri programma" size="56" duration="1600">
          <img slot="1" src="/assets/images/faro.jpg" data-ms="3200">
          <video slot="2" src="/assets/videos/amerigo.mp4"></video>
          <video slot="2" src="/assets/videos/gourmet.mp4"></video>
          <img slot="3" src="/assets/images/me.jpg">
        </story-badge>
      </experience-card>

      <experience-card
        id="exp-2"
        price="€570 per group"
        image="./assets/images/portofino.jpg"
        title="The Rainbow Tour"
        description="Esplora luoghi selvaggi e baie segrete, da Punta Chiappa a Portofino."
        tag="Tutto il giorno"
        cta="Configura"
        badge-image="/assets/thumbs/portofino.jpg"
        badge-label="Programma e rotte"
        badge-desc="Baia segreta + aperitivo">
        <ds-button slot="cta" value="rainbow-2" variant="with-icon-light" size="md" full>
          <span slot="text">Configura</span>
        </ds-button>
        <story-badge src="/assets/images/camogli.jpg" label="Tappe" size="56" duration="2600"></story-badge>
      </experience-card>

      <experience-card
        id="exp-3"
        price="€390 per group"
        image="./assets/images/genovese.jpg"
        title="Gourmet Sunset Cruise"
        description="Un'esperienza al tramonto con degustazione di piatti tipici."
        tag="Al tramonto"
        cta="Configura">
        <ds-button slot="cta" value="gourmet" variant="with-icon-light" size="md" full>
          <span slot="text">Configura</span>
        </ds-button>
        <story-badge src="/assets/images/camogli.jpg" label="Tappe" size="56" duration="2600"></story-badge>
      </experience-card>

      <experience-card
        id="exp-4"
        price="€250 per group"
        image="./assets/images/dolphin.jpg"
        title="Dolphin Watching"
        description="Avvistamento dei delfini nel loro habitat naturale."
        tag="Mezza giornata"
        cta="Configura">
        <ds-button slot="cta" value="dolphin" variant="with-icon-light" size="md" full>
          <span slot="text">Configura</span>
        </ds-button>
        <story-badge src="/assets/images/camogli.jpg" label="Tappe" size="56" duration="2600"></story-badge>
      </experience-card>

      <experience-card
        id="exp-5"
        price="€1200 per group"
        image="./assets/images/special.jpg"
        title="Stella Maris"
        description="Camogli e San Fruttuoso con aperitivo a bordo."
        tag="Al tramonto"
        cta="Configura">
        <ds-button slot="cta" value="stella-maris" variant="with-icon-light" size="md" full>
          <span slot="text">Configura</span>
        </ds-button>
        <story-badge src="/assets/images/camogli.jpg" label="Tappe" size="56" duration="2600"></story-badge>
      </experience-card>

      <experience-card
        id="exp-6"
        price="€1200 per group"
        image="./assets/images/fireworks.jpg"
        title="Recco Fireworks"
        description="Sentieri panoramici con viste mozzafiato."
        tag="Mezza giornata"
        cta="Scopri">
        <ds-button slot="cta" value="fireworks" variant="with-icon-light" size="md" full>
          <span slot="text">Configura</span>
        </ds-button>
        <story-badge src="/assets/images/camogli.jpg" label="Tappe" size="56" duration="2600"></story-badge>
      </experience-card>

      <experience-card
        id="exp-6"
        price="€1200 per group"
        image="./assets/images/amerigo.jpg"
        title="Amerigo Vespucci"
        description="Sentieri panoramici con viste mozzafiato."
        tag="Mezza giornata"
        cta="Scopri">
        <ds-button slot="cta" value="fireworks" variant="with-icon-light" size="md" full>
          <span slot="text">Configura</span>
        </ds-button>
        <story-badge src="/assets/images/camogli.jpg" label="Tappe" size="56" duration="2600"></story-badge>
      </experience-card>
      `;
    }

    connectedCallback() {
      this.addEventListener('scroll', this._onScroll, { passive: true });
      requestAnimationFrame(() => this._updateActive());
      this._ro = new ResizeObserver(() => this._updateActive());
      this._ro.observe(this);
    }

    disconnectedCallback() {
      this.removeEventListener('scroll', this._onScroll);
      if (this._ro) this._ro.disconnect();
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    _onScroll() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._updateActive();
      });
    }

    _updateActive() {
      const hostRect = this.getBoundingClientRect();
      const hostCenterX = hostRect.left + hostRect.width / 2;

      const children = Array.from(this.shadowRoot.children)
        .filter(el => el.tagName && el.tagName.includes('-')); // solo custom elements

      let best = null, bestDist = Infinity;

      for (const el of children) {
        const r = el.getBoundingClientRect();
        const elCenterX = r.left + r.width / 2;
        const dist = Math.abs(elCenterX - hostCenterX);
        if (dist < bestDist) { bestDist = dist; best = el; }
      }

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
