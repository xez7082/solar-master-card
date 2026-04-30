import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.0.1/lit-element.js?module";

class SolarMasterCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      activeTab: { type: Number }
    };
  }

  constructor() {
    super();
    this.activeTab = 0;
  }

  setConfig(config) {
    this.config = config;
  }

  _getVal(entityId) {
    const stateObj = this.hass.states[entityId];
    return {
      val: stateObj ? stateObj.state : '0',
      unit: stateObj ? stateObj.attributes.unit_of_measurement || '' : ''
    };
  }

  render() {
    return html`
      <ha-card>
        <div class="card-container">
          <div class="tabs">
            <div class="tab ${this.activeTab === 0 ? 'active' : ''}" @click="${() => this.activeTab = 0}">
              <ha-icon icon="mdi:solar-power"></ha-icon> SOLAIRE
            </div>
            <div class="tab ${this.activeTab === 1 ? 'active' : ''}" @click="${() => this.activeTab = 1}">
              <ha-icon icon="mdi:weather-partly-cloudy"></ha-icon> MÉTÉO
            </div>
          </div>

          <div class="content">
            ${this.activeTab === 0 ? this._renderSolar() : this._renderWeather()}
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const target = this._getVal(c.solar_target);
    
    // Calcul de la progression et du mois
    const pct_entity = this._getVal(c.solar_pct_sensor);
    const progress = c.solar_pct_sensor ? parseFloat(pct_entity.val) : Math.min(100, (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100);
    const moisActuel = new Date().toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();

    const consoState = c.conso_entity ? this.hass.states[c.conso_entity] : null; 
    const consoVal = consoState ? parseFloat(consoState.state) : 0;
    const consoDisplay = Math.abs(consoVal).toFixed(0);

    return html`
      <div class="page">
        
        <div class="solar-header">
          <div class="conso-box">
            ${consoVal > 0 ? html`<div style="color: #ff4444; font-weight: 900;"><ha-icon icon="mdi:transmission-tower"></ha-icon><br><span>${consoDisplay} W</span></div>` : ''}
          </div>

          <div class="main-prod-box">
            <div class="month-label">${moisActuel}</div>
            <div class="main-val">${prod.val} <small>W</small></div>
            <div class="target-info">
              <span>OBJ: <b>${target.val}</b></span>
              <span>RÉAL: <b style="color: #00f9f9;">${Math.round(progress)}%</b></span>
            </div>
          </div>

          <div class="conso-box">
            ${consoVal < 0 ? html`<div style="color: #00ff00; font-weight: 900;"><ha-icon icon="mdi:export"></ha-icon><br><span>${consoDisplay} W</span></div>` : ''}
          </div>
        </div>

        <div class="progress-bar-container">
          <div class="progress-bar">
            ${Array(20).fill().map((_, i) => html`
              <div class="bar-segment" style="background: ${i < (progress/5) ? '#ffc107' : '#1a1a1a'};"></div>
            `)}
          </div>
        </div>

        <div class="neon-circles">
          ${[1, 2, 3, 4].map(i => {
            const entityId = c[`p${i}_w`] || c[`panel${i}_production`];
            if(!entityId) return '';
            const v = this._getVal(entityId);
            const clr = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"][i-1];
            return html`
              <div class="n-item">
                <div class="n-circle" style="border-color: ${clr}; box-shadow: inset 0 0 12px ${clr};">
                   <span class="n-val">${Math.round(v.val)}</span>
                   <span class="n-unit">WATTS</span>
                </div>
                <div class="n-label">${c[`p${i}_name`] || 'P'+i}</div>
              </div>`;
          })}
        </div>

        <div class="data-grid">
          ${[4, 5, 6, 7, 8, 9].map(i => {
            const entityId = c[`d${i}_entity`];
            if(!entityId) return '';
            const d = this._getVal(entityId);
            return html`
              <div class="d-card">
                <span class="d-label">${c[`d${i}_label`] || 'DATA '+i}</span>
                <span class="d-val">${d.val}<small>${d.unit}</small></span>
              </div>`;
          })}
        </div>
      </div>
    `;
  }

  _renderWeather() {
    const c = this.config;
    const sun = this.hass.states['sun.sun'];
    if (!sun) return html`<div style="color:red;padding:20px;">ENTITÉ SUN INTROUVABLE</div>`;

    const elevation = sun.attributes.elevation ?? 0;
    const azimuth = sun.attributes.azimuth ?? 0;
    const sunX = 30 + ((azimuth / 360) * 140); 
    const sunY = 55 - (Math.max(0, elevation) * 0.4);

    // Traduction de la lune
    const moonState = this.hass.states[c.moon_entity]?.state;
    const moonTranslations = {
      'new_moon': 'Nouvelle lune',
      'waxing_crescent': 'Premier croissant',
      'first_quarter': 'Premier quartier',
      'waxing_gibbous': 'Gibbeuse croissante',
      'full_moon': 'Pleine lune',
      'waning_gibbous': 'Gibbeuse décroissante',
      'last_quarter': 'Dernier quartier',
      'waning_crescent': 'Dernier croissant'
    };
    const phaseFr = moonTranslations[moonState] || moonState || 'N/A';

    return html`
      <div class="page">
        <div class="weather-card sun-arc-box">
          <svg viewBox="0 0 200 70">
            <line x1="20" y1="60" x2="180" y2="60" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
            <path d="M 30,60 A 70,40 0 0 1 170,60" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2" stroke-dasharray="4,4" />
            <circle cx="${sunX}" cy="${sunY}" r="6" fill="#ffc107" style="filter: drop-shadow(0 0 8px #ffc107);" />
          </svg>
          <div class="sun-times">
              <span>${sun.attributes.next_rising?.split('T')[1].substring(0, 5)}</span>
              <span style="color:#ffc107; font-size: 14px;">${elevation.toFixed(1)}°</span>
              <span>${sun.attributes.next_setting?.split('T')[1].substring(0, 5)}</span>
          </div>
        </div>

        <div class="weather-card moon-box">
           <ha-icon icon="mdi:moon-waning-crescent"></ha-icon>
           <span class="moon-text">${phaseFr}</span>
        </div>

        <div class="weather-grid">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => this._renderMiniSensor(i))}
        </div>
      </div>
    `;
  }

  _renderMiniSensor(i) {
    const c = this.config;
    const entityId = c[`w${i}_e`];
    if (!entityId || !this.hass.states[entityId]) return html``;
    const stateObj = this.hass.states[entityId];

    return html`
      <div class="mini-sensor-card">
        <ha-icon icon="${c[`w${i}_i`] || 'mdi:circle-small'}"></ha-icon>
        <span class="mini-label">${c[`w${i}_l`] || 'S'+i}</span>
        <span class="mini-val">
          ${stateObj.state}<small>${stateObj.attributes.unit_of_measurement || ''}</small>
        </span>
      </div>`;
  }

  static get styles() {
    return css`
      :host { --accent: #00f9f9; --solar: #ffc107; }
      ha-card { background: rgba(10, 10, 10, 0.9); border-radius: 16px; color: white; overflow: hidden; }
      .card-container { display: flex; flex-direction: column; height: 520px; }
      
      /* TABS */
      .tabs { display: flex; background: rgba(0,0,0,0.3); }
      .tab { flex: 1; padding: 12px; text-align: center; cursor: pointer; font-weight: bold; font-size: 12px; color: #666; transition: 0.3s; }
      .tab.active { color: white; border-bottom: 2px solid var(--accent); background: rgba(255,255,255,0.05); }
      
      /* PAGES */
      .page { display: flex; flex-direction: column; gap: 10px; padding: 10px; box-sizing: border-box; flex: 1; }
      
      /* SOLAR HEADER */
      .solar-header { display: flex; align-items: center; justify-content: space-between; }
      .conso-box { flex: 1; text-align: center; font-size: 18px; }
      .main-prod-box { flex: 1.5; text-align: center; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
      .month-label { font-size: 10px; color: var(--solar); font-weight: bold; text-transform: uppercase; }
      .main-val { font-size: 32px; font-weight: 900; color: var(--solar); line-height: 1; }
      .main-val small { font-size: 14px; }
      .target-info { display: flex; justify-content: center; gap: 10px; font-size: 11px; color: #aaa; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 4px; }
      
      /* PROGRESS BAR */
      .progress-bar { display: flex; gap: 2px; height: 6px; }
      .bar-segment { flex: 1; border-radius: 1px; }

      /* CERCLES XL */
      .neon-circles { display: flex; justify-content: space-around; margin: 5px 0; }
      .n-circle { width: 82px; height: 82px; border-radius: 50%; border: 3px solid; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); }
      .n-val { font-size: 24px; font-weight: 900; color: #fff; line-height: 1; }
      .n-unit { font-size: 10px; color: #888; font-weight: bold; }
      .n-label { font-size: 10px; font-weight: bold; color: #aaa; text-transform: uppercase; margin-top: 4px; text-align: center; }

      /* DATA GRID */
      .data-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .d-card { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
      .d-label { font-size: 8px; color: #777; display: block; text-transform: uppercase; }
      .d-val { font-size: 16px; font-weight: bold; color: #fff; }
      .d-val small { font-size: 10px; color: var(--accent); margin-left: 2px; }

      /* WEATHER */
      .weather-card { background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); }
      .sun-arc-box { padding: 10px; }
      .sun-arc-box svg { width: 100%; height: 80px; overflow: visible; }
      .sun-times { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; margin-top: -5px; padding: 0 15px; }
      .moon-box { padding: 12px; display: flex; align-items: center; gap: 12px; }
      .moon-box ha-icon { color: var(--accent); --mdc-icon-size: 24px; }
      .moon-text { font-size: 15px; font-weight: bold; text-transform: uppercase; color: #fff; }
      .weather-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .mini-sensor-card { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; text-align: center; height: 55px; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; align-items: center; justify-content: center; }
      .mini-sensor-card ha-icon { color: var(--accent); --mdc-icon-size: 18px; }
      .mini-label { font-size: 9px; color: #aaa; font-weight: bold; text-transform: uppercase; }
      .mini-val { font-size: 18px; font-weight: 900; color: #fff; }
      .mini-val small { font-size: 11px; color: var(--accent); }
    `;
  }
}

customElements.define("solar-master-card", SolarMasterCard);
