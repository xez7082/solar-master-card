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
        { name: "entity_ext_temp", label: "Température Extérieure", selector: { entity: {} } },
        { name: "p1_name", label: "Nom P1", selector: { text: {} } }, { name: "p1_w", label: "Watts P1", selector: { entity: {} } },
        { name: "p2_name", label: "Nom P2", selector: { text: {} } }, { name: "p2_w", label: "Watts P2", selector: { entity: {} } },
        { name: "p3_name", label: "Nom P3", selector: { text: {} } }, { name: "p3_w", label: "Watts P3", selector: { entity: {} } },
        { name: "p4_name", label: "Nom P4", selector: { text: {} } }, { name: "p4_w", label: "Watts P4", selector: { entity: {} } }
      ],
      config_batt: [
        { name: "b1_n", label: "Nom Bat 1", selector: { text: {} } }, { name: "b1_s", label: "SOC % Bat 1", selector: { entity: {} } },
        { name: "b2_n", label: "Nom Bat 2", selector: { text: {} } }, { name: "b2_s", label: "SOC % Bat 2", selector: { entity: {} } }
      ],
      config_stats: [
        { name: "main_cons_entity", label: "Consommation Maison (W)", selector: { entity: {} } },
        { name: "eco_money", label: "Économies (€)", selector: { entity: {} } },
        { name: "total_month", label: "Prod Mensuelle (kWh)", selector: { entity: {} } },
        { name: "total_year", label: "Prod Annuelle (kWh)", selector: { entity: {} } }
      ]
    };
    return html`
      <div class="tabs">
        ${Object.keys(schemas).map(t => html`<button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>${t.replace('config_', '').toUpperCase()}</button>`)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
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

  _renderAnimatedGauge(name, entityW, color) {
    if (!entityW || !this.hass.states[entityW]) return html``;
    const val = Math.round(parseFloat(this._get(entityW))) || 0;
    return html`
      <div class="gauge-wrapper">
        <div class="center-gauge">
            <div class="outer-ring" style="border-top-color: ${color}; border-bottom-color: ${color};"></div>
            <div class="inner-circle">
                <span class="water-val" style="color: ${color}; text-shadow: 0 0 10px ${color}66;">${val}</span>
                <span class="unit-label">WATTS</span>
            </div>
        </div>
        <div class="gauge-label">${name}</div>
      </div>`;
  }

  render() {
    if (!this.config) return html``;
    const c = this.config;
    const panels = [
        {n: c.p1_name, e: c.p1_w, c: "#ffc107"}, {n: c.p2_name, e: c.p2_w, c: "#00f9f9"},
        {n: c.p3_name, e: c.p3_w, c: "#4caf50"}, {n: c.p4_name, e: c.p4_w, c: "#e91e63"}
    ].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:520px; background-image:url('${c.background || ''}');">
        <div class="overlay">
            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="top-row">
                        <div class="chip"><ha-icon icon="mdi:thermometer"></ha-icon> ${this._get(c.entity_ext_temp)}°C</div>
                        <div class="main-prod">${this._get(c.total_now)}<small>W</small></div>
                    </div>
                    <div class="gauges-grid grid-${panels.length}">
                        ${panels.map(p => this._renderAnimatedGauge(p.n, p.e, p.c))}
                    </div>` 
                : this._tab === 'batt' ? html`
                    <div class="header-small">ÉNERGIE STOCKÉE</div>
                    ${[1,2].map(i => c[`b${i}_s`] ? html`
                        <div class="batt-row">
                            <ha-icon icon="mdi:battery-charging" class="${parseInt(this._get(c[`b${i}_s`])) < 20 ? 'blink' : ''}"></ha-icon>
                            <div class="batt-info">
                                <div class="batt-name">${c[`b${i}_n`]}</div>
                                <div class="batt-bar-bg"><div class="batt-bar" style="width:${this._get(c[`b${i}_s`])}%; background:#4caf50"></div></div>
                            </div>
                            <div class="batt-val">${this._get(c[`b${i}_s`])}%</div>
                        </div>` : '')}`
                : html`
                    <div class="conso-hero">
                        <div class="conso-label">CONSO MAISON</div>
                        <div class="conso-val">${this._get(c.main_cons_entity)}<small>W</small></div>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-card green"><span>ÉCONOMIES</span>${this._get(c.eco_money)} €</div>
                        <div class="stat-card"><span>MOIS</span>${this._get(c.total_month)}<small>kWh</small></div>
                        <div class="stat-card"><span>ANNÉE</span>${this._get(c.total_year)}<small>kWh</small></div>
                    </div>`}
            </div>
            <div class="nav">
                <ha-icon class="${this._tab==='solar'?'active':''}" icon="mdi:solar-power-variant" @click=${()=>this._tab='solar'}></ha-icon>
                <ha-icon class="${this._tab==='batt'?'active':''}" icon="mdi:battery-high" @click=${()=>this._tab='batt'}></ha-icon>
                <ha-icon class="${this._tab==='stats'?'active':''}" icon="mdi:lightning-bolt" @click=${()=>this._tab='stats'}></ha-icon>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 28px; overflow: hidden; background-size: cover; color: #fff; font-family: sans-serif; }
    .overlay { height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(25px); display: flex; flex-direction: column; padding: 25px; box-sizing: border-box; }
    .content { flex: 1; }
    .gauge-wrapper { display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .center-gauge { position: relative; width: 110px; height: 110px; display: flex; align-items: center; justify-content: center; }
    .outer-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid transparent; animation: rotate 5s linear infinite; opacity: 0.6; }
    .inner-circle { width: 90px; height: 90px; background: rgba(255,255,255,0.03); border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .water-val { font-size: 28px; font-weight: 100; line-height: 1; }
    .unit-label { font-size: 8px; opacity: 0.4; letter-spacing: 1px; }
    .gauge-label { font-size: 10px; font-weight: 700; opacity: 0.7; text-transform: uppercase; margin-top:5px; }
    .top-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .chip { background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 20px; font-size: 12px; }
    .main-prod { font-size: 42px; font-weight: 900; color: #ffc107; line-height: 1; }
    .gauges-grid { display: grid; gap: 15px; justify-items: center; }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .batt-row { background: rgba(255,255,255,0.04); padding: 15px; border-radius: 20px; display: flex; align-items: center; gap: 15px; margin-bottom: 10px; }
    .batt-info { flex: 1; }
    .batt-bar-bg { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; margin-top: 6px; }
    .batt-bar { height: 100%; border-radius: 3px; }
    .conso-hero { text-align: center; padding: 25px; background: rgba(255,255,255,0.03); border-radius: 25px; margin-bottom: 20px; }
    .conso-val { font-size: 42px; font-weight: 900; color: #ffc107; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stat-card { background: rgba(255,255,255,0.06); padding: 15px; border-radius: 20px; text-align: center; font-size: 18px; font-weight: 900; }
    .stat-card.green { grid-column: span 2; color: #4caf50; background: rgba(76,175,80,0.1); }
    .stat-card span { display: block; font-size: 9px; opacity: 0.5; margin-bottom: 4px; }
    .nav { display: flex; justify-content: space-around; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); }
    .nav ha-icon { opacity: 0.2; cursor: pointer; --mdc-icon-size: 30px; }
    .nav ha-icon.active { opacity: 1; color: #ffc107; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .blink { animation: blink-anim 1s infinite; color: #ff5252; }
    @keyframes blink-anim { 50% { opacity: 0.3; } }
  `;
}

// --- 3. ENREGISTREMENT CRITIQUE ---
if (!customElements.get("solar-master-card")) {
  customElements.define("solar-master-card", SolarMasterCard);
}

window.customCards = window.customCards || [];
window.customCards = window.customCards.filter(c => c.type !== "solar-master-card");
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master HUD",
  preview: true,
  description: "Carte solaire animée style HUD futuriste"
});
