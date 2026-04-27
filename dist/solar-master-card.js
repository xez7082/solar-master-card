import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * EDITEUR (CONFIGURATEUR)
 */
class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _selectedTab: { type: String } }; }
  constructor() { super(); this._selectedTab = 'tab_solar'; }
  setConfig(config) { this._config = config; }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const schemas = {
      tab_solar: [
        { name: "weather_entity", label: "Entité Météo (weather.xxx)", selector: { entity: { domain: "weather" } } },
        { name: "total_now_label", label: "TITRE PRODUCTION CENTRALE", selector: { text: {} } },
        { name: "total_now", label: "Entité Production (W)", selector: { entity: {} } },
        { name: "title_left", label: "TITRE COLONNE GAUCHE", selector: { text: {} } },
        { name: "title_right", label: "TITRE COLONNE DROITE", selector: { text: {} } },
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `TITRE INDIVIDUEL CAPTEUR D${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité Capteur D${i}`, selector: { entity: {} } }
        ]).flat(),
        { name: "bg_url", label: "URL Image de Fond", selector: { text: {} } }
      ],
      tab_batt: [...[1, 2, 3, 4].map(i => [
        { name: `b${i}_n`, label: `Nom Batterie ${i}` },
        { name: `b${i}_s`, label: `Entité SOC % ${i}`, selector: { entity: {} } },
        { name: `b${i}_cap_label`, label: `Titre Capacité ${i}` },
        { name: `b${i}_cap`, label: `Entité Capacité ${i}`, selector: { entity: {} } }
      ]).flat()],
      tab_eco: [
        { name: "eco_money_label", label: "Titre Solde Éco", selector: { text: {} } },
        { name: "eco_money", label: "Entité Solde (€)", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="edit-tabs">
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>SOLAIRE</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIES</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ÉCONOMIE</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs { display: flex; gap: 8px; margin-bottom: 20px; } button { flex: 1; padding: 10px; background: #2c2c2c; color: white; border-radius: 8px; border: none; cursor: pointer; } button.active { background: #ffc107; color: black; font-weight: bold; }`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * CARTE PRINCIPALE
 */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '' };
    const s = this.hass.states[id];
    return { val: s.state, unit: s.attributes.unit_of_measurement || '' };
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    return html`
      <ha-card style="height: 650px;">
        ${c.bg_url ? html`<div class="bg-layer" style="background-image:url('${c.bg_url}'); opacity:${c.bg_opacity || 0.4}; filter: blur(${c.bg_blur || 0}px);"></div>` : ''}
        <div class="overlay">
          <div class="main-content">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : this._tab === 'BATTERIE' ? this._renderBattery() : this._renderEco()}
          </div>
          <div class="footer">
            <div class="f-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>SOLAIRE</div>
            <div class="f-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}>BATTERIES</div>
            <div class="f-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}>ÉCONOMIE</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const weatherState = this.hass.states[c.weather_entity];

    return html`
      <div class="page">
        <div class="weather-top">
          ${weatherState ? html`
            <ha-icon icon="mdi:weather-${weatherState.state.replace('partlycloudy', 'partly-cloudy')}"></ha-icon>
            <span class="w-temp">${weatherState.attributes.temperature}°C</span>
            <span class="w-txt">${weatherState.state.toUpperCase()}</span>
          ` : html`<span>Météo non configurée</span>`}
        </div>

        <div class="cockpit">
          <div class="side">
            <div class="group-title">${c.title_left || ''}</div>
            ${[4, 5, 6].map(i => this._renderDiag(i, 'l'))}
          </div>
          <div class="center">
            <div class="c-label">${c.total_now_label || 'PRODUCTION'}</div>
            <div class="big-val-titan">${prod.val}<small>W</small></div>
          </div>
          <div class="side">
            <div class="group-title right">${c.title_right || ''}</div>
            ${[7, 8, 9].map(i => this._renderDiag(i, 'r'))}
          </div>
        </div>
      </div>`;
  }

  _renderDiag(i, side) {
    const c = this.config;
    const label = c[`d${i}_label`]; // LE TITRE EST ICI
    const entityId = c[`d${i}_entity`];
    if (!entityId) return html`<div class="mini-diag empty"></div>`;
    const d = this._getVal(entityId);
    return html`
      <div class="mini-diag ${side}">
        <span class="m-l">${label || 'SENSOR ' + i}</span>
        <span class="m-v">${d.val}<small>${d.unit}</small></span>
      </div>`;
  }

  _renderBattery() { /* Identique aux versions précédentes */ }
  _renderEco() { /* Identique aux versions précédentes */ }

  static styles = css`
    ha-card { background:#000; color:#fff; border-radius:24px; overflow:hidden; position:relative; font-family:sans-serif; }
    .bg-layer { position:absolute; top:0; left:0; width:100%; height:100%; background-size:cover; background-position: center; z-index:0; }
    .overlay { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; padding:20px; background:rgba(0,0,0,0.7); box-sizing:border-box; }
    
    .weather-top { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); width: max-content; padding: 5px 15px; border-radius: 20px; border: 1px solid #00f9f944; color: #00f9f9; margin-bottom: 20px; }
    .w-temp { font-weight: bold; font-size: 18px; }
    .w-txt { font-size: 10px; opacity: 0.8; }

    .cockpit { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
    .side { flex: 1; }
    .group-title { font-size: 10px; font-weight: 900; color: #00f9f9; text-transform: uppercase; margin-bottom: 10px; }
    .group-title.right { text-align: right; color: #ffc107; }

    .mini-diag { background:rgba(0,0,0,0.5); padding:10px; border-radius:10px; margin:5px 0; border-left:4px solid #00f9f9; }
    .mini-diag.r { border-left:none; border-right:4px solid #ffc107; text-align: right; }
    .m-l { font-size: 9px; opacity: 0.7; display: block; text-transform: uppercase; font-weight: bold; }
    .m-v { font-size: 16px; font-weight: bold; }
    
    .big-val-titan { font-size:60px; font-weight:900; color:#ffc107; text-align:center; }
    .c-label { text-align: center; font-size: 12px; color: #ffc107; font-weight: bold; }

    .footer { display:flex; justify-content:space-around; padding-top:20px; border-top:1px solid #333; margin-top:auto; }
    .f-btn { cursor:pointer; opacity:0.5; font-size:12px; font-weight:bold; }
    .f-btn.active { opacity:1; color:#ffc107; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
