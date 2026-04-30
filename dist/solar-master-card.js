import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 ÉDITEUR DE CONFIGURATION (L'interface visuelle)
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
        { name: "main_cons", label: "Conso Maison (W)", selector: { entity: {} } }
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
 * ⚡ CARTE PRINCIPALE (L'affichage)
 * ==========================================
 */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  
  constructor() { 
    super(); 
    this._tab = 'SOLAIRE'; 
  }

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
            <div class="nav-item ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>
              <ha-icon icon="mdi:solar-power"></ha-icon><span>SOLAR</span>
            </div>
            <div class="nav-item ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}>
              <ha-icon icon="mdi:weather-cloudy"></ha-icon><span>METEO</span>
            </div>
            <div class="nav-item ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}>
              <ha-icon icon="mdi:battery-high"></ha-icon><span>BATT</span>
            </div>
            <div class="nav-item ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}>
              <ha-icon icon="mdi:cash-multiple"></ha-icon><span>ECO</span>
            </div>
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
                <div class="neon-circle color-${i}"><span class="val">${Math.round(w.val)}</span><span class="unit">W</span></div>
                <div class="label">${c[`p${i}_name`] || 'P'+i}</div>
              </div>`;
          })}
        </div>
      </div>`;
  }

  _renderWeather() {
    const c = this.config;
    const sun = this.hass.states['sun.sun'];
    if (!sun) return html`<div style="padding:20px;">Soleil non trouvé</div>`;

    const elevation = sun.attributes.elevation ?? 0;
    const azimuth = sun.attributes.azimuth ?? 0;
    const sunX = 40 + ((azimuth / 360) * 120); 
    const sunY = 40 - (Math.max(0, elevation) * 0.25); 

    const moonState = this.hass.states[c.moon_entity]?.state;
    const moonTranslations = { 'new_moon': 'Nouvelle lune', 'waxing_crescent': 'Premier croissant', 'first_quarter': 'Premier quartier', 'waxing_gibbous': 'Gibbeuse croissante', 'full_moon': 'Pleine lune', 'waning_gibbous': 'Gibbeuse décroissante', 'last_quarter': 'Dernier quartier', 'waning_crescent': 'Dernier croissant' };
    const phaseFr = moonTranslations[moonState] || moonState || 'N/A';

    return html`
      <div class="page-weather" style="display: flex; flex-direction: column; gap: 12px;">
        <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 15px 10px; border: 1px solid rgba(255,255,255,0.1); height: 75px; position: relative; overflow: hidden;">
          <svg viewBox="0 0 200 50" style="width: 100%; height: 50px; overflow: visible;">
            <line x1="20" y1="45" x2="180" y2="45" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
            <path d="M 30,45 A 80,20 0 0 1 170,45" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="2" stroke-dasharray="4,4" />
            <circle cx="${sunX}" cy="${sunY}" r="5" fill="#ffc107" style="filter: drop-shadow(0 0 5px #ffc107);" />
          </svg>
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #eee; margin-top: -12px; padding: 0 15px; font-weight: bold;">
              <span>${sun.attributes.next_rising?.split('T')[1].substring(0, 5)}</span>
              <span style="color:#ffc107;">${elevation.toFixed(1)}°</span>
              <span>${sun.attributes.next_setting?.split('T')[1].substring(0, 5)}</span>
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; display: flex; align-items: center; gap: 12px; border: 1px solid rgba(255,255,255,0.05);">
           <ha-icon icon="mdi:moon-waning-crescent" style="color: #00f9f9; --mdc-icon-size: 20px;"></ha-icon>
           <span style="font-size: 13px; color: white; font-weight: bold; text-transform: uppercase;">${phaseFr}</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => this._renderMiniSensor(i))}
        </div>
      </div>`;
  }

  _renderMiniSensor(i) {
    const c = this.config;
    const entityId = c[`w${i}_e`];
    if (!entityId || !this.hass.states[entityId]) return html``;
    const stateObj = this.hass.states[entityId];
    return html`
      <div style="background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 55px; padding: 4px;">
        <ha-icon icon="${c[`w${i}_i`] || 'mdi:circle-small'}" style="color: #00f9f9; --mdc-icon-size: 18px; margin-bottom: 2px;"></ha-icon>
        <span style="font-size: 9px; color: #aaa; text-transform: uppercase; font-weight: bold;">${c[`w${i}_l`] || 'S'+i}</span>
        <span style="font-size: 18px; font-weight: 900; color: white;">${stateObj.state}</span>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`
      <div class="page-batt">
        <div class="rack-list">
        ${[1,2,3,4].map(i => {
          if(!c[`b${i}_s`]) return '';
          const soc = parseFloat(this._getVal(c[`b${i}_s`]).val) || 0;
          const power = parseFloat(this._getVal(c[`b${i}_out`]).val) || 0;
          const temp = this._getVal(c[`b${i}_t`]).val;
          let color = soc < 20 ? "#ff4444" : (soc < 50 ? "#ffc107" : "#00f9f9");
          return html`
            <div class="rack-unit">
              <div class="rack-meta"><span>${c[`b${i}_n`] || 'BAT '+i}</span><span>${temp}°C</span></div>
              <div class="segment-bar">${Array(15).fill().map((_, idx) => html`<div class="trait ${idx < (soc / 6.6) ? 'on' : ''}" style="--clr: ${color}"></div>`)}</div>
              <div class="rack-values"><div class="v-main">${soc}%</div><div class="v-details"><span style="color: ${power >= 0 ? '#00ff00' : '#ff4444'}">${Math.abs(power)}W</span></div></div>
            </div>`;
        })}
        </div>
      </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`
      <div class="page-eco">
        <div class="eco-hero"><div class="val">${this._getVal(c.eco_money).val}€</div><div class="sub">ÉCONOMIES TOTALES</div></div>
        <div class="eco-grid">
          <div class="e-card"><span>JOUR</span><b>${this._getVal(c.eco_day_euro).val} €</b></div>
          <div class="e-card"><span>CONSO</span><b>${this._getVal(c.main_cons).val} W</b></div>
        </div>
      </div>`;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 20px; overflow: hidden; border: 1px solid #222; }
    .main-container { height: 100%; display: flex; flex-direction: column; position: relative; }
    .bg-img { position: absolute; top:0; left:0; width:100%; height:100%; background-size: cover; z-index: 0; }
    .content-area { flex: 1; padding: 15px; z-index: 1; overflow-y: auto; }
    .bottom-nav { display: flex; background: rgba(0,0,0,0.9); border-top: 1px solid #222; padding: 10px 0; z-index: 2; }
    .nav-item { flex: 1; text-align: center; color: #555; cursor: pointer; }
    .nav-item.active { color: #ffc107; }
    .nav-item ha-icon { --mdc-icon-size: 24px; }
    .nav-item span { display: block; font-size: 9px; font-weight: bold; }
    .top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .net-box { padding: 8px; border-radius: 10px; font-weight: bold; display: flex; flex-direction: column; align-items: center; min-width: 60px; }
    .import { color: #ff4444; background: rgba(255,0,0,0.1); }
    .export { color: #00ff00; background: rgba(0,255,0,0.1); }
    .big-w { font-size: 32px; font-weight: 900; color: #ffc107; text-align: center; }
    .progress-bar { display: flex; gap: 3px; height: 6px; margin: 15px 0; }
    .seg { flex: 1; background: #1a1a1a; border-radius: 2px; }
    .seg.on { background: #ffc107; box-shadow: 0 0 5px #ffc107; }
    .neon-grid { display: flex; justify-content: space-around; margin: 20px 0; }
    .neon-circle { width: 65px; height: 65px; border-radius: 50%; border: 3px solid #333; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .color-1 { border-color: #ffc107; } .color-2 { border-color: #00f9f9; } .color-3 { border-color: #4caf50; } .color-4 { border-color: #e91e63; }
    .rack-list { display: flex; flex-direction: column; gap: 12px; }
    .rack-unit { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; border: 1px solid #222; }
    .rack-meta { display: flex; justify-content: space-between; font-size: 11px; color: #888; margin-bottom: 8px; }
    .segment-bar { display: flex; gap: 4px; height: 10px; margin-bottom: 8px; }
    .trait { flex: 1; background: #1a1a1a; }
    .trait.on { background: var(--clr); box-shadow: 0 0 5px var(--clr); }
    .rack-values { display: flex; justify-content: space-between; align-items: center; }
    .v-main { font-size: 22px; font-weight: 900; }
    .eco-hero { text-align: center; padding: 20px; background: rgba(0,255,0,0.05); border-radius: 15px; margin-bottom: 15px; }
    .eco-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
    .e-card { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; text-align: center; border: 1px solid #222; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
