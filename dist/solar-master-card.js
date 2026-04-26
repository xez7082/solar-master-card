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
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 400, max: 1000, step: 10 } } },
        { name: "bg_solar", label: "Fond Solaire", selector: { text: {} } },
        { name: "overlay_opacity", label: "Sombre (0.1 à 1.0)", selector: { number: { min: 0, max: 1, step: 0.1, mode: "slider" } } },
        { name: "blur_amount", label: "Flou image (0=Net)", selector: { number: { min: 0, max: 20, step: 1, mode: "slider" } } },
        { name: "entity_ext_temp", label: "Temp Extérieure", selector: { entity: {} } },
        { name: "total_now", label: "Prod Totale (W)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif (%)", selector: { entity: {} } },
        { name: "p1_name", label: "Nom P1", selector: { text: {} } }, { name: "p1_w", label: "Watts P1", selector: { entity: {} } },
        { name: "p2_name", label: "Nom P2", selector: { text: {} } }, { name: "p2_w", label: "Watts P2", selector: { entity: {} } },
        { name: "p3_name", label: "Nom P3", selector: { text: {} } }, { name: "p3_w", label: "Watts P3", selector: { entity: {} } },
        { name: "p4_name", label: "Nom P4", selector: { text: {} } }, { name: "p4_w", label: "Watts P4", selector: { entity: {} } }
      ],
      config_batt: [
        { name: "bg_batt", label: "Fond Batterie", selector: { text: {} } },
        ...[1,2,3,4].map(i => [
          { name: `b${i}_n`, label: `Nom Bat ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_temp`, label: `Temp Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_cap`, label: `Capacité Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_flow`, label: `Flux Bat ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      config_stats: [
        { name: "bg_stats", label: "Fond Économie", selector: { text: {} } },
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

  _renderCirclePanel(name, entityW, color) {
    if (!entityW || !this.hass.states[entityW]) return html``;
    const val = Math.round(parseFloat(this._get(entityW))) || 0;
    return html`
      <div class="hud-box">
        <div class="hud-circle" style="border-color: ${color}44;">
          <div class="hud-scan-ring" style="border-top-color: ${color};"></div>
          <span class="hud-val" style="color: ${color}">${val}</span>
          <span class="hud-unit">WATTS</span>
        </div>
        <div class="hud-label">${name}</div>
      </div>`;
  }

  _renderRackBattery(i) {
    const c = this.config;
    if (!c[`b${i}_s`] || !this.hass.states[c[`b${i}_s`]]) return html``;
    const soc = parseInt(this._get(c[`b${i}_s`]));
    const flow = parseFloat(this._get(c[`b${i}_flow`]));
    return html`
      <div class="rack-module">
        <div class="rack-header">
            <div class="led ${soc < 20 ? 'red' : flow > 5 ? 'cyan' : 'green'}"></div>
            <span class="rack-name">${c[`b${i}_n`] || 'UNIT-'+i}</span>
            <span class="rack-soc">${soc}%</span>
        </div>
        <div class="rack-vumeter">
            ${[...Array(10)].map((_, idx) => html`<div class="v-seg ${soc > (idx * 10) ? 'on' : ''}"></div>`)}
        </div>
        <div class="rack-footer">
            <span>${this._get(c[`b${i}_temp`])}°C</span>
            <span class="${flow < 0 ? 'neg' : 'pos'}">${Math.abs(flow)}W</span>
            <span>${this._get(c[`b${i}_cap`])}</span>
        </div>
      </div>`;
  }

  render() {
    if (!this.config) return html``;
    const c = this.config;
    const h = c.card_height || 600;
    const currentBg = this._tab === 'solar' ? c.bg_solar : (this._tab === 'batt' ? c.bg_batt : c.bg_stats);
    
    const panels = [{n: c.p1_name, e: c.p1_w, c: "#ffc107"}, {n: c.p2_name, e: c.p2_w, c: "#00f9f9"}, {n: c.p3_name, e: c.p3_w, c: "#4caf50"}, {n: c.p4_name, e: c.p4_w, c: "#e91e63"}].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:${h}px; background: url('${currentBg || ''}') no-repeat center center / cover;">
        <div class="overlay" style="background: rgba(0,0,0,${c.overlay_opacity || 0.6}); backdrop-filter: blur(${c.blur_amount || 0}px);">
            
            <div class="top-nav">
                <div class="t-badge"><ha-icon icon="mdi:thermometer"></ha-icon> ${this._get(c.entity_ext_temp)}°</div>
                <div class="t-badge green"><ha-icon icon="mdi:currency-eur"></ha-icon> ${this._get(c.eco_money)}</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="solar-main">
                        <div class="total-yield-hub">
                            <div class="total-v">${this._get(c.total_now)}<small>W</small></div>
                            <div class="total-l">PRODUCTION TOTALE</div>
                            <div class="obj-bar-wrap"><div class="obj-fill" style="width:${this._get(c.total_obj_pct)}%"></div></div>
                        </div>
                        <div class="panels-grid grid-${panels.length}">
                            ${panels.map(p => this._renderCirclePanel(p.n, p.e, p.c))}
                        </div>
                    </div>` 
                
                : this._tab === 'batt' ? html`
                    <div class="batt-rack-view">
                        ${[1,2,3,4].map(i => this._renderRackBattery(i))}
                    </div>`

                : html`
                    <div class="economy-view">
                        <div class="eco-circle-container">
                            <div class="eco-circle-big">
                                <span class="eco-lbl">ÉCONOMIES</span>
                                <span class="eco-val">${this._get(c.eco_money)}<small>€</small></span>
                                <div class="eco-ring-pulse"></div>
                            </div>
                        </div>
                        <div class="eco-grid">
                            <div class="eco-tile"><span>JOUR</span><b>${this._get(c.total_day)}</b><small>kWh</small></div>
                            <div class="eco-tile"><span>MOIS</span><b>${this._get(c.total_month)}</b><small>kWh</small></div>
                            <div class="eco-tile"><span>ANNÉE</span><b>${this._get(c.total_year)}</b><small>kWh</small></div>
                            <div class="eco-tile"><span>CONSO</span><b>${this._get(c.main_cons_entity)}</b><small>W</small></div>
                        </div>
                    </div>`}
            </div>

            <div class="nav-footer">
                <div class="n-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}><ha-icon icon="mdi:solar-power-variant"></ha-icon></div>
                <div class="n-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}><ha-icon icon="mdi:battery-high"></ha-icon></div>
                <div class="n-btn ${this._tab==='stats'?'active':''}" @click=${()=>this._tab='stats'}><ha-icon icon="mdi:finance"></ha-icon></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 28px; overflow: hidden; color: #fff; font-family: 'Segoe UI', system-ui; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; }
    
    .top-nav { display: flex; justify-content: space-between; margin-bottom: 15px; }
    .t-badge { background: rgba(0,0,0,0.4); padding: 5px 12px; border-radius: 10px; font-size: 12px; font-weight: bold; border: 1px solid rgba(255,255,255,0.1); }
    .t-badge.green { color: #4caf50; }

    .content { flex: 1; overflow-y: auto; }

    /* PANNEAUX : CERCLES HUD */
    .total-yield-hub { text-align: center; margin-bottom: 25px; }
    .total-v { font-size: 54px; font-weight: 900; color: #ffc107; line-height: 1; }
    .total-l { font-size: 10px; opacity: 0.5; font-weight: bold; margin: 8px 0; }
    .obj-bar-wrap { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; width: 60%; margin: 0 auto; overflow: hidden; }
    .obj-fill { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; }

    .panels-grid { display: grid; gap: 15px; justify-items: center; }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .hud-box { display: flex; flex-direction: column; align-items: center; }
    .hud-circle { width: 95px; height: 95px; border-radius: 50%; border: 2px solid; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; background: rgba(0,0,0,0.4); }
    .hud-scan-ring { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 4s linear infinite; }
    .hud-val { font-size: 24px; font-weight: 900; }
    .hud-unit { font-size: 8px; opacity: 0.5; }
    .hud-label { font-size: 10px; font-weight: bold; margin-top: 8px; text-transform: uppercase; opacity: 0.8; }

    /* BATTERIES : RACK TECHNIQUE */
    .batt-rack-view { display: flex; flex-direction: column; gap: 10px; }
    .rack-module { background: rgba(0,0,0,0.6); padding: 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); }
    .rack-header { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .led { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 5px currentColor; }
    .led.green { color: #4caf50; background: #4caf50; }
    .led.cyan { color: #00f9f9; background: #00f9f9; animation: pulse 1s infinite; }
    .led.red { color: #ff5252; background: #ff5252; animation: pulse 0.5s infinite; }
    .rack-name { font-size: 11px; font-weight: 900; flex: 1; opacity: 0.7; }
    .rack-soc { font-size: 18px; font-weight: 900; color: #4caf50; }
    .rack-vumeter { display: flex; gap: 3px; height: 8px; margin: 10px 0; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.05); border-radius: 1px; }
    .v-seg.on { background: #4caf50; box-shadow: 0 0 4px #4caf50; }
    .rack-footer { display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; opacity: 0.6; }
    .pos { color: #00f9f9; } .neg { color: #ff5252; }

    /* ECONOMIE : ECO-CIRCLE */
    .eco-circle-container { display: flex; justify-content: center; margin-bottom: 25px; }
    .eco-circle-big { width: 150px; height: 150px; border-radius: 50%; border: 6px solid #4caf50; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; box-shadow: 0 0 20px rgba(76,175,80,0.3); }
    .eco-ring-pulse { position: absolute; width: 100%; height: 100%; border: 2px solid #4caf50; border-radius: 50%; animation: ping 2s infinite; opacity: 0.2; }
    .eco-val { font-size: 42px; font-weight: 900; color: #4caf50; line-height: 1; }
    .eco-lbl { font-size: 10px; font-weight: bold; opacity: 0.6; margin-bottom: 5px; }
    .eco-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .eco-tile { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
    .eco-tile span { display: block; font-size: 9px; opacity: 0.5; margin-bottom: 4px; }
    .eco-tile b { font-size: 15px; }

    /* NAV */
    .nav-footer { display: flex; justify-content: space-around; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); margin-top: 10px; }
    .n-btn { opacity: 0.3; cursor: pointer; transition: 0.3s; }
    .n-btn.active { opacity: 1; color: #ffc107; transform: scale(1.1); }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes pulse { 50% { opacity: 0.3; } }
    @keyframes ping { 70%, 100% { transform: scale(1.3); opacity: 0; } }
    .content::-webkit-scrollbar { width: 0; }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
