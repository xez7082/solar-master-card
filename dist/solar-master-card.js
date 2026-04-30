import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE CONFIGURATION
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
        { name: "bg_url", label: "URL de l'image de fond", selector: { text: {} } },
        { name: "bg_opacity", label: "Opacité du fond (0.1 à 1)", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "conso_entity", label: "Capteur Consommation/Import (W)", selector: { entity: {} } },
        { name: "solar_pct_sensor", label: "Sensor Pourcentage Objectif (%)", selector: { entity: {} } },
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 400, max: 1200 } } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "solar_target", label: "Objectif Jour (kWh)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau ${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts Panneau ${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `Info Extra ${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité Extra ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_weather: [
        { name: "weather_entity", label: "Entité Météo Principale", selector: { entity: { domain: "weather" } } },
        { name: "moon_entity", label: "Entité Lune", selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => [
           { name: `w${i}_l`, label: `Label Météo ${i}`, selector: { text: {} } },
           { name: `w${i}_e`, label: `Entité Météo ${i}`, selector: { entity: {} } },
           { name: `w${i}_i`, label: `Icone Météo ${i} (mdi:...)`, selector: { text: {} } }
        ]).flat()
      ],
      tab_batt: [
        { name: "batt_total_power", label: "Flux Total Batteries (W)", selector: { entity: {} } },
        { name: "batt_avg_soc", label: "SOC Moyen Global (%)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
          { name: `b${i}_t`, label: `Température ${i}`, selector: { entity: {} } },
          { name: `b${i}_v`, label: `Puissance Sortie (W) ${i}`, selector: { entity: {} } },
          { name: `b${i}_out`, label: `Flux E/S (W) ${i}`, selector: { entity: {} } },
        ]).flat()
      ],
      tab_eco: [
        { name: "eco_money", label: "Économies Totales (€)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gain Jour (€)", selector: { entity: {} } },
        { name: "eco_year_euro", label: "Gain Année (€)", selector: { entity: {} } },
        { name: "main_cons", label: "Conso Maison (W)", selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6].map(i => [
           { name: `e${i}_l`, label: `Label Éco ${i}`, selector: { text: {} } },
           { name: `e${i}_e`, label: `Entité Éco ${i}`, selector: { entity: {} } }
        ]).flat()
      ]
    };

    return html`
      <div class="edit-tabs">
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>SOLAIRE</button>
        <button class="${this._selectedTab === 'tab_weather' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_weather'}>METEO</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIES</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ECO</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs { display: flex; gap: 4px; margin-bottom: 15px; } button { flex: 1; padding: 10px; font-size: 10px; cursor: pointer; background: #111; color: #666; border: 1px solid #333; border-radius: 4px; } button.active { background: #ffc107; color: #000; border-color: #ffc107; font-weight: bold; }`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CARTE SOLAIRE MASTER V8
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
      <ha-card style="height:${c.card_height || 500}px;">
        <div class="card-wrapper">
          
          ${c.bg_url ? html`
            <div class="bg-overlay" style="background-image: url('${c.bg_url}'); opacity: ${c.bg_opacity || 0.3};"></div>
          ` : ''}

          <div class="view-port">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : ''}
            ${this._tab === 'METEO' ? this._renderWeather() : ''}
            ${this._tab === 'BATTERIE' ? this._renderBattery() : ''}
            ${this._tab === 'ECONOMIE' ? this._renderEco() : ''}
          </div>

          <div class="nav-bar">
            <div class="nav-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>
              <ha-icon icon="mdi:solar-power-variant"></ha-icon>
              <span>SOLAIRE</span>
            </div>
            <div class="nav-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}>
              <ha-icon icon="mdi:weather-partly-cloudy"></ha-icon>
              <span>METEO</span>
            </div>
            <div class="nav-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}>
              <ha-icon icon="mdi:battery-charging"></ha-icon>
              <span>BATTERIE</span>
            </div>
            <div class="nav-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}>
              <ha-icon icon="mdi:chart-areaspline"></ha-icon>
              <span>ECO</span>
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
    const pct_entity = this._getVal(c.solar_pct_sensor);
    
    // Calcul de progression sans limite de 100%
    const progress = c.solar_pct_sensor ? parseFloat(pct_entity.val) : (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100;
    const moisActuel = new Date().toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();

    const consoState = c.conso_entity ? this.hass.states[c.conso_entity] : null; 
    const consoVal = consoState ? parseFloat(consoState.state) : 0;
    const consoDisplay = Math.abs(consoVal).toFixed(0);

    return html`
      <div class="page">
        <div class="solar-header">
          <div class="grid-side">
            ${consoVal > 0 ? html`<div class="import-val"><ha-icon icon="mdi:transmission-tower"></ha-icon><br>${consoDisplay} W</div>` : ''}
          </div>

          <div class="main-display">
            <div class="month-label">${moisActuel}</div>
            <div class="prod-val">${prod.val} <small>W</small></div>
            <div class="stats-row">
              <span>OBJ: <b>${target.val} kWh</b></span>
              <span>RÉALISÉ: <b style="color: #00f9f9;">${Math.round(progress)} %</b></span>
            </div>
          </div>

          <div class="grid-side">
            ${consoVal < 0 ? html`<div class="export-val"><ha-icon icon="mdi:export"></ha-icon><br>${consoDisplay} W</div>` : ''}
          </div>
        </div>

        <div class="progress-container">
          <div class="progress-track">
            ${Array(20).fill().map((_, i) => html`
              <div class="segment ${i < (Math.min(100, progress)/5) ? 'active' : ''}"></div>
            `)}
          </div>
        </div>

        <div class="neon-circles-row">
          ${[1, 2, 3, 4].map(i => {
            const entityId = c[`p${i}_w`];
            if(!entityId) return '';
            const v = this._getVal(entityId);
            const colors = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"];
            return html`
              <div class="n-item">
                <div class="n-circle" style="--clr: ${colors[i-1]}">
                   <span class="v">${Math.round(v.val)}</span>
                   <span class="u">WATTS</span>
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
                <span class="d-lbl">${c[`d${i}_label`] || 'INFO'}</span>
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
    if (!sun) return html`<div>Erreur Sun</div>`;

    const elevation = sun.attributes.elevation ?? 0;
    const azimuth = sun.attributes.azimuth ?? 0;
    const sunX = 30 + ((azimuth / 360) * 140); 
    const sunY = 55 - (Math.max(0, elevation) * 0.4);

    return html`
      <div class="page">
        <div class="weather-arc-box">
          <svg viewBox="0 0 200 70">
            <line x1="20" y1="60" x2="180" y2="60" stroke="rgba(255,255,255,0.2)" />
            <path d="M 30,60 A 70,40 0 0 1 170,60" fill="none" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4,4" />
            <circle cx="${sunX}" cy="${sunY}" r="6" fill="#ffc107" />
          </svg>
          <div class="sun-times">
              <span>${sun.attributes.next_rising?.split('T')[1].substring(0, 5)}</span>
              <span style="color:#ffc107">${elevation.toFixed(1)}°</span>
              <span>${sun.attributes.next_setting?.split('T')[1].substring(0, 5)}</span>
          </div>
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
    if (!entityId || !this.hass.states[entityId]) return '';
    const s = this.hass.states[entityId];
    return html`
      <div class="mini-card">
        <ha-icon icon="${c[`w${i}_i`] || 'mdi:water'}"></ha-icon>
        <div class="m-lbl">${c[`w${i}_l`] || 'S'+i}</div>
        <div class="m-val">${s.state}<span>${s.attributes.unit_of_measurement}</span></div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`
      <div class="page scroll">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`b${i}_s`]) return '';
            const soc = parseFloat(this._getVal(c[`b${i}_s`]).val) || 0;
            const p = this._getVal(c[`b${i}_out`]);
            let color = soc >= 80 ? "#00c853" : soc >= 50 ? "#ffc107" : "#f44336";
            return html`
              <div class="rack-card" style="border-left: 4px solid ${color}">
                <div class="rack-info"><b>${c[`b${i}_n`] || 'BAT '+i}</b> <span>${soc}%</span></div>
                <div class="rack-bar"><div class="fill" style="width:${soc}%; background:${color}"></div></div>
                <div class="rack-stats">${Math.abs(p.val)} W</div>
              </div>`;
          })}
      </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`
      <div class="page">
        <div class="eco-hero">
            <div class="v">${this._getVal(c.eco_money).val}€</div>
            <div class="l">TOTAL ÉCONOMISÉ</div>
        </div>
        <div class="data-grid">
          <div class="d-card"><span>JOUR</span><b>${this._getVal(c.eco_day_euro).val}€</b></div>
          <div class="d-card"><span>ANNÉE</span><b>${this._getVal(c.eco_year_euro).val}€</b></div>
          <div class="d-card"><span>CONSO</span><b>${this._getVal(c.main_cons).val}W</b></div>
        </div>
      </div>`;
  }

  static styles = css`
    :host { --gold: #ffc107; --cyan: #00f9f9; --red: #ff4444; --green: #00ff00; }
    ha-card { background: #000; color: #fff; border-radius: 20px; overflow: hidden; font-family: sans-serif; border: 1px solid #222; }
    .card-wrapper { height: 100%; display: flex; flex-direction: column; position: relative; }
    .bg-overlay { position: absolute; top:0; left:0; width:100%; height:100%; background-size: cover; background-position: center; z-index: 0; pointer-events: none; }
    .view-port { flex: 1; padding: 15px; z-index: 1; overflow-y: auto; }
    .page { display: flex; flex-direction: column; gap: 15px; }
    
    /* SOLAIRE */
    .solar-header { display: flex; align-items: center; justify-content: space-between; }
    .main-display { flex: 2; text-align: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 15px; border: 1px solid #333; }
    .prod-val { font-size: 32px; font-weight: 900; color: var(--gold); }
    .month-label { font-size: 10px; color: var(--gold); font-weight: bold; }
    .stats-row { display: flex; justify-content: center; gap: 10px; font-size: 10px; border-top: 1px solid #333; margin-top: 5px; padding-top: 5px; }
    
    .import-val { color: var(--red); font-weight: bold; text-align: center; font-size: 14px; }
    .export-val { color: var(--green); font-weight: bold; text-align: center; font-size: 14px; }

    .progress-track { display: flex; gap: 3px; height: 8px; }
    .segment { flex: 1; background: #111; border-radius: 2px; }
    .segment.active { background: var(--gold); box-shadow: 0 0 5px var(--gold); }

    .neon-circles-row { display: flex; justify-content: space-around; margin: 10px 0; }
    .n-circle { width: 75px; height: 75px; border-radius: 50%; border: 3px solid var(--clr); display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.8); box-shadow: inset 0 0 10px var(--clr); }
    .n-circle .v { font-size: 20px; font-weight: 900; }
    .n-circle .u { font-size: 8px; color: #888; }
    .n-label { font-size: 10px; text-align: center; margin-top: 5px; font-weight: bold; }

    .data-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .d-card { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 10px; text-align: center; border: 1px solid #222; }
    .d-lbl { font-size: 8px; color: #888; display: block; }
    .d-val { font-size: 14px; font-weight: bold; }

    /* WEATHER */
    .weather-arc-box { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 15px; text-align: center; }
    .sun-times { display: flex; justify-content: space-between; padding: 0 20px; font-size: 12px; margin-top: -10px; font-weight: bold; }
    .weather-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .mini-card { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; text-align: center; }
    .mini-card ha-icon { color: var(--cyan); --mdc-icon-size: 20px; }
    .m-lbl { font-size: 8px; color: #888; }
    .m-val { font-size: 16px; font-weight: bold; }

    /* RACK BATTERY */
    .rack-card { background: #111; padding: 10px; border-radius: 8px; margin-bottom: 8px; }
    .rack-info { display: flex; justify-content: space-between; }
    .rack-bar { height: 6px; background: #222; border-radius: 3px; margin: 8px 0; }
    .fill { height: 100%; border-radius: 3px; transition: 1s; }

    /* ECO */
    .eco-hero { text-align: center; padding: 20px; background: rgba(0,255,0,0.05); border-radius: 20px; border: 1px solid #111; }
    .eco-hero .v { font-size: 40px; font-weight: 900; color: var(--green); }
    .eco-hero .l { font-size: 10px; color: #888; }

    /* NAV */
    .nav-bar { display: flex; background: rgba(0,0,0,0.9); border-top: 1px solid #222; padding: 10px 0; }
    .nav-btn { flex: 1; text-align: center; color: #555; cursor: pointer; transition: 0.3s; }
    .nav-btn ha-icon { --mdc-icon-size: 24px; }
    .nav-btn span { display: block; font-size: 9px; font-weight: bold; margin-top: 2px; }
    .nav-btn.active { color: var(--gold); transform: translateY(-3px); }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
