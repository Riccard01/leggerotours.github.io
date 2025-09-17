class MapCard extends HTMLElement {
  static get observedAttributes(){ return ['lat','lng','zoom']; }

  constructor() {
    super();
    this.attachShadow({ mode:'open' });
    this.lat = parseFloat(this.getAttribute('lat')) || 44.409220;
    this.lng = parseFloat(this.getAttribute('lng')) || 8.924081;
    this.zoom = parseInt(this.getAttribute('zoom')) || 14;
    this._map = null;
    this._marker = null;
    this._render();
  }

  connectedCallback() {
    this._ensureLeaflet().then(() => this._initMap());
  }

  disconnectedCallback() {
    if (this._map) this._map.remove();
    this._map = null;
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display:flex; justify-content:center;
          width:90vw; max-width:920px;
        }
        .card {
          position:relative; flex:1;
          border-radius:16px; overflow:hidden;
          box-shadow:0 12px 30px rgba(0,0,0,.12);
        }
        #map { width:100%; height:60vh; }

        .overlay-top-left {
          position:absolute; top:12px; left:12px; z-index:1000;
        }
        .overlay-bottom {
          position:absolute; bottom:12px; left:0; right:0; z-index:1000;
          display:flex; padding:0 12px; pointer-events:none;
        }
        .overlay-bottom ds-button {
          width:100%; pointer-events:auto;
        }
        ds-button::part(button) {
          background:#000 !important;
          border-color:#000 !important;
          color:#fff !important;
        }

        .leaflet-control-container { display:none; }
        .leaflet-container { font: inherit; }
      </style>

      <div class="card">
        <div id="map"></div>

        <div class="overlay-top-left">
          <slot name="place"></slot>
        </div>

        <div class="overlay-bottom">
          <ds-button id="goBtn" variant="solid-dark" size="lg" full>
            <span slot="text">Scopri Percorso</span>
          </ds-button>
        </div>
      </div>
    `;
  }

  _initMap() {
    const container = this.shadowRoot.getElementById('map');
    if (!container || !window.L) return;

    this._map = L.map(container, {
      zoomControl: false,
      attributionControl: false
    }).setView([this.lat, this.lng], this.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this._map);

    const svg = encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
        <defs><filter id="s" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".25"/>
        </filter></defs>
        <path filter="url(#s)" fill="#ea4335" d="M18 3c-5.8 0-10.5 4.6-10.5 10.4 0 7.8 9.1 17.4 10 18.3.3.3.7.3 1 0 .9-.9 10-10.5 10-18.3C28.5 7.6 23.8 3 18 3z"/>
        <circle cx="18" cy="13.4" r="4.2" fill="#fff"/>
      </svg>
    `);
    const icon = L.icon({
      iconUrl: `data:image/svg+xml;charset=UTF-8,${svg}`,
      iconSize: [36, 36],
      iconAnchor: [18, 34]
    });

    this._marker = L.marker([this.lat, this.lng], { icon }).addTo(this._map);

    this.shadowRoot.getElementById('goBtn')
      .addEventListener('ds-select', () => this._openRoute());
  }

  _openRoute() {
    const LAT = this.lat;
    const LNG = this.lng;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      window.location.href = `maps://?daddr=${LAT},${LNG}&dirflg=d`;
      return;
    }
    if (isAndroid) {
      window.location.href = `geo:0,0?q=${LAT},${LNG}(Destinazione)`;
      return;
    }
    const choice = window.prompt('Con quale app vuoi aprire il percorso? (google / apple)', 'google');
    if (choice && choice.toLowerCase().includes('apple')) {
      window.open(`https://maps.apple.com/?daddr=${LAT},${LNG}`, '_blank', 'noopener');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${LAT},${LNG}`, '_blank', 'noopener');
    }
  }

  _ensureLeaflet() {
    if (window.L && typeof window.L.map === 'function') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      s.onload = resolve; s.onerror = reject;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      this.shadowRoot.appendChild(link);
      document.head.appendChild(s);
    });
  }
}

customElements.define('map-card', MapCard);
