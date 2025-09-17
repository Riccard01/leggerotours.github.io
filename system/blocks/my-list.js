(() => {
  if (customElements.get('my-list')) return;

  class MyList extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = `
        <style>
          :host {
            display: block;
            font-family: var(--font-sans, "Plus Jakarta Sans", system-ui, sans-serif);
            color: #D1D5DB;
          }

          /* contenitore delle righe */
          .list {
            display: flex;
            flex-direction: column;
            gap: var(--row-gap, 12px);
            padding: 0;
            margin: 0 1rem;
          }

          .row {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .media {
            flex: 0 0 128px;
            width: 128px;
            height: 128px;
            border-radius: 12px;
            overflow: hidden;
            margin: 0;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          ::slotted([slot="image"]) {
            width: 70%;
            height: 70%;
            object-fit: contain;
            object-position: center;
            display: block;
          }

          .content {
            flex: 1;
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          ::slotted([slot="title"]) {
            margin: 0;
            padding: 0;
            font-size: 1rem;
            font-weight: 600;
            line-height: 1.3;
          }

          ::slotted([slot="description"]) {
            margin: 0;
            padding: 0;
            font-size: .9rem;
            color: #b0b3b8ff;
            line-height: 1.4;
          }

          ::slotted([slot="tag"]) {
            margin: 0;
            padding: 0;
            font-size: .85rem;
            color: #1c7bffff;
          }
        </style>

        <div class="list">
          <div class="row">
            <figure class="media">
              <slot name="image"></slot>
            </figure>
            <div class="content">
              <slot name="title"></slot>
              <slot name="description"></slot>
              <slot name="tag"></slot>
            </div>
          </div>
        </div>
      `;
    }
  }

  customElements.define('my-list', MyList);
})();
