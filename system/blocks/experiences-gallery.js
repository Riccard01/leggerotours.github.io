// /system/blocks/experiences-gallery.js
// Form a step: Esperienza -> Barca -> Cibo (1 sola) -> Porto
// - Scroll orizzontale con snap center
// - Scaling graduale in base alla distanza dal centro
// - Tab di progresso in alto
// - Emissione evento finale: "form-complete" con { esperienza, barca, cibo, porto }
(() => {
  if (customElements.get('experiences-gallery')) return;

  class ExperiencesGallery extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._onScroll = this._onScroll.bind(this);
      this._raf = null;

      // Stato del form
      this._steps = [
        { key: 'esperienza', label: 'Esperienza' },
        { key: 'barca',      label: 'Barca' },
        { key: 'cibo',       label: 'Cibo' },
        { key: 'porto',      label: 'Porto' },
      ];
      this._currentStep = 0;
      this._selections = { esperienza: null, barca: null, cibo: null, porto: null };

      // Dati demo (immagini random)
      this._data = {
        esperienza: [
          { id:'rainbow', title:'The Rainbow Tour', price:'€570 per group', img:'./assets/images/portofino.jpg', desc:'Esplora baie segrete da Punta Chiappa a Portofino.' },
          { id:'gourmet', title:'Gourmet Sunset',   price:'€390 per group', img:'./assets/images/genovese.jpg', desc:'Tramonto con degustazione a bordo.' },
          { id:'stella',  title:'Stella Maris',     price:'€1200 per group',img:'./assets/images/special.jpg',  desc:'Camogli e San Fruttuoso con aperitivo.' },
          { id:'firew',   title:'Recco Fireworks',  price:'€1200 per group',img:'./assets/images/fireworks.jpg',   desc:'Notte di fuochi dal mare.' },
        ],
        barca: [
          { id:'gozzo',  title:'Gozzo Ligure',    price:'Incluso', img:'https://picsum.photos/seed/gozzo/800/600',  desc:'Classico e confortevole.' },
          { id:'rib',    title:'Gommone RIB',     price:'+ €90',   img:'https://picsum.photos/seed/rib/800/600',    desc:'Agile e veloce.' },
          { id:'yacht',  title:'Piccolo Yacht',   price:'+ €350',  img:'https://picsum.photos/seed/yacht/800/600',  desc:'Eleganza e spazio.' },
        ],
        cibo: [
          { id:'focaccia', title:'Focaccia & Pesto', price:'+ €30', img:'https://picsum.photos/seed/focaccia/800/600', desc:'Tipico ligure.' },
          { id:'crudo',    title:'Crudi di Mare',    price:'+ €80', img:'https://picsum.photos/seed/crudi/800/600',    desc:'Selezione del giorno.' },
          { id:'veget',    title:'Vegetariano',      price:'+ €25', img:'https://picsum.photos/seed/veg/800/600',      desc:'Fresco e leggero.' },
        ],
        porto: [
          { id:'camogli',  title:'Camogli',    price:'—', img:'https://picsum.photos/seed/camogli/800/600',  desc:'Partenza dal molo principale.' },
          { id:'recco',    title:'Recco',      price:'—', img:'https://picsum.photos/seed/recco/800/600',    desc:'Comodo parcheggio.' },
          { id:'portofino',title:'Portofino',  price:'—', img:'https://picsum.photos/seed/portofino/800/600',desc:'Iconico borgo.' },
        ]
      };

      this.shadowRoot.innerHTML = `
        <style>
          :host {
            /* tuning effetti */
            --falloff: 260px;
            --scale-min: 0.92;
            --scale-max: 1.06;
            --opacity-min: 0.9;

            --gap: 32px;
            --pad: 16px;
            --peek: 110px;

            display: block;
            width: 100%;
            box-sizing: border-box;
          }

          /* Tabs di progresso */
          .tabs {
            position: sticky;
            top: 0;
            z-index: 10;
            background: linear-gradient(to bottom, rgba(255,255,255,.95), rgba(255,255,255,.85));
            backdrop-filter: blur(6px);
            padding: 8px 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          .tabs .row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
            align-items: center;
          }
          .tab {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 12px;
            font: 600 14px/1 system-ui, sans-serif;
            border-radius: 999px;
            border: 1px solid #e5e7eb;
            background: #fff;
            color: #0b1220;
            cursor: pointer;
            user-select: none;
            transition: background .15s ease, border-color .15s ease, color .15s ease;
            white-space: nowrap;
          }
          .tab[data-active="true"] {
            border-color: #c7d2fe;
            background: #eef2ff;
            color: #3730a3;
          }
          .tab[data-done="true"]::after {
            content: "✓";
            font-weight: 900;
            margin-left: 6px;
          }
          .tab[aria-disabled="true"] {
            opacity: .5;
            pointer-events: none;
          }

          /* Wrapper scroller */
          .wrap {
            position: relative;
          }

          /* Scroller orizzontale con snap */
          .scroller {
            display: flex;
            flex-direction: row;
            gap: var(--gap);
            padding: var(--pad);
            padding-top: 7rem; /* richiesto */
            width: 100%;
            box-sizing: border-box;

            overflow-x: auto;
            overflow-y: hidden;
            -webkit-overflow-scrolling: touch;
            scroll-snap-type: x mandatory;
          }
          .scroller::-webkit-scrollbar { display: none; }

          .scroller > * {
            flex: 0 0 auto;
            scroll-snap-align: center;
            scroll-snap-stop: normal;
          }

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
            content: "";
            position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
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
          .spacer {
            display: block;
            flex: 0 0 12px;
            scroll-snap-align: none;
            pointer-events: none;
          }

          /* Headline step */
          .headline {
            margin: 16px 16px 8px;
            font: 700 18px/1.2 system-ui, sans-serif;
            color: #0b1220;
          }

          @media (min-width: 501px) {
            .scroller {
              /* su desktop mostriamo comunque scroller + snap */
              padding-top: 4rem;
            }
          }
        </style>

        <div class="tabs" role="tablist" aria-label="Percorso prenotazione">
          <div class="row" id="tabsRow"></div>
        </div>

        <div class="headline" id="headline"></div>

        <div class="wrap">
          <div class="scroller" id="scroller">
            <div class="spacer" aria-hidden="true"></div>
            <!-- cards verranno generate qui -->
            <div class="spacer" aria-hidden="true"></div>
          </div>
        </div>
      `;
    }

    connectedCallback() {
      // Render iniziale
      this._renderTabs();
      this._renderStep();

      // Scroll listener per scaling
      const scroller = this.shadowRoot.getElementById('scroller');
      scroller.addEventListener('scroll', this._onScroll, { passive: true });

      // Resize observer per ricalcolare scaling/spacers
      this._ro = new ResizeObserver(() => this._queueUpdate());
      this._ro.observe(scroller);

      // Primo update
      requestAnimationFrame(() => this._queueUpdate());
    }

    disconnectedCallback() {
      const scroller = this.shadowRoot.getElementById('scroller');
      scroller?.removeEventListener('scroll', this._onScroll);
      if (this._ro) this._ro.disconnect();
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

        // Permetti di tornare agli step già completati
        if (i > this._currentStep && !done) {
          b.setAttribute('aria-disabled', 'true');
        }

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

    _renderStep() {
      const head = this.shadowRoot.getElementById('headline');
      const step = this._steps[this._currentStep];
      const scroller = this.shadowRoot.getElementById('scroller');

      head.textContent = this._headlineFor(step.key);

      // Rendi le card per lo step
      const items = this._data[step.key] || [];
      // Manteniamo i due spacer già presenti come primo e ultimo child
      const children = Array.from(scroller.children).filter(n => !n.classList.contains('spacer'));
      for (const n of children) n.remove();

      // ✅ mantiene l'ordine
      const anchor = scroller.lastElementChild; // lo spacer in coda
      items.forEach(item => {
        const card = this._createCard(step.key, item);
        scroller.insertBefore(card, anchor); // sempre prima dello spacer finale
      });


      // Reset scroll all’inizio dello step
      scroller.scrollTo({ left: 0 });

      // Re-bind pulsanti "Configura"/"Scegli"
      scroller.querySelectorAll('ds-button[slot="cta"]').forEach(btn => {
        btn.addEventListener('ds-select', (e) => {
          const val = btn.getAttribute('value');
          this._handleSelect(step.key, val);
        });
      });

      // Aggiorna tabs
      this._renderTabs();
      // Aggiorna scaling/spacer
      this._queueUpdate();
    }

    _createCard(stepKey, item) {
      const el = document.createElement('experience-card');
      el.setAttribute('id', `${stepKey}-${item.id}`);
      el.setAttribute('image', item.img);
      el.setAttribute('title', item.title);
      if (item.price) el.setAttribute('price', item.price);
      if (item.desc)  el.setAttribute('description', item.desc);

      // CTA text cambia a seconda dello step
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
      if (stepKey === 'cibo') {
        // Solo uno selezionabile: sovrascrive eventuale scelta precedente
        this._selections.cibo = value;
      } else {
        this._selections[stepKey] = value;
      }

      // Avanza di step o completa
      if (this._currentStep < this._steps.length - 1) {
        this._currentStep++;
        this._renderStep();
      } else {
        // Fine: dispatch evento con tutte le selezioni
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

    // ---------- Scroll FX (scaling + spacer dinamici) ----------
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
      const items = Array.from(scroller.children)
        .filter(el => el.tagName && el.tagName.includes('-'));
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

      const children = Array.from(scroller.children)
        .filter(el => el.tagName && el.tagName.includes('-'));

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

      // flag "data-active" (se ti serve per stili extra)
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
  }

  customElements.define('experiences-gallery', ExperiencesGallery);
})();
