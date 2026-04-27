import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/* =========================
   🧠 EDITOR
========================= */

class SolarMasterCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {} };
  }

  setConfig(config) {
    this._config = config;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
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
      { name: "total_now", label: "Production (W)", selector: { entity: {} } },
      { name: "total_now_label", label: "Titre Central", selector: { text: {} } },
      { name: "weather_entity", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
      
      { label: "--- CAPTEURS LATERAUX (D4-D9) ---", type: "header" },
      ...[4, 5, 6, 7, 8, 9].flatMap(i => [
        { name: `d${i}_label`, label: `Titre D${i}`, selector: { text: {} } },
        { name: `d${i}_entity`, label: `Entité D${i}`, selector: { entity: {} } }
      ]),

      { label: "--- CERCLES BAS (P1-P4) ---", type: "header" },
      ...[1, 2, 3, 4].flatMap(i => [
        { name: `p${i}_name`, label: `Nom Cercle P${i}`, selector: { text: {} } },
        { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }
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
   ⚡ CARD V5 COCKPIT
========================= */

class SolarMasterCard extends LitElement {

  static getConfigElement() {
    return document.createElement("solar-master-card-editor");
  }

  static get properties() {
    return { hass: {}, config: {} };
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this.config = config;
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

  _renderCockpit() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const weather = this.hass.states[c.weather_entity];

    const sun = this.hass.states["sun.sun"];
    const elev = sun ? sun.attributes.elevation : 0;

    const pos = ((elev + 20) / 110) * 100;
    const glow = Math.min(1, prod.val / 5000);

    return html`
      <div class="wrap">

        ${weather ? html`
          <div class="weather-top">
             <ha-icon icon="mdi:weather-${weather.state.replace('partlycloudy', 'partly-cloudy')}"></ha-icon>
             <span>${weather.attributes.temperature}°C</span>
          </div>
        ` : ''}

        <svg viewBox="0 0 400 100" class="arc">
          <path d="M0,90 Q200,-20 400,90" />
        </svg>

        <div class="sun"
          style="left:${Math.max(5, Math.min(95, pos))}%; opacity:${0.5 + (glow * 0.5)};
          transform:translateX(-50%) scale(${0.8 + (glow * 0.4)}); text-shadow: 0 0 ${10*glow}px gold;">
          ☀️
          <div class="elev">${elev.toFixed(1)}°</div>
        </div>

        <div class="center">
          <div class="prod" style="text-shadow:0 0 ${20 * glow}px #ffc107">
            ${Math.round(prod.val)}<small>W</small>
          </div>
          <div class="label-main">${c.total_now_label || "PRODUCTION"}</div>
        </div>

        <div class="sides">
          <div class="col">
            ${[4, 5, 6].map(i => this._diag(i, 'left'))}
          </div>
          <div class="col">
            ${[7, 8, 9].map(i => this._diag(i, 'right'))}
          </div>
        </div>

        <div class="circles">
          ${[1, 2, 3, 4].map(i => {
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

  _diag(i, align) {
    const c = this.config;
    if (!c[`d${i}_entity`]) return "";

    const d = this._getVal(c[`d${i}_entity`]);

    return html`
      <div class="diag" style="border-${align}: 3px solid #ffc107aa">
        <div class="d-lab">${c[`d${i}_label`] || "CAPTEUR D"+i}</div>
        <div class="d-val">${d.val} <small>${d.unit}</small></div>
      </div>
    `;
  }

  static styles = css`
    ha-card {
      background: rgba(0,0,0,0.9);
      color: #fff;
      border-radius: 24px;
      padding: 15px;
      overflow: hidden;
      font-family: 'Segoe UI', Roboto, sans-serif;
    }

    .wrap { position: relative; min-height: 480px; }

    .weather-top {
      position: absolute;
      top: 0;
      left: 10px;
      display: flex;
      align-items: center;
      gap: 5px;
      font-weight: bold;
      color: #00f9f9;
    }

    .arc {
      width: 100%;
      height: auto;
      margin-top: 10px;
    }

    .arc path {
      fill: none;
      stroke: #ffc10722;
      stroke-width: 1;
      stroke-dasharray: 4;
    }

    .sun {
      position: absolute;
      top: 10px;
      font-size: 24px;
      text-align: center;
      transition: 0.5s ease-out;
      z-index: 2;
    }
    .elev { font-size: 10px; color: #aaa; }

    .center { text-align: center; margin-top: 10px; }

    .prod {
      font-size: 64px;
      font-weight: 900;
      color: #ffc107;
      line-height: 1;
    }
    .prod small { font-size: 20px; margin-left: 4px; }

    .label-main {
      font-size: 12px;
      font-weight: bold;
      letter-spacing: 2px;
      opacity: 0.7;
      text-transform: uppercase;
      margin-top: 5px;
    }

    .sides {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      gap: 10px;
    }
    .col { flex: 1; display: flex; flex-direction: column; gap: 8px; }

    .diag {
      background: rgba(255,255,255,0.05);
      padding: 8px 12px;
      border-radius: 6px;
    }
    .d-lab { font-size: 9px; text-transform: uppercase; opacity: 0.6; font-weight: bold; }
    .d-val { font-size: 15px; font-weight: bold; }

    .circles {
      display: flex;
      justify-content: space-around;
      margin-top: 40px;
    }

    .circle {
      position: relative;
      width: 65px;
      height: 65px;
      border-radius: 50%;
      border: 1px solid #ffc10733;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(255,193,7,0.03);
    }

    .scan {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border-top: 2px solid #ffc107;
      animation: spin 4s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0); }
      to { transform: rotate(360deg); }
    }

    .val { font-size: 16px; font-weight: 900; color: #ffc107; }
    .name { font-size: 9px; text-transform: uppercase; opacity: 0.8; }
  `;
}

customElements.define("solar-master-card", SolarMasterCard);

/* REGISTER */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master V5 Cockpit",
  description: "Cockpit solaire corrigé avec labels et météo"
});
