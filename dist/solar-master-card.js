import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE LA CARTE (V4.9)
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
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 300, max: 1200 } } },
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
      tab_batt: [...[1, 2, 3, 4].map(i => [
        { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
        { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
        { name: `b${i}_cap`, label: `Capacité ${i}`, selector: { entity: {} } },
        { name: `b${i}_out`, label: `Sortie ${i}`, selector: { entity: {} } }
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

/**
 * ==========================================
 * ⚡ CORPS DE LA CARTE (ULTIMATE V4.9)
 * ==========================================
 */
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
      <ha-card style="height:${c.card_height || 550}px;">
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
    
    let pctVal;
    if (c.solar_pct_entity) {
        pctVal = parseFloat(this._getVal(c.solar_pct_entity).val) || 0;
    } else {
        pctVal = (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100;
    }
    const progress = Math.min(100, pctVal);

    return html`
      <div class="page">
        <div class="header-prod-compact">
            <div class="big-val-slim">${prod.val}<small>W</small></div>
            <div class="target-row-slim">
                <div class="target-bar-slim"><div class="target-fill" style="width:${progress}%"></div></div>
                <span class="pct-val">${progress.toFixed(0)}%</span>
            </div>
            <div class="obj-label">OBJ: ${target.val}kWh</div>
        </div>

        <div class="cockpit-slim">
          <div class="side">${[4, 5, 6].map(i => this._renderDiag(i, 'l'))}</div>
          <div class="side">${[7, 8, 9].map(i => this._renderDiag(i, 'r'))}</div>
        </div>

        <div class="hud-orbit-row-slim">
          ${[1, 2, 3, 4].map(i => {
            const val = this._getVal(c[`p${i}_w`]);
            if (!c[`p${i}_w`]) return '';
            const color = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"][i-1];
            return html`
              <div class="hud-orbit-slim">
                <div class="orbit-circle-slim" style="border-color: ${color}99;">
                  <span class="orbit-val-slim">${Math.round(val.val)}</span>
                </div>
                <div class="orbit-label-slim">${c[`p${i}_name`] || 'P'+i}</div>
              </div>`;
          })}
        </div>
      </div>`;
  }

  _renderWeather() {
    const c = this.config;
    const sun = this.hass.states['sun.sun'];
    const weather = this._getVal(c.weather_entity);
    const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '--:--';

    return html`
      <div class="page scroll">
        <div class="weather-compact">
            <div class="ws-top-slim">
                <div class="ws-temp-slim">${this._getVal(c.temp_ext).val}°</div>
                <ha-icon icon="${weather.attr?.forecast ? 'mdi:weather-partly-cloudy' : 'mdi:weather-sunny'}"></ha-icon>
            </div>
            <div class="sun-grid-slim">
                <div class="sg-item"><ha-icon icon="mdi:angle-acute"></ha-icon> ELEV: <b>${sun?.attributes.elevation.toFixed(1)}°</b></div>
                <div class="sg-item"><ha-icon icon="mdi:compass-outline"></ha-icon> AZIM: <b>${sun?.attributes.azimuth.toFixed(1)}°</b></div>
                <div class="sg-item"><ha-icon icon="mdi:water-percent"></ha-icon> HUM: <b>${this._getVal(c.hum_ext).val}%</b></div>
            </div>
            <div class="astro-slim">
                <span>↑ ${formatTime(sun?.attributes.next_rising)}</span>
                <span>↓ ${formatTime(sun?.attributes.next_setting)}</span>
            </div>
        </div>

        <div class="weather-grid-slim">
            ${[1,2,3,4,5,6,7,8].map(i => {
                if(!c[`w${i}_e`]) return '';
                const e = this._getVal(c[`w${i}_e`]);
                return html`<div class="w-card-slim"><span>${c[`w${i}_l`]}</span><b>${e.val}<small>${e.unit}</small></b></div>`;
            })}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`<div class="page scroll">
      ${[1,2,3,4].map(i => {
        if (!c[`b${i}_s`]) return '';
        const soc = this._getVal(c[`b${i}_s`]);
        const out = this._getVal(c[`b${i}_out`]);
        return html`
          <div class="rack-slim">
            <div class="r-head-slim"><span>${c[`b${i}_n`] || 'B'+i}</span><b>${soc.val}%</b></div>
            <div class="r-progress-slim"><div class="r-fill" style="width:${soc.val}%; background:${soc.val < 15 ? '#f44336' : '#00c853'}"></div></div>
            <div class="r-foot-slim">${this._getVal(c[`b${i}_cap`]).val} • <span style="color:#ffc107">${out.val}${out.unit}</span></div>
          </div>`;
      })}
    </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`<div class="page scroll">
      <div class="eco-slim-header">
          <div class="eco-main-val">${this._getVal(c.eco_money).val}€</div>
          <div class="eco-sub-vals">JOUR: <b>${this._getVal(c.eco_day_euro).val}€</b> • AN: <b>${this._getVal(c.eco_year_euro).val}€</b></div>
      </div>
      
      <div class="cons-slim">
          <ha-icon icon="mdi:home-lightning-bolt"></ha-icon>
          <span>CONSO MAISON: <b>${this._getVal(c.main_cons).val} W</b></span>
      </div>

      <div class="eco-grid-slim">
        ${[1,2,3,4,5,6].map(i => {
            if(!c[`e${i}_e`]) return '';
            const e = this._getVal(c[`e${i}_e`]);
            return html`
              <div class="eco-tile-slim">
                <span class="i-l">${c[`e${i}_l`]}</span>
                <span class="i-v">${e.val}<small>${e.unit}</small></span>
              </div>`;
        })}
      </div>
    </div>`;
  }

  _renderDiag(i, side) {
    const c = this.config;
    if (!c[`d${i}_entity`]) return html``;
    const d = this._getVal(c[`d${i}_entity`]);
    return html`<div class="diag-slim ${side}"><span>${c[`d${i}_label`]}</span><b>${d.val}<small>${d.unit}</small></b></div>`;
  }

  static styles = css`
    ha-card { background:#000; color:#fff; border-radius:20px; overflow:hidden; font-family: 'Inter', sans-serif; position:relative; }
    .bg-layer { position:absolute; top:0; left:0; width:100%; height:100%; background-size:cover; opacity:0.08; z-index:0; }
    .overlay { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; padding:12px; background:rgba(0,0,0,0.85); box-sizing:border-box; }
    
    /* Solar Slim */
    .header-prod-compact { text-align:center; margin-bottom:10px; }
    .big-val-slim { font-size:50px; font-weight:900; color:#ffc107; line-height:1; }
    .target-row-slim { display:flex; align-items:center; justify-content:center; gap:10px; margin: 5px 0; }
    .target-bar-slim { width:120px; height:4px; background:#1a1a1a; border-radius:2px; overflow:hidden; }
    .target-fill { height:100%; background:#ffc107; }
    .pct-val { font-size:12px; color:#00e676; font-weight:bold; }
    .obj-label { font-size:9px; color:#666; }

    .cockpit-slim { display:flex; justify-content:space-between; margin:10px 0; gap:5px; }
    .diag-slim { flex:1; background:rgba(255,255,255,0.03); padding:6px 10px; border-radius:6px; border-left:2px solid #00f9f9; }
    .diag-slim.r { border-left:none; border-right:2px solid #ffc107; text-align:right; }
    .diag-slim span { font-size:8px; color:#888; display:block; text-transform:uppercase; }
    .diag-slim b { font-size:12px; }

    .hud-orbit-row-slim { display:flex; justify-content:space-around; margin-top:10px; }
    .orbit-circle-slim { width:45px; height:45px; border-radius:50%; border:1.5px solid; display:flex; align-items:center; justify-content:center; }
    .orbit-val-slim { font-size:14px; font-weight:bold; }
    .orbit-label-slim { font-size:8px; color:#888; margin-top:4px; text-align:center; }

    /* Météo Slim */
    .weather-compact { background:rgba(255,255,255,0.04); border:1px solid #222; padding:12px; border-radius:15px; margin-bottom:10px; }
    .ws-top-slim { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .ws-temp-slim { font-size:32px; font-weight:900; }
    .ws-top-slim ha-icon { --mdc-icon-size:30px; color:#ffc107; }
    .sun-grid-slim { display:grid; grid-template-columns: 1fr 1fr; gap:5px; margin-bottom:8px; }
    .sg-item { font-size:9px; color:#aaa; display:flex; align-items:center; gap:4px; }
    .sg-item ha-icon { --mdc-icon-size:12px; color:#00f9f9; }
    .astro-slim { display:flex; justify-content:space-between; font-size:9px; color:#666; border-top:1px solid #222; padding-top:6px; }

    .weather-grid-slim { display:grid; grid-template-columns: 1fr 1fr; gap:6px; }
    .w-card-slim { background:rgba(255,255,255,0.02); padding:8px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; }
    .w-card-slim span { font-size:8px; color:#777; }
    .w-card-slim b { font-size:11px; }

    /* Racks Slim */
    .rack-slim { background:rgba(255,255,255,0.03); padding:10px; border-radius:10px; margin-bottom:6px; border-left:3px solid #ffc107; }
    .r-head-slim { display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; }
    .r-progress-slim { height:5px; background:#111; border-radius:3px; overflow:hidden; margin-bottom:4px; }
    .r-foot-slim { font-size:9px; color:#666; }

    /* Économie Slim */
    .eco-slim-header { text-align:center; padding:10px; background:rgba(76,175,80,0.05); border-radius:12px; margin-bottom:10px; }
    .eco-main-val { font-size:32px; font-weight:900; color:#4caf50; }
    .eco-sub-vals { font-size:9px; color:#888; }
    .cons-slim { background:#0a0a0a; padding:8px; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:10px; font-size:10px; border:1px solid #1a1a1a; }
    .cons-slim ha-icon { --mdc-icon-size:16px; color:#4caf50; }
    .eco-grid-slim { display:grid; grid-template-columns: 1fr 1fr; gap:6px; }
    .eco-tile-slim { background:rgba(255,255,255,0.02); padding:8px; border-radius:8px; display:flex; justify-content:space-between; }
    .i-l { font-size:8px; color:#666; }
    .i-v { font-size:11px; font-weight:bold; color:#4caf50; }

    /* Global */
    .footer { display:flex; justify-content:space-around; padding-top:10px; border-top: 1px solid #222; margin-top:auto; }
    .f-btn { cursor:pointer; opacity:0.3; transition:0.2s; color:#fff; }
    .f-btn.active { opacity:1; color:#ffc107; }
    .f-btn ha-icon { --mdc-icon-size:22px; }
    .scroll { overflow-y:auto; padding-right:4px; }
    .scroll::-webkit-scrollbar { width:2px; }
    .scroll::-webkit-scrollbar-thumb { background:#333; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
