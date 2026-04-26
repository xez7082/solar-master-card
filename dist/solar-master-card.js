import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- 1. ÉDITEUR VISUEL (INTERFACE DE CONFIGURATION) ---
class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _selectedTab: { type: String } }; }
  constructor() { super(); this._selectedTab = 'config_home'; }
  setConfig(config) { this._config = config; }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const schemas = {
      config_home: [
        { name: "background", label: "Image de fond (URL)", selector: { text: {} } },
        { name: "entity_water_temp", label: "Température Eau SPA", selector: { entity: {} } },
        { name: "max_temp", label: "Alerte Temp Max (ex: 38)", selector: { number: { mode: "box" } } },
        { name: "entity_ext_temp", label: "Temp Extérieure", selector: { entity: {} } },
        { name: "entity_spa_air_temp", label: "Temp Air SPA", selector: { entity: {} } },
        { name: "main_cons_entity", label: "Consommation Maison (W)", selector: { entity: {} } }
      ],
      config_solar: [
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "total_obj", label: "Objectif Jour (kWh)", selector: { entity: {} } },
        { name: "total_month", label: "Prod Mensuelle (kWh)", selector: { entity: {} } },
        { name: "total_year", label: "Prod Annuelle (kWh)", selector: { entity: {} } },
        { name: "p1_name", label: "Nom P1", selector: { text: {} } }, { name: "p1_w", label: "Watts P1", selector: { entity: {} } },
        { name: "p2_name", label: "Nom P2", selector: { text: {} } }, { name: "p2_w", label: "Watts P2", selector: { entity: {} } },
        { name: "p3_name", label: "Nom P3", selector: { text: {} } }, { name: "p3_w", label: "Watts P3", selector: { entity: {} } },
        { name: "p4_name", label: "Nom P4", selector: { text: {} } }, { name: "p4_w", label: "Watts P4", selector: { entity: {} } }
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
    .tabs { display: flex; gap: 8px; margin-bottom: 15px; }
    button { background: #333; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; flex: 1; font-weight: bold; font-size: 11px; }
    button.active { background: #ffc107; color: black; }
    .editor-box { background: #222; padding: 15px; border-radius: 8px; }
  `;
}
if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- 2. CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'home'; }
  setConfig(config) { this.config = config; }

  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }

  // Rendu des jauges circulaires solaires
  _renderCircularGauge(name, entityW, color) {
    if (!entityW || !this.hass.states[entityW]) return html``;
    const val = Math.round(parseFloat(this._get(entityW))) || 0;
    const max = 1200; // Seuil max pour le calcul du cercle
    const pct = Math.min((val / max) * 100, 100);
    const radius = 35;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (pct / 100) * circ;

    return html`
      <div class="gauge-container">
        <svg viewBox="0 0 100 100" class="gauge-svg">
          <circle class="gauge-bg" cx="50" cy="50" r="${radius}"></circle>
          <circle class="gauge-fill" cx="50" cy="50" r="${radius}" 
            style="stroke-dasharray: ${circ}; stroke-dashoffset: ${offset}; stroke: ${color};">
          </circle>
          <text x="50" y="52" class="gauge-text">${val}<tspan y="65" x="50" class="gauge-unit">W</tspan></text>
        </svg>
        <div class="gauge-label">${name || 'Solaire'}</div>
      </div>`;
  }

  // VUE ACCUEIL (HOME)
  _renderHome() {
    const c = this.config;
    const valW = parseFloat(this._get(c.entity_water_temp));
    const isAlert = (c.max_temp && valW > c.max_temp);
    
    return html`
      <div class="home-view">
        <div class="main-display">
            <div class="side-info">
                <div class="val-big">${this._get(c.entity_ext_temp)}°</div>
                <div class="label-tiny">EXTÉRIEUR</div>
            </div>
            <div class="center-gauge">
                <div class="outer-ring ${isAlert ? 'alert' : ''}"></div>
                <div class="inner-circle">
                    <span class="water-label">EAU SPA</span>
                    <span class="water-val">${valW || '--'}°</span>
                </div>
            </div>
            <div class="side-info">
                <div class="val-big">${this._get(c.entity_spa_air_temp)}°</div>
                <div class="label-tiny">AIR SPA</div>
            </div>
        </div>
        <div class="energy-card">
            <ha-icon icon="mdi:lightning-bolt" class="anim-pulse"></ha-icon>
            <div class="energy-details">
                <div class="energy-val">${this._get(c.main_cons_entity)} W</div>
                <div class="energy-label">CONSO MAISON ACTUELLE</div>
            </div>
        </div>
      </div>`;
  }

  // VUE SOLAIRE
  _renderSolar() {
    const c = this.config;
    const panels = [
        {n: c.p1_name, e: c.p1_w, c: "#ffc107"},
        {n: c.p2_name, e: c.p2_w, c: "#00d4ff"},
        {n: c.p3_name, e: c.p3_w, c: "#4caf50"},
        {n: c.p4_name, e: c.p4_w, c: "#e91e63"}
    ].filter(p => p.e && this.hass.states[p.e]);

    return html`
        <div class="solar-view">
            <div class="header-minimal">
                <div class="main-total">${this._get(c.total_now)}<small>W</small></div>
                <div class="sub-total">OBJECTIF: ${this._get(c.total_obj)}</div>
            </div>
            
            <div class="gauges-grid grid-${panels.length}">
                ${panels.map(p => this._renderCircularGauge(p.n, p.e, p.c))}
            </div>

            <div class="stats-bar">
                <div class="s-item"><span>MENSUEL</span>${this._get(c.total_month)}</div>
                <div class="s-item"><span>ANNUEL</span>${this._get(c.total_year)}</div>
            </div>
        </div>`;
  }

  render() {
    return html`
      <ha-card style="height:520px; background-image:url('${this.config.background || ''}');">
        <div class="overlay">
            <div class="content">
                ${this._tab === 'home' ? this._renderHome() : this._renderSolar()}
            </div>
            <div class="nav">
                <ha-icon class="${this._tab==='home'?'active':''}" icon="mdi:home-variant" @click=${()=>this._tab='home'}></ha-icon>
                <ha-icon class="${this._tab==='solar'?'active':''}" icon="mdi:solar-power-variant" @click=${()=>this._tab='solar'}></ha-icon>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 30px; overflow: hidden; background-size: cover; background-position: center; color: white; transition: all 0.3s ease; }
    .overlay { height: 100%; background: rgba(0,0,0,0.75); backdrop-filter: blur(15px); display: flex; flex-direction: column; padding: 25px; box-sizing: border-box; }
    .content { flex: 1; }

    /* --- HOME STYLE --- */
    .main-display { display: flex; align-items: center; justify-content: space-between; margin-top: 15px; }
    .center-gauge { position: relative; width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; }
    .outer-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 3px dashed rgba(255,255,255,0.15); animation: rotate 15s linear infinite; }
    .outer-ring.alert { border: 3px solid #ff4444; box-shadow: 0 0 20px rgba(255,68,68,0.4); animation: rotate 4s linear infinite; }
    .inner-circle { text-align: center; }
    .water-val { font-size: 44px; font-weight: 900; color: #00d4ff; line-height: 1; }
    .water-label { font-size: 10px; opacity: 0.6; letter-spacing: 1px; }
    .side-info { width: 80px; text-align: center; }
    .val-big { font-size: 26px; font-weight: bold; margin-bottom: 2px; }
    .label-tiny { font-size: 8px; opacity: 0.5; letter-spacing: 1px; }
    .energy-card { background: linear-gradient(145deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02)); border-radius: 24px; padding: 20px; margin-top: 40px; display: flex; align-items: center; gap: 15px; border: 1px solid rgba(255,255,255,0.1); }
    .energy-val { font-size: 32px; font-weight: 900; color: #ffc107; }
    .energy-label { font-size: 10px; opacity: 0.5; font-weight: bold; }

    /* --- SOLAR STYLE --- */
    .header-minimal { text-align: center; margin-bottom: 25px; }
    .main-total { font-size: 48px; font-weight: 900; color: #ffc107; line-height: 1; }
    .main-total small { font-size: 16px; opacity: 0.6; margin-left: 5px; }
    .sub-total { font-size: 11px; opacity: 0.4; letter-spacing: 2px; margin-top: 8px; font-weight: bold; }
    .gauges-grid { display: grid; gap: 20px; justify-items: center; align-items: center; }
    .grid-3 { grid-template-columns: repeat(3, 1fr); }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .gauge-container { text-align: center; background: rgba(255,255,255,0.04); padding: 12px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.06); width: 100%; max-width: 100px; }
    .gauge-svg { width: 75px; height: 75px; margin-bottom: 8px; }
    .gauge-bg { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 8; }
    .gauge-fill { fill: none; stroke-width: 8; stroke-linecap: round; transform: rotate(-90deg); transform-origin: 50% 50%; transition: stroke-dashoffset 1.5s cubic-bezier(0.4, 0, 0.2, 1); }
    .gauge-text { fill: white; font-size: 18px; font-weight: 800; text-anchor: middle; }
    .gauge-unit { font-size: 9px; opacity: 0.4; }
    .gauge-label { font-size: 10px; font-weight: 700; opacity: 0.8; text-transform: uppercase; }
    .stats-bar { display: flex; justify-content: space-between; margin-top: 30px; background: rgba(255,193,7,0.12); padding: 15px 25px; border-radius: 18px; border: 1px solid rgba(255,193,7,0.2); }
    .s-item { font-size: 16px; font-weight: 900; }
    .s-item span { display: block; font-size: 9px; opacity: 0.6; letter-spacing: 1px; margin-bottom: 2px; }

    /* NAVIGATION */
    .nav { display: flex; justify-content: space-around; padding: 20px 0 5px 0; border-top: 1px solid rgba(255,255,255,0.1); }
    .nav ha-icon { opacity: 0.25; cursor: pointer; --mdc-icon-size: 32px; transition: 0.3s; }
    .nav ha-icon.active { opacity: 1; color: #ffc107; filter: drop-shadow(0 0 8px rgba(255,193,7,0.5)); }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .anim-pulse { animation: pulse 2s infinite; color: #ffc107; --mdc-icon-size: 32px; }
    @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.15); } 100% { opacity: 1; transform: scale(1); } }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);

// Enregistrement de la carte pour l'interface HA
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master Final Hybrid",
  description: "Dashboard hybride Solaire + Maison avec jauges circulaires adaptatives.",
  preview: true
});
