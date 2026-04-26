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
        { name: "card_height", label: "Hauteur de la carte (px)", selector: { number: { min: 400, max: 1000, step: 10 } } },
        { name: "bg_solar", label: "Image Fond Solaire", selector: { text: {} } },
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
  static styles = css`.tabs{display:flex;gap:5px;margin-bottom:10px}button{background:#333;color:#fff;border:none;padding:8px;border-radius:4px;cursor:pointer;flex:1;font-size:10px}button.active{background:#ffc107;color:#000;font-weight:700}`;
}
if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- 2. CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'solar'; }
  setConfig(config) { this.config = config; }
  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }

  _renderPanel(name, entityW, color) {
    if (!entityW || !this.hass.states[entityW]) return html``;
    const val = Math.round(parseFloat(this._get(entityW))) || 0;
    return html`
      <div class="glass-card panel">
        <div class="panel-glow" style="background:${color}"></div>
        <div class="panel-info">
          <span class="p-val" style="color:${color}">${val}<small>W</small></span>
          <span class="p-name">${name}</span>
        </div>
      </div>`;
  }

  render() {
    if (!this.config) return html``;
    const c = this.config;
    const h = c.card_height || 600;
    const currentBg = this._tab === 'solar' ? c.bg_solar : (this._tab === 'batt' ? c.bg_batt : c.bg_stats);
    
    const panels = [
        {n: c.p1_name, e: c.p1_w, c: "#ffc107"}, {n: c.p2_name, e: c.p2_w, c: "#00f9f9"},
        {n: c.p3_name, e: c.p3_w, c: "#4caf50"}, {n: c.p4_name, e: c.p4_w, c: "#e91e63"}
    ].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:${h}px; background: url('${currentBg || ''}') no-repeat center center / cover;">
        <div class="overlay" style="background: rgba(0,0,0,${c.overlay_opacity || 0.6}); backdrop-filter: blur(${c.blur_amount || 0}px);">
            
            <div class="top-nav">
                <div class="t-badge"><ha-icon icon="mdi:thermometer"></ha-icon> ${this._get(c.entity_ext_temp)}°</div>
                <div class="t-title">${this._tab.toUpperCase()}</div>
                <div class="t-badge green"><ha-icon icon="mdi:currency-eur"></ha-icon> ${this._get(c.eco_money)}</div>
            </div>

            <div class="main-content">
                ${this._tab === 'solar' ? html`
                    <div class="yield-box">
                        <div class="y-val">${this._get(c.total_now)}<small>W</small></div>
                        <div class="y-obj">PROD. ACTUELLE • OBJ. ${this._get(c.total_obj_pct)}%</div>
                    </div>
                    <div class="panels-grid">
                        ${panels.map(p => this._renderPanel(p.n, p.e, p.c))}
                    </div>` 
                
                : this._tab === 'batt' ? html`
                    <div class="cyber-batt-list">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="cell-card">
                                <div class="cell-main">
                                    <div class="cell-icon-wrap">
                                        <ha-icon icon="mdi:shield-flash" class="${parseInt(this._get(c[`b${i}_s`])) < 20 ? 'alert' : ''}"></ha-icon>
                                        <div class="cell-name">${c[`b${i}_n`] || 'PACK '+i}</div>
                                    </div>
                                    <div class="cell-soc">${this._get(c[`b${i}_s`])}%</div>
                                </div>
                                <div class="cell-progress">
                                    <div class="cell-fill" style="width:${this._get(c[`b${i}_s`])}%"></div>
                                </div>
                                <div class="cell-data">
                                    <div class="d-item"><ha-icon icon="mdi:thermometer"></ha-icon>${this._get(c[`b${i}_temp`])}°</div>
                                    <div class="d-item"><ha-icon icon="mdi:database"></ha-icon>${this._get(c[`b${i}_cap`])}</div>
                                    <div class="d-item ${parseFloat(this._get(c[`b${i}_flow`])) < 0 ? 'neg' : 'pos'}">
                                        ${this._get(c[`b${i}_flow`])}W
                                    </div>
                                </div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="stats-screen">
                        <div class="conso-card">
                            <div class="c-val">${this._get(c.main_cons_entity)}<small>W</small></div>
                            <div class="c-label">CONSOMMATION MAISON</div>
                        </div>
                        <div class="stats-tiles">
                            <div class="tile"><span>JOUR</span><b>${this._get(c.total_day)}</b><small>kWh</small></div>
                            <div class="tile"><span>MOIS</span><b>${this._get(c.total_month)}</b><small>kWh</small></div>
                            <div class="tile full"><span>ANNÉE</span><b>${this._get(c.total_year)}</b><small>kWh</small></div>
                        </div>
                    </div>`}
            </div>

            <div class="bottom-nav">
                <div class="n-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}><ha-icon icon="mdi:solar-power-variant"></ha-icon></div>
                <div class="n-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}><ha-icon icon="mdi:battery-charging-100"></ha-icon></div>
                <div class="n-btn ${this._tab==='stats'?'active':''}" @click=${()=>this._tab='stats'}><ha-icon icon="mdi:chart-timeline-variant"></ha-icon></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 24px; overflow: hidden; color: #fff; font-family: 'Inter', system-ui; border: 1px solid rgba(255,255,255,0.1); }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 16px; box-sizing: border-box; }
    
    /* NAV */
    .top-nav { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .t-title { font-size: 10px; font-weight: 900; letter-spacing: 2px; opacity: 0.5; }
    .t-badge { background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 8px; font-size: 12px; font-weight: bold; display: flex; align-items: center; gap: 5px; }
    .t-badge.green { color: #4caf50; border: 1px solid rgba(76,175,80,0.3); }

    .main-content { flex: 1; overflow-y: auto; }

    /* SOLAR PAGE */
    .yield-box { text-align: center; margin-bottom: 25px; padding: 20px; background: rgba(255,255,255,0.03); border-radius: 20px; }
    .y-val { font-size: 56px; font-weight: 900; color: #ffc107; line-height: 1; }
    .y-obj { font-size: 10px; font-weight: bold; opacity: 0.6; margin-top: 10px; letter-spacing: 1px; }
    .panels-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .glass-card { background: rgba(0,0,0,0.5); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.15); position: relative; overflow: hidden; }
    .panel-glow { position: absolute; top: -50%; left: -50%; width: 100%; height: 100%; filter: blur(40px); opacity: 0.15; }
    .panel-info { position: relative; z-index: 1; display: flex; flex-direction: column; }
    .p-val { font-size: 20px; font-weight: 900; }
    .p-name { font-size: 9px; font-weight: bold; opacity: 0.5; text-transform: uppercase; margin-top: 4px; }

    /* BATTERY CYBER-CELL */
    .cyber-batt-list { display: flex; flex-direction: column; gap: 10px; }
    .cell-card { background: rgba(0,0,0,0.6); padding: 14px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); }
    .cell-main { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .cell-icon-wrap { display: flex; align-items: center; gap: 10px; }
    .cell-name { font-size: 11px; font-weight: 900; opacity: 0.7; }
    .cell-soc { font-size: 22px; font-weight: 900; color: #4caf50; }
    .cell-progress { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; margin-bottom: 12px; }
    .cell-fill { height: 100%; background: linear-gradient(90deg, #4caf50, #81c784); box-shadow: 0 0 10px #4caf50; }
    .cell-data { display: flex; justify-content: space-between; font-size: 11px; font-weight: bold; opacity: 0.8; }
    .d-item { display: flex; align-items: center; gap: 4px; }
    .pos { color: #00f9f9; } .neg { color: #ff5252; }
    .alert { color: #ff5252; animation: blink 1s infinite; }

    /* STATS */
    .conso-card { background: rgba(255,193,7,0.1); padding: 25px; border-radius: 20px; text-align: center; margin-bottom: 15px; border: 1px solid rgba(255,193,7,0.2); }
    .c-val { font-size: 42px; font-weight: 900; color: #ffc107; }
    .c-label { font-size: 10px; font-weight: bold; opacity: 0.6; }
    .stats-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .tile { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; text-align: center; }
    .tile.full { grid-column: span 2; }
    .tile span { display: block; font-size: 9px; opacity: 0.5; margin-bottom: 5px; }

    /* BOTTOM NAV */
    .bottom-nav { display: flex; justify-content: space-around; background: rgba(0,0,0,0.8); padding: 12px; border-radius: 18px; margin-top: 15px; border: 1px solid rgba(255,255,255,0.1); }
    .n-btn { opacity: 0.3; cursor: pointer; transition: 0.3s; }
    .n-btn.active { opacity: 1; color: #ffc107; transform: translateY(-2px); }

    @keyframes blink { 50% { opacity: 0.2; } }
    .main-content::-webkit-scrollbar { width: 0; }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
