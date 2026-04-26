import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- 1. ÉDITEUR VISUEL COMPLET ---
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
        { name: "entity_ext_temp", label: "Température Extérieure", selector: { entity: {} } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "total_obj", label: "Objectif Jour (kWh)", selector: { entity: {} } },
        { name: "p1_name", label: "Nom P1", selector: { text: {} } }, { name: "p1_w", label: "Watts P1", selector: { entity: {} } },
        { name: "p2_name", label: "Nom P2", selector: { text: {} } }, { name: "p2_w", label: "Watts P2", selector: { entity: {} } },
        { name: "p3_name", label: "Nom P3", selector: { text: {} } }, { name: "p3_w", label: "Watts P3", selector: { entity: {} } },
        { name: "p4_name", label: "Nom P4", selector: { text: {} } }, { name: "p4_w", label: "Watts P4", selector: { entity: {} } }
      ],
      config_batt: [
        { name: "b1_n", label: "Nom Bat 1", selector: { text: {} } }, { name: "b1_s", label: "SOC % Bat 1", selector: { entity: {} } },
        { name: "b2_n", label: "Nom Bat 2", selector: { text: {} } }, { name: "b2_s", label: "SOC % Bat 2", selector: { entity: {} } },
        { name: "b3_n", label: "Nom Bat 3", selector: { text: {} } }, { name: "b3_s", label: "SOC % Bat 3", selector: { entity: {} } }
      ],
      config_stats: [
        { name: "main_cons_entity", label: "Consommation Maison (W)", selector: { entity: {} } },
        { name: "eco_money", label: "Économies Totales (€)", selector: { entity: {} } },
        { name: "total_day", label: "Prod Jour (kWh)", selector: { entity: {} } },
        { name: "total_month", label: "Prod Mois (kWh)", selector: { entity: {} } },
        { name: "total_year", label: "Prod An (kWh)", selector: { entity: {} } }
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
                <span class="hud-val" style="color: ${color}; text-shadow: 0 0 10px ${color}66;">${val}</span>
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
      <ha-card style="height:540px; background-image:url('${c.background || ''}');">
        <div class="overlay">
            <div class="global-header">
                <div class="chip-temp"><ha-icon icon="mdi:thermometer"></ha-icon> ${this._get(c.entity_ext_temp)}°C</div>
                <div class="main-title">${this._tab.toUpperCase()}</div>
                <div class="chip-eco">${this._get(c.eco_money)} €</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="solar-hero">
                        <div class="hero-val">${this._get(c.total_now)}<small>W</small></div>
                        <div class="hero-sub">OBJECTIF : ${this._get(c.total_obj)} kWh</div>
                    </div>
                    <div class="gauges-grid grid-${panels.length}">
                        ${panels.map(p => this._renderAnimatedGauge(p.n, p.e, p.c))}
                    </div>` 
                
                : this._tab === 'batt' ? html`
                    <div class="batt-container">
                        <div class="header-small">STOCKAGE ÉNERGIE</div>
                        ${[1,2,3].map(i => c[`b${i}_s`] ? html`
                            <div class="batt-card">
                                <ha-icon icon="mdi:battery-charging" class="${parseInt(this._get(c[`b${i}_s`])) < 20 ? 'blink' : ''}"></ha-icon>
                                <div class="batt-body">
                                    <div class="batt-header"><span>${c[`b${i}_n`]}</span> <b>${this._get(c[`b${i}_s`])}%</b></div>
                                    <div class="progress-bg"><div class="progress-fill" style="width:${this._get(c[`b${i}_s`])}%;"></div></div>
                                </div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="stats-view">
                        <div class="conso-box">
                            <div class="label">CONSO MAISON</div>
                            <div class="val">${this._get(c.main_cons_entity)}<small>W</small></div>
                        </div>
                        <div class="stats-grid">
                            <div class="s-card"><span>AUJOURD'HUI</span>${this._get(c.total_day)}<small>kWh</small></div>
                            <div class="s-card"><span>CE MOIS</span>${this._get(c.total_month)}<small>kWh</small></div>
                            <div class="s-card"><span>CETTE ANNÉE</span>${this._get(c.total_year)}<small>kWh</small></div>
                        </div>
                    </div>`}
            </div>

            <div class="nav">
                <ha-icon class="${this._tab==='solar'?'active':''}" icon="mdi:solar-power-variant" @click=${()=>this._tab='solar'}></ha-icon>
                <ha-icon class="${this._tab==='batt'?'active':''}" icon="mdi:battery-high" @click=${()=>this._tab='batt'}></ha-icon>
                <ha-icon class="${this._tab==='stats'?'active':''}" icon="mdi:chart-bar" @click=${()=>this._tab='stats'}></ha-icon>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 30px; overflow: hidden; background-size: cover; background-position: center; color: #fff; font-family: 'Segoe UI', Roboto, sans-serif; }
    .overlay { height: 100%; background: rgba(0,0,0,0.85); backdrop-filter: blur(25px); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
    .content { flex: 1; margin-top: 10px; }

    /* HEADER */
    .global-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 15px; }
    .main-title { font-size: 10px; letter-spacing: 3px; font-weight: 900; opacity: 0.5; }
    .chip-temp, .chip-eco { background: rgba(255,255,255,0.08); padding: 5px 12px; border-radius: 15px; font-size: 12px; font-weight: bold; color: #ffc107; }
    .chip-eco { color: #4caf50; }

    /* SOLAR & HUD GAUGE */
    .solar-hero { text-align: center; margin-bottom: 20px; }
    .hero-val { font-size: 56px; font-weight: 900; color: #ffc107; line-height: 1; }
    .hero-val small { font-size: 18px; opacity: 0.5; margin-left: 5px; }
    .hero-sub { font-size: 10px; opacity: 0.4; letter-spacing: 1px; margin-top: 5px; }
    
    .gauges-grid { display: grid; gap: 15px; justify-items: center; }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    
    .center-gauge { position: relative; width: 105px; height: 105px; display: flex; align-items: center; justify-content: center; }
    .outer-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid transparent; animation: rotate 5s linear infinite; opacity: 0.6; }
    .inner-circle { width: 85px; height: 85px; background: rgba(255,255,255,0.03); border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .hud-val { font-size: 26px; font-weight: 100; }
    .unit-label { font-size: 7px; opacity: 0.4; margin-top: 2px; }
    .gauge-label { font-size: 9px; font-weight: 700; opacity: 0.7; text-transform: uppercase; margin-top: 8px; text-align: center; }

    /* BATTERIES */
    .batt-card { background: rgba(255,255,255,0.05); border-radius: 18px; padding: 15px; display: flex; align-items: center; gap: 15px; margin-bottom: 12px; border: 1px solid rgba(255,255,255,0.05); }
    .batt-body { flex: 1; }
    .batt-header { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
    .progress-bg { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
    .progress-fill { height: 100%; background: linear-gradient(90deg, #4caf50, #81c784); border-radius: 3px; transition: width 1s ease; }

    /* STATS */
    .conso-box { text-align: center; padding: 25px; background: rgba(255,193,7,0.05); border-radius: 25px; margin-bottom: 20px; border: 1px solid rgba(255,193,7,0.1); }
    .conso-box .val { font-size: 46px; font-weight: 900; color: #ffc107; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .s-card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 20px; text-align: center; font-size: 16px; font-weight: 900; }
    .s-card:first-child { grid-column: span 2; background: rgba(255,255,255,0.08); }
    .s-card span { display: block; font-size: 8px; opacity: 0.5; margin-bottom: 5px; letter-spacing: 1px; }

    /* NAV */
    .nav { display: flex; justify-content: space-around; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); }
    .nav ha-icon { opacity: 0.2; cursor: pointer; --mdc-icon-size: 28px; transition: 0.3s; }
    .nav ha-icon.active { opacity: 1; color: #ffc107; }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .blink { animation: blink-anim 1s infinite; color: #ff5252; }
    @keyframes blink-anim { 50% { opacity: 0.3; } }
  `;
}

// --- 3. ENREGISTREMENT ---
if (!customElements.get("solar-master-card")) {
  customElements.define("solar-master-card", SolarMasterCard);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master Ultra",
  preview: true
});
