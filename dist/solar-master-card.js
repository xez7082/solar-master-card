import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/* =========================
   EDITOR (simplifié propre)
========================= */

class SolarMasterCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {} };
  }

  setConfig(config) {
    this._config = config;
  }

  _valueChanged(ev) {
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true
    }));
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const schema = [
      { name: "total_now", selector: { entity: {} } },
      { name: "total_now_label", selector: { text: {} } },

      ...[4,5,6,7,8,9].flatMap(i => [
        { name: `d${i}_label`, selector: { text: {} } },
        { name: `d${i}_entity`, selector: { entity: {} } }
      ]),

      ...[1,2,3,4].flatMap(i => [
        { name: `p${i}_name`, selector: { text: {} } },
        { name: `p${i}_w`, selector: { entity: {} } }
      ])
    ];

    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schema}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}

customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/* =========================
   CARD V5 COCKPIT
========================= */

class SolarMasterCard extends LitElement {

  static getConfigElement() {
    return document.createElement("solar-master-card-editor");
  }

  static get properties() {
    return { hass: {}, config: {} };
  }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) {
      return { val: 0, unit: "" };
    }
    const s = this.hass.states[id];
    return {
      val: parseFloat(s.state) || 0,
      unit: s.attributes.unit_of_measurement || ""
    };
  }

  render() {
    if (!this.config || !this.hass) return html``;

    return html`
      <ha-card>
        ${this._renderCockpit()}
      </ha-card>
    `;
  }

  /* ================= COCKPIT ================= */

  _renderCockpit() {
    const c = this.config;
    const prod = this._getVal(c.total_now);

    const sun = this.hass.states["sun.sun"];
    const elev = sun ? sun.attributes.elevation : 0;

    const pos = ((elev + 20) / 110) * 100;
    const glow = Math.min(1, prod.val / 5000);

    return html`
      <div class="wrap">

        <!-- ARC SOLAIRE -->
        <svg viewBox="0 0 400 100" class="arc">
          <path d="M0,90 Q200,-20 400,90" />
        </svg>

        <!-- SOLEIL -->
        <div class="sun" style="
          left:${pos}%;
          opacity:${0.5 + glow};
          transform:translateX(-50%) scale(${0.8 + glow});
        ">
          ☀
          <span>${elev.toFixed(1)}°</span>
        </div>

        <!-- PRODUCTION -->
        <div class="center">
          <div class="prod" style="text-shadow:0 0 ${20*glow}px #ffc107">
            ${Math.round(prod.val)}
          </div>
          <div class="label">${c.total_now_label || "PRODUCTION"}</div>
        </div>

        <!-- CAPTEURS -->
        <div class="sides">
          <div class="left">
            ${[4,5,6].map(i => this._diag(i))}
          </div>
          <div class="right">
            ${[7,8,9].map(i => this._diag(i))}
          </div>
        </div>

        <!-- CERCLES -->
        <div class="circles">
          ${[1,2,3,4].map(i => {
            if (!c[`p${i}_w`]) return "";
            const v = this._getVal(c[`p${i}_w`]);

            return html`
              <div class="circle">
                <div class="scan"></div>
                <div class="val">${Math.round(v.val)}</div>
                <div class="name">${c[`p${i}_name`] || "P"+i}</div>
              </div>
            `;
          })}
        </div>

      </div>
    `;
  }

  _diag(i) {
    const c = this.config;
    if (!c[`d${i}_entity`]) return "";

    const d = this._getVal(c[`d${i}_entity`]);

    return html`
      <div class="diag">
        <span>${c[`d${i}_label`] || "D"+i}</span>
        <b>${d.val}${d.unit}</b>
      </div>
    `;
  }

  static styles = css`

    ha-card {
      background:#000;
      color:#fff;
      border-radius:20px;
      padding:20px;
      overflow:hidden;
    }

    .wrap {
      position:relative;
      height:500px;
    }

    /* ARC */
    .arc path {
      fill:none;
      stroke:#ffc10755;
      stroke-width:2;
      stroke-dasharray:6;
    }

    /* SUN */
    .sun {
      position:absolute;
      bottom:20px;
      color:#ffc107;
      font-size:20px;
      display:flex;
      flex-direction:column;
      align-items:center;
      transition:0.3s;
    }

    .sun span {
      font-size:10px;
    }

    /* CENTER */
    .center {
      text-align:center;
      margin-top:60px;
    }

    .prod {
      font-size:70px;
      font-weight:900;
      color:#ffc107;
      transition:0.3s;
    }

    .label {
      font-size:12px;
      opacity:0.7;
    }

    /* DIAGS */
    .sides {
      display:flex;
      justify-content:space-between;
      margin-top:20px;
    }

    .diag {
      background:#111;
      padding:8px;
      margin:4px;
      border-radius:8px;
      font-size:11px;
    }

    /* CIRCLES */
    .circles {
      display:flex;
      justify-content:space-around;
      margin-top:30px;
    }

    .circle {
      position:relative;
      width:70px;
      height:70px;
      border-radius:50%;
      border:2px solid #ffc10744;
      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;
    }

    .scan {
      position:absolute;
      width:100%;
      height:100%;
      border-radius:50%;
      border-top:2px solid #ffc107;
      animation:spin 3s linear infinite;
    }

    @keyframes spin {
      from { transform:rotate(0); }
      to { transform:rotate(360deg); }
    }

    .val {
      font-weight:bold;
    }

    .name {
      font-size:10px;
    }
  `;
}

customElements.define("solar-master-card", SolarMasterCard);

/* REGISTER */

window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master V5 Cockpit",
  description: "Cockpit solaire avancé animé"
});
