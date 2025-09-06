// /system/blocks/booking-calendar.js  — Calendario “Leggero” con giorni selezionabili
(() => {
  if (customElements.get('booking-calendar')) return;

  class BookingCalendar extends HTMLElement {
    static get observedAttributes() {
      return ['value','min','max','disabled-dates','locale','start-on']; // start-on: 1=Lunedì, 0=Domenica
    }

    constructor(){
      super();
      this.attachShadow({mode:'open'});
      this._mounted = false;

      const now = new Date();
      this._state = {
        locale: 'it-IT',
        startOn: 1, // lunedì
        monthCursor: new Date(now.getFullYear(), now.getMonth(), 1),
        value: null,        // Date selezionata
        min: null,          // Date
        max: null,          // Date
        disabledSet: new Set() // ISO yyyy-mm-dd
      };
    }

    connectedCallback(){
      this._render();
      this._readAll();
      this._mount();
      this._mounted = true;
      this._updateUI();
    }

    attributeChangedCallback(){
      if (!this._mounted) return;
      this._readAll();
      this._updateUI();
    }

    /* ========= Public API ========= */
    get value(){ return this._state.value ? this._toISO(this._state.value) : ''; }
    set value(iso){
      const d = this._parseISO(iso);
      if (d && !this._isDisabled(d)) {
        this._state.value = d;
        this._state.monthCursor = new Date(d.getFullYear(), d.getMonth(), 1);
        this._updateUI(true);
      }
    }

    /* ========= Internals ========= */
    _qs = (s) => this.shadowRoot.querySelector(s);

    _readAll(){
      const g = (n) => this.getAttribute(n);

      // locale / start-on
      const loc = (g('locale') || 'it-IT').trim();
      this._state.locale = loc;
      const so = Number(g('start-on'));
      this._state.startOn = Number.isFinite(so) ? Math.max(0, Math.min(6, so)) : 1;

      // value/min/max
      const v = this._parseISO(g('value'));
      if (v) this._state.value = v;

      const min = this._parseISO(g('min'));
      const max = this._parseISO(g('max'));
      this._state.min = min || null;
      this._state.max = max || null;

      // disabled-dates: CSV o JSON array
      const ddRaw = g('disabled-dates') || '';
      const list = this._parseDisabled(ddRaw);
      this._state.disabledSet = new Set(list.map(x => x));

      // inizializza il mese visibile
      const base = this._state.value || new Date();
      this._state.monthCursor = new Date(base.getFullYear(), base.getMonth(), 1);
    }

    _parseDisabled(raw){
      if (!raw) return [];
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.map(x => String(x));
      } catch(e){}
      return raw.split(',').map(s => s.trim()).filter(Boolean);
    }

    _parseISO(str){
      if (!str) return null;
      // accetta YYYY-MM-DD
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
      if (!m) return null;
      const d = new Date(+m[1], +m[2]-1, +m[3], 12, 0, 0, 0); // mezzogiorno per evitare TZ flip
      return isNaN(d) ? null : d;
    }

    _toISO(d){
      const y = d.getFullYear();
      const m = String(d.getMonth()+1).padStart(2,'0');
      const day = String(d.getDate()).padStart(2,'0');
      return `${y}-${m}-${day}`;
    }

    _sameDay(a,b){
      return a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
    }

    _isDisabled(d){
      const iso = this._toISO(d);
      if (this._state.disabledSet.has(iso)) return true;
      if (this._state.min && d < this._stripTime(this._state.min)) return true;
      if (this._state.max && d > this._stripTime(this._state.max)) return true;
      return false;
    }

    _stripTime(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

    _shiftMonth(delta){
      const c = this._state.monthCursor;
      this._state.monthCursor = new Date(c.getFullYear(), c.getMonth()+delta, 1);
      this._updateUI();
    }

    _mount(){
      this._qs('#prev').addEventListener('click', () => this._shiftMonth(-1));
      this._qs('#next').addEventListener('click', () => this._shiftMonth( 1));
      this._qs('#confirm').addEventListener('click', () => {
        if (!this._state.value) return;
        this.dispatchEvent(new CustomEvent('confirm', {
          detail: { date: this._toISO(this._state.value) },
          bubbles: true, composed: true
        }));
      });
    }

    _updateUI(scrollIntoView=false){
      const {monthCursor, locale, startOn, value} = this._state;

      // intestazione mese
      const monthFmt = new Intl.DateTimeFormat(locale, { month:'long', year:'numeric' });
      this._qs('#monthLabel').textContent = this._capFirst(monthFmt.format(monthCursor));

      // labels giorni
      const fmt = new Intl.DateTimeFormat(locale, { weekday:'short' });
      const labels = [];
      for (let i=0;i<7;i++){
        const dayIndex = (i + startOn) % 7; // ruota per lunedì=0 se startOn=1
        const tmp = new Date(2021, 7, 1 + dayIndex); // qualsiasi settimana
        labels.push(this._shortWeek(fmt.format(tmp)));
      }
      this._qs('.dow').innerHTML = labels.map(s => `<div class="c">${s}</div>`).join('');

      // griglia giorni
      this._renderGrid();

      // pulsante conferma
      this._qs('#confirm').toggleAttribute('disabled', !value);

      // scroll focus sul selezionato (opzionale, leggero)
      if (scrollIntoView && this._qs('.day.is-selected')) {
        this._qs('.day.is-selected').focus({preventScroll:false});
      }
    }

    _capFirst(s){ return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
    _shortWeek(w){ return w.replace('.', '').slice(0,3); } // “lun, mar, mer…”

    _buildMonthMatrix(){
      const {monthCursor, startOn} = this._state;
      const y = monthCursor.getFullYear(), m = monthCursor.getMonth();

      // primo giorno cella
      const first = new Date(y, m, 1);
      const firstDow = (first.getDay()+6) % 7; // 0=Mon, … 6=Sun (europeo)
      const shift = (firstDow - (startOn%7) + 7) % 7;

      const daysInMonth = new Date(y, m+1, 0).getDate();

      const cells = [];
      // giorni del mese precedente per riempire
      for (let i=0;i<shift;i++){
        const d = new Date(y, m, 1 - (shift - i));
        cells.push({d, outside:true});
      }
      // giorni mese corrente
      for (let day=1; day<=daysInMonth; day++){
        const d = new Date(y, m, day);
        cells.push({d, outside:false});
      }
      // riempi fino a multiplo di 7
      while (cells.length % 7 !== 0){
        const last = cells[cells.length-1].d;
        const d = new Date(last.getFullYear(), last.getMonth(), last.getDate()+1);
        cells.push({d, outside:true});
      }
      return cells;
    }

    _renderGrid(){
      const wrap = this._qs('.grid');
      const cells = this._buildMonthMatrix();
      const today = this._stripTime(new Date());
      const selected = this._state.value;

      wrap.innerHTML = '';
      cells.forEach(({d, outside}) => {
        const iso = this._toISO(d);
        const disabled = this._isDisabled(d);
        const isToday = this._sameDay(d, today);
        const isSel   = selected && this._sameDay(d, selected);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'day' +
          (outside ? ' is-out' : '') +
          (disabled ? ' is-dis' : '') +
          (isToday ? ' is-today' : '') +
          (isSel ? ' is-selected' : '');
        btn.textContent = d.getDate();
        btn.setAttribute('aria-label', iso);
        btn.setAttribute('aria-pressed', isSel ? 'true' : 'false');
        btn.disabled = !!disabled;

        btn.addEventListener('click', () => {
          if (outside){
            // clic su giorno fuori mese: salta al suo mese
            this._state.monthCursor = new Date(d.getFullYear(), d.getMonth(), 1);
          }
          if (!this._isDisabled(d)){
            this._state.value = d;
            this.dispatchEvent(new CustomEvent('change', {
              detail: { date: this._toISO(d) },
              bubbles: true, composed: true
            }));
          }
          this._updateUI();
        });

        wrap.appendChild(btn);
      });
    }

    _render(){
      this.shadowRoot.innerHTML = `
        <style>
          :host{
            --surface: var(--surface-900, #0b1220);
            --bg: var(--bg-950, #060a16);
            --text: var(--text-100, #e5eefc);
            --muted: var(--text-400, #9fb0d0);
            --accent: var(--accent-400, #5cc8ff);
            --glow-rgb: var(--glow-rgb, 0,160,255);

            --card-r: 16px;
            --cell: 42px;

            display:block; color:var(--text);
            font-family:system-ui, -apple-system, Segoe UI, Roboto, "Plus Jakarta Sans", sans-serif;
            width:min(720px, 96vw);
          }

          .cal{
            position:relative; border-radius:var(--card-r); overflow:hidden; isolation:isolate;
            background:linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.00));
            box-shadow: 0 12px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.07);
          }

          /* Glow azzurro mascherato metà bassa */
          .cal::before{
            content:""; position:absolute; inset:0; border-radius:inherit; z-index:0; pointer-events:none;
            background:
              radial-gradient(120% 100% at 50% 120%, rgba(var(--glow-rgb),.30) 0%, rgba(var(--glow-rgb),.16) 42%, rgba(0,0,0,0) 70%);
            box-shadow:
              0 34px 70px -18px rgba(var(--glow-rgb), .55),
              inset 0 -16px 32px rgba(var(--glow-rgb), .25);
            -webkit-mask-image: linear-gradient(to top, black 50%, transparent 86%);
                    mask-image: linear-gradient(to top, black 50%, transparent 86%);
            opacity:.92;
          }

          .head{
            position:relative; z-index:1;
            display:flex; align-items:center; justify-content:space-between; gap:12px;
            padding:14px 14px; border-bottom:1px solid rgba(255,255,255,.06);
            background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.00));
          }
          .title{ font-weight:800; letter-spacing:.3px; display:flex; align-items:center; gap:10px; }
          .nav{ display:flex; gap:8px; align-items:center; }

          .dow, .grid{
            position:relative; z-index:1;
            display:grid; grid-template-columns:repeat(7, 1fr);
            gap:8px; padding:12px 12px 10px;
          }
          .dow{ padding-bottom:2px; color:var(--muted); font-weight:700; text-transform:uppercase; font-size:12px; }
          .dow .c{ display:grid; place-items:center; }

          .grid{ padding-top:8px; padding-bottom:16px; }

          .day{
            height:var(--cell); width:var(--cell); margin:auto;
            border-radius:12px; border:1px solid rgba(255,255,255,.10);
            background:rgba(255,255,255,.02); color:var(--text);
            display:grid; place-items:center; font-weight:800;
            transition: transform .14s cubic-bezier(.2,.8,.2,1), border-color .2s, background .2s, color .2s, box-shadow .2s;
            cursor:pointer;
          }
          .day:hover{ transform:translateY(-1px); border-color:rgba(92,200,255,.45); }
          .day.is-out{ opacity:.45; }
          .day.is-dis{ opacity:.35; cursor:not-allowed; filter:saturate(.7); }
          .day.is-today{ box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.35); }

          .day.is-selected{
            color:#04101d;
            background:linear-gradient(180deg, #5bd2ff, #2aa9ff);
            border-color:transparent;
            box-shadow:
              0 12px 28px rgba(0,0,0,.35),
              0 0 0 1px rgba(255,255,255,.15),
              0 16px 44px rgba(var(--glow-rgb),.35);
          }

          .foot{
            position:relative; z-index:1;
            display:flex; justify-content:center; padding:12px;
            border-top:1px solid rgba(255,255,255,.06);
            background:var(--surface);
          }
          .foot ds-button{ --radius: 12px; }
        </style>

        <div class="cal">
          <div class="head">
            <div class="title">
              <span id="monthLabel">Mese Anno</span>
            </div>
            <div class="nav">
              <ds-button id="prev" variant="with-icon-light" size="sm"><span slot="text">◀︎</span></ds-button>
              <ds-button id="next" variant="with-icon-light" size="sm"><span slot="text">▶︎</span></ds-button>
            </div>
          </div>

          <div class="dow" aria-hidden="true"></div>
          <div class="grid" role="grid" aria-label="Calendario selezione giorno"></div>

          <div class="foot">
            <ds-button id="confirm" variant="with-icon-light" size="md" disabled>
              <span slot="text">Conferma data</span>
            </ds-button>
          </div>
        </div>
      `;
    }
  }

  customElements.define('booking-calendar', BookingCalendar);
})();
