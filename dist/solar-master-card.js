import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE LA CARTE (V5.0)
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
 * ⚡ CORPS DE LA CARTE (ULTIMATE V5.0)
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
    
    let pctVal;
    if (c.solar_pct_entity) {
        pctVal = parseFloat(this._getVal(c.solar_pct_entity).val) || 0;
    } else {
        pctVal = (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100;
    }
    const progress = Math.min(100, pctVal);

    return html`
      <div class="page">
        <div class="header-prod">
            <div class="big-val-titan">${prod.val}<small>W</small></div>
            <div class="target-container">
                <div class="target-bar"><div class="target-fill" style="width:${progress}%"></div></div>
                <div class="target-row">
                    <span>OBJECTIF: <b>${target.val} kWh</b></span>
                    <span class="pct-val">${progress.toFixed(1)}%</span>
                </div>
            </div>
        </div>

        <div class="cockpit">
          <div class="side">${[4, 5, 6].map(i => this._renderDiag(i, 'l'))}</div>
          <div class="center-spacer"></div>
          <div class="side">${[7, 8, 9].map(i => this._renderDiag(i, 'r'))}</div>
        </div>

        <div class="hud-orbit-row">
          ${[1, 2, 3, 4].map(i => {
            const val = this._getVal(c[`p${i}_w`]);
            if (!c[`p${i}_w`]) return '';
            const color = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"][i-1];
            return html`
              <div class="hud-orbit">
                <div class="orbit-circle" style="border-color: ${color}bb;">
                  <div class="orbit-value">${Math.round(val.val)}</div>
                  <div class="orbit-unit">W</div>
                </div>
                <div class="orbit-label">${c[`p${i}_name`] || 'P'+i}</div>
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
        <div class="weather-station-v3">
            <div class="ws-header">
                <div class="ws-temp">${this._getVal(c.temp_ext).val}<small>°C</small></div>
                <div class="ws-icon-box">
                    <ha-icon icon="${weather.attr?.forecast ? 'mdi:weather-partly-cloudy' : 'mdi:weather-sunny'}"></ha-icon>
                    <div class="ws-desc">${this._translateWeather(weather.val)}</div>
                </div>
            </div>

            <div class="sun-dashboard">
                <div class="sun-stat">
                    <ha-icon icon="mdi:angle-acute"></ha-icon>
                    <div class="stat-content">
                        <span>ÉLÉVATION</span>
                        <b>${sun?.attributes.elevation.toFixed(1)}°</b>
                    </div>
                </div>
                <div class="sun-stat">
                    <ha-icon icon="mdi:compass-outline"></ha-icon>
                    <div class="stat-content">
                        <span>AZIMUT</span>
                        <b>${sun?.attributes.azimuth.toFixed(1)}°</b>
                    </div>
                </div>
            </div>

            <div class="astro-footer">
                <div>LEVER: <b>${formatTime(sun?.attributes.next_rising)}</b></div>
                <div>HUMIDITÉ: <b>${this._getVal(c.hum_ext).val}%</b></div>
                <div>COUCHER: <b>${formatTime(sun?.attributes.next_setting)}</b></div>
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
    return html`<div class="page scroll">
      <div class="section-title">STOCKAGE ÉNERGIE</div>
      ${[1,2,3,4].map(i => {
        if (!c[`b${i}_s`]) return '';
        const soc = this._getVal(c[`b${i}_s`]);
        const out = this._getVal(c[`b${i}_out`]);
        return html`
          <div class="rack-v5">
            <div class="r-head"><span>${c[`b${i}_n`] || 'RACK '+i}</span><b>${soc.val}%</b></div>
            <div class="r-progress"><div class="r-fill" style="width:${soc.val}%; background:${soc.val < 15 ? '#f44336' : '#00c853'}"></div></div>
            <div class="r-foot">CAPACITÉ: <b>${this._getVal(c[`b${i}_cap`]).val}</b> • FLUX: <b style="color:#ffc107">${out.val}${out.unit}</b></div>
          </div>`;
      })}
    </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`<div class="page scroll">
      <div class="eco-header-slim">
          <div class="eco-money-main">${this._getVal(c.eco_money).val}€ <small>TOTAUX</small></div>
          <div class="eco-split">
             <div class="split-box">JOUR: <b>${this._getVal(c.eco_day_euro).val}€</b></div>
             <div class="split-box">AN: <b>${this._getVal(c.eco_year_euro).val}€</b></div>
          </div>
      </div>

      <div class="cons-bar-slim">
          <span class="c-label">CONSO MAISON</span>
          <span class="c-val">${this._getVal(c.main_cons).val} <b>W</b></span>
      </div>

      <div class="eco-list-compact">
        ${[1,2,3,4,5,6].map(i => {
            if(!c[`e${i}_e`]) return '';
            const e = this._getVal(c[`e${i}_e`]);
            return html`
              <div class="eco-row-item">
                <span class="item-label">${c[`e${i}_l`]}</span>
                <span class="item-value">${e.val}<small>${e.unit}</small></span>
              </div>`;
        })}
      </div>
    </div>`;
  }

  _renderDiag(i, side) {
    const c = this.config;
    if (!c[`d${i}_entity`]) return html`<div class="mini-diag empty"></div>`;
    const d = this._getVal(c[`d${i}_entity`]);
    return html`<div class="mini-diag ${side}"><span class="m-l">${c[`d${i}_label`]}</span><span class="m-v">${d.val}<small>${d.unit}</small></span></div>`;
  }

  static styles = css`
    ha-card { background:#000; color:#fff; border-radius:28px; overflow:hidden; font-family: 'Inter', sans-serif; position:relative; }
    .bg-layer { position:absolute; top:0; left:0; width:100%; height:100%; background-size:cover; opacity:0.1; z-index:0; }
    .overlay { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; padding:20px; background:rgba(0,0,0,0.85); box-sizing:border-box; }
    
    /* Solar HUD (Rétabli) */
    .header-prod { text-align:center; margin-bottom:15px; }
    .big-val-titan { font-size:55px; font-weight:900; color:#ffc107; line-height:1; }
    .target-container { width:100%; max-width:280px; margin:10px auto; }
    .target-bar { height:6px; background:#1a1a1a; border-radius:3px; overflow:hidden; border:1px solid #333; }
    .target-fill { height:100%; background:#ffc107; box-shadow: 0 0 10px rgba(255,193,7,0.4); }
    .target-row { display:flex; justify-content:space-between; font-size:10px; margin-top:5px; color:#aaa; font-weight:bold; }
    .pct-val { color:#00e676; }
    .hud-orbit-row { display:flex; justify-content:space-around; margin-top:15px; }
    .orbit-circle { width:75px; height:75px; border-radius:50%; border:2px solid; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(255,255,255,0.03); }
    .orbit-value { font-size:18px; font-weight:bold; }
    .orbit-label { font-size:9px; color:#aaa; margin-top:8px; font-weight:bold; text-transform:uppercase; }

    /* Météo Station V3 (Rétabli) */
    .weather-station-v3 { background:rgba(255,255,255,0.04); border:1px solid #333; padding:20px; border-radius:20px; margin-bottom:15px; }
    .ws-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; }
    .ws-temp { font-size:25px; font-weight:900; }
    .sun-dashboard { display:grid; grid-template-columns: 1fr 1fr; gap:10px; padding:15px; background:rgba(0,249,249,0.05); border-radius:15px; margin-bottom:15px; border:1px solid rgba(0,249,249,0.1); }
    .sun-stat { display:flex; align-items:center; gap:12px; }
    .sun-stat ha-icon { color:#00f9f9; --mdc-icon-size:24px; }
    .stat-content b { font-size:16px; color:#fff; }
    .weather-grid-8 { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .w-card { background:rgba(255,255,255,0.03); padding:12px; border-radius:10px; border:1px solid #222; }
    .w-v { font-size:14px; font-weight:bold; color:#00f9f9; }

    /* ÉCONOMIE REDUITE (V5.0 Nouveauté) */
    .eco-header-slim { background:rgba(76,175,80,0.1); padding:15px; border-radius:16px; text-align:center; margin-bottom:15px; border:1px solid rgba(76,175,80,0.2); }
    .eco-money-main { font-size:38px; font-weight:900; color:#4caf50; }
    .eco-money-main small { font-size:10px; color:#aaa; letter-spacing:1px; }
    .eco-split { display:flex; justify-content:center; gap:20px; margin-top:5px; font-size:11px; }
    .split-box b { color:#4caf50; }

    .cons-bar-slim { display:flex; justify-content:space-between; background:#111; padding:10px 15px; border-radius:10px; margin-bottom:15px; border:1px solid #222; }
    .c-label { font-size:10px; color:#888; font-weight:bold; }
    .c-val { font-size:14px; font-weight:bold; color:#fff; }
    .c-val b { color:#4caf50; }

    .eco-list-compact { display:flex; flex-direction:column; gap:6px; }
    .eco-row-item { display:flex; justify-content:space-between; background:rgba(255,255,255,0.02); padding:10px 15px; border-radius:8px; align-items:center; border:1px solid #1a1a1a; }
    .item-label { font-size:10px; color:#aaa; text-transform:uppercase; font-weight:bold; }
    .item-value { font-size:14px; font-weight:bold; color:#4caf50; }
    .item-value small { font-size:9px; margin-left:3px; color:#888; }

    /* Racks & Cockpit */
    .rack-v5 { background:rgba(255,255,255,0.03); border:1px solid #222; padding:15px; border-radius:12px; margin-bottom:10px; border-left:4px solid #ffc107; }
    .cockpit { display:flex; justify-content:space-between; margin:15px 0; }
    .mini-diag { background:rgba(255,255,255,0.04); padding:10px; border-radius:8px; width:100px; border-left:3px solid #00f9f9; }
    .mini-diag.r { border-left:none; border-right:3px solid #ffc107; text-align:right; }
    .m-v { font-size:14px; font-weight:bold; }
    
    .footer { display:flex; justify-content:space-around; padding-top:20px; border-top:1px solid #222; margin-top:auto; }
    .f-btn { cursor:pointer; opacity:0.3; transition:0.3s; color:#fff; }
    .f-btn.active { opacity:1; color:#ffc107; transform:translateY(-2px); }
    .f-btn ha-icon { --mdc-icon-size:26px; }
    .scroll { overflow-y:auto; }
    .scroll::-webkit-scrollbar { width:3px; }
    .scroll::-webkit-scrollbar-thumb { background:#444; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
