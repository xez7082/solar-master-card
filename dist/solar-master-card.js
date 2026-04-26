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
        { name: "bg_solar", label: "Fond Onglet Solaire (URL)", selector: { text: {} } },
        { name: "entity_ext_temp", label: "Température Extérieure", selector: { entity: {} } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "total_obj_kwh", label: "Objectif Jour (kWh)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif Jour (%)", selector: { entity: {} } },
        { name: "p1_name", label: "Nom P1", selector: { text: {} } }, { name: "p1_w", label: "Watts P1", selector: { entity: {} } },
        { name: "p2_name", label: "Nom P2", selector: { text: {} } }, { name: "p2_w", label: "Watts P2", selector: { entity: {} } },
        { name: "p3_name", label: "Nom P3", selector: { text: {} } }, { name: "p3_w", label: "Watts P3", selector: { entity: {} } }
      ],
      config_batt: [
        { name: "bg_batt", label: "Fond Onglet Batterie (URL)", selector: { text: {} } },
        { name: "b1_n", label: "Nom Bat 1", selector: { text: {} } }, 
        { name: "b1_s", label: "SOC %", selector: { entity: {} } },
        { name: "b1_temp", label: "Température Bat", selector: { entity: {} } },
        { name: "b1_cap", label: "Capacité (Ah/kWh)", selector: { entity: {} } },
        { name: "b1_flow", label: "Flux Charge/Décharge (W)", selector: { entity: {} } }
      ],
      config_stats: [
        { name: "bg_stats", label: "Fond Onglet Économie (URL)", selector: { text: {} } },
        { name: "main_cons_entity", label: "Consommation Maison (W)", selector: { entity: {} } },
        { name: "eco_money", label: "Économies (€)", selector: { entity: {} } },
        { name: "total_day", label: "Prod Jour (kWh)", selector: { entity: {} } },
        { name: "total_month", label: "Prod Mois (kWh)", selector: { entity: {} } }
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
    
    // Gestion du fond dynamique
    const currentBg = this._tab === 'solar' ? c.bg_solar : (this._tab === 'batt' ? c.bg_batt : c.bg_stats);
    
    const panels = [
        {n: c.p1_name, e: c.p1_w, c: "#ffc107"}, {n: c.p2_name, e: c.p2_w, c: "#00f9f9"},
        {n: c.p3_name, e: c.p3_w, c: "#4caf50"}, {n: c.p4_name, e: c.p4_w, c: "#e91e63"}
    ].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:560px; background-image:url('${currentBg || ''}'); transition: background 0.5s ease;">
        <div class="overlay">
            <div class="global-header">
                <div class="chip-temp"><ha-icon icon="mdi:thermometer"></ha-icon> ${this._get(c.entity_ext_temp)}°</div>
                <div class="main-title">${this._tab.toUpperCase()}</div>
                <div class="chip-eco">${this._get(c.eco_money)} €</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="solar-hero">
                        <div class="hero-val">${this._get(c.total_now)}<small>W</small></div>
                        <div class="obj-container">
                            <div class="obj-text">OBJECTIF: ${this._get(c.total_obj_kwh)}kWh (${this._get(c.total_obj_pct)}%)</div>
                            <div class="obj-bar"><div class="obj-fill" style="width:${this._get(c.total_obj_pct)}%"></div></div>
                        </div>
                    </div>
                    <div class="gauges-grid grid-${panels.length}">
                        ${panels.map(p => this._renderAnimatedGauge(p.n, p.e, p.c))}
                    </div>` 
                
                : this._tab === 'batt' ? html`
                    <div class="batt-view">
                        <div class="header-small">GESTION ÉNERGIE</div>
                        ${[1].map(i => c[`b${i}_s`] ? html`
                            <div class="batt-pro-card">
                                <div class="batt-main-row">
                                    <ha-icon icon="mdi:battery-charging" class="batt-icon ${parseInt(this._get(c[`b${i}_s`])) < 20 ? 'blink' : ''}"></ha-icon>
                                    <div class="batt-core">
                                        <div class="batt-n">${c[`b${i}_n`]}</div>
                                        <div class="batt-p-bg"><div class="batt-p-fill" style="width:${this._get(c[`b${i}_s`])}%"></div></div>
                                    </div>
                                    <div class="batt-soc">${this._get(c[`b${i}_s`])}%</div>
                                </div>
                                <div class="batt-details">
                                    <div class="det-item"><ha-icon icon="mdi:thermometer"></ha-icon> ${this._get(c[`b${i}_temp`])}°C</div>
                                    <div class="det-item"><ha-icon icon="mdi:lightning-bolt"></ha-icon> ${this._get(c[`b${i}_cap`])}</div>
                                    <div class="det-item flow ${parseFloat(this._get(c[`b${i}_flow`])) < 0 ? 'out' : 'in'}">
                                        <ha-icon icon="mdi:swap-vertical"></ha-icon> ${this._get(c[`b${i}_flow`])}W
                                    </div>
                                </div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="stats-view">
                        <div class="conso-hero">
                            <div class="label">MAISON ACTUEL</div>
                            <div class="val">${this._get(c.main_cons_entity)}<small>W</small></div>
                        </div>
                        <div class="stats-grid">
                            <div class="s-card full"><span>PROD JOUR</span>${this._get(c.total_day)}<small>kWh</small></div>
                            <div class="s-card"><span>MOIS</span>${this._get(c.total_month)}<small>kWh</small></div>
                            <div class="s-card"><span>ANNÉE</span>${this._get(c.total_year)}<small>kWh</small></div>
                        </div>
                    </div>`}
            </div>

            <div class="nav">
                <ha-icon class="${this._tab==='solar'?'active':''}" icon="mdi:solar-power-variant" @click=${()=>this._tab='solar'}></ha-icon>
                <ha-icon class="${this._tab==='batt'?'active':''}" icon="mdi:battery-high" @click=${()=>this._tab='batt'}></ha-icon>
                <ha-icon class="${this._tab==='stats'?'active':''}" icon="mdi:chart-areaspline" @click=${()=>this._tab='stats'}></ha-icon>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 30px; overflow: hidden; background-size: cover; background-position: center; color: #fff; font-family: sans-serif; }
    .overlay { height: 100%; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
    .content { flex: 1; }

    .global-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .chip-temp, .chip-eco { background: rgba(255,255,255,0.1); padding: 5px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .chip-eco { color: #4caf50; border: 1px solid rgba(76,175,80,0.3); }

    /* SOLAR HERO */
    .solar-hero { text-align: center; margin-bottom: 25px; }
    .hero-val { font-size: 58px; font-weight: 900; color: #ffc107; line-height: 1; }
    .obj-container { margin-top: 10px; width: 60%; margin-left: 20%; }
    .obj-text { font-size: 9px; opacity: 0.5; margin-bottom: 4px; }
    .obj-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; }
    .obj-fill { height: 100%; background: #ffc107; border-radius: 2px; box-shadow: 0 0 8px #ffc107; }

    /* HUD GAUGE */
    .gauges-grid { display: grid; gap: 15px; justify-items: center; }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .center-gauge { position: relative; width: 100px; height: 100px; display: flex; align-items: center; justify-content: center; }
    .outer-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid transparent; animation: rotate 5s linear infinite; opacity: 0.6; }
    .inner-circle { width: 80px; height: 80px; background: rgba(255,255,255,0.03); border-radius: 50%; border: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .hud-val { font-size: 24px; font-weight: 100; }
    .gauge-label { font-size: 9px; font-weight: bold; margin-top: 8px; opacity: 0.7; }

    /* BATTERY PRO CARD */
    .batt-pro-card { background: rgba(255,255,255,0.05); border-radius: 20px; padding: 15px; border: 1px solid rgba(255,255,255,0.05); }
    .batt-main-row { display: flex; align-items: center; gap: 15px; margin-bottom: 15px; }
    .batt-core { flex: 1; }
    .batt-n { font-size: 14px; font-weight: bold; margin-bottom: 5px; }
    .batt-p-bg { height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; }
    .batt-p-fill { height: 100%; background: #4caf50; border-radius: 4px; }
    .batt-soc { font-size: 20px; font-weight: 900; }
    .batt-details { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px; }
    .det-item { font-size: 11px; opacity: 0.7; display: flex; align-items: center; gap: 4px; }
    .det-item ha-icon { --mdc-icon-size: 14px; }
    .flow.in { color: #4caf50; }
    .flow.out { color: #ff5252; }

    /* STATS */
    .conso-hero { text-align: center; padding: 30px; background: rgba(255,255,255,0.03); border-radius: 25px; margin-bottom: 20px; }
    .conso-hero .val { font-size: 50px; font-weight: 900; color: #ffc107; }
    .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .s-card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 18px; text-align: center; font-size: 18px; font-weight: bold; }
    .s-card.full { grid-column: span 2; background: rgba(255,255,255,0.08); }
    .s-card span { display: block; font-size: 8px; opacity: 0.5; margin-bottom: 4px; }

    .nav { display: flex; justify-content: space-around; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); }
    .nav ha-icon { opacity: 0.2; cursor: pointer; --mdc-icon-size: 30px; }
    .nav ha-icon.active { opacity: 1; color: #ffc107; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .blink { animation: blink-anim 1s infinite; }
    @keyframes blink-anim { 50% { opacity: 0.3; } }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
