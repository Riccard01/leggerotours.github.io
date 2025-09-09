// /system/blocks/experiences-gallery.js
// Form a step: Esperienza -> Barca -> Cibo (1 sola) -> Porto
// - Tabs stile "tag" (dark, attivo/done bianco)
// - Scroll orizzontale con snap + scaling graduale
// - Animazioni di comparsa/scomparsa con leggero delay (stagger)
// - Dots/pallini sotto le card
// - Typewriter sul titolo (senza caret), centrato e stabile
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
      this._renderToken = 0;

      // Typewriter
      this._typeSpeed = 10; // ms per carattere (modifica qui per cambiare velocità)
      this._twTimer = null;

      // Stato del form
      this._steps = [
        { key: 'esperienza', label: 'Esperienza' },
        { key: 'barca',      label: 'Barca' },
        { key: 'cibo',       label: 'Cibo' },
        { key: 'porto',      label: 'Porto' },
      ];
      this._currentStep = 0;
      this._selections = { esperienza: null, barca: null, cibo: null, porto: null };

      // Dati demo
      this._data = {
        esperienza: [
          { id:'rainbow', title:'The Rainbow Tour', price:'€570 per group', img:'./assets/images/portofino.jpg',   desc:'Esplora baie segrete da Punta Chiappa a Portofino.' },
          { id:'gourmet', title:'Gourmet Sunset',   price:'€390 per group', img:'./assets/images/genovese.jpg',    desc:'Tramonto con degustazione a bordo.' },
          { id:'stella',  title:'Stella Maris',     price:'€1200 per group',img:'./assets/images/special.jpg',     desc:'Camogli e San Fruttuoso con aperitivo.' },
          { id:'firew',   title:'Recco Fireworks',  price:'€1200 per group',img:'./assets/images/fireworks.jpg',   desc:'Notte di fuochi dal mare.' },
        ],
        barca: [
          { id:'gozzo',  title:'Leggera',        price:'Incluso',  img:'./assets/images/leggera.jpg',  desc:'Classico e confortevole.' },
          { id:'rib',    title:'Gozzo Ligure',   price:'+ €90',    img:'./assets/images/barca2.jpg',   desc:'Agile e veloce.' },
          { id:'yacht',  title:'Piccolo Yacht',  price:'+ €350',   img:'./assets/images/barca3.jpg',   desc:'Eleganza e spazio.' },
        ],
        cibo: [
          { id:'focaccia', title:'Prosciutto e melone',          price:'+ €30', img:'./assets/images/melone.jpg',   desc:'Tipico ligure.' },
          { id:'crudo',    title:'Insalata di anguria e cipolle', price:'+ €80', img:'./assets/images/anguria.jpg',  desc:'Selezione del giorno.' },
          { id:'veget',    title:'Vegetariano',                  price:'+ €25', img:'./assets/images/couscous.jpg', desc:'Fresco e leggero.' },
        ],
        porto: [
          { id:'camogli',   title:'Porto Antico', price:'—', img:'./assets/images/portoantico.jpg',  desc:'Partenza dal molo principale.' },
          { id:'portofino', title:'Portofino',    price:'—', img:'./assets/images/portofino.jpg',    desc:'Iconico borgo.' },
          { id:'recco',     title:'Recco',        price:'—', img:'./assets/images/porto1.jpg',       desc:'Comodo parcheggio.' },
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

            /* padding separati */
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
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
          }

          /* Headline (gradient Apple-like, centrato, stabile) */
          .headline{
            margin: 16px var(--pad-inline) 12px;
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
            font-weight: 700;
            font-size: 1.4rem;
            line-height: 1.2;
            text-align: center;

            /* stile Apple index */
            background: linear-gradient(to bottom, #ffffff 0%, #ebebeb 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
            text-shadow: 0 2px 6px rgba(0,0,0,0.25);

            min-height: 1.4em; /* evita salti */
          }
          .headline #tw{
            display: inline-block;
            white-space: nowrap; /* nessun wrap -> niente shift */
          }

          /* Tabs stile tag (dark, attivo/done bianco) */
          .tabs { position: static; background: transparent; border: none; padding: 0; margin: 0 var(--pad-inline) 8px; }
          .tabs .row {
            display: flex; gap: 8px; align-items: center; justify-content: center; flex-wrap: wrap;
          }
          .tab {
            display: inline-flex; align-items: center; justify-content: center; gap: 4px;
            padding: 3px 10px; /* breadcrumb-like */
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
            font-weight: 600; font-size: 13px; line-height: 1.1;
            color: #e8eef8;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.18);
            border-radius: 999px;
            cursor: pointer; user-select: none;
            transition: background .15s ease, border-color .15s ease, color .15s ease, opacity .15s ease;
          }
          .tab:hover:not([aria-disabled="true"]) { background: rgba(255,255,255,.10); }
          .tab[aria-disabled="true"] { opacity: .5; cursor: default; }

          /* attivo */
          .tab[aria-selected="true"],
          .tab[data-active="true"] {
            background: #fff;
            color: #0b1220;
            border-color: transparent;
          }
          /* completati: restano bianchi */
          .tab[data-done="true"]{
            background: #fff;
            color: #0b1220;
            border-color: transparent;
            opacity: .95;
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

          /* Spacers ai lati (dinamici) */
          .spacer { display: block; flex: 0 0 12px; scroll-snap-align: none; pointer-events: none; }

          /* Dots pagination (minimal) */
          .dots{
            position: absolute; left: 0; right: 0; bottom: 76px;
            display: flex; justify-content: center; gap: 8px;
            pointer-events: none;
          }
          .dot{
            inline-size: 6px; block-size: 6px; border-radius: 999px;
            background: rgba(255,255,255,.28);
            transform: scale(1);
            transition: transform .18s ease, background-color .18s ease, opacity .18s;
            opacity: .85;
          }
          .dot[aria-current="true"]{
            background: #fff; opacity: 1; transform: scale(1.25);
          }

          @media (min-width: 501px){
            .scroller { padding-top: var(--pad-top-desktop); }
            .dots{ bottom: 32px; } /* più vicino alle card su desktop */
          }

          /* Animazioni (entrata/uscita) */
          @keyframes card-in { from { opacity:0; transform: translateY(8px) scale(.985); } to { opacity:1; transform: translateY(0) scale(1);} }
          @keyframes card-out { to { opacity:0; transform: translateY(8px) scale(.985);} }
          .card-enter{ animation: card-in var(--enter-dur) cubic-bezier(.2,.7,.2,1) both; animation-delay: calc(var(--stagger-idx, 0) * var(--stagger)); }
          .card-leave{ animation: card-out var(--exit-dur) ease both; animation-delay: calc(var(--stagger-idx, 0) * var(--stagger)); }

          @media (prefers-reduced-motion: reduce) {
            .card-enter, .card-leave { animation: none !important; }
          }
        </style>

        <h2 class="headline" id="headline" aria-live="polite" aria-atomic="true">
          <span id="tw"></span>
        </h2>

        <div class="tabs" role="tablist" aria-label="Percorso prenotazione">
          <div class="row" id="tabsRow"></div>
        </div>

        <div class="wrap">
          <div class="scroller" id="scroller">
            <div class="spacer" aria-hidden="true"></div>
            <!-- cards create dinamicamente -->
            <div class="spacer" aria-hidden="true"></div>
          </div>
          <div class="dots" id="dots" aria-hidden="true"></div>
        </div>
      `;
    }

    connectedCallback() {
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
      if (this._twTimer) { clearTimeout(this._twTimer); this._twTimer = null; }
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
      const step = this._steps[this._currentStep];
      const scroller = this.shadowRoot.getElementById('scroller');
      const token = ++this._renderToken;

      // 1) Anima via le card correnti (non spacer)
      const leaving = Array.from(scroller.children).filter(n => !n.classList.contains('spacer'));
      if (leaving.length) {
        leaving.forEach((el, i) => {
          el.classList.remove('card-enter');
          el.style.setProperty('--stagger-idx', i.toString());
          el.classList.add('card-leave');
        });

        await this._wait(EXIT_DUR + (leaving.length - 1) * STAGGER + 20);
        if (token !== this._renderToken) return;
        leaving.forEach(n => n.remove());
      }

      // 2) Inserisci le nuove card e anima ingresso
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

      // Dots per il nuovo step
      this._renderDots(items.length);

      // Reset scroll step + update spacers per centrare PERFETTAMENTE
      // (senza sottrarre gap: lo spacer deve essere (host - card)/2)
      requestAnimationFrame(() => {
        this._updateSpacers();
        scroller.scrollTo({ left: 0 });
        this._queueUpdate();
      });

      // CTA
      scroller.querySelectorAll('ds-button[slot="cta"]').forEach(btn => {
        btn.addEventListener('ds-select', () => {
          const val = btn.getAttribute('value');
          this._handleSelect(step.key, val);
        });
      });

      // Tabs
      this._renderTabs();

      // Titolo typewriter (dopo che le card sono inserite)
      this._typeHeadline(this._headlineFor(step.key));

      // Ripulisci classi 'card-enter' a fine anim
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

    // ---------- Typewriter (senza caret) ----------
    _typeHeadline(text){
      const tw = this.shadowRoot.getElementById('tw');
      if (!tw) return;
      if (this._twTimer) { clearTimeout(this._twTimer); this._twTimer = null; }
      tw.textContent = '';
      // start dopo un frame per non competere con il repaint delle card
      requestAnimationFrame(() => this._typewriteStep(tw, text, 0));
    }
    _typewriteStep(tw, text, i){
      if (i > text.length) return;
      tw.textContent = text.slice(0, i);
      if (i < text.length){
        this._twTimer = setTimeout(() => this._typewriteStep(tw, text, i+1), this._typeSpeed);
      } else {
        this._twTimer = null;
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

      // Fix centratura: nessuna sottrazione del gap!
      const leftNeeded  = Math.max(12, (hostRect.width - firstRect.width) / 2);
      const rightNeeded = Math.max(12, (hostRect.width - lastRect.width)  / 2);

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
        const activeIndex = children.indexOf(best);
        this._updateDots(activeIndex);
      }
    }

    // ---------- Dots ----------
    _renderDots(count){
      const dots = this.shadowRoot.getElementById('dots');
      if (!dots) return;
      dots.innerHTML = '';
      for (let i = 0; i < count; i++){
        const d = document.createElement('i');
        d.className = 'dot';
        d.setAttribute('role','presentation');
        dots.appendChild(d);
      }
      this._updateDots(0);
    }

    _updateDots(activeIndex){
      const dots = this.shadowRoot.getElementById('dots');
      if (!dots) return;
      const list = Array.from(dots.children);
      list.forEach((el, i) => {
        if (i === activeIndex) el.setAttribute('aria-current','true');
        else el.removeAttribute('aria-current');
      });
    }

    // ---------- Utils ----------
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
