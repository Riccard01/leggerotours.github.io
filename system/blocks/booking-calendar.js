// /system/blocks/booking-calendar.js — Calendario minimal “Airbnb-like” su sfondo trasparente
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

      // intestazione mese (minuscolo come Airbnb: “ottobre 2025”)
      const monthFmt = new Intl.DateTimeFormat(locale, { month:'long', year:'numeric' });
      this._qs('#monthLabel').textContent = monthFmt.format(monthCursor).toLocaleLowerCase();

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

      // scroll focus sul selezionato (opzionale)
      if (scrollIntoView && this._qs('.day.is-selected')) {
        this._qs('.day.is-selected').focus({preventScroll:false});
      }
    }

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
            /* Font principale richiesto */
            font-family:"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            display:block;
            color:#fff; /* testo di default bianco */
            width:min(720px, 96vw);
            background:transparent; /* richiesto */
          }

          /* carica il font all'interno dello Shadow DOM */
          @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap");

          .cal{
            background:transparent; /* nessun pannello */
            border:none;
            border-radius:12px;
          }

          .head{
            display:flex; align-items:center; justify-content:space-between; gap:12px;
            padding:10px 6px 12px;
          }
          .title{ 
            font-weight:700; 
            text-transform:lowercase; 
            font-size:16px; 
            letter-spacing:.2px; 
          }
          .nav{ display:flex; gap:6px; align-items:center; }
          .nav .nav-btn{
            height:28px; width:28px; border-radius:14px;
            background:rgba(255,255,255,.14);
            color:#fff; border:none; cursor:pointer;
            display:inline-grid; place-items:center;
            font-size:14px; line-height:1;
          }
          .nav .nav-btn:hover{ background:rgba(255,255,255,.22); }
          .nav .nav-btn:active{ background:rgba(255,255,255,.28); }

          .dow, .grid{
            display:grid; grid-template-columns:repeat(7, 1fr);
            text-align:center;
          }
          .dow{ 
            padding:0 4px 8px; 
            color:rgba(255,255,255,.55); 
            font-size:12px; 
            font-weight:600; 
            text-transform:uppercase; 
            letter-spacing:.3px;
          }

          .grid{ padding:0 4px 8px; gap:4px; }

          .day{
            height:34px; width:34px; margin:auto;
            border-radius:50%;
            background:transparent; 
            color:#fff;              /* numeri bianchi richiesti */
            display:grid; place-items:center;
            font-size:14px; font-weight:700;
            cursor:pointer;
            border:none;
            transition: background .15s ease, color .15s ease, transform .1s ease;
          }
          .day:hover{ background:rgba(255,255,255,.10); }
          .day.is-out{ color:rgba(255,255,255,.38); }        /* giorni fuori mese in grigio/bianco tenue */
          .day.is-dis{ color:rgba(255,255,255,.18); cursor:not-allowed; } /* molto trasparenti */
          .day.is-today{ box-shadow:inset 0 0 0 1px rgba(255,255,255,.45); }

          /* Selezione richiesta: sfondo bianco, testo scuro */
          .day.is-selected{
            background:#fff; 
            color:#111; 
            font-weight:800;
          }
* {
  font-family: 'Plus Jakarta Sans' !important;
}
          .foot{
            display:flex; justify-content:center; padding:10px 0 0;
            border-top:none;
          }
          .confirm-btn{
            height:36px; padding:0 14px; border-radius:10px;
            border:1px solid rgba(255,255,255,.25);
            color:#fff; background:transparent; cursor:pointer;
            font-weight:700;
          }
          .confirm-btn[disabled]{ opacity:.35; cursor:not-allowed; }
          .confirm-btn:not([disabled]):hover{ background:rgba(255,255,255,.10); }
        </style>

        <div class="cal">
          <div class="head">
            <div class="title">
              <span id="monthLabel">mese anno</span>
            </div>
            <div class="nav">
              <button class="nav-btn" id="prev" type="button" aria-label="Mese precedente">◀︎</button>
              <button class="nav-btn" id="next" type="button" aria-label="Mese successivo">▶︎</button>
            </div>
          </div>

          <div class="dow" aria-hidden="true"></div>
          <div class="grid" role="grid" aria-label="Calendario selezione giorno"></div>

          <div class="foot">
            <button id="confirm" class="confirm-btn" type="button" disabled>
              Conferma data
            </button>
          </div>
        </div>
      `;
    }
  }

  customElements.define('booking-calendar', BookingCalendar);
})();
