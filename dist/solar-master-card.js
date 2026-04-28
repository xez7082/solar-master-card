import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE LA CARTE (V6.0 OMNI)
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
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "solar_target", label: "Objectif Jour (kWh)", selector: { entity: {} } },
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
        { name: "weather_entity", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
        { name: "temp_ext", label: "Température Ext.", selector: { entity: {} } },
        { name: "hum_ext", label: "Humidité Ext.", selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => [
           { name: `w${i}_l`, label: `Label Météo ${i}`, selector: { text: {} } },
           { name: `w${i}_e`, label: `Entité Météo ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [
        { name: "batt_total_power", label: "Puissance Totale (W)", selector: { entity: {} } },
        { name: "batt_avg_soc", label: "SOC Moyen (%)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
          { name: `b${i}_cap`, label: `Capacité ${i}`, selector: { entity: {} } },
          { name: `b${i}_out`, label: `Sortie Watts ${i}`, selector: { entity: {} } }
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
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>PRODUCTION</button>
        <button class="${this._selectedTab === 'tab_weather' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_weather'}>METEO</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIE</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>FINANCE</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs { display: flex; gap: 4px; margin-bottom: 15px; } button { flex: 1; padding: 12px; font-size: 11px; cursor: pointer; background: #111; color: #555; border: 1px solid #333; border-radius: 8px; font-weight: bold; } button.active { background: #ffc107; color: #000; border-color: #ffc107; }`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CORPS DE LA CARTE (V6.0 OMNI)
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

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    return html`
      <ha-card style="height:${c.card_height || 700}px;">
        <div class="glass-container">
          <div class="content-area">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : 
              this._tab === 'METEO' ? this._renderWeather() :
              this._tab === 'BATTERIE' ? this._renderBattery() : this._renderEco()}
          </div>
          
          <div class="navbar">
            <div class="nav-item ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}><ha-icon icon="mdi:solar-power-variant"></ha-icon><span>SYSTEM</span></div>
            <div class="nav-item ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}><ha-icon icon="mdi:weather-dust"></ha-icon><span>METEO</span></div>
            <div class="nav-item ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}><ha-icon icon="mdi:battery-high"></ha-icon><span>ENERGY</span></div>
            <div class="nav-item ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}><ha-icon icon="mdi:finance"></ha-icon><span>ECO</span></div>
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
      <div class="view">
        <div class="master-gauge">
            <svg viewBox="0 0 100 60">
                <path class="gauge-bg" d="M 10 50 A 40 40 0 0 1 90 50" fill="none" />
                <path class="gauge-fill" d="M 10 50 A 40 40 0 0 1 90 50" fill="none" 
                      stroke-dasharray="125.6" stroke-dashoffset="${125.6 - (progress * 1.256)}" />
            </svg>
            <div class="gauge-data">
                <div class="g-val">${prod.val}</div>
                <div class="g-unit">WATTS</div>
            </div>
        </div>

        <div class="target-section">
            <div class="target-label">OBJECTIF JOURNALIER : <b>${target.val} kWh</b></div>
            <div class="ruler-container">
                <div class="ruler-marks">${Array(11).fill().map(() => html`<span></span>`)}</div>
                <div class="ruler-bar"><div class="ruler-fill" style="width:${progress}%"></div></div>
            </div>
            <div class="target-pct">${progress.toFixed(1)}% COMPLETÉ</div>
        </div>

        <div class="orbits-row">
            ${[1, 2, 3, 4].map(i => {
                if(!c[`p${i}_w`]) return '';
                const v = this._getVal(c[`p${i}_w`]);
                const colors = ["#ffc107", "#00f9f9", "#4caf50", "#f44336"];
                return html`
                <div class="orbit-box">
                    <div class="orbit-circle" style="border-color:${colors[i-1]}">
                        <div class="o-val">${Math.round(v.val)}</div>
                        <div class="o-u">W</div>
                    </div>
                    <div class="o-label">${c[`p${i}_name`] || 'P'+i}</div>
                </div>`;
            })}
        </div>

        <div class="info-grid">
            ${[4, 5, 6, 7, 8, 9].map(i => {
                if(!c[`d${i}_entity`]) return '';
                const d = this._getVal(c[`d${i}_entity`]);
                return html`<div class="info-tile"><span>${c[`d${i}_label`]}</span><b>${d.val}<small>${d.unit}</small></b></div>`;
            })}
        </div>
      </div>`;
  }

  _renderWeather() {
    const c = this.config;
    const temp = this._getVal(c.temp_ext);
    const hum = this._getVal(c.hum_ext);
    const sun = this.hass.states['sun.sun'];
    return html`
      <div class="view scroll">
        <div class="weather-hero">
            <div class="temp-big">${temp.val}°</div>
            <div class="hum-ring">
                <svg viewBox="0 0 36 36"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#333" stroke-width="2"/><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#00f9f9" stroke-width="2" stroke-dasharray="${hum.val}, 100"/></svg>
                <span>${hum.val}%<br><small>HUMIDITÉ</small></span>
            </div>
        </div>
        <div class="sun-ruler">
            <div class="ruler-line">
                <div class="sun-pos" style="left:${((sun?.attributes.elevation + 90) / 180) * 100}%"><ha-icon icon="mdi:white-balance-sunny"></ha-icon></div>
            </div>
            <div class="sun-times">
                <span>↑ ${new Date(sun?.attributes.next_rising).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                <span>AZIMUT: ${sun?.attributes.azimuth.toFixed(1)}°</span>
                <span>↓ ${new Date(sun?.attributes.next_setting).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
        </div>
        <div class="weather-grid">
            ${[1,2,3,4,5,6,7,8].map(i => {
                if(!c[`w${i}_e`]) return '';
                const e = this._getVal(c[`w${i}_e`]);
                return html`<div class="w-item"><span>${c[`w${i}_l`]}</span><b>${e.val}${e.unit}</b></div>`;
            })}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    const avgSoc = this._getVal(c.batt_avg_soc);
    const totalP = this._getVal(c.batt_total_power);
    return html`
      <div class="view scroll">
        <div class="batt-dashboard">
            <div class="soc-master">
                <div class="soc-circle">
                    <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="none" stroke="#111" stroke-width="5" /><circle cx="50" cy="50" r="45" fill="none" stroke="#00c853" stroke-width="5" stroke-dasharray="282.7" stroke-dashoffset="${282.7 - (avgSoc.val * 2.82)}" /></svg>
                    <div class="soc-text">${avgSoc.val}%</div>
                </div>
                <div class="soc-label">RESERVE D'ÉNERGIE</div>
            </div>
            <div class="power-flow">
                <ha-icon icon="mdi:transmission-tower"></ha-icon>
                <div class="flow-val ${parseFloat(totalP.val) >= 0 ? 'out' : 'in'}">${totalP.val}W</div>
            </div>
        </div>
        <div class="rack-list">
            ${[1,2,3,4].map(i => {
                if(!c[`b${i}_s`]) return '';
                const s = this._getVal(c[`b${i}_s`]);
                const p = this._getVal(c[`b${i}_out`]);
                return html`
                <div class="rack-item">
                    <div class="ri-head"><span>${c[`b${i}_n`] || 'RACK '+i}</span><b>${s.val}%</b></div>
                    <div class="ri-bar"><div class="ri-fill" style="width:${s.val}%"></div></div>
                    <div class="ri-foot">CAPACITÉ: ${this._getVal(c[`b${i}_cap`]).val} • FLUX: ${p.val}W</div>
                </div>`;
            })}
        </div>
      </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`
      <div class="view scroll">
        <div class="finance-header">
            <div class="fh-main">
                <span class="fh-l">ÉCONOMIES TOTALES</span>
                <span class="fh-v">${this._getVal(c.eco_money).val}€</span>
            </div>
            <div class="fh-stats">
                <div class="fh-s-box">JOUR: <b>${this._getVal(c.eco_day_euro).val}€</b></div>
                <div class="fh-s-box">AN: <b>${this._getVal(c.eco_year_euro).val}€</b></div>
            </div>
        </div>

        <div class="conso-monitor">
            <div class="cm-head">CONSOMMATION MAISON</div>
            <div class="cm-gauge">
                <div class="cm-ruler">${Array(21).fill().map(() => html`<span></span>`)}</div>
                <div class="cm-val">${this._getVal(c.main_cons).val} <small>W</small></div>
            </div>
        </div>

        <div class="eco-grid">
            ${[1,2,3,4,5,6].map(i => {
                if(!c[`e${i}_e`]) return '';
                const e = this._getVal(c[`e${i}_e`]);
                return html`
                <div class="eco-tile">
                    <ha-icon icon="mdi:shield-check-outline"></ha-icon>
                    <div class="et-data">
                        <span class="et-l">${c[`e${i}_l`]}</span>
                        <span class="et-v">${e.val}<small>${e.unit}</small></span>
                    </div>
                </div>`;
            })}
        </div>
      </div>`;
  }

  static styles = css`
    ha-card { background: #000; border-radius: 24px; color: #fff; overflow: hidden; font-family: 'Segoe UI', Roboto, sans-serif; }
    .glass-container { height: 100%; display: flex; flex-direction: column; background: radial-gradient(circle at top right, #111, #000); }
    .content-area { flex: 1; padding: 20px; overflow: hidden; }
    .view { height: 100%; display: flex; flex-direction: column; }
    .scroll { overflow-y: auto; padding-right: 5px; }
    .scroll::-webkit-scrollbar { width: 4px; }
    .scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }

    /* MASTER GAUGE */
    .master-gauge { position: relative; width: 100%; height: 160px; margin-bottom: 20px; }
    .gauge-bg { stroke: #1a1a1a; stroke-width: 6; stroke-linecap: round; }
    .gauge-fill { stroke: #ffc107; stroke-width: 8; stroke-linecap: round; filter: drop-shadow(0 0 8px #ffc107); transition: 1s ease-out; }
    .gauge-data { position: absolute; bottom: 30px; width: 100%; text-align: center; }
    .g-val { font-size: 56px; font-weight: 900; color: #fff; line-height: 1; }
    .g-unit { font-size: 12px; color: #ffc107; font-weight: bold; letter-spacing: 4px; }

    /* RULER PROGRESS */
    .target-section { margin-bottom: 25px; }
    .target-label { font-size: 10px; color: #888; margin-bottom: 8px; letter-spacing: 1px; }
    .ruler-container { position: relative; height: 30px; display: flex; align-items: center; }
    .ruler-marks { position: absolute; width: 100%; display: flex; justify-content: space-between; height: 15px; }
    .ruler-marks span { width: 1px; height: 100%; background: #333; }
    .ruler-bar { width: 100%; height: 6px; background: #111; border-radius: 3px; border: 1px solid #222; }
    .ruler-fill { height: 100%; background: linear-gradient(90deg, #ffc107, #ff9800); box-shadow: 0 0 10px #ffc107; border-radius: 3px; }
    .target-pct { text-align: right; font-size: 10px; font-weight: bold; color: #00f9f9; margin-top: 5px; }

    /* ORBITS */
    .orbits-row { display: flex; justify-content: space-between; margin-bottom: 25px; }
    .orbit-box { text-align: center; }
    .orbit-circle { width: 60px; height: 60px; border-radius: 50%; border: 3px solid; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.03); margin-bottom: 8px; box-shadow: inset 0 0 10px rgba(0,0,0,0.5); }
    .o-val { font-size: 16px; font-weight: bold; }
    .o-u { font-size: 8px; color: #888; }
    .o-label { font-size: 9px; color: #aaa; font-weight: bold; text-transform: uppercase; }

    /* INFO TILES */
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .info-tile { background: #0a0a0a; padding: 10px; border-radius: 10px; border: 1px solid #1a1a1a; }
    .info-tile span { font-size: 8px; color: #666; display: block; text-transform: uppercase; }
    .info-tile b { font-size: 13px; color: #fff; }

    /* BATTERY & ECO */
    .batt-dashboard { display: flex; justify-content: space-between; align-items: center; background: #0a0a0a; padding: 15px; border-radius: 20px; border: 1px solid #1a1a1a; margin-bottom: 20px; }
    .soc-circle { width: 80px; height: 80px; position: relative; }
    .soc-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 20px; font-weight: bold; color: #00c853; }
    .power-flow { text-align: right; }
    .flow-val { font-size: 24px; font-weight: bold; }
    .flow-val.in { color: #00c853; }
    .flow-val.out { color: #ffc107; }

    .finance-header { background: linear-gradient(135deg, #0d1a0d, #000); padding: 20px; border-radius: 20px; border: 1px solid #1a331a; margin-bottom: 20px; }
    .fh-v { font-size: 42px; font-weight: 900; color: #4caf50; display: block; }
    .fh-stats { display: flex; gap: 15px; margin-top: 10px; font-size: 11px; }

    .conso-monitor { background: #0a0a0a; padding: 15px; border-radius: 15px; margin-bottom: 20px; border: 1px solid #1a1a1a; }
    .cm-gauge { position: relative; height: 40px; display: flex; align-items: center; justify-content: center; }
    .cm-ruler { position: absolute; width: 100%; display: flex; justify-content: space-between; }
    .cm-ruler span { width: 1px; height: 10px; background: #333; }
    .cm-val { font-size: 24px; font-weight: bold; color: #fff; z-index: 1; }

    /* NAVBAR */
    .navbar { height: 70px; background: #080808; border-top: 1px solid #1a1a1a; display: flex; justify-content: space-around; align-items: center; padding-bottom: 5px; }
    .nav-item { cursor: pointer; display: flex; flex-direction: column; align-items: center; color: #444; transition: 0.3s; }
    .nav-item.active { color: #ffc107; transform: translateY(-5px); }
    .nav-item ha-icon { --mdc-icon-size: 26px; }
    .nav-item span { font-size: 9px; font-weight: bold; margin-top: 4px; letter-spacing: 1px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
