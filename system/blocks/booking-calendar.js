// /system/blocks/booking-calendar.js  — Calendario minimal stile Airbnb
(() => {
  if (customElements.get('booking-calendar')) return;

  class BookingCalendar extends HTMLElement {
    static get observedAttributes() {
      return ['value','min','max','disabled-dates','locale','start-on']; 
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
        value: null,
        min: null,
        max: null,
        disabledSet: new Set()
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

    get value(){ return this._state.value ? this._toISO(this._state.value) : ''; }
    set value(iso){
      const d = this._parseISO(iso);
      if (d && !this._isDisabled(d)) {
        this._state.value = d;
        this._state.monthCursor = new Date(d.getFullYear(), d.getMonth(), 1);
        this._updateUI(true);
      }
    }

    _qs = (s) => this.shadowRoot.querySelector(s);

    _readAll(){
      const g = (n) => this.getAttribute(n);

      const loc = (g('locale') || 'it-IT').trim();
      this._state.locale = loc;
      const so = Number(g('start-on'));
      this._state.startOn = Number.isFinite(so) ? Math.max(0, Math.min(6, so)) : 1;

      const v = this._parseISO(g('value'));
      if (v) this._state.value = v;

      const min = this._parseISO(g('min'));
      const max = this._parseISO(g('max'));
      this._state.min = min || null;
      this._state.max = max || null;

      const ddRaw = g('disabled-dates') || '';
      const list = this._parseDisabled(ddRaw);
      this._state.disabledSet = new Set(list.map(x => x));

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
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
      if (!m) return null;
      const d = new Date(+m[1], +m[2]-1, +m[3], 12, 0, 0, 0);
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

      const monthFmt = new Intl.DateTimeFormat(locale, { month:'long', year:'numeric' });
      this._qs('#monthLabel').textContent = monthFmt.format(monthCursor).toLowerCase();

      const fmt = new Intl.DateTimeFormat(locale, { weekday:'short' });
      const labels = [];
      for (let i=0;i<7;i++){
        const dayIndex = (i + startOn) % 7;
        const tmp = new Date(2021, 7, 1 + dayIndex);
        labels.push(this._shortWeek(fmt.format(tmp)));
      }
      this._qs('.dow').innerHTML = labels.map(s => `<div class="c">${s}</div>`).join('');

      this._renderGrid();

      this._qs('#confirm').toggleAttribute('disabled', !value);

      if (scrollIntoView && this._qs('.day.is-selected')) {
        this._qs('.day.is-selected').focus({preventScroll:false});
      }
    }

    _shortWeek(w){ return w.replace('.', '').slice(0,3); }

    _buildMonthMatrix(){
      const {monthCursor, startOn} = this._state;
      const y = monthCursor.getFullYear(), m = monthCursor.getMonth();

      const first = new Date(y, m, 1);
      const firstDow = (first.getDay()+6) % 7;
      const shift = (firstDow - (startOn%7) + 7) % 7;

      const daysInMonth = new Date(y, m+1, 0).getDate();

      const cells = [];
      for (let i=0;i<shift;i++){
        const d = new Date(y, m, 1 - (shift - i));
        cells.push({d, outside:true});
      }
      for (let day=1; day<=daysInMonth; day++){
        const d = new Date(y, m, day);
        cells.push({d, outside:false});
      }
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
            font-family:system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display:block; color:#222;
            width:min(720px, 96vw);
          }

          .cal{
            background:#fff;
            border:1px solid #ddd;
            border-radius:12px;
            overflow:hidden;
          }

          .head{
            display:flex; align-items:center; justify-content:space-between;
            padding:16px;
          }
          .title{ font-weight:600; text-transform:capitalize; font-size:16px; }
          .nav{ display:flex; gap:8px; align-items:center; }
          .nav ds-button{ font-size:18px; }

          .dow, .grid{
            display:grid; grid-template-columns:repeat(7, 1fr);
            text-align:center;
          }
          .dow{ padding:0 16px 8px; color:#717171; font-size:12px; font-weight:500; text-transform:uppercase; }
          .grid{ padding:0 16px 16px; gap:2px; }

          .day{
            height:36px; width:36px; margin:auto;
            border-radius:50%;
            background:transparent; color:#222;
            display:grid; place-items:center;
            font-size:14px;
            cursor:pointer;
            border:none;
          }
          .day:hover{ background:#f7f7f7; }
          .day.is-out{ color:#c7c7c7; }
          .day.is-dis{ color:#ddd; cursor:not-allowed; }
          .day.is-today{ font-weight:600; border:1px solid #222; }
          .day.is-selected{
            background:#222; color:#fff; font-weight:600;
          }

          .foot{
            display:flex; justify-content:center; padding:12px;
            border-top:1px solid #eee;
          }
          .foot ds-button{ font-size:14px; }
        </style>

        <div class="cal">
          <div class="head">
            <div class="title">
              <span id="monthLabel">mese anno</span>
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
