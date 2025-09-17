// /system/blocks/booking-calendar.js — Calendario minimal “Airbnb-like” con filtri esperienza
(() => {
  if (customElements.get('booking-calendar')) return;

  class BookingCalendar extends HTMLElement {
    static get observedAttributes() {
      return [
        'value','min','max','disabled-dates','locale','start-on',
        'availability',          // JSON: { "yyyy-mm-dd": ["full","half-am","half-pm","sunset"], ... }
        'experience',            // "full" | "half" | "sunset"
        'half-slot',             // "am" | "pm" (valido solo se experience="half")
        'assume-available'       // "true" se vuoi abilitare tutto salvo override
      ];
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
        disabledSet: new Set(), // ISO yyyy-mm-dd

        // Filtri
        experience: 'full',     // full | half | sunset
        halfSlot: 'am',         // am | pm (per half)
        availability: new Map(),// Map(iso -> Set(slots))
        assumeAvailable: false
      };
    }

    /* ================= Lifecycle ================= */
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

    /* ================= Public API ================= */
    get value(){ return this._state.value ? this._toISO(this._state.value) : ''; }
    set value(iso){
      const d = this._parseISO(iso);
      if (d && !this._isDisabled(d)) {
        this._state.value = d;
        this._state.monthCursor = new Date(d.getFullYear(), d.getMonth(), 1);
        this._updateUI(true);
      }
    }
    /** Imposta disponibilità da oggetto { iso: string[] } */
    setAvailability(obj = {}, assumeAvailable = false){
      const m = new Map();
      for (const k of Object.keys(obj||{})){
        const v = Array.isArray(obj[k]) ? new Set(obj[k]) : new Set();
        m.set(k, v);
      }
      this._state.availability = m;
      this._state.assumeAvailable = !!assumeAvailable;
      this._updateUI();
    }

    /* ================= Internals ================= */
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

      // esperienza / slot
      const exp = (g('experience')||'full').trim();
      this._state.experience = ['full','half','sunset'].includes(exp) ? exp : 'full';
      const hs = (g('half-slot')||'am').trim();
      this._state.halfSlot = (hs==='pm') ? 'pm' : 'am';

      // disponibilità
      const avRaw = g('availability') || '';
      const assume = (g('assume-available')||'false').toLowerCase()==='true';
      this._state.assumeAvailable = assume;
      this._state.availability = this._parseAvailability(avRaw);

      // inizializza il mese visibile
      const base = this._state.value || new Date();
      this._state.monthCursor = new Date(base.getFullYear(), base.getMonth(), 1);
    }

    _parseAvailability(raw){
      if (!raw) return new Map();
      try {
        const o = JSON.parse(raw);
        const m = new Map();
        for (const k of Object.keys(o||{})){
          const v = Array.isArray(o[k]) ? new Set(o[k]) : new Set();
          m.set(String(k), v);
        }
        return m;
      } catch(e){
        return new Map();
      }
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
      // filtri globali
      if (this._state.disabledSet.has(iso)) return true;
      if (this._state.min && d < this._stripTime(this._state.min)) return true;
      if (this._state.max && d > this._stripTime(this._state.max)) return true;

      // logica disponibilità per filtro corrente
      const {experience, halfSlot, availability, assumeAvailable} = this._state;

      // slot richiesto
      const need = experience === 'full'
        ? 'full'
        : experience === 'sunset'
          ? 'sunset'
          : (halfSlot === 'pm' ? 'half-pm' : 'half-am');

      if (availability.size === 0) {
        // se non è specificata disponibilità: abilita tutto solo se assumeAvailable
        return !assumeAvailable;
      }

      const set = availability.get(iso);
      if (!set) return true; // se il giorno non esiste nella mappa, non disponibile

      return !set.has(need);
    }

    _stripTime(d){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

    _shiftMonth(delta){
      const c = this._state.monthCursor;
      this._state.monthCursor = new Date(c.getFullYear(), c.getMonth()+delta, 1);
      this._updateUI();
    }

    /* ================= UI wiring ================= */
    _mount(){
      // nav mesi
      this._qs('#prev').addEventListener('click', () => this._shiftMonth(-1));
      this._qs('#next').addEventListener('click', () => this._shiftMonth( 1));

      // filtri esperienza
      this._qs('[data-exp="full"]').addEventListener('click', () => this._setExperience('full'));
      this._qs('[data-exp="half"]').addEventListener('click', () => this._setExperience('half'));
      this._qs('[data-exp="sunset"]').addEventListener('click', () => this._setExperience('sunset'));
      this._qs('[data-slot="am"]').addEventListener('click', () => this._setHalfSlot('am'));
      this._qs('[data-slot="pm"]').addEventListener('click', () => this._setHalfSlot('pm'));

      // conferma
      this._qs('#confirm').addEventListener('click', () => {
        if (!this._state.value) return;
        this.dispatchEvent(new CustomEvent('confirm', {
          detail: { 
            date: this._toISO(this._state.value),
            experience: this._state.experience,
            slot: this._state.experience==='half' ? this._state.halfSlot : null
          },
          bubbles: true, composed: true
        }));
      });
    }

    _setExperience(exp){
      if (!['full','half','sunset'].includes(exp)) return;
      this._state.experience = exp;
      // se passo a half e non ho slot, default AM
      if (exp === 'half' && !['am','pm'].includes(this._state.halfSlot)) {
        this._state.halfSlot = 'am';
      }
      this.dispatchEvent(new CustomEvent('filter-change', {
        detail: { experience: this._state.experience, slot: this._state.halfSlot },
        bubbles:true, composed:true
      }));
      this._updateUI();
    }

    _setHalfSlot(slot){
      if (!['am','pm'].includes(slot)) return;
      this._state.halfSlot = slot;
      if (this._state.experience !== 'half') this._state.experience = 'half';
      this.dispatchEvent(new CustomEvent('filter-change', {
        detail: { experience: this._state.experience, slot: this._state.halfSlot },
        bubbles:true, composed:true
      }));
      this._updateUI();
    }

    _updateUI(scrollIntoView=false){
      const {monthCursor, locale, startOn, value, experience, halfSlot} = this._state;

      // intestazione mese (minuscolo come Airbnb: “ottobre 2025”)
      const monthFmt = new Intl.DateTimeFormat(locale, { month:'long', year:'numeric' });
      this._qs('#monthLabel').textContent = monthFmt.format(monthCursor).toLocaleLowerCase();

      // etichetta filtro
      const label = experience === 'full'
        ? 'Full Day · tutto il giorno'
        : experience === 'sunset'
          ? 'Gourmet Sunset Cruise · 18:30–23:00'
          : (halfSlot === 'pm' ? 'Half Day · 14:00–18:00' : 'Half Day · 09:00–13:00');
      this._qs('#filterLabel').textContent = label;

      // stato pulsanti filtro
      this._qsAll('[data-exp]').forEach(el => el.classList.toggle('is-active', el.dataset.exp === experience));
      this._qs('#halfRow').style.display = (experience === 'half') ? 'flex' : 'none';
      this._qsAll('[data-slot]').forEach(el => el.classList.toggle('is-active', el.dataset.slot === halfSlot));

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

    _qsAll = (s) => Array.from(this.shadowRoot.querySelectorAll(s));
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
              detail: { 
                date: this._toISO(d),
                experience: this._state.experience,
                slot: this._state.experience==='half' ? this._state.halfSlot : null
              },
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
            font-family:"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
            display:block;
            color:#fff; /* numeri/etichette bianchi */
            width:min(720px, 96vw);
            background:transparent;
          }
          @import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap");

          /* forza il font in tutto lo shadow */
          * { font-family: "Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif !important; }

          .cal{ background:transparent; border:none; border-radius:12px; }

          /* ===== Filtro esperienza ===== */
          .filters{
            display:flex; flex-direction:column; gap:8px; padding:6px 4px 4px;
          }
          .seg{
            display:flex; gap:6px; flex-wrap:wrap;
          }
          .chip{
            border:1px solid rgba(255,255,255,.28);
            color:#fff;
            background:transparent;
            border-radius:999px;
            padding:6px 10px;
            font-size:13px; font-weight:700;
            cursor:pointer;
            transition:background .15s ease, color .15s ease, border-color .15s ease, transform .06s ease;
          }
          .chip:hover{ background:rgba(255,255,255,.10); }
          .chip.is-active{
            background:#fff; color:#111; border-color:transparent;
          }
          .subseg{
            display:flex; gap:6px; align-items:center; padding-left:2px;
          }
          .subseg .chip{ padding:6px 8px; font-weight:700; }

          .filterLabel{
            color:rgba(255,255,255,.65); font-size:12px; font-weight:600; letter-spacing:.2px;
          }

          /* ===== Header mese ===== */
          .head{
            display:flex; align-items:center; justify-content:space-between; gap:12px;
            padding:10px 6px 8px;
          }
          .title{ font-weight:700; text-transform:lowercase; font-size:16px; letter-spacing:.2px; }
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

          /* ===== Grid giorni ===== */
          .dow, .grid{
            display:grid; grid-template-columns:repeat(7, 1fr);
            text-align:center;
          }
          .dow{ 
            padding:2px 4px 8px; 
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
            color:#fff;
            display:grid; place-items:center;
            font-size:14px; font-weight:700;
            cursor:pointer;
            border:none;
            transition: background .15s ease, color .15s ease, transform .1s ease;
          }
          .day:hover{ background:rgba(255,255,255,.10); }
          .day.is-out{ color:rgba(255,255,255,.38); }
          .day.is-dis{ color:rgba(255,255,255,.18); cursor:not-allowed; }
          .day.is-today{ box-shadow:inset 0 0 0 1px rgba(255,255,255,.45); }

          .day.is-selected{
            background:#fff; 
            color:#111; 
            font-weight:800;
          }

          .foot{
            display:flex; justify-content:center; padding:8px 0 0;
          }
          .confirm-btn{
            height:36px; padding:0 14px; border-radius:10px;
            border:1px solid rgba(255,255,255,.25);
            color:#fff; background:transparent; cursor:pointer;
            font-weight:800;
          }
          .confirm-btn[disabled]{ opacity:.35; cursor:not-allowed; }
          .confirm-btn:not([disabled]):hover{ background:rgba(255,255,255,.10); }
        </style>

        <div class="cal">
          <!-- FILTRI -->
          <div class="filters">
            <div class="seg">
              <button class="chip" data-exp="full" type="button">Full Day</button>
              <button class="chip" data-exp="half" type="button">Half Day</button>
              <button class="chip" data-exp="sunset" type="button">Gourmet Sunset Cruise</button>
            </div>
            <div id="halfRow" class="subseg" style="display:none">
              <span class="filterLabel">Seleziona fascia:</span>
              <button class="chip" data-slot="am" type="button">09:00–13:00</button>
              <button class="chip" data-slot="pm" type="button">14:00–18:00</button>
            </div>
            <div class="filterLabel" id="filterLabel"></div>
          </div>

          <!-- INTESTAZIONE MESE -->
          <div class="head">
            <div class="title">
              <span id="monthLabel">mese anno</span>
            </div>
            <div class="nav">
              <button class="nav-btn" id="prev" type="button" aria-label="Mese precedente">◀︎</button>
              <button class="nav-btn" id="next" type="button" aria-label="Mese successivo">▶︎</button>
            </div>
          </div>

          <!-- GRIGLIA -->
          <div class="dow" aria-hidden="true"></div>
          <div class="grid" role="grid" aria-label="Calendario selezione giorno"></div>

          <!-- FOOTER -->
          <div class="foot">
            <button id="confirm" class="confirm-btn" type="button" disabled>
              Conferma
            </button>
          </div>
        </div>
      `;
    }
  }

  customElements.define('booking-calendar', BookingCalendar);
})();
