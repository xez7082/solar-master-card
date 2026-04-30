import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 ÉDITEUR DE CONFIGURATION COMPLET
 * ==========================================
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
        { name: "bg_url", label: "Image de fond (URL)", selector: { text: {} } },
        { name: "bg_opacity", label: "Opacité (0.1 à 1)", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "conso_entity", label: "Import/Export Réseau (W)", selector: { entity: {} } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "solar_target", label: "Objectif Jour (kWh)", selector: { entity: {} } },
        { name: "solar_pct_sensor", label: "Capteur % (Optionnel)", selector: { entity: {} } },
        { name: "card_height", label: "Hauteur (px)", selector: { number: { min: 400, max: 1000 } } },
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau ${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts Panneau ${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `Label Info ${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité Info ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_weather: [
        { name: "weather_entity", label: "Météo Principale", selector: { entity: { domain: "weather" } } },
        { name: "moon_entity", label: "Phase de Lune", selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => [
           { name: `w${i}_l`, label: `Label ${i}`, selector: { text: {} } },
           { name: `w${i}_e`, label: `Entité ${i}`, selector: { entity: {} } },
           { name: `w${i}_i`, label: `Icone (mdi:...) ${i}`, selector: { text: {} } }
        ]).flat()
      ],
      tab_batt: [
        { name: "batt_avg_soc", label: "SOC Global (%)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `b${i}_n`, label: `Nom Bat ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
          { name: `b${i}_out`, label: `Puissance W ${i}`, selector: { entity: {} } },
          { name: `b${i}_t`, label: `Température ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_eco: [
        { name: "eco_money", label: "Total Économies (€)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gain Jour (€)", selector: { entity: {} } },
        { name: "main_cons", label: "Conso Maison (W)", selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6].map(i => [
           { name: `e${i}_l`, label: `Label ${i}`, selector: { text: {} } },
           { name: `e${i}_e`, label: `Entité ${i}`, selector: { entity: {} } }
        ]).flat()
      ]
    };

    return html`
      <div class="edit-tabs">
        ${['tab_solar','tab_weather','tab_batt','tab_eco'].map(t => html`
          <button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>
            ${t.replace('tab_','').toUpperCase()}
          </button>
        `)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs { display: flex; gap: 4px; margin-bottom: 15px; } button { flex: 1; padding: 8px; font-size: 10px; cursor: pointer; background: #111; color: #666; border: 1px solid #333; border-radius: 4px; } button.active { background: #ffc107; color: #000; font-weight: bold; }`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CARTE PRINCIPALE V8 FULL
 * ==========================================
 */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '', attr: {} };
    const s = this.hass.states[id];
    return { val: s.state, unit: s.attributes.unit_of_measurement || '', attr: s.attributes };
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;

    return html`
      <ha-card style="height:${c.card_height || 550}px;">
        <div class="main-container">
          ${c.bg_url ? html`<div class="bg-img" style="background-image: url('${c.bg_url}'); opacity: ${c.bg_opacity || 0.3};"></div>` : ''}
          
          <div class="content-area">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : ''}
            ${this._tab === 'METEO' ? this._renderWeather() : ''}
            ${this._tab === 'BATTERIE' ? this._renderBattery() : ''}
            ${this._tab === 'ECONOMIE' ? this._renderEco() : ''}
          </div>

          <div class="bottom-nav">
            <div class="nav-item ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}><ha-icon icon="mdi:solar-power"></ha-icon><span>SOLAR</span></div>
            <div class="nav-item ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}><ha-icon icon="mdi:weather-cloudy"></ha-icon><span>METEO</span></div>
            <div class="nav-item ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}><ha-icon icon="mdi:battery-high"></ha-icon><span>BATT</span></div>
            <div class="nav-item ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}><ha-icon icon="mdi:cash-multiple"></ha-icon><span>ECO</span></div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const target = this._getVal(c.solar_target);
    const progress = c.solar_pct_sensor ? parseFloat(this._getVal(c.solar_pct_sensor).val) : (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100;
    const consoVal = parseFloat(this._getVal(c.conso_entity).val) || 0;

    return html`
      <div class="page-solar">
        <div class="top-row">
            <div class="net-box ${consoVal > 0 ? 'import' : 'export'}">
                <ha-icon icon="${consoVal > 0 ? 'mdi:transmission-tower' : 'mdi:export'}"></ha-icon>
                <span>${Math.abs(consoVal).toFixed(0)} W</span>
            </div>
            <div class="center-prod">
                <div class="month">${new Date().toLocaleDateString('fr-FR', {month:'long'}).toUpperCase()}</div>
                <div class="big-w">${prod.val} <small>W</small></div>
                <div class="target-info">OBJ: ${target.val}kWh • <b>${Math.round(progress)}%</b></div>
            </div>
            <div class="empty-side"></div>
        </div>

        <div class="progress-bar">
          ${Array(20).fill().map((_, i) => html`<div class="seg ${i < (Math.min(100, progress)/5) ? 'on' : ''}"></div>`)}
        </div>

        <div class="neon-grid">
          ${[1,2,3,4].map(i => {
            const w = this._getVal(c[`p${i}_w`]);
            if (!c[`p${i}_w`]) return '';
            return html`
              <div class="neon-item">
                <div class="neon-circle color-${i}">
                  <span class="val">${Math.round(w.val)}</span>
                  <span class="unit">W</span>
                </div>
                <div class="label">${c[`p${i}_name`] || 'P'+i}</div>
              </div>`;
          })}
        </div>

        <div class="info-grid">
          ${[4,5,6,7,8,9].map(i => {
            const d = this._getVal(c[`d${i}_entity`]);
            if(!c[`d${i}_entity`]) return '';
            return html`<div class="info-card"><span>${c[`d${i}_label`]}</span><b>${d.val}${d.unit}</b></div>`;
          })}
        </div>
      </div>
    `;
  }

  _renderWeather() {
    const sun = this.hass.states['sun.sun'];
    return html`
      <div class="page-weather">
        <div class="sun-arc-container">
            <svg viewBox="0 0 200 80"><path d="M 20,70 A 80,50 0 0 1 180,70" fill="none" stroke="#333" stroke-dasharray="4" /><circle cx="100" cy="30" r="5" fill="#ffc107" /></svg>
            <div class="sun-labels"><span>${sun?.attributes.next_rising.split('T')[1].substr(0,5)}</span><span>${sun?.attributes.next_setting.split('T')[1].substr(0,5)}</span></div>
        </div>
        <div class="weather-grid">
          ${[1,2,3,4,5,6,7,8,9].map(i => {
             const w = this._getVal(this.config[`w${i}_e`]);
             if(!this.config[`w${i}_e`]) return '';
             return html`
              <div class="w-item">
                <ha-icon icon="${this.config[`w${i}_i`] || 'mdi:eye'}"></ha-icon>
                <div class="l">${this.config[`w${i}_l`]}</div>
                <div class="v">${w.val}${w.unit}</div>
              </div>`;
          })}
        </div>
      </div>`;
  }

_renderBattery() {
    const c = this.config;
    const socGlobal = this._getVal(c.batt_avg_soc).val;
    
    return html`
      <div class="page-batt">
        <div class="batt-header">
            <div class="global-soc">${socGlobal}%</div>
            <div class="global-label">CAPACITÉ RACK TOTAL</div>
        </div>
        
        <div class="rack-list">
        ${[1,2,3,4].map(i => {
          if(!c[`b${i}_s`]) return '';
          const soc = parseFloat(this._getVal(c[`b${i}_s`]).val) || 0;
          const power = parseFloat(this._getVal(c[`b${i}_out`]).val) || 0;
          const temp = this._getVal(c[`b${i}_t`]).val;
          
          let color = "#00ff00"; // Vert
          if (soc < 20) color = "#ff4444"; // Rouge
          else if (soc < 50) color = "#ffc107"; // Orange

          return html`
            <div class="rack-unit">
              <div class="rack-meta">
                <span class="n">${c[`b${i}_n`] || 'Unité '+i}</span>
                <span class="t"><ha-icon icon="mdi:thermometer"></ha-icon> ${temp}°C</span>
              </div>
              <div class="rack-main">
                <div class="rack-soc-bar">
                  <div class="fill" style="width:${soc}%; background: ${color}; box-shadow: 0 0 10px ${color}"></div>
                </div>
                <div class="rack-values">
                  <span class="p">${Math.round(soc)}%</span>
                  <span class="w" style="color: ${power > 0 ? '#4caf50' : (power < 0 ? '#ff4444' : '#888')}">
                    ${power > 0 ? '↑' : (power < 0 ? '↓' : '')} ${Math.abs(power)} W
                  </span>
                </div>
              </div>
            </div>`;
        })}
        </div>
      </div>`;
  }
  _renderEco() {
    const c = this.config;
    return html`
      <div class="page-eco">
        <div class="eco-hero">
          <div class="val">${this._getVal(c.eco_money).val}€</div>
          <div class="sub">ÉCONOMIES TOTALES</div>
        </div>
        <div class="eco-grid">
          <div class="e-card"><span>AUJOURD'HUI</span><b>${this._getVal(c.eco_day_euro).val} €</b></div>
          <div class="e-card"><span>CONSO MAISON</span><b>${this._getVal(c.main_cons).val} W</b></div>
          ${[1,2,3,4,5,6].map(i => {
            const e = this._getVal(c[`e${i}_e`]);
            if(!c[`e${i}_e`]) return '';
            return html`<div class="e-card"><span>${c[`e${i}_l`]}</span><b>${e.val}${e.unit}</b></div>`;
          })}
        </div>
      </div>`;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #222; }
    .main-container { height: 100%; display: flex; flex-direction: column; position: relative; }
    .bg-img { position: absolute; top:0; left:0; width:100%; height:100%; background-size: cover; z-index: 0; }
    .content-area { flex: 1; padding: 15px; z-index: 1; overflow-y: auto; }
    
    .bottom-nav { display: flex; background: rgba(0,0,0,0.8); border-top: 1px solid #222; padding: 8px 0; }
    .nav-item { flex: 1; text-align: center; color: #555; cursor: pointer; }
    .nav-item.active { color: #ffc107; }
    .nav-item ha-icon { --mdc-icon-size: 22px; }
    .nav-item span { display: block; font-size: 9px; font-weight: bold; }

    /* SOLAR */
    .top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .net-box { padding: 8px; border-radius: 10px; font-weight: bold; display: flex; flex-direction: column; align-items: center; }
    .import { color: #ff4444; background: rgba(255,0,0,0.1); }
    .export { color: #00ff00; background: rgba(0,255,0,0.1); }
    .center-prod .month { font-size: 10px; color: #ffc107; font-weight: bold; text-align: center; }
    .big-w { font-size: 32px; font-weight: 900; color: #ffc107; }
    .target-info { font-size: 11px; color: #888; text-align: center; }
    
    .progress-bar { display: flex; gap: 3px; height: 6px; margin: 15px 0; }
    .seg { flex: 1; background: #1a1a1a; border-radius: 2px; }
    .seg.on { background: #ffc107; box-shadow: 0 0 5px #ffc107; }

    .neon-grid { display: flex; justify-content: space-around; margin: 20px 0; }
    .neon-circle { width: 70px; height: 70px; border-radius: 50%; border: 3px solid #333; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .color-1 { border-color: #ffc107; box-shadow: inset 0 0 8px #ffc107; }
    .color-2 { border-color: #00f9f9; box-shadow: inset 0 0 8px #00f9f9; }
    .color-3 { border-color: #4caf50; box-shadow: inset 0 0 8px #4caf50; }
    .color-4 { border-color: #e91e63; box-shadow: inset 0 0 8px #e91e63; }
    .neon-circle .val { font-size: 18px; font-weight: bold; }
    .neon-circle .unit { font-size: 9px; color: #888; }
    .neon-item .label { font-size: 10px; text-align: center; margin-top: 5px; color: #fff; font-weight: bold; }

    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .info-card { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; text-align: center; border: 1px solid #222; }
    .info-card span { font-size: 8px; color: #888; display: block; }
    .info-card b { font-size: 12px; }

    /* WEATHER / BATT / ECO */
    .weather-grid, .eco-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 15px; }
    .w-item, .e-card { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; text-align: center; }
    .w-item ha-icon { color: #00f9f9; }
   /* BATTERY RACK STYLE */
    .batt-header { text-align: center; padding: 15px; background: rgba(255,255,255,0.03); border-radius: 15px; margin-bottom: 20px; border: 1px solid #222; }
    .global-soc { font-size: 42px; font-weight: 900; color: #00ff00; text-shadow: 0 0 15px rgba(0,255,0,0.3); }
    .global-label { font-size: 10px; color: #888; letter-spacing: 1px; }
    
    .rack-unit { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 12px; margin-bottom: 12px; border: 1px solid #333; }
    .rack-meta { display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; margin-bottom: 8px; color: #aaa; }
    .rack-soc-bar { height: 10px; background: #111; border-radius: 5px; overflow: hidden; margin-bottom: 8px; border: 1px solid #222; }
    .fill { height: 100%; transition: width 1s ease-in-out; }
    .rack-values { display: flex; justify-content: space-between; align-items: center; }
    .rack-values .p { font-size: 18px; font-weight: 900; }
    .rack-values .w { font-size: 14px; font-weight: bold; font-family: monospace; }
    .eco-hero { text-align: center; padding: 20px; background: rgba(0,255,0,0.05); border-radius: 15px; }
    .eco-hero .val { font-size: 36px; font-weight: 900; color: #4caf50; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
