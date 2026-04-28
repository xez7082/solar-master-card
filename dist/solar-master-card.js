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
  static get properties() {
    return {
      hass: {},
      _config: {},
      _selectedTab: { type: String }
    };
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
        { name: "bg_url", label: "URL de l'image de fond", selector: { text: {} } },
        { name: "bg_opacity", label: "Opacité du fond (0.1 à 1)", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 400, max: 1200 } } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "solar_target", label: "Objectif Jour (kWh)", selector: { entity: {} } },
        { name: "solar_pct_sensor", label: "Sensor Pourcentage Objectif (%)", selector: { entity: {} } },
        { name: "conso_entity", label: "Entité Consommation (W)", selector: { entity: {} } },
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
        ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => [
          { name: `w${i}_l`, label: `Label Météo ${i}`, selector: { text: {} } },
          { name: `w${i}_e`, label: `Entité Météo ${i}`, selector: { entity: {} } },
          { name: `w${i}_i`, label: `Icone Météo ${i} (mdi:...)`, selector: { text: {} } }
        ]).flat()
      ],
      tab_batt: [
        ...[1, 2, 3, 4].map(i => [
          { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
          { name: `b${i}_v`, label: `Watts Sortie ${i}`, selector: { entity: {} } },
          { name: `b${i}_out`, label: `Flux Global Charge/Décharge ${i}`, selector: { entity: {} } },
          { name: `b${i}_t`, label: `Température Batt ${i}`, selector: { entity: {} } }
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

  static styles = css`
    .edit-tabs { display: flex; gap: 4px; margin-bottom: 15px; } 
    button { flex: 1; padding: 10px; font-size: 10px; cursor: pointer; background: #111; color: #666; border: 1px solid #333; border-radius: 4px; } 
    button.active { background: #ffc107; color: #000; border-color: #ffc107; font-weight: bold; }
  `;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CARTE PRINCIPALE
 * ==========================================
 */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }

  constructor() {
    super();
    this._tab = 'SOLAIRE';
  }

  setConfig(config) {
    this.config = config;
  }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '', attr: {} };
    const s = this.hass.states[id];
    return { val: s.state, unit: s.attributes.unit_of_measurement || '', attr: s.attributes };
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;

    return html`
      <ha-card style="height:${c.card_height || 600}px; overflow: hidden; position: relative; background: #000; border-radius: 24px;">
        <div class="card-wrapper" style="height: 100%; display: flex; flex-direction: column;">
          
          ${c.bg_url ? html`
            <div style="background-image: url('${c.bg_url}'); opacity: ${c.bg_opacity || 0.3}; 
                        position: absolute; top:0; left:0; width:100%; height:100%; 
                        background-size:cover; background-position:center; z-index: 0; pointer-events: none;">
            </div>` : ''}

          <div class="view-port" style="flex: 1; position: relative; z-index: 1; overflow-y: auto; padding: 20px;">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : ''}
            ${this._tab === 'METEO' ? this._renderWeather() : ''}
            ${this._tab === 'BATTERIE' ? this._renderBattery() : ''}
            ${this._tab === 'ECONOMIE' ? this._renderEco() : ''}
          </div>

          <div class="nav-bar">
            <div class="nav-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>
              <ha-icon icon="mdi:solar-power-variant"></ha-icon><span>SOLAIRE</span>
            </div>
            <div class="nav-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}>
              <ha-icon icon="mdi:weather-partly-cloudy"></ha-icon><span>METEO</span>
            </div>
            <div class="nav-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}>
              <ha-icon icon="mdi:battery-charging"></ha-icon><span>ENERGIE</span>
            </div>
            <div class="nav-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}>
              <ha-icon icon="mdi:chart-areaspline"></ha-icon><span>ECO</span>
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
    const progress = c.solar_pct_sensor ? parseFloat(pct_entity.val) : Math.min(100, (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100);
    
    const consoVal = parseFloat(this._getVal(c.conso_entity).val) || 0;

    return html`
      <div class="page">
        <div class="solar-header">
          <div style="flex: 1;">
            ${consoVal > 0 ? html`<div style="color: #ff4444;"><ha-icon icon="mdi:transmission-tower"></ha-icon><br><b>${Math.abs(consoVal)} W</b></div>` : ''}
          </div>
          <div class="prod-main">
            <small>PRODUCTION</small><br>
            <span class="big-val">${prod.val} <small>W</small></span>
          </div>
          <div style="flex: 1;">
            ${consoVal < 0 ? html`<div style="color: #00ff00;"><ha-icon icon="mdi:export"></ha-icon><br><b>${Math.abs(consoVal)} W</b></div>` : ''}
          </div>
        </div>

        <div class="ruler-box">
           <div class="r-track">
             ${Array(20).fill().map((_, i) => html`<div class="seg ${i < progress / 5 ? 'active' : ''}"></div>`)}
           </div>
        </div>

        <div class="neon-circles">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`p${i}_w`]) return '';
            const v = this._getVal(c[`p${i}_w`]);
            const clrs = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"];
            return html`
              <div class="n-item">
                <div class="n-circle" style="--clr: ${clrs[i-1]}">
                  <span class="v">${Math.round(v.val)}</span><span class="u">W</span>
                </div>
                <div class="n-label">${c[`p${i}_name`] || 'P'+i}</div>
              </div>`;
          })}
        </div>

        <div class="data-grid">
          ${[4, 5, 6, 7, 8, 9].map(i => {
            if (!c[`d${i}_entity`]) return '';
            const d = this._getVal(c[`d${i}_entity`]);
            return html`<div class="d-card"><span>${c[`d${i}_label`]}</span><b>${d.val} <small>${d.unit}</small></b></div>`;
          })}
        </div>
      </div>`;
  }

  _renderWeather() {
    const c = this.config;
    const sun = this.hass.states['sun.sun'];
    if (!sun) return html`<div>Sun entity missing</div>`;

    const elev = sun.attributes.elevation || 0;
    const azim = sun.attributes.azimuth || 0;
    const sunX = 35 + ((azim - 45) / 270) * 130;
    const sunY = 65 - (Math.max(0, elev) * 0.6);

    return html`
      <div class="page">
        <div class="weather-grid-8">
           <div style="display: flex; flex-direction: column; gap: 8px;">
             ${[1, 2, 3, 4, 5, 6].map(i => this._renderMiniSensor(i))}
           </div>
           <div style="text-align: center;">
              <svg viewBox="0 0 200 85" style="width: 100%;">
                <path d="M 35,65 A 65,50 0 0 1 165,65" fill="none" stroke="#333" stroke-dasharray="4,4" />
                <circle cx="${sunX}" cy="${sunY}" r="6" fill="#ffc107" />
              </svg>
              <div class="moon-box">
                <ha-icon icon="mdi:moon-waning-crescent"></ha-icon>
                <span>${this._getVal(c.moon_entity).val}</span>
              </div>
           </div>
        </div>
      </div>`;
  }

  _renderMiniSensor(i) {
    const c = this.config;
    if (!c[`w${i}_e`]) return '';
    const s = this._getVal(c[`w${i}_e`]);
    return html`
      <div class="w-tile">
        <ha-icon icon="${c[`w${i}_i`] || 'mdi:circle-small'}"></ha-icon>
        <div><small>${c[`w${i}_l`]}</small><br><b>${s.val}${s.unit}</b></div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`
      <div class="page scroll">
        ${[1, 2, 3, 4].map(i => {
          if (!c[`b${i}_s` or `b${i}_out` ...]) { // Simplified check for formatting
             if(!c[`b${i}_s`]) return '';
          }
          const soc = parseFloat(this._getVal(c[`b${i}_s`]).val) || 0;
          const power = parseFloat(this._getVal(c[`b${i}_out`]).val) || 0;
          const temp = this._getVal(c[`b${i}_t`]);
          const clr = soc > 80 ? '#00c853' : soc > 20 ? '#ffc107' : '#f44336';
          
          return html`
            <div class="rack-pro" style="border-left: 4px solid ${clr}">
              <div class="rp-head"><b>${c[`b${i}_n`] || 'BAT '+i}</b><span>${soc}%</span></div>
              <div class="rp-bar"><div class="rp-fill" style="width: ${soc}%; background: ${clr}"></div></div>
              <div class="rp-foot">
                <span>${temp.val}°C</span> | <span>${power}W</span> | <span>${this._getVal(c[`b${i}_v`]).val}W</span>
              </div>
            </div>`;
        })}
      </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`
      <div class="page">
        <div class="eco-hero">
          <div class="eh-val">${this._getVal(c.eco_money).val}€</div>
          <div class="eh-sub">GAIN TOTAL</div>
        </div>
        <div class="eco-stats-grid">
           <div class="es-card"><span>MAISON</span><b>${this._getVal(c.main_cons).val}W</b></div>
           <div class="es-card"><span>JOUR</span><b>${this._getVal(c.eco_day_euro).val}€</b></div>
           ${[1,2,3].map(i => {
             if(!c[`e${i}_e`]) return '';
             return html`<div class="es-card"><span>${c[`e${i}_l`]}</span><b>${this._getVal(c[`e${i}_e`]).val}</b></div>`;
           })}
        </div>
      </div>`;
  }

  static styles = css`
    ha-card { color: #fff; font-family: sans-serif; }
    .nav-bar { display: flex; justify-content: space-around; padding: 10px; background: #050505; border-top: 1px solid #222; }
    .nav-btn { color: #555; text-align: center; cursor: pointer; transition: 0.3s; flex: 1; }
    .nav-btn.active { color: #ffc107; transform: translateY(-2px); }
    .nav-btn ha-icon { --mdc-icon-size: 24px; }
    .nav-btn span { display: block; font-size: 9px; font-weight: bold; margin-top: 4px; }
    
    .solar-header { display: flex; justify-content: space-between; align-items: center; text-align: center; margin-bottom: 20px; }
    .big-val { font-size: 38px; font-weight: 900; color: #ffc107; }
    .big-val small { font-size: 16px; color: #fff; opacity: 0.5; }
    
    .ruler-box { margin-bottom: 25px; }
    .r-track { display: flex; gap: 3px; height: 8px; }
    .seg { flex: 1; background: #1a1a1a; border-radius: 2px; }
    .seg.active { background: #ffc107; box-shadow: 0 0 5px #ffc107; }
    
    .neon-circles { display: flex; justify-content: space-around; margin-bottom: 20px; }
    .n-circle { width: 65px; height: 65px; border-radius: 50%; border: 2px solid var(--clr); display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); box-shadow: inset 0 0 10px var(--clr); }
    .n-circle .v { font-size: 16px; font-weight: bold; }
    .n-circle .u { font-size: 8px; color: #888; }
    .n-label { font-size: 9px; text-align: center; margin-top: 5px; color: #aaa; }
    
    .data-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .d-card { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; text-align: center; border: 1px solid #222; }
    .d-card span { font-size: 8px; color: #888; display: block; text-transform: uppercase; margin-bottom: 4px; }
    .d-card b { font-size: 13px; }

    .rack-pro { background: #0a0a0a; padding: 12px; border-radius: 12px; margin-bottom: 10px; border: 1px solid #1a1a1a; }
    .rp-head { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .rp-bar { height: 6px; background: #111; border-radius: 3px; overflow: hidden; }
    .rp-fill { height: 100%; transition: 0.5s; }
    .rp-foot { font-size: 10px; margin-top: 10px; color: #666; }

    .weather-grid-8 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .w-tile { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; display: flex; align-items: center; gap: 10px; }
    .moon-box { margin-top: 20px; background: #111; padding: 10px; border-radius: 10px; }

    .eco-hero { text-align: center; padding: 20px; background: rgba(76,175,80,0.1); border-radius: 20px; margin-bottom: 20px; }
    .eh-val { font-size: 32px; font-weight: bold; color: #4caf50; }
    .eh-sub { font-size: 10px; color: #aaa; letter-spacing: 2px; }
    .eco-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .es-card { background: #0a0a0a; padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #1a1a1a; }
    .es-card span { font-size: 9px; color: #666; }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
