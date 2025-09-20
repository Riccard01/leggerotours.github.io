// /system/blocks/experiences-gallery.js
// Form a step: Esperienza -> Barca -> Cibo (1 sola) -> Porto
// - Tabs stile "tag" (dark, attivo/done bianco)
// - Scroll orizzontale con snap + scaling graduale (senza shine extra)
// - Animazioni di comparsa/scomparsa con leggero delay (stagger) senza interferire con la scala
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

      // Typewriter (velocità consigliata 24–36 ms)
      this._typeSpeed = 28; // ms per carattere — modifica qui per cambiare velocità
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

      // Dati demo (usa i tuoi asset)
      this._data = {
        esperienza: [
          { id:'rainbow', title:'Full Day', price:'€650 per group', img:'./assets/images/portofino.jpg',   desc:'Una giornata intera di esplorazione nel golfo di Portofino' },
          { id:'rainbow', title:'Half Day', price:'€450 per group', img:'./assets/images/portofino.jpg',   desc:'Goditi mezza giornata di bagno a Bogliasco' },
          { id:'gourmet', title:'Gourmet Sunset',   price:'€390 per group', img:'./assets/images/genovese.jpg',    desc:'Tramonto con degustazione a bordo.' },
          { id:'stella',  title:'Stella Maris',     price:'€1200 per group',img:'./assets/images/special.jpg',     desc:'Camogli e San Fruttuoso con aperitivo.' },
          { id:'firew',   title:'Recco Fireworks',  price:'€1200 per group',img:'./assets/images/fireworks.jpg',   desc:'Notte di fuochi dal mare.' },

          { id:'Boccadasse',   title:'Boccadasse',  price:'€1200 per group',img:'./assets/images/boccadasse.jpeg',   desc:'Notte di fuochi dal mare.' },
          { id:'Bogliasco',   title:'Bogliasco',  price:'€1200 per group',img:'./assets/images/bogliasco.jpg',   desc:'Notte di fuochi dal mare.' },
          { id:'Sori',   title:'Sori',  price:'€1200 per group',img:'./assets/images/sori.jpg',   desc:'Notte di fuochi dal mare.' },
          { id:'Recco',   title:'Recco',  price:'€1200 per group',img:'./assets/images/recco.jpg',   desc:'Notte di fuochi dal mare.' },
          { id:'Camogli',   title:'Camogli',  price:'€1200 per group',img:'./assets/images/camogli.jpg',   desc:'Notte di fuochi dal mare.' },
          { id:'San Fruttuoso',   title:'San Fruttuoso',  price:'€1200 per group',img:'./assets/images/sanfru.webp',   desc:'Notte di fuochi dal mare.' },
          { id:'Portofino',   title:'Portofino',  price:'€1200 per group',img:'./assets/images/portofino.webp',   desc:'Notte di fuochi dal mare.' },
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
            --pad-bottom: 7.5rem;
            --pad-top-desktop: 4rem;

            /* animazioni */
            --enter-dur: ${ENTER_DUR}ms;
            --exit-dur:  ${EXIT_DUR}ms;
            --stagger:   ${STAGGER}ms;

            z-index: 1;
            display: block;
            width: 100%;
            box-sizing: border-box;
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
          }
* {
  font-family: 'Plus Jakarta Sans' !important;
}
          /* Headline Apple-like (centrato e stabile) */
          .headline{
            margin: 8px var(--pad-inline) 10px;
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
            font-weight: 700;
            font-size: 1.4rem;
            line-height: 1.2;
            text-align: center;

            background: linear-gradient(to bottom, #ffffff 0%, #ebebeb 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            color: transparent;
            text-shadow: 0 2px 6px rgba(0,0,0,0.25);

            min-height: 1.6em; /* evita salti */
          }
          .headline #tw{
            display: inline-block;
            white-space: nowrap; /* niente wrap -> nessuno shift a sx */
          }

          /* Tabs stile tag (dark, attivo/done bianco) */
          .tabs { position: static; background: transparent; border: none; padding: 0; margin: 0 var(--pad-inline) 6px; }
          .tabs .row {
            display: flex; gap: 8px; align-items: center; justify-content: center; flex-wrap: wrap;
          }
          .tab {
            display: inline-flex; align-items: center; justify-content: center; gap: 4px;
            padding: 3px 10px;                      /* breadcrumb-like */
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

          /* attivo + completati: restano bianchi */
          .tab[aria-selected="true"],
          .tab[data-active="true"],
          .tab[data-done="true"] {
            background: #fff;
            color: #0b1220;
            border-color: transparent;
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
          .scroller > * { flex: 0 0 auto; scroll-snap-align: center; scroll-snap-stop: always; }

          /* Card: scaling (NO SHINE) */
          .scroller > :not(.spacer) {
            position: relative;
            transform: scale(var(--_scale, 1));
            opacity: var(--_opacity, 1);
            transition: transform 0s, opacity 0s; /* immediata: niente conflitti con anim */
            will-change: transform, opacity;
            z-index: var(--_z, 0);
          }
          /* (RIMOSSO qualsiasi ::after "shine") */

          /* Spacers ai lati (dinamici) */
          .spacer { display: block; flex: 0 0 12px; scroll-snap-align: none; pointer-events: none; }

          /* Dots pagination (minimal) */
          .dots{
            position: absolute; left: 0; right: 0; bottom: 80px; z-index: 10;
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
            .dots{ bottom: 80px; }
          }

          /* Animazioni (entrata/uscita) — NON tocchiamo la scala, solo translate/opacity */
          @supports (translate: 0) {
            @keyframes card-in { from { opacity:0; translate: 0 8px; } to { opacity:1; translate: 0 0; } }
            @keyframes card-out{ to   { opacity:0; translate: 0 8px; } }
          }
          @supports not (translate: 0) {
            @keyframes card-in { from { opacity:0; transform: translateY(8px) scale(var(--_scale,1)); } to { opacity:1; transform: translateY(0) scale(var(--_scale,1)); } }
            @keyframes card-out{ to   { opacity:0; transform: translateY(8px) scale(var(--_scale,1)); } }
          }
          .card-enter{
            animation: card-in var(--enter-dur) cubic-bezier(.2,.7,.2,1) both;
            animation-delay: calc(var(--stagger-idx, 0) * var(--stagger));
          }
          .card-leave{
            animation: card-out var(--exit-dur) ease both;
            animation-delay: calc(var(--stagger-idx, 0) * var(--stagger));
          }

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

      this._ro = new ResizeObserver(() => {
        // Centra e aggiorna durante resize senza scatti
        this._updateSpacers();
        this._updateVisuals();
      });
      this._ro.observe(scroller);

      requestAnimationFrame(() => {
        this._updateSpacers();
        this._updateVisuals();
      });
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

        const done = !!this._selections[s.key];
        const isActive = (i === this._currentStep);

        b.dataset.active = isActive ? 'true' : 'false';
        b.dataset.done   = done ? 'true' : 'false';
        b.setAttribute('aria-selected', isActive ? 'true' : 'false');
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

      // 1) Uscita card correnti (non spacer)
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

      // 2) Inserisci nuove card
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

      // 3) Dots
      this._renderDots(items.length);

      // 4) Centra SUBITO la prima card e applica la scala PRIMA del typewriter
      //    (niente scatti: niente scrollTo smooth, e aggiorniamo le spacers sync)
      this._updateSpacers();
      scroller.scrollLeft = 0;
      this._updateVisuals(); // scala immediata della card centrale

      // 5) Tabs + Titolo (typewriter)
      this._renderTabs();
      this._typeHeadline(this._headlineFor(step.key));

      // 6) Pulizia animazioni
      setTimeout(() => {
        if (token !== this._renderToken) return;
        scroller.querySelectorAll('.card-enter').forEach(el => el.classList.remove('card-enter'));
      }, ENTER_DUR + (items.length - 1) * STAGGER + 20);

      // 7) Bind CTA (avanza step)
      scroller.querySelectorAll('ds-button[slot="cta"]').forEach(btn => {
        btn.addEventListener('ds-select', () => {
          const val = btn.getAttribute('value');
          this._handleSelect(step.key, val);
        });
      });
    }

    _createCard(stepKey, item) {
      const el = document.createElement('experience-card');
      el.setAttribute('id', `${stepKey}-${item.id}`);
      el.setAttribute('image', item.img);
      el.setAttribute('title', item.title);
      if (item.price) el.setAttribute('price', item.price);
      if (item.desc)  el.setAttribute('description', item.desc);

      // Il bottone resta come nel tuo design system (bianco solid full)
      const cta = document.createElement('ds-button');
      cta.setAttribute('slot', 'cta');
      cta.setAttribute('size', 'md');
      cta.setAttribute('full', '');
      cta.setAttribute('variant', 'solid-light');
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
      // start dopo un frame (le card sono già centrate e scalate)
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
    _onScroll() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => {
        this._raf = null;
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

      // Centratura precisa: (host - card)/2 — niente sottrazione del gap!
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

      const cs = getComputedStyle(this);
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

        const scale = sMin + (sMax - sMin) * eased;
        const opacity = oMin + (1 - oMin) * eased;

        el.style.setProperty('--_scale', scale.toFixed(4));
        el.style.setProperty('--_opacity', opacity.toFixed(4));
        el.style.setProperty('--_z', (Math.round(eased * 100)).toString());

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
    _wait(ms) { return new Promise(r => setTimeout(r, ms)); }
  }

  customElements.define('experiences-gallery', ExperiencesGallery);
})();
