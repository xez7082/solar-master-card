import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- 1. ÉDITEUR VISUEL ---
class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _selectedTab: { type: String } }; }
  constructor() { super(); this._selectedTab = 'config_solar'; }
  setConfig(config) { this._config = config; }
  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
  render() {
    if (!this.hass || !this._config) return html``;
    const schemas = {
      config_solar: [
        { name: "bg_solar", label: "Image Fond Solaire", selector: { text: {} } },
        { name: "overlay_opacity", label: "Sombre (0.1 à 1.0)", selector: { number: { min: 0, max: 1, step: 0.1, mode: "slider" } } },
        { name: "blur_amount", label: "Flou image (0=Net)", selector: { number: { min: 0, max: 20, step: 1, mode: "slider" } } },
        { name: "entity_ext_temp", label: "Temp Extérieure", selector: { entity: {} } },
        { name: "total_now", label: "Prod Totale (W)", selector: { entity: {} } },
        { name: "total_obj_kwh", label: "Objectif (kWh)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif (%)", selector: { entity: {} } },
        { name: "p1_name", label: "Nom P1", selector: { text: {} } }, { name: "p1_w", label: "Watts P1", selector: { entity: {} } },
        { name: "p2_name", label: "Nom P2", selector: { text: {} } }, { name: "p2_w", label: "Watts P2", selector: { entity: {} } },
        { name: "p3_name", label: "Nom P3", selector: { text: {} } }, { name: "p3_w", label: "Watts P3", selector: { entity: {} } },
        { name: "p4_name", label: "Nom P4", selector: { text: {} } }, { name: "p4_w", label: "Watts P4", selector: { entity: {} } }
      ],
      config_batt: [
        { name: "bg_batt", label: "Image Fond Batterie", selector: { text: {} } },
        ...[1,2,3,4].map(i => [
          { name: `b${i}_n`, label: `Nom Bat ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_temp`, label: `Temp Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_cap`, label: `Capacité Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_flow`, label: `Flux Bat ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      config_stats: [
        { name: "bg_stats", label: "Image Fond Économie", selector: { text: {} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } },
        { name: "eco_money", label: "Économies (€)", selector: { entity: {} } },
        { name: "total_day", label: "Prod Jour (kWh)", selector: { entity: {} } },
        { name: "total_month", label: "Prod Mois (kWh)", selector: { entity: {} } },
        { name: "total_year", label: "Prod An (kWh)", selector: { entity: {} } }
      ]
    };
    return html`<div class="tabs">${Object.keys(schemas).map(t => html`<button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>${t.replace('config_', '').toUpperCase()}</button>`)}</div><ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>`;
  }
}
if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- 2. CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'solar'; }
  setConfig(config) { this.config = config; }
  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }

  _renderFixedGauge(name, entityW, color) {
    if (!entityW || !this.hass.states[entityW]) return html``;
    const val = Math.round(parseFloat(this._get(entityW))) || 0;
    return html`
      <div class="panel-box">
        <div class="panel-circle" style="border-color: ${color}44;">
          <div class="panel-glow" style="background: ${color};"></div>
          <div class="panel-val">${val}</div>
          <div class="panel-unit">W</div>
        </div>
        <div class="panel-label">${name}</div>
      </div>`;
  }

  render() {
    if (!this.config) return html``;
    const c = this.config;
    const currentBg = this._tab === 'solar' ? c.bg_solar : (this._tab === 'batt' ? c.bg_batt : c.bg_stats);
    const opacity = c.overlay_opacity !== undefined ? c.overlay_opacity : 0.6;
    const blur = c.blur_amount !== undefined ? c.blur_amount : 0;
    
    const panels = [
        {n: c.p1_name, e: c.p1_w, c: "#ffc107"}, {n: c.p2_name, e: c.p2_w, c: "#00f9f9"},
        {n: c.p3_name, e: c.p3_w, c: "#4caf50"}, {n: c.p4_name, e: c.p4_w, c: "#e91e63"}
    ].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:600px; background: url('${currentBg || ''}') no-repeat center center / cover;">
        <div class="overlay" style="background: rgba(0,0,0,${opacity}); backdrop-filter: blur(${blur}px);">
            
            <div class="header-nav">
                <div class="h-item">
                    <ha-icon icon="mdi:thermometer"></ha-icon>
                    <span>${this._get(c.entity_ext_temp)}°C</span>
                </div>
                <div class="h-title">SOLAR SYSTEM</div>
                <div class="h-item eco">
                    <ha-icon icon="mdi:cash-multiple"></ha-icon>
                    <span>${this._get(c.eco_money)}€</span>
                </div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="main-display">
                        <div class="total-yield">
                            <span class="total-label">PRODUCTION ACTUELLE</span>
                            <span class="total-val">${this._get(c.total_now)}<small>W</small></span>
                            <div class="obj-mini-bar">
                                <div class="obj-fill" style="width:${this._get(c.total_obj_pct)}%"></div>
                                <span>OBJECTIF: ${this._get(c.total_obj_pct)}%</span>
                            </div>
                        </div>
                        <div class="panels-container grid-${panels.length}">
                            ${panels.map(p => this._renderFixedGauge(p.n, p.e, p.c))}
                        </div>
                    </div>` 
                
                : this._tab === 'batt' ? html`
                    <div class="batt-rack">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="rack-unit">
                                <div class="unit-led ${parseInt(this._get(c[`b${i}_s`])) < 20 ? 'red' : 'green'}"></div>
                                <div class="unit-name">${c[`b${i}_n`]}</div>
                                <div class="unit-bar"><div class="bar-fill" style="width:${this._get(c[`b${i}_s`])}%"></div></div>
                                <div class="unit-pct">${this._get(c[`b${i}_s`])}%</div>
                                <div class="unit-stats">
                                    <span>${this._get(c[`b${i}_temp`])}°</span>
                                    <span class="${parseFloat(this._get(c[`b${i}_flow`])) < 0 ? 'out' : 'in'}">${this._get(c[`b${i}_flow`])}W</span>
                                </div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="economy-view">
                        <div class="eco-hero">
                            <div class="eco-circle">
                                <span class="eco-label">ÉCONOMIES</span>
                                <span class="eco-val">${this._get(c.eco_money)}<small>€</small></span>
                            </div>
                        </div>
                        <div class="eco-stats-grid">
                            <div class="eco-card">
                                <ha-icon icon="mdi:calendar-today"></ha-icon>
                                <div class="eco-card-data"><span>JOUR</span><b>${this._get(c.total_day)} kWh</b></div>
                            </div>
                            <div class="eco-card">
                                <ha-icon icon="mdi:calendar-month"></ha-icon>
                                <div class="eco-card-data"><span>MOIS</span><b>${this._get(c.total_month)} kWh</b></div>
                            </div>
                            <div class="eco-card">
                                <ha-icon icon="mdi:calendar-check"></ha-icon>
                                <div class="eco-card-data"><span>ANNEE</span><b>${this._get(c.total_year)} kWh</b></div>
                            </div>
                            <div class="eco-card">
                                <ha-icon icon="mdi:home-lightning-bolt"></ha-icon>
                                <div class="eco-card-data"><span>CONSO</span><b>${this._get(c.main_cons_entity)} W</b></div>
                            </div>
                        </div>
                    </div>`}
            </div>

            <div class="nav-bar">
                <div class="nav-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}>
                    <ha-icon icon="mdi:solar-power-variant"></ha-icon>
                </div>
                <div class="nav-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}>
                    <ha-icon icon="mdi:battery-high"></ha-icon>
                </div>
                <div class="nav-btn ${this._tab==='stats'?'active':''}" @click=${()=>this._tab='stats'}>
                    <ha-icon icon="mdi:finance"></ha-icon>
                </div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 25px; overflow: hidden; color: #fff; font-family: 'Roboto', sans-serif; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; }
    
    /* HEADER */
    .header-nav { display: flex; justify-content: space-between; align-items: center; padding: 10px; background: rgba(0,0,0,0.4); border-radius: 15px; margin-bottom: 15px; }
    .h-title { font-weight: 900; letter-spacing: 2px; font-size: 12px; opacity: 0.6; }
    .h-item { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: bold; }
    .h-item.eco { color: #4caf50; }

    /* SOLAR PAGE FIXED */
    .main-display { display: flex; flex-direction: column; height: 100%; }
    .total-yield { text-align: center; padding: 15px; background: rgba(0,0,0,0.3); border-radius: 20px; margin-bottom: 20px; }
    .total-val { display: block; font-size: 48px; font-weight: 900; color: #ffc107; line-height: 1; }
    .total-val small { font-size: 16px; margin-left: 4px; }
    .total-label { font-size: 10px; opacity: 0.5; font-weight: bold; letter-spacing: 1px; }
    .obj-mini-bar { margin-top: 10px; height: 14px; background: rgba(255,255,255,0.1); border-radius: 7px; overflow: hidden; position: relative; }
    .obj-fill { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; transition: width 1s ease; }
    .obj-mini-bar span { position: absolute; width: 100%; left: 0; top: 0; font-size: 9px; font-weight: 900; color: #fff; line-height: 14px; text-shadow: 1px 1px 2px #000; }

    .panels-container { display: grid; gap: 15px; flex: 1; align-content: center; justify-items: center; }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-2 { grid-template-columns: 1fr 1fr; }

    .panel-box { display: flex; flex-direction: column; align-items: center; }
    .panel-circle { width: 90px; height: 90px; border-radius: 50%; border: 4px solid; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; background: rgba(0,0,0,0.5); }
    .panel-glow { position: absolute; width: 100%; height: 100%; border-radius: 50%; filter: blur(15px); opacity: 0.2; }
    .panel-val { font-size: 22px; font-weight: 900; }
    .panel-unit { font-size: 9px; opacity: 0.5; }
    .panel-label { font-size: 9px; font-weight: bold; margin-top: 8px; opacity: 0.8; }

    /* RACK BATTERY */
    .rack-unit { background: rgba(0,0,0,0.6); padding: 12px; border-radius: 12px; display: grid; grid-template-columns: 15px 1fr 40px; align-items: center; gap: 10px; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.1); }
    .unit-led { width: 8px; height: 8px; border-radius: 50%; }
    .unit-led.green { background: #4caf50; box-shadow: 0 0 5px #4caf50; }
    .unit-led.red { background: #f44336; box-shadow: 0 0 5px #f44336; animation: blink 1s infinite; }
    .unit-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; background: #4caf50; }
    .unit-pct { font-size: 14px; font-weight: bold; text-align: right; }
    .unit-stats { grid-column: span 3; display: flex; justify-content: space-between; font-size: 10px; opacity: 0.6; padding-top: 5px; border-top: 1px solid rgba(255,255,255,0.05); }
    .in { color: #00f9f9; } .out { color: #ff5252; }

    /* ECONOMY VIEW */
    .eco-hero { display: flex; justify-content: center; margin-bottom: 25px; }
    .eco-circle { width: 140px; height: 140px; border-radius: 50%; border: 8px solid #4caf50; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); box-shadow: 0 0 20px rgba(76,175,80,0.2); }
    .eco-val { font-size: 36px; font-weight: 900; color: #4caf50; }
    .eco-label { font-size: 10px; opacity: 0.6; font-weight: bold; }
    .eco-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .eco-card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; display: flex; align-items: center; gap: 10px; border: 1px solid rgba(255,255,255,0.1); }
    .eco-card ha-icon { color: #ffc107; }
    .eco-card-data { display: flex; flex-direction: column; }
    .eco-card-data span { font-size: 9px; opacity: 0.5; }
    .eco-card-data b { font-size: 14px; }

    /* NAV BAR */
    .nav-bar { display: flex; justify-content: space-around; background: rgba(0,0,0,0.6); padding: 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); }
    .nav-btn { opacity: 0.3; cursor: pointer; transition: 0.3s; }
    .nav-btn.active { opacity: 1; color: #ffc107; transform: scale(1.2); }
    
    @keyframes blink { 50% { opacity: 0.2; } }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
