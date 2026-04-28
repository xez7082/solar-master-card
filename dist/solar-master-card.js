import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE LA CARTE (V5.1)
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
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 400, max: 1200 } } },
        { name: "bg_url", label: "URL Image de Fond", selector: { text: {} } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "solar_target", label: "Objectif (kWh)", selector: { entity: {} } },
        { name: "solar_pct_entity", label: "Sensor Pourcentage (Optionnel)", selector: { entity: {} } },
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `Label D${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité D${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_weather: [
        { name: "weather_entity", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
        { name: "temp_ext", label: "Température Ext.", selector: { entity: {} } },
        { name: "hum_ext", label: "Humidité Ext.", selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => [
           { name: `w${i}_l`, label: `Label Météo ${i}`, selector: { text: {} } },
           { name: `w${i}_e`, label: `Entité Météo ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [
        { name: "batt_total_power", label: "Puissance Totale Batteries (W)", selector: { entity: {} } },
        { name: "batt_avg_soc", label: "SOC Moyen Global (%)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
          { name: `b${i}_cap`, label: `Capacité ${i}`, selector: { entity: {} } },
          { name: `b${i}_out`, label: `Sortie Watts ${i}`, selector: { entity: {} } }
        ]).flat()],
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
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATT</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ECO</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs { display: flex; gap: 4px; margin-bottom: 15px; } button { flex: 1; padding: 10px; font-size: 10px; cursor: pointer; background: #1a1a1a; color: #666; border: 1px solid #333; border-radius: 6px; font-weight: bold; } button.active { background: #ffc107; color: #000; border-color: #ffc107; }`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '' };
    const s = this.hass.states[id];
    return { val: s.state, unit: s.attributes.unit_of_measurement || '', attr: s.attributes };
  }

  _translateWeather(state) {
    const dict = {
      'clear-night': 'Nuit Claire', 'cloudy': 'Nuageux', 'fog': 'Brouillard', 'hail': 'Grêle', 'lightning': 'Orages', 
      'lightning-rainy': 'Orageux', 'partlycloudy': 'Éclaircies', 'pouring': 'Averses', 'rainy': 'Pluie', 
      'snowy': 'Neige', 'sunny': 'Ensoleillé', 'windy': 'Vent'
    };
    return dict[state?.toLowerCase()] || state || 'Inconnu';
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        ${c.bg_url ? html`<div class="bg-layer" style="background-image:url('${c.bg_url}');"></div>` : ''}
        <div class="overlay">
          <div class="main-content">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : 
              this._tab === 'METEO' ? this._renderWeather() :
              this._tab === 'BATTERIE' ? this._renderBattery() : this._renderEco()}
          </div>
          <div class="footer">
            <div class="f-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}><ha-icon icon="mdi:solar-power"></ha-icon></div>
            <div class="f-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon></div>
            <div class="f-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}><ha-icon icon="mdi:battery-charging-100"></ha-icon></div>
            <div class="f-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}><ha-icon icon="mdi:currency-eur"></ha-icon></div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const target = this._getVal(c.solar_target);
    const progress = Math.min(100, (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100);

    return html`
      <div class="page">
        <div class="header-prod">
            <div class="big-val-titan">${prod.val}<small>W</small></div>
            <div class="target-container">
                <div class="target-bar"><div class="target-fill" style="width:${progress}%"></div></div>
                <div class="target-row"><span>OBJ: <b>${target.val}kWh</b></span><span>${progress.toFixed(1)}%</span></div>
            </div>
        </div>
        <div class="cockpit">
          <div class="side">${[4, 5, 6].map(i => this._renderDiag(i, 'l'))}</div>
          <div class="side">${[7, 8, 9].map(i => this._renderDiag(i, 'r'))}</div>
        </div>
        <div class="hud-orbit-row">
          ${[1, 2, 3, 4].map(i => {
            const val = this._getVal(c[`p${i}_w`]);
            if (!c[`p${i}_w`]) return '';
            return html`<div class="hud-orbit"><div class="orbit-circle"><div class="orbit-value">${Math.round(val.val)}</div></div><div class="orbit-label">${c[`p${i}_name`] || 'P'+i}</div></div>`;
          })}
        </div>
      </div>`;
  }

  _renderWeather() {
    const c = this.config;
    const sun = this.hass.states['sun.sun'];
    const weather = this._getVal(c.weather_entity);
    return html`
      <div class="page scroll">
        <div class="weather-station-v3">
            <div class="ws-header"><div class="ws-temp">${this._getVal(c.temp_ext).val}<small>°C</small></div><ha-icon icon="mdi:weather-sunny"></ha-icon></div>
            <div class="sun-dashboard">
                <div class="sun-stat"><span>ÉLÉVATION</span><b>${sun?.attributes.elevation.toFixed(1)}°</b></div>
                <div class="sun-stat"><span>AZIMUT</span><b>${sun?.attributes.azimuth.toFixed(1)}°</b></div>
            </div>
        </div>
        <div class="weather-grid-8">
            ${[1,2,3,4,5,6,7,8].map(i => {
                if(!c[`w${i}_e`]) return '';
                const e = this._getVal(c[`w${i}_e`]);
                return html`<div class="w-card"><span class="w-l">${c[`w${i}_l`]}</span><span class="w-v">${e.val}<small>${e.unit}</small></span></div>`;
            })}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    const totalPower = this._getVal(c.batt_total_power);
    const avgSoc = this._getVal(c.batt_avg_soc);

    return html`
      <div class="page scroll">
        <div class="batt-master-header">
            <div class="batt-main-val">
                <span class="bm-v">${avgSoc.val}<small>%</small></span>
                <span class="bm-l">SOC MOYEN</span>
            </div>
            <div class="batt-main-power">
                <ha-icon icon="${parseFloat(totalPower.val) >= 0 ? 'mdi:battery-arrow-up' : 'mdi:battery-arrow-down'}"></ha-icon>
                <span class="bm-p">${Math.abs(totalPower.val)}<small>W</small></span>
            </div>
        </div>

        <div class="section-title">ÉTAT DES RACKS</div>
        
        <div class="rack-container">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`b${i}_s`]) return '';
            const soc = this._getVal(c[`b${i}_s`]);
            const out = this._getVal(c[`b${i}_out`]);
            const cap = this._getVal(c[`b${i}_cap`]);
            const isCharging = parseFloat(out.val) < 0;

            return html`
              <div class="rack-card">
                <div class="r-info">
                  <span class="r-name">${c[`b${i}_n`] || 'RACK '+i}</span>
                  <span class="r-cap">${cap.val} ${cap.unit}</span>
                </div>
                <div class="r-mid">
                  <div class="r-soc-val">${soc.val}%</div>
                  <div class="r-power-val ${isCharging ? 'charge' : 'discharge'}">
                    ${isCharging ? '↓' : '↑'} ${Math.abs(out.val)}W
                  </div>
                </div>
                <div class="r-progress-bg">
                  <div class="r-progress-fill" style="width:${soc.val}%; background:${soc.val < 20 ? '#f44336' : '#00c853'}"></div>
                </div>
              </div>`;
          })}
        </div>
      </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`<div class="page scroll">
      <div class="eco-header-slim">
          <div class="eco-money-main">${this._getVal(c.eco_money).val}€</div>
          <div class="eco-split">
             <div class="split-box">JOUR: <b>${this._getVal(c.eco_day_euro).val}€</b></div>
             <div class="split-box">AN: <b>${this._getVal(c.eco_year_euro).val}€</b></div>
          </div>
      </div>
      <div class="cons-bar-slim">
          <span class="c-label">CONSO MAISON</span>
          <span class="c-val">${this._getVal(c.main_cons).val} W</span>
      </div>
      <div class="eco-list-compact">
        ${[1,2,3,4,5,6].map(i => {
            if(!c[`e${i}_e`]) return '';
            const e = this._getVal(c[`e${i}_e`]);
            return html`<div class="eco-row-item"><span>${c[`e${i}_l`]}</span><b>${e.val}${e.unit}</b></div>`;
        })}
      </div>
    </div>`;
  }

  _renderDiag(i, side) {
    const c = this.config;
    if (!c[`d${i}_entity`]) return '';
    const d = this._getVal(c[`d${i}_entity`]);
    return html`<div class="mini-diag ${side}"><span class="m-l">${c[`d${i}_label`]}</span><span class="m-v">${d.val}<small>${d.unit}</small></span></div>`;
  }

  static styles = css`
    ha-card { background:#000; color:#fff; border-radius:28px; overflow:hidden; font-family: 'Inter', sans-serif; position:relative; }
    .bg-layer { position:absolute; top:0; left:0; width:100%; height:100%; background-size:cover; opacity:0.1; z-index:0; }
    .overlay { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; padding:20px; background:rgba(0,0,0,0.9); box-sizing:border-box; }
    
    .page { display:flex; flex-direction:column; height:100%; overflow-y:auto; }
    .scroll::-webkit-scrollbar { width:3px; }
    .scroll::-webkit-scrollbar-thumb { background:#444; }

    /* Header & General */
    .big-val-titan { font-size:30px; font-weight:900; color:#ffc107; text-align:center; }
    .target-container { max-width:250px; margin:0 auto 15px; }
    .target-bar { height:6px; background:#222; border-radius:3px; overflow:hidden; }
    .target-fill { height:100%; background:#ffc107; }
    .target-row { display:flex; justify-content:space-between; font-size:10px; color:#aaa; margin-top:4px; }

    /* Batterie Tab Style */
    .batt-master-header { display:flex; justify-content:space-between; align-items:center; background:rgba(0,200,83,0.1); padding:20px; border-radius:20px; border:1px solid rgba(0,200,83,0.2); margin-bottom:20px; }
    .batt-main-val { display:flex; flex-direction:column; }
    .bm-v { font-size:42px; font-weight:900; color:#00c853; line-height:1; }
    .bm-l { font-size:10px; color:#aaa; letter-spacing:1px; }
    .batt-main-power { text-align:right; display:flex; flex-direction:column; }
    .batt-main-power ha-icon { color:#ffc107; --mdc-icon-size:30px; }
    .bm-p { font-size:24px; font-weight:bold; color:#fff; }
    
    .section-title { font-size:12px; font-weight:bold; color:#666; margin-bottom:10px; letter-spacing:1px; text-transform:uppercase; }
    .rack-container { display:flex; flex-direction:column; gap:10px; }
    .rack-card { background:rgba(255,255,255,0.03); border:1px solid #222; border-radius:15px; padding:12px; }
    .r-info { display:flex; justify-content:space-between; margin-bottom:8px; }
    .r-name { font-size:11px; font-weight:bold; color:#00c853; }
    .r-cap { font-size:10px; color:#666; }
    .r-mid { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px; }
    .r-soc-val { font-size:24px; font-weight:900; }
    .r-power-val { font-size:14px; font-weight:bold; }
    .r-power-val.charge { color:#00c853; }
    .r-power-val.discharge { color:#ffc107; }
    .r-progress-bg { height:6px; background:#111; border-radius:3px; overflow:hidden; }
    .r-progress-fill { height:100%; transition: width 0.5s ease-in-out; }

    /* Rest of Styles */
    .cockpit { display:flex; justify-content:space-between; margin-bottom:20px; }
    .mini-diag { background:rgba(255,255,255,0.04); padding:10px; border-radius:10px; border-left:3px solid #00f9f9; width:45%; }
    .mini-diag.r { border-left:none; border-right:3px solid #ffc107; text-align:right; }
    .m-v { font-size:16px; font-weight:bold; }
    
    .hud-orbit-row { display:flex; justify-content:space-around; }
    .orbit-circle { width:60px; height:60px; border-radius:50%; border:2px solid #ffc107; display:flex; align-items:center; justify-content:center; }
    .orbit-value { font-size:16px; font-weight:bold; }
    .orbit-label { font-size:9px; text-align:center; margin-top:5px; color:#aaa; }

    .eco-header-slim { background:rgba(76,175,80,0.1); padding:15px; border-radius:15px; text-align:center; margin-bottom:15px; }
    .eco-money-main { font-size:32px; font-weight:900; color:#4caf50; }
    .eco-row-item { display:flex; justify-content:space-between; padding:10px; background:rgba(255,255,255,0.02); margin-bottom:5px; border-radius:8px; font-size:12px; }

    .footer { display:flex; justify-content:space-around; padding-top:20px; border-top:1px solid #222; margin-top:auto; }
    .f-btn { cursor:pointer; opacity:0.4; transition:0.3s; }
    .f-btn.active { opacity:1; color:#ffc107; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
