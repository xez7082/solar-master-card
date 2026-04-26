import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- ÉDITEUR DE CONFIGURATION ---
class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _selectedTab: { type: String } }; }
  constructor() { super(); this._selectedTab = 'gen'; }
  setConfig(config) { this._config = config; }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const schemas = {
      gen: [
        { name: "title", label: "Titre du Système", selector: { text: {} } },
        { name: "background", label: "Image de fond (/local/...)", selector: { text: {} } },
        { name: "card_height", label: "Hauteur Carte (ex: 500px)", selector: { text: {} } }
      ],
      solar: [
        { name: "entity_solar_power", label: "Puissance Solaire (W)", selector: { entity: { domain: "sensor" } } },
        { name: "entity_solar_yield", label: "Production Jour (kWh)", selector: { entity: { domain: "sensor" } } },
        { name: "entity_house_load", label: "Consommation Maison", selector: { entity: { domain: "sensor" } } }
      ],
      battery: [
        { name: "entity_soc", label: "État de charge (%)", selector: { entity: { domain: "sensor" } } },
        { name: "entity_bat_temp", label: "Température Batterie", selector: { entity: { domain: "sensor" } } },
        { name: "entity_bat_power", label: "Charge/Décharge (W)", selector: { entity: { domain: "sensor" } } },
        { name: "min_soc", label: "SOC Alerte Basse", selector: { number: { mode: "box" } } }
      ],
      details: [
        { name: "entity_bat_volt", label: "Tension Batterie (V)", selector: { entity: { domain: "sensor" } } },
        { name: "entity_bat_amp", label: "Courant Batterie (A)", selector: { entity: { domain: "sensor" } } },
        { name: "entity_solar_volt", label: "Tension Panneaux (V)", selector: { entity: { domain: "sensor" } } }
      ]
    };

    return html`
      <div class="editor-tabs">
        ${Object.keys(schemas).map(t => html`<button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>${t.toUpperCase()}</button>`)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.editor-tabs { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 15px; } button { padding: 8px; cursor: pointer; border-radius: 4px; border: none; background: #444; color: white; font-size: 10px;} button.active { background: #ffc107; color: black; font-weight: bold; }`;
}

if (!customElements.get("solar-master-card-editor")) {
    customElements.define("solar-master-card-editor", SolarMasterCardEditor);
}

// --- CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'home'; }
  setConfig(config) { this.config = config; }

  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '--'; }
  _getUnit(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].attributes.unit_of_measurement || '' : ''; }

  _renderTab() {
    const c = this.config;
    
    if (this._tab === 'home') {
        const valS = parseFloat(this._get(c.entity_solar_power)) || 0;
        return html`
          <div class="home-view">
            <div class="main-display">
                <div class="side-info">
                    <div class="val-big">${this._get(c.entity_soc)}%</div>
                    <div class="label-tiny">BATTERIE</div>
                    <div class="hum-pill">${this._get(c.entity_bat_temp)}°C</div>
                </div>
                <div class="center-gauge">
                    <div class="outer-ring"></div>
                    <div class="inner-circle">
                        <span class="water-label">SOLAIRE</span>
                        <span class="water-val">${valS}</span>
                        <span class="water-unit">WATTS</span>
                    </div>
                </div>
                <div class="side-info">
                    <div class="val-big">${this._get(c.entity_solar_yield)}</div>
                    <div class="label-tiny">PRODUCTION JOUR</div>
                    <div class="hum-pill">kWh</div>
                </div>
            </div>
            <div class="energy-card">
                <ha-icon icon="mdi:home-lightning-bolt" class="anim-pulse"></ha-icon>
                <div class="energy-details">
                    <div class="energy-val">${this._get(c.entity_house_load)} <small>W</small></div>
                    <div class="energy-label">CONSO MAISON ACTUELLE</div>
                </div>
            </div>
          </div>`;
    }

    if (this._tab === 'bat') {
        const batP = parseFloat(this._get(c.entity_bat_power)) || 0;
        return html`
          <div class="home-view">
             <div class="center-gauge" style="width:180px; height:180px;">
                <div class="inner-circle" style="width:150px; height:150px;">
                    <ha-icon icon="${batP >= 0 ? 'mdi:battery-arrow-up' : 'mdi:battery-arrow-down'}" style="color: #ffc107; --mdc-icon-size: 40px;"></ha-icon>
                    <span class="water-val" style="font-size: 38px;">${Math.abs(batP)}</span>
                    <span class="water-unit">WATTS ${batP >= 0 ? 'CHARGE' : 'DÉCHARGE'}</span>
                </div>
             </div>
          </div>`;
    }
    
    if (this._tab === 'det') {
        const sensors = [
            { n: 'BAT V', v: this._get(c.entity_bat_volt), u: 'V', i: 'mdi:sine-wave' },
            { n: 'BAT A', v: this._get(c.entity_bat_amp), u: 'A', i: 'mdi:current-dc' },
            { n: 'SOLAR V', v: this._get(c.entity_solar_volt), u: 'V', i: 'mdi:solar-panel-large' },
            { n: 'TEMP', v: this._get(c.entity_bat_temp), u: '°C', i: 'mdi:thermometer' }
        ];
        return html`<div class="glass-grid">${sensors.map(s => html`
            <div class="glass-card">
                <div class="g-header"><ha-icon icon="${s.i}"></ha-icon> <span>${s.n}</span></div>
                <div class="g-body">
                    <span class="g-main">${s.v}<small>${s.u}</small></span>
                </div>
            </div>`)}</div>`;
    }
  }

  render() {
    const c = this.config;
    return html`
      <ha-card style="height: ${c.card_height || '500px'};">
        <div class="bg" style="background-image: url('${c.background || ''}'); background-color: #1a1a1a;">
            <div class="glass-overlay">
                <div class="card-header">${c.title || 'SOLAR MASTER'}</div>
                <div class="content">${this._renderTab()}</div>
                <div class="navbar">
                    <ha-icon class="${this._tab==='home'?'active':''}" icon="mdi:solar-power" @click=${()=>this._tab='home'}></ha-icon>
                    <ha-icon class="${this._tab==='bat'?'active':''}" icon="mdi:battery-charging-100" @click=${()=>this._tab='bat'}></ha-icon>
                    <ha-icon class="${this._tab==='det'?'active':''}" icon="mdi:chart-timeline-variant" @click=${()=>this._tab='det'}></ha-icon>
                </div>
            </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host { --accent: #ffc107; --glass: rgba(255, 255, 255, 0.05); }
    ha-card { border-radius: 25px; overflow: hidden; border: none; background: #000; color: #fff; }
    .bg { background-size: cover; background-position: center; height: 100%; }
    .glass-overlay { height: 100%; background: linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.9) 100%); backdrop-filter: blur(15px); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
    .card-header { text-align: center; font-weight: 200; letter-spacing: 4px; font-size: 12px; opacity: 0.6; }
    .content { flex: 1; display: flex; align-items: center; justify-content: center; }
    
    .home-view { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 25px; }
    .main-display { display: flex; align-items: center; justify-content: space-around; width: 100%; }
    .val-big { font-size: 24px; font-weight: 300; color: var(--accent); }
    .label-tiny { font-size: 8px; letter-spacing: 1px; opacity: 0.4; }
    .hum-pill { font-size: 10px; background: var(--glass); padding: 2px 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); }
    
    .center-gauge { position: relative; width: 160px; height: 160px; display: flex; align-items: center; justify-content: center; }
    .outer-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 1px solid rgba(255,193,7,0.1); border-top: 3px solid var(--accent); animation: rotate 4s linear infinite; }
    .inner-circle { width: 135px; height: 135px; background: rgba(255,255,255,0.02); border-radius: 50%; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    
    .water-val { font-size: 42px; font-weight: 100; color: var(--accent); }
    .water-label { font-size: 9px; opacity: 0.5; letter-spacing: 2px; }
    .water-unit { font-size: 9px; opacity: 0.5; }

    .energy-card { background: var(--glass); border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; padding: 15px; display: flex; align-items: center; gap: 15px; width: 85%; }
    .energy-card ha-icon { color: var(--accent); }
    .energy-val { font-size: 18px; }
    .energy-label { font-size: 8px; opacity: 0.4; }

    .glass-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%; }
    .glass-card { background: var(--glass); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 15px; text-align: center; }
    .g-header { font-size: 10px; opacity: 0.5; margin-bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 5px; }
    .g-main { font-size: 18px; color: var(--accent); }

    .navbar { display: flex; justify-content: space-around; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); }
    .navbar ha-icon { cursor: pointer; opacity: 0.3; --mdc-icon-size: 24px; transition: 0.3s; }
    .navbar ha-icon.active { opacity: 1; color: var(--accent); filter: drop-shadow(0 0 5px var(--accent)); }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .anim-pulse { animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
  `;
}

if (!customElements.get("solar-master-card")) {
    customElements.define("solar-master-card", SolarMasterCard);
}

window.customCards = window.customCards || [];
window.customCards.push({ type: "solar-master-card", name: "Solar Master Ultra V1", preview: true });
