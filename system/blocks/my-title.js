class MyTitle extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._render();
  }

  static get observedAttributes() {
    return ['title', 'subtitle'];
  }

  attributeChangedCallback() {
    this._render();
  }

  _render() {
    const title = this.getAttribute('title') || 'Titolo di esempio';
    const subtitle = this.getAttribute('subtitle') || 'Questa è una descrizione di esempio.';

    this.shadowRoot.innerHTML = `
      <style>
        .wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: .5rem;
          margin: 3rem 1rem;
          
        }

        .title {
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1.2;
          margin-bottom: 1rem;
          margin: 0;

          background: linear-gradient(to bottom, #ffffff 0%, #adadadff 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;

          /* ombra leggera */
          text-shadow: 0 2px 6px rgba(0,0,0,0.25);
        }

        .subtitle {
          font-size: 1rem;
          max-width: 640px;
          text-align: center;
          margin: 0;
          color: var(--my-subtitle-color, #D1D5DB);
        }
      </style>

      <div class="wrapper">
        <h2 class="title">${title}</h2>
        <p class="subtitle">${subtitle}</p>
      </div>
    `;
  }
}

customElements.define('my-title', MyTitle);
