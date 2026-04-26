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
        { name: "blur_amount", label: "Flou de l'image (0 = Net)", selector: { number: { min: 0, max: 20, step: 1, mode: "slider" } } },
        { name: "entity_ext_temp", label: "Température Extérieure", selector: { entity: {} } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
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
    const currentBg = this._tab === 'solar' ? c.bg_solar : (this._tab === 'batt' ? c.bg_batt : c.bg_stats);
    
    // NOUVEAUX REGLAGES VISUELS
    const opacity = c.overlay_opacity !== undefined ? c.overlay_opacity : 0.6;
    const blur = c.blur_amount !== undefined ? c.blur_amount : 0; // Défaut à 0 pour que ce soit net
    
    const panels = [
        {n: c.p1_name, e: c.p1_w, c: "#ffc107"}, {n: c.p2_name, e: c.p2_w, c: "#00f9f9"},
        {n: c.p3_name, e: c.p3_w, c: "#4caf50"}, {n: c.p4_name, e: c.p4_w, c: "#e91e63"}
    ].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:600px; background: url('${currentBg || ''}') no-repeat center center / cover;">
        <div class="overlay" style="background: rgba(0,0,0,${opacity}); backdrop-filter: blur(${blur}px); -webkit-backdrop-filter: blur(${blur}px);">
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
                    <div class="batt-scroll">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="batt-pro-card">
                                <div class="batt-main-row">
                                    <ha-icon icon="mdi:battery" class="batt-icon ${parseInt(this._get(c[`b${i}_s`])) < 20 ? 'blink' : ''}"></ha-icon>
                                    <div class="batt-core">
                                        <div class="batt-n">${c[`b${i}_n`] || `Pack ${i}`}</div>
                                        <div class="batt-p-bg"><div class="batt-p-fill" style="width:${this._get(c[`b${i}_s`])}%"></div></div>
                                    </div>
                                    <div class="batt-soc">${this._get(c[`b${i}_s`])}%</div>
                                </div>
                                <div class="batt-details">
                                    <div class="det-item"><ha-icon icon="mdi:thermometer"></ha-icon> ${this._get(c[`b${i}_temp`])}°</div>
                                    <div class="det-item"><ha-icon icon="mdi:database"></ha-icon> ${this._get(c[`b${i}_cap`])}</div>
                                    <div class="det-item flow ${parseFloat(this._get(c[`b${i}_flow`])) < 0 ? 'out' : 'in'}">
                                        <ha-icon icon="mdi:swap-vertical"></ha-icon>${this._get(c[`b${i}_flow`])}W
                                    </div>
                                </div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="stats-view">
                        <div class="conso-hero">
                            <div class="label">CONSO ACTUELLE</div>
                            <div class="val">${this._get(c.main_cons_entity)}<small>W</small></div>
                        </div>
                        <div class="stats-grid">
                            <div class="s-card full"><span>PROD AUJOURD'HUI</span>${this._get(c.total_day)}<small>kWh</small></div>
                            <div class="s-card"><span>CE MOIS</span>${this._get(c.total_month)}<small>kWh</small></div>
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
    ha-card { border-radius: 30px; overflow: hidden; color: #fff; font-family: sans-serif; transition: all 0.5s ease; border: 1px solid rgba(255,255,255,0.15); }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; transition: background 0.4s ease, backdrop-filter 0.4s ease; }
    .content { flex: 1; overflow: hidden; }

    .global-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
    .chip-temp, .chip-eco { background: rgba(0,0,0,0.5); padding: 5px 12px; border-radius: 12px; font-size: 12px; border: 1px solid rgba(255,255,255,0.1); }
    .chip-eco { color: #4caf50; }

    /* SOLAR */
    .solar-hero { text-align: center; margin-bottom: 20px; }
    .hero-val { font-size: 64px; font-weight: 900; color: #ffc107; line-height: 1; text-shadow: 0 4px 15px rgba(0,0,0,0.8); }
    .obj-container { margin-top: 8px; width: 60%; margin-left: 20%; }
    .obj-text { font-size: 10px; font-weight: bold; opacity: 0.9; margin-bottom: 4px; text-shadow: 1px 1px 3px #000; }
    .obj-bar { height: 6px; background: rgba(255,255,255,0.2); border-radius: 3px; border: 1px solid rgba(0,0,0,0.3); }
    .obj-fill { height: 100%; background: #ffc107; border-radius: 3px; box-shadow: 0 0 10px #ffc107; }

    /* HUD GAUGE */
    .gauges-grid { display: grid; gap: 15px; justify-items: center; }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .center-gauge { position: relative; width: 105px; height: 105px; display: flex; align-items: center; justify-content: center; }
    .outer-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2.5px solid transparent; animation: rotate 5s linear infinite; }
    .inner-circle { width: 85px; height: 85px; background: rgba(0,0,0,0.5); border-radius: 50%; border: 1.5px solid rgba(255,255,255,0.2); display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: inset 0 0 15px rgba(0,0,0,0.5); }
    .hud-val { font-size: 26px; font-weight: 900; }
    .gauge-label { font-size: 10px; font-weight: bold; margin-top: 8px; text-transform: uppercase; text-shadow: 1px 1px 3px #000; }

    /* BATTERIES */
    .batt-scroll { height: 100%; overflow-y: auto; padding-right: 5px; }
    .batt-scroll::-webkit-scrollbar { width: 4px; }
    .batt-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.3); border-radius: 10px; }
    .batt-pro-card { background: rgba(0,0,0,0.6); border-radius: 15px; padding: 12px; border: 1px solid rgba(255,255,255,0.15); margin-bottom: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.3); }
    .batt-n { font-size: 13px; font-weight: bold; text-shadow: 1px 1px 2px #000; }
    .batt-p-fill { height: 100%; background: linear-gradient(90deg, #388e3c, #66bb6a); border-radius: 3px; }
    .batt-soc { font-size: 20px; font-weight: 900; color: #66bb6a; }

    /* STATS */
    .conso-hero { text-align: center; padding: 20px; background: rgba(0,0,0,0.5); border-radius: 20px; margin-bottom: 15px; border: 1px solid rgba(255,255,255,0.1); }
    .conso-hero .val { font-size: 50px; font-weight: 900; color: #ffc107; text-shadow: 0 0 15px rgba(255,193,7,0.3); }
    .s-card { background: rgba(0,0,0,0.6); padding: 15px; border-radius: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }

    .nav { display: flex; justify-content: space-around; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2); }
    .nav ha-icon { opacity: 0.4; cursor: pointer; --mdc-icon-size: 32px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5)); }
    .nav ha-icon.active { opacity: 1; color: #ffc107; filter: drop-shadow(0 0 8px #ffc107); }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .blink { animation: blink-anim 1s infinite; color: #ff5252; }
    @keyframes blink-anim { 50% { opacity: 0.3; } }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
