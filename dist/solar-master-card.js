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
        { name: "background", label: "Image de fond (URL)", selector: { text: {} } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "p1_name", label: "Nom P1", selector: { text: {} } }, { name: "p1_w", label: "Watts P1", selector: { entity: {} } },
        { name: "p2_name", label: "Nom P2", selector: { text: {} } }, { name: "p2_w", label: "Watts P2", selector: { entity: {} } },
        { name: "p3_name", label: "Nom P3", selector: { text: {} } }, { name: "p3_w", label: "Watts P3", selector: { entity: {} } },
        { name: "p4_name", label: "Nom P4", selector: { text: {} } }, { name: "p4_w", label: "Watts P4", selector: { entity: {} } }
      ],
      config_batt: [
        { name: "b1_n", label: "Nom Bat 1", selector: { text: {} } }, { name: "b1_s", label: "SOC % Bat 1", selector: { entity: {} } },
        { name: "b2_n", label: "Nom Bat 2", selector: { text: {} } }, { name: "b2_s", label: "SOC % Bat 2", selector: { entity: {} } },
        { name: "b3_n", label: "Nom Bat 3", selector: { text: {} } }, { name: "b3_s", label: "SOC % Bat 3", selector: { entity: {} } },
        { name: "b4_n", label: "Nom Bat 4", selector: { text: {} } }, { name: "b4_s", label: "SOC % Bat 4", selector: { entity: {} } }
      ],
      config_stats: [
        { name: "main_cons_entity", label: "Consommation Maison (W)", selector: { entity: {} } },
        { name: "total_month", label: "Prod Mensuelle (kWh)", selector: { entity: {} } },
        { name: "total_year", label: "Prod Annuelle (kWh)", selector: { entity: {} } }
      ]
    };
    return html`
      <div class="tabs">
        ${Object.keys(schemas).map(t => html`<button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>${t.replace('config_', '').toUpperCase()}</button>`)}
      </div>
      <div class="editor-box">
        <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
      </div>
    `;
  }
  static styles = css`
    .tabs { display: flex; gap: 5px; margin-bottom: 10px; }
    button { background: #333; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; flex: 1; font-size: 10px; }
    button.active { background: #ffc107; color: black; font-weight: bold; }
    .editor-box { background: #222; padding: 10px; border-radius: 5px; }
  `;
}
if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- 2. CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'solar'; }
  setConfig(config) { this.config = config; }

  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }

  _renderCircularGauge(name, entityW, color) {
    if (!entityW || !this.hass.states[entityW]) return html``;
    const val = Math.round(parseFloat(this._get(entityW))) || 0;
    const radius = 35;
    const circ = 2 * Math.PI * radius;
    const pct = Math.min((val / 1200) * 100, 100);
    const offset = circ - (pct / 100) * circ;

    return html`
      <div class="gauge-container">
        <svg viewBox="0 0 100 100" class="gauge-svg">
          <circle class="gauge-bg" cx="50" cy="50" r="${radius}"></circle>
          <circle class="gauge-fill" cx="50" cy="50" r="${radius}" style="stroke-dasharray: ${circ}; stroke-dashoffset: ${offset}; stroke: ${color};"></circle>
          <text x="50" y="55" class="gauge-text">${val}<tspan y="68" x="50" class="gauge-unit">W</tspan></text>
        </svg>
        <div class="gauge-label">${name}</div>
      </div>`;
  }

  _renderSolar() {
    const c = this.config;
    const panels = [
        {n: c.p1_name, e: c.p1_w, c: "#ffc107"}, {n: c.p2_name, e: c.p2_w, c: "#00d4ff"},
        {n: c.p3_name, e: c.p3_w, c: "#4caf50"}, {n: c.p4_name, e: c.p4_w, c: "#e91e63"}
    ].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <div class="view-content">
        <div class="header-main">
            <div class="main-val">${this._get(c.total_now)}<small>W</small></div>
            <div class="main-label">PRODUCTION ACTUELLE</div>
        </div>
        <div class="gauges-grid grid-${panels.length}">
            ${panels.map(p => this._renderCircularGauge(p.n, p.e, p.c))}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    const batts = [1,2,3,4].filter(i => c[`b${i}_s`] && this.hass.states[c[`b${i}_s`]]);
    return html`
      <div class="view-content">
        <div class="header-main">BATTERIES</div>
        <div class="batt-list">
            ${batts.map(i => {
                const soc = parseInt(this._get(c[`b${i}_s`]));
                return html`
                <div class="batt-row">
                    <ha-icon icon="${soc > 10 ? 'mdi:battery-high' : 'mdi:battery-outline'}" style="color:${soc > 20 ? '#4caf50' : '#ff5252'}"></ha-icon>
                    <div class="batt-info">
                        <div class="batt-name">${c[`b${i}_n`] || 'Batterie'}</div>
                        <div class="batt-bar-bg"><div class="batt-bar" style="width:${soc}%; background:${soc > 20 ? '#4caf50' : '#ff5252'}"></div></div>
                    </div>
                    <div class="batt-val">${soc}%</div>
                </div>`;
            })}
        </div>
      </div>`;
  }

  _renderStats() {
    const c = this.config;
    return html`
      <div class="view-content">
        <div class="header-main">CONSOMMATION</div>
        <div class="conso-card">
            <ha-icon icon="mdi:transmission-tower" class="conso-icon"></ha-icon>
            <div class="conso-val">${this._get(c.main_cons_entity)} W</div>
        </div>
        <div class="stats-grid">
            <div class="stat-box"><span>MENSUEL</span>${this._get(c.total_month)} kWh</div>
            <div class="stat-box"><span>ANNUEL</span>${this._get(c.total_year)} kWh</div>
        </div>
      </div>`;
  }

  render() {
    return html`
      <ha-card style="height:500px; background-image:url('${this.config.background || ''}');">
        <div class="overlay">
            <div class="content">
                ${this._tab === 'solar' ? this._renderSolar() : this._tab === 'batt' ? this._renderBattery() : this._renderStats()}
            </div>
            <div class="nav">
                <ha-icon class="${this._tab==='solar'?'active':''}" icon="mdi:solar-power-variant" @click=${()=>this._tab='solar'}></ha-icon>
                <ha-icon class="${this._tab==='batt'?'active':''}" icon="mdi:battery-charging-100" @click=${()=>this._tab='batt'}></ha-icon>
                <ha-icon class="${this._tab==='stats'?'active':''}" icon="mdi:chart-timeline-variant" @click=${()=>this._tab='stats'}></ha-icon>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 25px; overflow: hidden; background-size: cover; color: white; }
    .overlay { height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(15px); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
    .content { flex: 1; }
    .header-main { text-align: center; font-size: 10px; letter-spacing: 2px; opacity: 0.6; margin-bottom: 20px; font-weight: bold; }
    .main-val { font-size: 48px; font-weight: 900; color: #ffc107; text-align: center; line-height: 1; }
    .main-val small { font-size: 16px; margin-left: 5px; opacity: 0.5; }
    .main-label { text-align: center; font-size: 9px; opacity: 0.4; letter-spacing: 1px; margin-top: 5px; }

    /* GRILLE SOLAIRE */
    .gauges-grid { display: grid; gap: 15px; margin-top: 30px; justify-items: center; }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .gauge-container { text-align: center; width: 100%; }
    .gauge-svg { width: 80px; height: 80px; }
    .gauge-bg { fill: none; stroke: rgba(255,255,255,0.1); stroke-width: 7; }
    .gauge-fill { fill: none; stroke-width: 7; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; transition: stroke-dashoffset 1s ease; }
    .gauge-text { fill: white; font-size: 20px; font-weight: 900; text-anchor: middle; }
    .gauge-unit { font-size: 9px; opacity: 0.4; font-weight: normal; }
    .gauge-label { font-size: 9px; font-weight: bold; margin-top: 5px; text-transform: uppercase; opacity: 0.7; }

    /* BATTERIES */
    .batt-list { display: flex; flex-direction: column; gap: 15px; margin-top: 10px; }
    .batt-row { display: flex; align-items: center; gap: 15px; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 15px; }
    .batt-info { flex: 1; }
    .batt-name { font-size: 11px; font-weight: bold; margin-bottom: 5px; }
    .batt-bar-bg { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
    .batt-bar { height: 100%; transition: width 1s ease; }
    .batt-val { font-size: 14px; font-weight: 900; width: 40px; text-align: right; }

    /* STATS / CONSO */
    .conso-card { background: rgba(255,193,7,0.1); border-radius: 25px; padding: 30px; text-align: center; border: 1px solid rgba(255,193,7,0.2); }
    .conso-icon { --mdc-icon-size: 40px; color: #ffc107; margin-bottom: 10px; }
    .conso-val { font-size: 36px; font-weight: 900; color: #ffc107; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px; }
    .stat-box { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; text-align: center; font-size: 14px; font-weight: bold; }
    .stat-box span { display: block; font-size: 8px; opacity: 0.5; margin-bottom: 5px; }

    .nav { display: flex; justify-content: space-around; padding: 20px 0 10px 0; border-top: 1px solid rgba(255,255,255,0.1); }
    .nav ha-icon { opacity: 0.3; cursor: pointer; --mdc-icon-size: 28px; }
    .nav ha-icon.active { opacity: 1; color: #ffc107; filter: drop-shadow(0 0 5px #ffc107); }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "solar-master-card", name: "Solar Master Energy Only", preview: true });
