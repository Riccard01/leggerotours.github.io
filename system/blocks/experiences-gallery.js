// /system/blocks/experiences-gallery.js
// Form a step: Esperienza -> Barca -> Cibo (1 sola) -> Porto
// - Tabs stile "tag", non sticky
// - Scroll orizzontale con snap + scaling graduale
// - Animazioni di comparsa/scomparsa con leggero delay (stagger)
// - Emissione finale "form-complete"
(() => {
  if (customElements.get('experiences-gallery')) return;

  const ENTER_DUR = 280; // ms
  const EXIT_DUR  = 180; // ms
  const STAGGER   = 60;  // ms tra una card e la successiva

  class ExperiencesGallery extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._onScroll = this._onScroll.bind(this);
      this._raf = null;
      this._renderToken = 0; // per evitare race tra step rapidi

      // Stato del form
      this._steps = [
        { key: 'esperienza', label: 'Esperienza' },
        { key: 'barca',      label: 'Barca' },
        { key: 'cibo',       label: 'Cibo' },
        { key: 'porto',      label: 'Porto' },
      ];
      this._currentStep = 0;
      this._selections = { esperienza: null, barca: null, cibo: null, porto: null };

      // Dati demo (mix reali + placeholder)
      this._data = {
        esperienza: [
          { id:'rainbow', title:'The Rainbow Tour', price:'€570 per group', img:'./assets/images/portofino.jpg',   desc:'Esplora baie segrete da Punta Chiappa a Portofino.' },
          { id:'gourmet', title:'Gourmet Sunset',   price:'€390 per group', img:'./assets/images/genovese.jpg',    desc:'Tramonto con degustazione a bordo.' },
          { id:'stella',  title:'Stella Maris',     price:'€1200 per group',img:'./assets/images/special.jpg',     desc:'Camogli e San Fruttuoso con aperitivo.' },
          { id:'firew',   title:'Recco Fireworks',  price:'€1200 per group',img:'./assets/images/fireworks.jpg',   desc:'Notte di fuochi dal mare.' },
        ],
        barca: [
          { id:'gozzo',  title:'Leggera',    price:'Incluso', img:'./assets/images/leggera.jpg',  desc:'Classico e confortevole.' },
          { id:'rib',    title:'Gozzo Ligure',     price:'+ €90',   img:'./assets/images/barca2.jpg',    desc:'Agile e veloce.' },
          { id:'yacht',  title:'Piccolo Yacht',   price:'+ €350',  img:'./assets/images/barca3.jpg',  desc:'Eleganza e spazio.' },
        ],
        cibo: [
          { id:'focaccia', title:'Prosciutto e melone', price:'+ €30', img:'./assets/images/melone.jpg', desc:'Tipico ligure.' },
          { id:'crudo',    title:'Instalata di anguria e cipolle',    price:'+ €80', img:'./assets/images/anguria.jpg',    desc:'Selezione del giorno.' },
          { id:'veget',    title:'Vegetariano',      price:'+ €25', img:'./assets/images/couscous.jpg',      desc:'Fresco e leggero.' },
        ],
        porto: [
          { id:'camogli',  title:'Porto Antico',     price:'—', img:'./assets/images/portoantico.jpg',  desc:'Partenza dal molo principale.' },
          { id:'recco',    title:'Portofino',       price:'—', img:'./assets/images/porto1.jpg',    desc:'Comodo parcheggio.' },
          { id:'portofino',title:'Recco',   price:'—', img:'./assets/images/portofino.jpg',desc:'Iconico borgo.' },
        ]
      };

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            /* FX scroller */
            --falloff: 260px;
            --scale-min: 0.92;
            --scale-max: 1.06;
            --opacity-min: 0.9;

            --gap: 32px;

            /* padding separati (puoi override da fuori) */
            --pad-inline: 16px;
            --pad-top: 3rem;
            --pad-bottom: 8rem;
            --pad-top-desktop: 4rem;

            /* animazioni */
            --enter-dur: ${ENTER_DUR}ms;
            --exit-dur:  ${EXIT_DUR}ms;
            --stagger:   ${STAGGER}ms;

            display: block;
            width: 100%;
            box-sizing: border-box;
          }

          /* Headline step */
          .headline {
            margin: 16px var(--pad-inline) 6px;
            font: 700 18px/1.3 system-ui, sans-serif;
            color: #fff;
          }

/* TABS: pill bianche, nessuna ombra, centrate */
.tabs{
  position: static;
  background: transparent;
  border: none;
  /* centratura rispetto alla pagina/contenitore */
  margin: 0 auto 12px;
  width: 100%;
  max-width: 1100px;               /* allinea alla tua grid */
  padding: 0 var(--pad-inline);
  box-sizing: border-box;
}
.tabs .row{
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: center;         /* centrato */
}

/* pill bianche in ogni stato; niente shadow */
.tab{
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  font: 600 13px/1.1 var(--font-sans, system-ui, sans-serif);
  color: #0b1220;                  /* testo scuro sul bianco */
  background: #ffffff;             /* BIANCO */
  border: 1px solid #ffffff;
  border-radius: 999px;
  cursor: pointer;
  user-select: none;
  transition: opacity .15s ease, transform .12s ease, border-color .15s ease;
}
.tab:hover:not([aria-disabled="true"]){ opacity: .9; }

/* attiva: sempre bianca */
.tab[data-active="true"]{
  background: #ffffff;
  color: #0b1220;
  border-color: #ffffff;
}

/* completata: sempre bianca ma un filo attenuata */
.tab[data-done="true"]{
  background: #ffffff;
  color: #0b1220;
  border-color: #e5e7eb;
  opacity: .8;
}
.tab[data-done="true"]::after{
  content: "✓";
  font-weight: 700;
  font-size: 12px;
  margin-left: 6px;
}

/* futura/disabilitata: bianca ma più chiara */
.tab[aria-disabled="true"]{
  opacity: .45;
  cursor: default;
}

/* focus accessibile (niente shadow) */
.tab:focus-visible{
  outline: 2px solid var(--ring-brand, #93C5FD);
  outline-offset: 2px;
}


          @media (max-width: 560px){
            .tabs .row{ gap: 6px; }
            .tab{ padding: 5px 10px; font-weight: 700; font-size: 12.5px; }
          }

          /* Wrapper scroller */
          .wrap { position: relative; }

          /* Scroller orizzontale con snap */
          .scroller {
            display: flex; flex-direction: row; gap: var(--gap);
            padding: var(--pad-top) var(--pad-inline) var(--pad-bottom) var(--pad-inline);
            width: 100%; box-sizing: border-box;

            overflow-x: auto; overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: x mandatory;
          }
          .scroller::-webkit-scrollbar { display: none; }
          .scroller > * { flex: 0 0 auto; scroll-snap-align: center; scroll-snap-stop: normal; }

          /* Card: scaling/shine */
          .scroller > :not(.spacer) {
            position: relative;
            transform: scale(var(--_scale, 1));
            opacity: var(--_opacity, 1);
            transition: transform 0s, opacity 0s;
            will-change: transform, opacity;
            z-index: var(--_z, 0);
          }
          .scroller > :not(.spacer)::after {
            content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
            background-image: linear-gradient(60deg,
              rgba(255,255,255,0) 0%,
              rgba(255,255,255,0.06) 40%,
              rgba(255,255,255,0.14) 50%,
              rgba(255,255,255,0.06) 60%,
              rgba(255,255,255,0) 100%);
            opacity: calc(var(--_shine, 0) * 0.45);
            mix-blend-mode: screen;
          }

          /* spacer ai lati (dinamici in JS) */
          .spacer { display: block; flex: 0 0 12px; scroll-snap-align: none; pointer-events: none; }

          /* ── Animazioni (entrata/uscita) ───────────────────────── */
          @keyframes card-in {
            from { opacity: 0; transform: translateY(8px) scale(.985); }
            to   { opacity: 1; transform: translateY(0)    scale(1); }
          }
          @keyframes card-out {
            to   { opacity: 0; transform: translateY(8px) scale(.985); }
          }
          .card-enter {
            animation: card-in var(--enter-dur) cubic-bezier(.2,.7,.2,1) both;
            animation-delay: calc(var(--stagger-idx, 0) * var(--stagger));
          }
          .card-leave {
            animation: card-out var(--exit-dur) ease both;
            animation-delay: calc(var(--stagger-idx, 0) * var(--stagger));
          }

          /* Rispetto riduzione movimento */
          @media (prefers-reduced-motion: reduce) {
            .card-enter, .card-leave { animation: none !important; }
          }

          @media (min-width: 501px) {
            .scroller { padding-top: var(--pad-top-desktop); }
          }
        </style>

        <div class="headline" id="headline"></div>

        <div class="tabs" role="tablist" aria-label="Percorso prenotazione">
          <div class="row" id="tabsRow"></div>
        </div>

        <div class="wrap">
          <div class="scroller" id="scroller">
            <div class="spacer" aria-hidden="true"></div>
            <!-- cards create dinamicamente -->
            <div class="spacer" aria-hidden="true"></div>
          </div>
        </div>
      `;
    }

    connectedCallback() {
      // Render iniziale
      this._renderTabs();
      this._renderStep();

      const scroller = this.shadowRoot.getElementById('scroller');
      scroller.addEventListener('scroll', this._onScroll, { passive: true });

      this._ro = new ResizeObserver(() => this._queueUpdate());
      this._ro.observe(scroller);

      requestAnimationFrame(() => this._queueUpdate());
    }

    disconnectedCallback() {
      const scroller = this.shadowRoot.getElementById('scroller');
      scroller?.removeEventListener('scroll', this._onScroll);
      this._ro?.disconnect();
      if (this._raf) cancelAnimationFrame(this._raf);
    }

    // ---------- UI Rendering ----------
    _renderTabs() {
      const row = this.shadowRoot.getElementById('tabsRow');
      row.innerHTML = '';
      this._steps.forEach((s, i) => {
        const b = document.createElement('button');
        b.className = 'tab';
        b.type = 'button';
        b.textContent = `${i+1}. ${s.label}`;
        b.dataset.index = i;
        b.setAttribute('role', 'tab');

        const done = i < this._currentStep || (i === this._currentStep && this._isStepDone(i));
        b.dataset.done = done ? 'true' : 'false';
        b.dataset.active = (i === this._currentStep) ? 'true' : 'false';
        b.setAttribute('aria-selected', i === this._currentStep ? 'true' : 'false');
        if (i > this._currentStep && !done) b.setAttribute('aria-disabled', 'true');

        b.addEventListener('click', () => {
          if (i <= this._currentStep) {
            this._currentStep = i;
            this._renderTabs();
            this._renderStep();
          }
        });

        row.appendChild(b);
      });
    }

    async _renderStep() {
      const head = this.shadowRoot.getElementById('headline');
      const step = this._steps[this._currentStep];
      const scroller = this.shadowRoot.getElementById('scroller');
      const token = ++this._renderToken;

      head.textContent = this._headlineFor(step.key);

      // 1) Anima via le card correnti (non spacer)
      const leaving = Array.from(scroller.children).filter(n => !n.classList.contains('spacer'));
      if (leaving.length) {
        leaving.forEach((el, i) => {
          el.classList.remove('card-enter');
          el.style.setProperty('--stagger-idx', i.toString());
          el.classList.add('card-leave');
        });

        // attesa complessiva (exit dur + ultimo delay)
        await this._wait(EXIT_DUR + (leaving.length - 1) * STAGGER + 20);
        if (token !== this._renderToken) return; // se è cambiato step nel frattempo, abort
        leaving.forEach(n => n.remove());
      }

      // 2) Inserisci le nuove card e anima ingresso con stagger
      const items = this._data[step.key] || [];
      const anchor = scroller.lastElementChild; // spacer finale
      const frag = document.createDocumentFragment();
      items.forEach((item, idx) => {
        const card = this._createCard(step.key, item);
        card.classList.add('card-enter');
        card.style.setProperty('--stagger-idx', idx.toString());
        frag.appendChild(card);
      });
      scroller.insertBefore(frag, anchor);

      // Reset scroll step
      scroller.scrollTo({ left: 0 });

      // Bind CTA
      scroller.querySelectorAll('ds-button[slot="cta"]').forEach(btn => {
        btn.addEventListener('ds-select', () => {
          const val = btn.getAttribute('value');
          this._handleSelect(step.key, val);
        });
      });

      this._renderTabs();

      // 3) Aggiorna FX e rimuovi classi 'card-enter' dopo anim
      this._queueUpdate();
      setTimeout(() => {
        if (token !== this._renderToken) return;
        scroller.querySelectorAll('.card-enter').forEach(el => el.classList.remove('card-enter'));
      }, ENTER_DUR + (items.length - 1) * STAGGER + 20);
    }

    _createCard(stepKey, item) {
      const el = document.createElement('experience-card');
      el.setAttribute('id', `${stepKey}-${item.id}`);
      el.setAttribute('image', item.img);
      el.setAttribute('title', item.title);
      if (item.price) el.setAttribute('price', item.price);
      if (item.desc)  el.setAttribute('description', item.desc);

      const cta = document.createElement('ds-button');
      cta.setAttribute('slot', 'cta');
      cta.setAttribute('size', 'md');
      cta.setAttribute('full', '');
      cta.setAttribute('variant', stepKey === 'esperienza' ? 'with-icon-light' : 'solid-light');
      cta.setAttribute('value', item.id);
      cta.innerHTML = `<span slot="text">${this._ctaTextFor(stepKey)}</span>`;

      el.appendChild(cta);
      return el;
    }

    _ctaTextFor(stepKey) {
      switch (stepKey) {
        case 'esperienza': return 'Configura';
        case 'barca':      return 'Scegli barca';
        case 'cibo':       return 'Scegli menu';
        case 'porto':      return 'Scegli porto';
        default:           return 'Seleziona';
      }
    }

    _headlineFor(stepKey) {
      switch (stepKey) {
        case 'esperienza': return 'Scegli la tua esperienza';
        case 'barca':      return 'Scegli la barca';
        case 'cibo':       return 'Scegli il cibo (1 solo)';
        case 'porto':      return 'Scegli il porto di partenza';
        default:           return '';
      }
    }

    // ---------- Selezione & Navigazione ----------
    _handleSelect(stepKey, value) {
      if (stepKey === 'cibo') this._selections.cibo = value; // single-select
      else this._selections[stepKey] = value;

      if (this._currentStep < this._steps.length - 1) {
        this._currentStep++;
        this._renderStep();
      } else {
        const ev = new CustomEvent('form-complete', {
          bubbles: true,
          composed: true,
          detail: { ...this._selections }
        });
        this.dispatchEvent(ev);
      }
    }
    _isStepDone(index) {
      const key = this._steps[index].key;
      return !!this._selections[key];
    }

    // ---------- Scroll FX ----------
    _onScroll() { this._queueUpdate(); }
    _queueUpdate() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
        this._updateSpacers();
        this._updateVisuals();
      });
    }

    _updateSpacers() {
      const scroller = this.shadowRoot.getElementById('scroller');
      const items = Array.from(scroller.children).filter(el => el.tagName && el.tagName.includes('-'));
      if (!items.length) return;

      const hostRect = scroller.getBoundingClientRect();
      if (hostRect.width === 0) return;

      const firstRect = items[0].getBoundingClientRect();
      const lastRect  = items[items.length - 1].getBoundingClientRect();
      if (firstRect.width === 0 || lastRect.width === 0) return;

      const cs = getComputedStyle(scroller);
      const gapPx = this._toPx(cs.getPropertyValue('gap') || '0');

      const leftNeeded  = Math.max(12, (hostRect.width / 2) - (firstRect.width / 2) - gapPx);
      const rightNeeded = Math.max(12, (hostRect.width / 2) - (lastRect.width  / 2) - gapPx);

      const spacers = Array.from(scroller.querySelectorAll('.spacer'));
      if (spacers[0]) spacers[0].style.flexBasis = `${Math.round(leftNeeded)}px`;
      if (spacers[1]) spacers[1].style.flexBasis = `${Math.round(rightNeeded)}px`;
    }

    _updateVisuals() {
      const scroller = this.shadowRoot.getElementById('scroller');
      const hostRect = scroller.getBoundingClientRect();
      const hostCenterX = hostRect.left + hostRect.width / 2;

      const cs = getComputedStyle(scroller);
      const falloff = parseFloat(cs.getPropertyValue('--falloff')) || 260;
      const sMin = parseFloat(cs.getPropertyValue('--scale-min')) || 0.92;
      const sMax = parseFloat(cs.getPropertyValue('--scale-max')) || 1.06;
      const oMin = parseFloat(cs.getPropertyValue('--opacity-min')) || 0.9;

      const children = Array.from(scroller.children).filter(el => el.tagName && el.tagName.includes('-'));

      let best = null, bestDist = Infinity;

      for (const el of children) {
        const r = el.getBoundingClientRect();
        const center = r.left + r.width / 2;
        const dist = Math.abs(center - hostCenterX);

        const t = 1 - Math.min(dist / falloff, 1); // 0..1
        const eased = 1 - (1 - t) * (1 - t);       // easeOutQuad
        const shineT = Math.max(0, Math.min(1, t * 1.25 + 0.15));

        const scale = sMin + (sMax - sMin) * eased;
        const opacity = oMin + (1 - oMin) * eased;

        el.style.setProperty('--_scale', scale.toFixed(4));
        el.style.setProperty('--_opacity', opacity.toFixed(4));
        el.style.setProperty('--_z', (Math.round(eased * 100)).toString());
        el.style.setProperty('--_shine', shineT.toFixed(4));

        if (dist < bestDist) { bestDist = dist; best = el; }
      }

      if (best) {
        for (const el of children) {
          if (el === best) el.setAttribute('data-active', '');
          else el.removeAttribute('data-active');
        }
      }
    }

    _toPx(val) {
      const num = parseFloat(val);
      if (String(val).includes('rem')) {
        return num * parseFloat(getComputedStyle(document.documentElement).fontSize || 16);
      }
      if (String(val).includes('px') || !isNaN(num)) return num || 0;
      return 0;
    }

    _wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  }

  customElements.define('experiences-gallery', ExperiencesGallery);
})();
