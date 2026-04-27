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
    return { hass: {}, _config: {}, _selectedTab: { type: String } };
  }

  constructor() {
    super();
    this._selectedTab = 'tab_solar';
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

    const schemas = {
      tab_solar: [
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
      ],
      tab_batt: [
        { name: "batt_soc", label: "Entité SOC (%)", selector: { entity: {} } },
        { name: "batt_power", label: "Entité Puissance (W)", selector: { entity: {} } },
        { name: "batt_v", label: "Entité Voltage (V)", selector: { entity: {} } },
        { name: "batt_temp", label: "Entité Température (°C)", selector: { entity: {} } }
      ],
      tab_eco: [
        { name: "eco_total", label: "Gain Total (€)", selector: { entity: {} } },
        { name: "eco_day", label: "Gain Jour (€)", selector: { entity: {} } },
        { name: "house_conso", label: "Consommation Maison (W)", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="edit-tabs">
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>SOLAIRE</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIE</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ÉCONOMIE</button>
      </div>
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schemas[this._selectedTab]}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  static styles = css`
    .edit-tabs { display: flex; gap: 8px; margin-bottom: 15px; }
    button { flex: 1; padding: 10px; border-radius: 8px; border: none; background: #333; color: #fff; cursor: pointer; }
    button.active { background: #ffc107; color: #000; font-weight: bold; }
  `;
}

customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/* =========================
   ⚡ CARD V5.4 (SOLAR + BATT + ECO)
========================= */

class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }

  constructor() {
    super();
    this._tab = 'SOLAIRE';
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this.config = config;
  }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: 0, unit: "" };
    const s = this.hass.states[id];
    return { val: parseFloat(s.state) || 0, unit: s.attributes.unit_of_measurement || "" };
  }

  render() {
    if (!this.config || !this.hass) return html``;
    return html`
      <ha-card>
        <div class="main-content">
          ${this._tab === 'SOLAIRE' ? this._renderCockpit() : 
            this._tab === 'BATTERIE' ? this._renderBattery() : this._renderEco()}
        </div>
        <div class="navigation">
          <div class="nav-item ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>SOLAIRE</div>
          <div class="nav-item ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}>BATTERIE</div>
          <div class="nav-item ${this._tab === 'ÉCONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ÉCONOMIE'}>ÉCONOMIE</div>
        </div>
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
        <svg viewBox="0 0 400 100" class="arc"><path d="M0,90 Q200,-20 400,90" /></svg>
        <div class="sun" style="left:${Math.max(5, Math.min(95, pos))}%; opacity:${0.5 + (glow * 0.5)};">
          ☀️<div class="elev">${elev.toFixed(1)}°</div>
        </div>
        <div class="center">
          <div class="prod" style="text-shadow:0 0 ${20 * glow}px #ffc107">${Math.round(prod.val)}<small>W</small></div>
          <div class="label-main">${c.total_now_label || "PRODUCTION"}</div>
        </div>
        <div class="sides">
          <div class="col">${[4, 5, 6].map(i => this._diag(i, 'left'))}</div>
          <div class="col">${[7, 8, 9].map(i => this._diag(i, 'right'))}</div>
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
              </div>`;
          })}
        </div>
      </div>
    `;
  }

  _renderBattery() {
    const soc = this._getVal(this.config.batt_soc);
    const pwr = this._getVal(this.config.batt_power);
    return html`
      <div class="page-view">
        <div class="batt-main">
          <div class="batt-icon"><ha-icon icon="mdi:battery-${Math.round(soc.val / 10) * 10}"></ha-icon></div>
          <div class="batt-soc">${soc.val}%</div>
          <div class="batt-pwr">${pwr.val} W</div>
        </div>
        <div class="batt-grid">
           <div class="diag"><span>VOLTAGE</span><b>${this._getVal(this.config.batt_v).val} V</b></div>
           <div class="diag"><span>TEMPÉRATURE</span><b>${this._getVal(this.config.batt_temp).val} °C</b></div>
        </div>
      </div>
    `;
  }

  _renderEco() {
    return html`
      <div class="page-view">
        <div class="eco-hero">
          <div class="eco-val">${this._getVal(this.config.eco_total).val} €</div>
          <div class="label-main">TOTAL ÉCONOMISÉ</div>
        </div>
        <div class="sides">
          <div class="diag"><span>AUJOURD'HUI</span><b>${this._getVal(this.config.eco_day).val} €</b></div>
          <div class="diag"><span>CONSO MAISON</span><b>${this._getVal(this.config.house_conso).val} W</b></div>
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
        <div class="d-lab">${c[`d${i}_label`] || "D"+i}</div>
        <div class="d-val">${d.val} <small>${d.unit}</small></div>
      </div>`;
  }

  static styles = css`
    ha-card { background: rgba(0,0,0,0.9); color: #fff; border-radius: 24px; padding: 15px; overflow: hidden; font-family: sans-serif; }
    .wrap { position: relative; min-height: 440px; }
    .page-view { min-height: 440px; display: flex; flex-direction: column; justify-content: center; align-items: center; }
    
    .weather-top { position: absolute; top: 0; left: 10px; display: flex; align-items: center; gap: 5px; color: #00f9f9; }
    .arc { width: 100%; height: auto; margin-top: 10px; }
    .arc path { fill: none; stroke: #ffc10722; stroke-width: 1; stroke-dasharray: 4; }
    .sun { position: absolute; top: 10px; font-size: 24px; text-align: center; transition: 0.5s ease-out; }
    .elev { font-size: 10px; color: #aaa; }

    .center { text-align: center; margin-top: 5px; }
    .prod { font-size: 64px; font-weight: 900; color: #ffc107; line-height: 1; }
    .prod small { font-size: 20px; }
    .label-main { font-size: 12px; font-weight: bold; letter-spacing: 2px; opacity: 0.7; text-transform: uppercase; }

    .sides { display: flex; justify-content: space-between; width: 100%; gap: 10px; margin-top: 15px; }
    .col { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .diag { background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 8px; min-width: 100px; text-align: center; }
    .d-lab, .diag span { font-size: 9px; text-transform: uppercase; opacity: 0.6; display: block; }
    .d-val, .diag b { font-size: 16px; font-weight: bold; }

    .circles { display: flex; justify-content: space-around; width: 100%; margin-top: 25px; }
    .circle { position: relative; width: 65px; height: 65px; border-radius: 50%; border: 1px solid #ffc10733; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .scan { position: absolute; width: 100%; height: 100%; border-radius: 50%; border-top: 2px solid #ffc107; animation: spin 4s linear infinite; }
    @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
    .val { font-size: 16px; font-weight: 900; color: #ffc107; }
    .name { font-size: 9px; text-transform: uppercase; }

    .batt-main { text-align: center; margin-bottom: 30px; }
    .batt-icon ha-icon { --mdc-icon-size: 80px; color: #4caf50; }
    .batt-soc { font-size: 48px; font-weight: bold; }
    .batt-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }

    .eco-hero { text-align: center; margin-bottom: 40px; }
    .eco-val { font-size: 56px; font-weight: 900; color: #4caf50; }

    .navigation { display: flex; justify-content: space-around; border-top: 1px solid #333; margin-top: 15px; padding-top: 10px; }
    .nav-item { cursor: pointer; font-size: 10px; font-weight: bold; color: #666; transition: 0.3s; }
    .nav-item.active { color: #ffc107; }
  `;
}

customElements.define("solar-master-card", SolarMasterCard);

/* REGISTER */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master V5.4 Cockpit",
  description: "Vue complète Cockpit + Batterie + Économie"
});
