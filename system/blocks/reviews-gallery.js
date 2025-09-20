// /system/blocks/reviews-gallery.js (stacked, negative overlap, start centered)
(() => {
  if (customElements.get('reviews-gallery')) return;

  class ReviewsGallery extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._onScroll = this._onScroll.bind(this);
      this._raf = null;

      this.shadowRoot.innerHTML = `
        <style>
          :host{
            display:block;
            position:relative;
            width:100%;
            /* evitiamo flash di layout: mostriamo quando è centrato */
            opacity:0;
            transition:opacity .15s ease !important;
            /* scroller */
            overflow-x:auto;
            overflow-y:hidden;
            -webkit-overflow-scrolling:touch;
            scroll-snap-type:x mandatory;
            padding-block:24px;
          }
          :host([data-ready="true"]){ opacity:1; }
          :host::-webkit-scrollbar{ display:none; }

          .row{
            display:flex;
            align-items:stretch;
            gap:0;
            min-width:max-content;
            padding-inline:16px;
            box-sizing:border-box;
            margin: 140px 0;
          }

          .row > review-card{
            flex:0 0 auto;
            scroll-snap-align: center;
            scroll-snap-stop: always; 
            position:relative;
            transition:
              transform .15s cubic-bezier(.2,.8,.2,1) !important,
              opacity .15s !important;
            transform: translateY(36px) scale(.9);
            opacity:1;
            z-index:1;
          }

          /* overlap a margine negativo */
          .row > review-card + review-card{
            margin-left: calc(-1 * var(--overlap, 48px));
          }

          /* vicine alla principale */
          .row > review-card[data-pos="left"]{
            transform: translateY(24px) rotate(-6deg) scale(.9);
            z-index:2; opacity:1;
          }
          .row > review-card[data-pos="right"]{
            transform: translateY(24px) rotate(6deg) scale(.9);
            z-index:2; opacity:1;
          }

          /* attiva */
          .row > review-card[data-active]{
            transform: translateY(0) rotate(0) scale(1);
            z-index:3; opacity:1;
          }

          /* spaziatori per centrare prima/ultima */
          .spacer{ flex:0 0 max(8px, calc(50% - var(--peek, 110px))); }
        </style>

        <div class="row">
          <div class="spacer" aria-hidden="true"></div>

          <review-card
            image="./assets/images/florence.jpg"
            title="Florence"
            description="Riccardo è una guida esperta, discreta ma calorosa e familiare come un vecchio amico. Ti farà sentire come un locale che vive il sogno italiano per un giorno."
            tag="Esperienza fantastica"
            avatar="./assets/images/avatar1.jpg">
          </review-card>

          <review-card
            image="./assets/images/lana.jpg"
            title="Lana"
            description="And the captain was so nice and flexible..."
            tag="Super raccomandato"
            avatar="./assets/images/avatar2.jpg">
          </review-card>
          
          <review-card
            image="./assets/images/Linda.jpg"
            title="Linda"
            description="Un tour indimenticabile, dal primo all’ultimo minuto. Consigliatissimo a chi vuole scoprire la Liguria dal mare."
            tag="Da rifare"
            avatar="./assets/images/avatar3.jpg">
          </review-card>

          <review-card
            image="./assets/images/simo.jpg"
            title="Simone"
            description="Un tour indimenticabile, dal primo all’ultimo minuto. Consigliatissimo a chi vuole scoprire la Liguria dal mare."
            tag="Da rifare"
            platform-logo="./assets/images/google.png"
            platform-alt="Recensione su Google">
          </review-card>

            
          <review-card
            image="./assets/images/giulix.jpg"
            title="Giulia"
            description="Un tour indimenticabile, dal primo all’ultimo minuto. Consigliatissimo a chi vuole scoprire la Liguria dal mare."
            tag="Da rifare"
            avatar="./assets/images/avatar3.jpg">
          </review-card>

          <review-card
            image="./assets/images/tipo.jpg"
            title="Ahmed"
            description="Un tour indimenticabile, dal primo all’ultimo minuto. Consigliatissimo a chi vuole scoprire la Liguria dal mare."
            tag="Da rifare"
            avatar="./assets/images/avatar3.jpg">
          </review-card>

          <review-card
            image="./assets/images/elie.jpg"
            title="Elie"
            description="Un tour indimenticabile, dal primo all’ultimo minuto. Consigliatissimo a chi vuole scoprire la Liguria dal mare."
            tag="Da rifare"
            avatar="./assets/images/avatar3.jpg">
          </review-card>

          <review-card
            image="./assets/images/melissa.jpg"
            title="Melyssa"
            description="Un tour indimenticabile, dal primo all’ultimo minuto. Consigliatissimo a chi vuole scoprire la Liguria dal mare."
            tag="Da rifare"
            avatar="./assets/images/avatar3.jpg">
          </review-card>


          <div class="spacer" aria-hidden="true"></div>
        </div>
      `;
    }

    connectedCallback(){
      this.addEventListener('scroll', this._onScroll, { passive: true });

      // Centro la card iniziale PRIMA di mostrare il componente
      // start-index: indice 0-based; default = card centrale
      requestAnimationFrame(() => {
        const items = this._items();
        const defaultIndex = Math.floor(Math.max(0, items.length - 1) / 2);
        const idxAttr = this.getAttribute('start-index');
        const startIndex = Number.isFinite(+idxAttr) ? Math.min(Math.max(+idxAttr,0), Math.max(0, items.length-1)) : defaultIndex;
        this._centerIndex(startIndex, true);
        this._updateActive();
        this.setAttribute('data-ready','true'); // mostra
      });

      this._ro = new ResizeObserver(() => {
        // ricentra sull’attiva quando cambia layout
        const activeIdx = this._activeIndex();
        if (activeIdx >= 0) this._centerIndex(activeIdx, true);
        this._updateActive();
      });
      this._ro.observe(this);
    }

    disconnectedCallback(){
      this.removeEventListener('scroll', this._onScroll);
      if (this._ro) this._ro.disconnect();
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    _onScroll(){
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._updateActive();
      });
    }

    _items(){
      return Array.from(this.shadowRoot.querySelectorAll('.row > review-card'));
    }

    _activeIndex(){
      const items = this._items();
      return items.findIndex(el => el.hasAttribute('data-active'));
    }

    _centerIndex(index, instant=false){
      const items = this._items();
      const target = items[index];
      if (!target) return;

      const host = this;
      const hostRect = host.getBoundingClientRect();
      const centerX = hostRect.left + hostRect.width / 2;

      const r = target.getBoundingClientRect();
      const targetCenterX = r.left + r.width / 2;
      const delta = targetCenterX - centerX;

      host.scrollTo({ left: host.scrollLeft + delta, behavior: instant ? 'auto' : 'smooth' });
    }

    _updateActive(){
      const hostRect = this.getBoundingClientRect();
      const centerX = hostRect.left + hostRect.width / 2;

      const items = this._items();
      if (!items.length) return;

      // trova più vicino al centro
      let best = null, bestDist = Infinity;
      for (const el of items){
        const r = el.getBoundingClientRect();
        const elCenterX = r.left + r.width / 2;
        const dist = Math.abs(elCenterX - centerX);
        if (dist < bestDist){ bestDist = dist; best = el; }
      }

      items.forEach(el => { el.removeAttribute('data-active'); el.removeAttribute('data-pos'); });

      if (best){
        best.setAttribute('data-active','');
        const idx = items.indexOf(best);
        if (items[idx - 1]) items[idx - 1].setAttribute('data-pos','left');
        if (items[idx + 1]) items[idx + 1].setAttribute('data-pos','right');
      }
    }
  }

  customElements.define('reviews-gallery', ReviewsGallery);
})();
