import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/* =========================
   🧠 EDITEUR (Labels Fixés)
========================= */
class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {} }; }
  setConfig(config) { this._config = config; }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const schema = [
      { name: "weather_entity", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
      { name: "total_now_label", label: "Titre Central (EX: SOLAIRE)", selector: { text: {} } },
      { name: "total_now", label: "Entité Production (W)", selector: { entity: {} } },
      ...[4, 5, 6, 7, 8, 9].flatMap(i => [
        { name: `d${i}_label`, label: `NOM DU CAPTEUR D${i}`, selector: { text: {} } },
        { name: `d${i}_entity`, label: `Entité Capteur D${i}`, selector: { entity: {} } }
      ]),
      ...[1, 2, 3, 4].flatMap(i => [
        { name: `p${i}_name`, label: `NOM DU CERCLE P${i}`, selector: { text: {} } },
        { name: `p${i}_w`, label: `Entité Watts P${i}`, selector: { entity: {} } }
      ])
    ];

    return html`<ha-form .hass=${this.hass} .data=${this._config} .schema=${schema} @value-changed=${this._valueChanged}></ha-form>`;
  }
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/* =========================
   ⚡ CARTE COCKPIT (Vrai Design)
========================= */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {} }; }
  setConfig(config) { this.config = config; }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: 0, unit: "" };
    const s = this.hass.states[id];
    return { val: parseFloat(s.state) || 0, unit: s.attributes.unit_of_measurement || "" };
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const weather = this.hass.states[c.weather_entity];
    const sun = this.hass.states["sun.sun"];
    const elev = sun ? sun.attributes.elevation : 0;
    const pos = ((elev + 20) / 110) * 100;

    return html`
      <ha-card>
        <div class="wrap">
          
          ${weather ? html`
            <div class="weather">
              <ha-icon icon="mdi:weather-${weather.state.replace('partlycloudy', 'partly-cloudy')}"></ha-icon>
              <span>${weather.attributes.temperature}°C</span>
            </div>
          ` : ''}

          <svg viewBox="0 0 400 100" class="arc"><path d="M0,90 Q200,-20 400,90" /></svg>
          <div class="sun" style="left:${Math.max(5, Math.min(95, pos))}%">☀️</div>

          <div class="center">
            <div class="prod-val">${Math.round(prod.val)}<small>W</small></div>
            <div class="prod-lab">${c.total_now_label || "PRODUCTION"}</div>
          </div>

          <div class="sides">
            <div class="side-col">
              ${[4, 5, 6].map(i => this._renderDiag(i, 'l'))}
            </div>
            <div class="side-col">
              ${[7, 8, 9].map(i => this._renderDiag(i, 'r'))}
            </div>
          </div>

          <div class="circles">
            ${[1, 2, 3, 4].map(i => {
              if (!c[`p${i}_w`]) return "";
              const v = this._getVal(c[`p${i}_w`]);
              return html`
                <div class="circle-item">
                  <div class="c-scan"></div>
                  <div class="c-val">${Math.round(v.val)}</div>
                  <div class="c-name">${c[`p${i}_name`] || "P"+i}</div>
                </div>`;
            })}
          </div>

        </div>
      </ha-card>
    `;
  }

  _renderDiag(i, side) {
    const c = this.config;
    if (!c[`d${i}_entity`]) return "";
    const d = this._getVal(c[`d${i}_entity`]);
    return html`
      <div class="diag-box ${side}">
        <div class="d-label">${c[`d${i}_label`] || "CAPTEUR "+i}</div>
        <div class="d-value">${d.val}<small>${d.unit}</small></div>
      </div>`;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 20px; padding: 20px; overflow: hidden; }
    .wrap { position: relative; min-height: 500px; }
    
    .weather { position: absolute; top: 0; left: 0; display: flex; align-items: center; gap: 8px; color: #00f9f9; font-weight: bold; }
    
    .arc { width: 100%; height: auto; margin-top: 15px; }
    .arc path { fill: none; stroke: rgba(255,193,7,0.2); stroke-width: 2; stroke-dasharray: 5; }
    .sun { position: absolute; top: 15px; font-size: 20px; transform: translateX(-50%); transition: 0.5s; }

    .center { text-align: center; margin-top: 10px; }
    .prod-val { font-size: 65px; font-weight: 900; color: #ffc107; line-height: 1; }
    .prod-val small { font-size: 20px; margin-left: 5px; }
    .prod-lab { font-size: 12px; font-weight: bold; letter-spacing: 2px; opacity: 0.6; text-transform: uppercase; }

    .sides { display: flex; justify-content: space-between; margin-top: 25px; gap: 15px; }
    .side-col { flex: 1; display: flex; flex-direction: column; gap: 10px; }
    .diag-box { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; }
    .diag-box.l { border-left: 3px solid #00f9f9; }
    .diag-box.r { border-right: 3px solid #ffc107; text-align: right; }
    .d-label { font-size: 9px; text-transform: uppercase; opacity: 0.6; font-weight: bold; }
    .d-value { font-size: 16px; font-weight: bold; }

    .circles { display: flex; justify-content: space-around; margin-top: 40px; }
    .circle-item { position: relative; width: 70px; height: 70px; border-radius: 50%; border: 1px solid rgba(255,193,7,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .c-scan { position: absolute; width: 100%; height: 100%; border-radius: 50%; border-top: 2px solid #ffc107; animation: spin 4s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    .c-val { font-size: 18px; font-weight: 900; color: #ffc107; }
    .c-name { font-size: 9px; text-transform: uppercase; opacity: 0.7; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: "solar-master-card", name: "Solar Master Cockpit V5.2", description: "Design cockpit classique avec titres fixes" });
