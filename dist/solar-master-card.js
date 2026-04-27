import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- ÉDITEUR ---
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
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 400, max: 1200, step: 10 } } },
        { name: "background_image", label: "URL Image de fond", selector: { text: {} } },
        { name: "entity_weather", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [{ name: `p${i}_name`, label: `Nom P${i}` }, { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }]).flat()
      ],
      config_batt: [
        ...[1,2,3,4].map(i => [
            { name: `b${i}_n`, label: `Nom Bat ${i}` },
            { name: `b${i}_s`, label: `SOC % Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_v`, label: `Sensor Gauche (ex: Volt) Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_temp`, label: `Temp Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_cap`, label: `Capacité Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_a`, label: `Sensor Droite (ex: Amp) Bat ${i}`, selector: { entity: {} } }
        ]).flat()
      ]
    };
    return html`
      <div class="tabs">
        ${['config_solar','config_batt'].map(t => html`<button class="${this._selectedTab===t?'active':''}" @click=${()=>this._selectedTab=t}>${t === 'config_solar' ? 'SOLAIRE' : 'BATTERIES'}</button>`)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.tabs{display:flex;gap:5px;margin-bottom:15px}button{flex:1;padding:10px;background:#2c2c2c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:11px;font-weight:bold}button.active{background:#ffc107;color:#000}`;
}
if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'solar'; }
  setConfig(config) { this.config = config; }
  
  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '--'; }
  _getU(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].attributes.unit_of_measurement || '' : ''; }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        <div class="overlay">
            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="page">
                        <div class="header-main">
                            <div class="big-val">${this._get(c.total_now)}<small>W</small></div>
                        </div>
                    </div>` 

                : this._tab === 'batt' ? html`
                    <div class="page battery-page">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="rack-card">
                                <div class="r-h">
                                   <span class="r-n">${c[`b${i}_n`]}</span>
                                   <span class="soc-v">${this._get(c[`b${i}_s`])}%</span>
                                </div>
                                <div class="v-meter">
                                    ${[...Array(45)].map((_, idx) => html`<div class="v-seg ${parseInt(this._get(c[`b${i}_s`])) > (idx * 2.22) ? 'on' : ''}"></div>`)}
                                </div>
                                <div class="r-f-grid-4">
                                    <div class="r-f-box cyan-text">${this._get(c[`b${i}_v` ])}<small>${this._getU(c[`b${i}_v` ])}</small></div>
                                    <div class="r-f-box"><ha-icon icon="mdi:thermometer"></ha-icon>${this._get(c[`b${i}_temp`])}°</div>
                                    <div class="r-f-box"><ha-icon icon="mdi:battery-import"></ha-icon>${this._get(c[`b${i}_cap`])}<small>${this._getU(c[`b${i}_cap` ])}</small></div>
                                    <div class="r-f-box cyan-text">${this._get(c[`b${i}_a` ])}<small>${this._getU(c[`b${i}_a` ])}</small></div>
                                </div>
                            </div>` : '')}
                    </div>`
                : ''}
            </div>

            <div class="nav-footer">
                <div class="n-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}><ha-icon icon="mdi:solar-power"></ha-icon></div>
                <div class="n-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}><ha-icon icon="mdi:battery-charging-high"></ha-icon></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 28px; overflow: hidden; background: #000; color: #fff; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 12px; box-sizing: border-box; background: #0b0b0b; }
    
    .battery-page { max-height: 480px; overflow-y: auto; padding-right: 4px; }
    .rack-card { 
        background: rgba(255,255,255,0.05); 
        padding: 10px 12px; 
        border-radius: 14px; 
        margin-bottom: 10px; 
        border-left: 3px solid #4caf50;
        border-top: 1px solid rgba(255,255,255,0.05);
    }

    .r-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
    .r-n { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; }
    .soc-v { color: #4caf50; font-weight: 900; font-size: 14px; }
    
    .v-meter { display: flex; gap: 1.2px; height: 6px; margin-bottom: 10px; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.03); width: 0.4px; } 
    .v-seg.on { background: #4caf50; box-shadow: 0 0 3px rgba(76,175,80,0.6); }

    .r-f-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
    .r-f-box { 
        background: rgba(0,0,0,0.4); 
        padding: 5px 2px; 
        border-radius: 6px; 
        font-size: 10px; 
        font-weight: 700; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        gap: 3px;
        border: 1px solid rgba(255,255,255,0.02);
    }
    .cyan-text { color: #00f9f9; }
    small { font-size: 7px; opacity: 0.6; margin-left: 1px; }
    ha-icon { --mdc-icon-size: 12px; opacity: 0.8; }

    .nav-footer { display: flex; justify-content: space-around; padding: 12px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: auto; }
    .n-btn { opacity: 0.3; cursor: pointer; transition: 0.3s; }
    .n-btn.active { opacity: 1; color: #ffc107; }
    
    .battery-page::-webkit-scrollbar { width: 3px; }
    .battery-page::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
