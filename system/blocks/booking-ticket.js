// /system/blocks/booking-ticket.js  — Ticket Web Component (spin 3D on mount + glow subito dopo)
(() => {
  if (customElements.get('booking-ticket')) return;

  class BookingTicket extends HTMLElement {
    static get observedAttributes() {
      return [
        'code','title','name','pax','porto','cancellable','price','boat','snacks',
        'start-iso','date','time','duration-min'
      ];
    }

    constructor(){
      super();
      this.attachShadow({mode:'open'});
      this._mounted = false;
      this._data = {
        code:'LT-000000',
        title:'The Rainbow Tour',
        name:'Nome Cognome',
        pax: 2,
        porto:'Porto Antico',
        cancellable: true,
        price: 0,
        boat: 'Leggera',
        snacks: [],
        durationMin: 120,
        startLocal: null,
      };
    }

    connectedCallback(){
      this._render();
      this._readAll();
      this._bind();
      this._mounted = true;
      this._updateUI();
    }

    attributeChangedCallback(){
      if (!this._mounted) return;
      this._readAll();
      this._updateUI();
    }

    // API
    get value(){ return structuredClone(this._data); }
    set value(v){ Object.assign(this._data, v || {}); this._updateUI(); }

    _qs(s){ return this.shadowRoot.querySelector(s); }

    _readAll(){
      const g = (n, d='') => this.getAttribute(n) ?? d;

      this._data.code        = g('code', this._data.code);
      this._data.title       = g('title', this._data.title);
      this._data.name        = g('name', this._data.name);
      this._data.pax         = +g('pax', this._data.pax);
      this._data.porto       = g('porto', this._data.porto);
      this._data.cancellable = this.hasAttribute('cancellable') ? this.getAttribute('cancellable') !== 'false' : this._data.cancellable;
      this._data.price       = +g('price', this._data.price);
      this._data.boat        = g('boat', this._data.boat);

      const snacksRaw        = g('snacks','');
      this._data.snacks      = snacksRaw ? snacksRaw.split(',').map(s => s.trim()).filter(Boolean) : (this._data.snacks || []);

      // startLocal
      const iso = g('start-iso','').trim();
      if (iso) {
        const d = new Date(iso);
        if (!isNaN(d)) this._data.startLocal = d;
      } else {
        const date = g('date','').trim(); // YYYY-MM-DD
        const time = g('time','').trim(); // HH:MM
        if (date && time){
          const [Y,M,D] = date.split('-').map(Number);
          const [h,m] = time.split(':').map(Number);
          const d = new Date(Y, (M||1)-1, D||1, h||0, m||0);
          if (!isNaN(d)) this._data.startLocal = d;
        }
      }
      if (!this._data.startLocal){
        const d = new Date(); d.setDate(d.getDate()+2); d.setHours(18,30,0,0);
        this._data.startLocal = d;
      }

      const dm = +g('duration-min', this._data.durationMin);
      this._data.durationMin = Number.isFinite(dm) ? dm : this._data.durationMin;
    }

    _bind(){
      this._qs('#btnShare')  .addEventListener('click', () => this._onShare());
      this._qs('#btnIcsEvt') .addEventListener('click', () => this._downloadICS(false));
      this._qs('#btnIcsTodo').addEventListener('click', () => this._downloadICS(true));
      this._qs('#btnPDF')    .addEventListener('click', () => window.print());
    }

    _updateUI(){
      const d = this._data;

      this._qs('#code').textContent = '#' + (d.code || 'LT-000000');
      this._qs('#title').textContent = d.title || '';
      this._qs('#pax').textContent   = `${d.pax||0} pax`;
      this._qs('#avatar').textContent = (d.name||'?').trim().charAt(0).toUpperCase();
      this._qs('#name').textContent   = d.name || '';
      this._qs('#porto').textContent  = d.porto || '-';
      this._qs('#boat').textContent   = d.boat || '-';
      this._qs('#snacks').textContent = (d.snacks||[]).join(', ') || '—';
      this._qs('#price').textContent  = d.price ? `€ ${d.price}` : '';

      const dayFmt  = new Intl.DateTimeFormat('it-IT', { day:'2-digit', month:'short', year:'numeric' });
      const timeFmt = new Intl.DateTimeFormat('it-IT', { hour:'2-digit', minute:'2-digit' });
      const dd = dayFmt.format(d.startLocal).replace('.', '');
      const tt = timeFmt.format(d.startLocal);
      this._qs('#dateLabel').textContent = dd;
      this._qs('#timeLabel').textContent = tt;

      const h = Math.floor((d.durationMin||0)/60), m = (d.durationMin||0)%60;
      this._qs('#durata').textContent = `${h}h ${m}m`;

      const $st = this._qs('#status');
      $st.textContent = d.cancellable ? 'CANCELLABILE fino a 24h' : 'NON CANCELLABILE';
      $st.classList.toggle('ok',  !!d.cancellable);
      $st.classList.toggle('no', !d.cancellable);
    }

    _toICSDateUTC(dt){
      return new Date(dt.getTime() - dt.getTimezoneOffset()*60000)
        .toISOString().replace(/[-:]/g,'').split('.')[0] + 'Z';
    }

    _downloadICS(isTodo){
      const d = this._data;
      const now = new Date();

      if (isTodo){
        const due = new Date(d.startLocal.getTime() - 2*60*60000); // -2h
        const ics =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Leggero Tours//Reminder//IT
BEGIN:VTODO
UID:${d.code}-todo@leggero.tours
DTSTAMP:${this._toICSDateUTC(now)}
DUE:${this._toICSDateUTC(due)}
SUMMARY:Partenza — ${d.title}
DESCRIPTION:Porto: ${d.porto}\\nOspite: ${d.name}\\n${d.pax} pax — Arriva 15 min prima
STATUS:NEEDS-ACTION
END:VTODO
END:VCALENDAR`;
        this._downloadBlob(ics, `Reminder-${d.code}.ics`, 'text/calendar;charset=utf-8');
      } else {
        const end = new Date(d.startLocal.getTime() + (d.durationMin||0)*60000);
        const ics =
`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Leggero Tours//Ticket//IT
CALSCALE:GREGORIAN
BEGIN:VEVENT
UID:${d.code}@leggero.tours
DTSTAMP:${this._toICSDateUTC(now)}
DTSTART:${this._toICSDateUTC(d.startLocal)}
DTEND:${this._toICSDateUTC(end)}
SUMMARY:${d.title} (${d.pax} pax) — Leggero Tours
LOCATION:${d.porto}
DESCRIPTION:Prenotazione ${d.code}\\nOspite: ${d.name}\\nBarca: ${d.boat}\\nSnack: ${(d.snacks||[]).join(', ')}\\nCancellabile: ${d.cancellable ? 'Sì' : 'No'}\\nPrezzo: €${d.price||0}
END:VEVENT
END:VCALENDAR`;
        this._downloadBlob(ics, `Leggero-${d.code}.ics`, 'text/calendar;charset=utf-8');
      }
    }

    _downloadBlob(text, filename, mime){
      const blob = new Blob([text], {type: mime || 'text/plain'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
    }

    async _onShare(){
      const d = this._data;
      const dd = this._qs('#dateLabel').textContent;
      const tt = this._qs('#timeLabel').textContent;
      const text = `Leggero Tours — ${d.title}
Codice: ${d.code}
Giorno: ${dd} alle ${tt}
Porto: ${d.porto} — ${d.pax} pax`;
      try{
        if (navigator.share) {
          await navigator.share({ title: 'Biglietto Leggero Tours', text });
        } else {
          await navigator.clipboard.writeText(text);
          alert('Dettagli copiati negli appunti ✨');
        }
      }catch(e){}
    }

    _render(){
      this.shadowRoot.innerHTML = `
        <style>
          :host{
            /* Theming & sizing (integra con i tuoi tokens esistenti) */
            --ticket-w: 720px;
            --surface: var(--surface-900, #0b1220);
            --bg: var(--bg-950, #060a16);
            --text: var(--text-100, #e5eefc);
            --muted: var(--text-400, #9fb0d0);
            --accent: var(--accent-400, #5cc8ff);
            --ok: var(--success-400, #22c55e);
            --danger: var(--danger-400, #ef4444);
            --edge: #0e1629;
            --glow-rgb: var(--glow-rgb, 0,160,255);

            /* Animazioni entrance+glow */
            --enter-dur: .6s;                            /* durata spin 3D */
            --enter-ease: cubic-bezier(.22,.61,.36,1);   /* easing coerente col resto */
            --glow-in-dur: .24s;                         /* durata accensione glow */

            display:block;
            width:min(var(--ticket-w), 96vw);
          }

          .ticket{
            position:relative;
            width:100%;
            border-radius:20px;
            background:linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.00));
            overflow:hidden; isolation:isolate;
            box-shadow: 0 12px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.07);

            /* Spin 3D su render */
            transform-style: preserve-3d;
            backface-visibility: hidden;
            will-change: transform, opacity;
            animation: ticket-enter var(--enter-dur) var(--enter-ease) both;
          }

          /* Glow “Leggero” che parte subito dopo lo spin */
          .ticket::before{
            content:""; position:absolute; inset:0; z-index:-1; border-radius:inherit; pointer-events:none;
            background:
              radial-gradient(120% 100% at 50% 120%, rgba(var(--glow-rgb),.30) 0%, rgba(var(--glow-rgb),.16) 42%, rgba(0,0,0,0) 70%);
            box-shadow:
              0 38px 76px -22px rgba(var(--glow-rgb), .55),
              0 0 0 1.2px rgba(var(--glow-rgb), .35),
              inset 0 -18px 36px rgba(var(--glow-rgb), .25);
            opacity:0; transform: scale(.96);
            animation: glow-enter var(--glow-in-dur) cubic-bezier(.2,.8,.2,1) var(--enter-dur) both; /* delay = durata spin */
          }

          /* Shine decorativo (rimane come prima) */
          .shine{ position:absolute; inset:0; border-radius:inherit; pointer-events:none; mix-blend-mode:overlay; }
          .shine::before{
            content:""; position:absolute; left:-40%; top:-150%; width:180%; height:160%;
            background:linear-gradient(120deg, transparent 35%, rgba(255,255,255,.5) 50%, transparent 65%);
            transform:rotate(18deg);
            animation:shine 2.2s ease-in-out .25s forwards;
            opacity:0;
          }

          @keyframes ticket-enter{
            0%   { transform: perspective(1000px) rotateY(-22deg) translateY(8px) scale(.94); opacity:0; }
            60%  { opacity:1; }
            100% { transform: perspective(1000px) rotateY(0) translateY(0) scale(1); opacity:1; }
          }
          @keyframes glow-enter{
            0%   { opacity:0; transform: scale(.96); }
            100% { opacity:.9; transform: scale(1); }
          }
          @keyframes shine{ 0%{top:-150%;opacity:0} 25%{opacity:.85} 55%{top:-10%;opacity:1} 100%{top:150%;opacity:0} }

          /* Head */
          .head{
            display:flex; align-items:center; justify-content:space-between; gap:12px;
            padding:18px 20px; border-bottom:1px solid rgba(255,255,255,.06);
            background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.00));
            color: var(--text);
          }
          .brand{ display:flex; align-items:center; gap:10px; font-weight:700; letter-spacing:.3px; }
          .brand .dot{ width:10px; height:10px; border-radius:999px; background:conic-gradient(from 0deg, #6ef3ff, #5bdef7, #2bc0ff, #6ef3ff); box-shadow:0 0 18px rgba(92,200,255,.9) }
          .badge{
            display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:13px;
            padding:8px 10px; border-radius:10px;
            background:rgba(92,200,255,.12);
            border:1px solid rgba(92,200,255,.28);
            color:#bfeaff;
          }

          .body{ display:grid; grid-template-columns:1.1fr .9fr; gap:0; background:var(--surface); color:var(--text); }
          @media (max-width: 720px){ .body{ grid-template-columns:1fr; } }

          .left{ padding:20px 20px 16px; display:grid; gap:14px; }
          .tour{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
          .tour h1{ font-size:22px; line-height:1.2; margin:0; text-shadow:0 1px 0 rgba(255,255,255,.08); }
          .pax{
            align-self:flex-start;
            display:inline-flex; gap:7px; align-items:center; font-weight:700; font-size:13px;
            padding:7px 10px; border:1px solid rgba(255,255,255,.14); border-radius:999px; color:#d6e6ff; background:rgba(255,255,255,.04);
          }

          .who{ display:flex; align-items:center; gap:10px; color:#cfe0ff; font-size:14px; }
          .avatar{
            width:28px; aspect-ratio:1; border-radius:999px; background:linear-gradient(135deg,#2a3d63,#0f1a30);
            display:grid; place-items:center; font-weight:700; color:#a7c6ff;
            border:1px solid rgba(255,255,255,.08);
          }

          .grid{ display:grid; grid-template-columns:1fr 1fr; gap:10px; }
          .field{
            padding:12px; border:1px solid rgba(255,255,255,.08); border-radius:12px;
            background:rgba(255,255,255,.02);
          }
          .field small{ display:block; color:var(--muted); font-weight:700; letter-spacing:.2px; margin-bottom:6px; }
          .field b{ font-size:15px; }

          .right{
            padding:20px; border-left:1px dashed rgba(255,255,255,.08); position:relative;
            background:
              radial-gradient(250px 60px at 50% 100%, rgba(255,255,255,.06), transparent 70%),
              linear-gradient(180deg, rgba(255,255,255,.02), transparent);
          }
          @media (max-width: 720px){ .right{ border-left:0; border-top:1px dashed rgba(255,255,255,.08); } }

          .right::before, .right::after{
            content:""; position:absolute; left:-10px; width:20px; height:20px; border-radius:50%;
            background:var(--bg); border:1px solid var(--edge);
          }
          .right::before{ top:-10px; }
          .right::after{ bottom:-10px; }

          .qr{
            width:120px; height:120px; border-radius:12px; background:
              repeating-linear-gradient(90deg, #000 0 6px, #fff 6px 12px),
              repeating-linear-gradient(#000 0 6px, #fff 6px 12px);
            filter:contrast(2) brightness(.9);
            border:4px solid #0e1629;
            box-shadow:inset 0 0 0 1px rgba(255,255,255,.05), 0 10px 24px rgba(0,0,0,.35);
          }
          .right .note{ color:#a5b7d8; font-size:12px; margin-top:10px; }

          .status{
            display:inline-flex; align-items:center; gap:8px; font-weight:800; font-size:12px;
            padding:8px 10px; border-radius:999px; letter-spacing:.2px;
            border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.03);
            margin-top:14px;
          }
          .status.ok{ color:#bbf7d0; border-color:rgba(34,197,94,.35); background:rgba(34,197,94,.08); }
          .status.no{ color:#fecaca; border-color:rgba(239,68,68,.35); background:rgba(239,68,68,.08); }

          .price{
            margin-top:18px; font-weight:800; font-size:22px;
            background:linear-gradient(180deg,#fff,#a3b8ff); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent;
          }

          /* Actions (usa ds-button) */
          .actions{
            display:flex; flex-wrap:wrap; gap:12px; justify-content:center;
            padding:14px 16px 12px; background:var(--surface);
            border-top:1px solid rgba(255,255,255,.06);
          }
          .actions ds-button { --radius: 12px; }

          /* Preferenze di riduzione movimento */
          @media (prefers-reduced-motion: reduce){
            .ticket{ animation:none !important; }
            .ticket::before{ animation:none !important; opacity:.9; transform:none; }
            .shine::before{ animation:none !important; }
          }

          /* Print */
          @media print{
            :host{ width:auto }
            .actions, .shine{ display:none !important; }
            .ticket{
              box-shadow:none; border:1px solid #ddd; background:#fff;
            }
            .body, .right, .left{ background:#fff; color:#000 }
            .field{ border-color:#eee; background:#fff }
          }
        </style>

        <div class="ticket" part="ticket">
          <div class="shine" aria-hidden="true"></div>

          <div class="head">
            <div class="brand"><i class="dot"></i> Leggero Tours — Ticket</div>
            <div class="badge" id="code">#LT-000000</div>
          </div>

          <div class="body">
            <div class="left">
              <div class="tour">
                <h1 id="title">The Rainbow Tour</h1>
                <div class="pax" id="pax">2 pax</div>
              </div>

              <div class="who">
                <div class="avatar" id="avatar">N</div>
                <div>
                  <div style="font-weight:800" id="name">Nome Cognome</div>
                  <small style="color:var(--muted)">Prenotazione</small>
                </div>
              </div>

              <div class="grid">
                <div class="field">
                  <small>Giorno</small>
                  <b id="dateLabel">—</b>
                </div>
                <div class="field">
                  <small>Ora</small>
                  <b id="timeLabel">—</b>
                </div>
                <div class="field">
                  <small>Porto</small>
                  <b id="porto">—</b>
                </div>
                <div class="field">
                  <small>Durata</small>
                  <b id="durata">—</b>
                </div>
                <div class="field">
                  <small>Barca</small>
                  <b id="boat">—</b>
                </div>
                <div class="field">
                  <small>Snack</small>
                  <b id="snacks">—</b>
                </div>
              </div>
            </div>

            <div class="right">
              <div class="qr" aria-hidden="true"></div>
              <div class="note">Mostra questo biglietto all’imbarco. Documento d’identità richiesto.</div>
              <div class="status ok" id="status">CANCELLABILE fino a 24h</div>
              <div class="price" id="price">€ 0</div>
            </div>
          </div>

          <div class="actions">
            <ds-button id="btnShare" variant="with-icon-light" size="md">
              <span slot="text">Condividi</span>
            </ds-button>
            <ds-button id="btnIcsEvt" variant="with-icon-light" size="md">
              <span slot="text">Aggiungi al Calendario (.ics)</span>
            </ds-button>
            <ds-button id="btnIcsTodo" variant="with-icon-light" size="md">
              <span slot="text">Promemoria Apple (.ics)</span>
            </ds-button>
            <ds-button id="btnPDF" variant="with-icon-light" size="md">
              <span slot="text">Scarica PDF</span>
            </ds-button>
          </div>
        </div>
      `;
    }
  }

  customElements.define('booking-ticket', BookingTicket);
})();
