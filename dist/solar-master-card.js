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
        { name: "background", label: "Image de fond", selector: { text: {} } }
      ],
      beem_maison: [
        { name: "beem_m_w", label: "Beem Maison - Watts", selector: { entity: { domain: "sensor" } } },
        { name: "beem_m_d", label: "Beem Maison - Jour", selector: { entity: { domain: "sensor" } } },
        { name: "beem_m_m", label: "Beem Maison - Mois", selector: { entity: { domain: "sensor" } } }
      ],
      beem_spa: [
        { name: "beem_s_w", label: "Beem Spa - Watts", selector: { entity: { domain: "sensor" } } },
        { name: "beem_s_d", label: "Beem Spa - Jour", selector: { entity: { domain: "sensor" } } },
        { name: "beem_s_m", label: "Beem Spa - Mois", selector: { entity: { domain: "sensor" } } }
      ],
      beem_ibc: [
        { name: "beem_i_w", label: "Beem IBC - Watts", selector: { entity: { domain: "sensor" } } },
        { name: "beem_i_d", label: "Beem IBC - Jour", selector: { entity: { domain: "sensor" } } },
        { name: "beem_i_m", label: "Beem IBC - Mois", selector: { entity: { domain: "sensor" } } }
      ],
      system: [
        { name: "entity_soc", label: "Batterie (%)", selector: { entity: { domain: "sensor" } } },
        { name: "entity_house_load", label: "Conso Maison (W)", selector: { entity: { domain: "sensor" } } }
      ]
    };

    return html`
      <div class="editor-tabs">
        ${Object.keys(schemas).map(t => html`<button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>${t.toUpperCase()}</button>`)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.editor-tabs { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 15px; } button { padding: 8px; cursor: pointer; border-radius: 4px; border: none; background: #444; color: white; font-size: 9px;} button.active { background: #ffc107; color: black; font-weight: bold; }`;
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

  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }

  _renderBeemRow(name, s_w, s_d, s_m) {
    const valW = parseInt(this._get(s_w));
    const valD = parseFloat(this._get(s_d)).toFixed(1);
    const valM = parseInt(this._get(s_m));
    const pct = Math.min((valW / 1200) * 100, 100);
    const isActive = valW > 5;

    return html`
      <div class="beem-row">
        <div class="beem-icon-container">
            <div class="beem-shape ${isActive ? 'active' : ''}" style="--anim-glow: ${valW/1200*25+5}px">
                <ha-icon icon="mdi:solar-power-variant"></ha-icon>
            </div>
        </div>
        <div class="beem-info">
            <div class="beem-name">${name}</div>
            <div class="beem-state">${valW} W</div>
            <div class="beem-progress-bg"><div class="beem-bar" style="width: ${pct}%"></div></div>
        </div>
        <div class="beem-badges">
            <div class="b-badge b-month">MOIS<br><span>${valM}k</span></div>
            <div class="b-badge b-day">JOUR<br><span>${valD}k</span></div>
            <div class="b-badge b-now">NOW<br><span>${valW}W</span></div>
        </div>
      </div>
    `;
  }

  _renderTab() {
    const c = this.config;
    if (this._tab === 'home') {
        return html`
            <div class="beem-container">
                <div class="beem-title-main">PRODUCTION SOLAIRE BEEM</div>
                ${this._renderBeemRow("Beem Maison", c.beem_m_w, c.beem_m_d, c.beem_m_m)}
                ${this._renderBeemRow("Beem Spa", c.beem_s_w, c.beem_s_d, c.beem_s_m)}
                ${this._renderBeemRow("Beem IBC", c.beem_i_w, c.beem_i_d, c.beem_i_m)}
            </div>
        `;
    }
    
    if (this._tab === 'sys') {
        return html`
          <div class="sys-view">
             <div class="center-gauge">
                <div class="outer-ring"></div>
                <div class="inner-circle">
                    <span class="water-label">BATTERIE</span>
                    <span class="water-val">${this._get(c.entity_soc)}%</span>
                </div>
             </div>
             <div class="energy-card">
                <ha-icon icon="mdi:home-lightning-bolt" class="anim-pulse"></ha-icon>
                <div class="energy-val">${this._get(c.entity_house_load)} W</div>
             </div>
          </div>`;
    }
  }

  render() {
    const c = this.config;
    return html`
      <ha-card style="height: ${c.card_height || '550px'};">
        <div class="bg" style="background-image: url('${c.background || ''}');">
            <div class="glass-overlay">
                <div class="card-header">${c.title || 'SOLAR MASTER'}</div>
                <div class="content">${this._renderTab()}</div>
                <div class="navbar">
                    <ha-icon class="${this._tab==='home'?'active':''}" icon="mdi:solar-panel-large" @click=${()=>this._tab='home'}></ha-icon>
                    <ha-icon class="${this._tab==='sys'?'active':''}" icon="mdi:battery-charging" @click=${()=>this._tab='sys'}></ha-icon>
                </div>
            </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host { --accent: #ffc107; --c-solar: 255, 193, 7; --c-day: 76, 175, 80; --c-month: 33, 150, 243; }
    ha-card { border-radius: 25px; overflow: hidden; background: #000; color: #fff; }
    .bg { background-size: cover; background-position: center; height: 100%; }
    .glass-overlay { height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(15px); display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; }
    .content { flex: 1; overflow-y: auto; padding: 10px 0; }
    
    /* BEEM ROWS (Traductions du Mushroom) */
    .beem-container { display: flex; flex-direction: column; gap: 15px; }
    .beem-title-main { text-align: center; font-size: 9px; font-weight: 900; letter-spacing: 2px; color: rgba(var(--c-solar), 0.6); margin-bottom: 5px; }
    .beem-row { background: rgba(255,255,255,0.03); border-radius: 15px; padding: 10px; display: flex; align-items: center; position: relative; height: 85px; border: 1px solid rgba(255,255,255,0.05); }
    
    .beem-icon-container { width: 50px; display: flex; justify-content: center; }
    .beem-shape { width: 42px; height: 42px; border-radius: 50%; background: rgba(var(--c-solar), 0.1); display: flex; align-items: center; justify-content: center; position: relative; }
    .beem-shape ha-icon { --mdc-icon-size: 24px; color: rgb(var(--c-solar)); z-index: 2; }
    
    /* Animation Scan & Pulse */
    .beem-shape.active::before {
        content: ""; position: absolute; inset: -3px; border-radius: 50%;
        background: conic-gradient(from -25deg, transparent 0%, rgba(var(--c-solar), 0.5) 25%, transparent 50%);
        animation: rotate 4s linear infinite; filter: blur(2px);
    }
    .beem-shape.active { box-shadow: 0 0 var(--anim-glow) rgba(var(--c-solar), 0.4); }

    .beem-info { flex: 1; margin-left: 10px; }
    .beem-name { font-size: 11px; font-weight: bold; opacity: 0.9; }
    .beem-state { font-size: 10px; opacity: 0.6; }
    
    .beem-progress-bg { width: 100%; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 8px; overflow: hidden; }
    .beem-bar { height: 100%; background: rgb(var(--c-solar)); box-shadow: 0 0 8px rgba(var(--c-solar), 0.5); transition: width 0.5s ease; }

    .beem-badges { display: flex; gap: 4px; }
    .b-badge { width: 42px; height: 28px; border-radius: 6px; font-size: 7px; font-weight: bold; text-align: center; display: flex; flex-direction: column; justify-content: center; border: 1px solid; }
    .b-badge span { font-size: 9px; }
    .b-month { background: rgba(var(--c-month), 0.1); border-color: rgb(var(--c-month)); color: rgb(var(--c-month)); }
    .b-day { background: rgba(var(--c-day), 0.1); border-color: rgb(var(--c-day)); color: rgb(var(--c-day)); }
    .b-now { background: rgba(255, 152, 0, 0.1); border-color: rgb(255, 152, 0); color: rgb(255, 152, 0); }

    /* SYSTEM TAB */
    .sys-view { display: flex; flex-direction: column; align-items: center; gap: 20px; }
    .center-gauge { position: relative; width: 140px; height: 140px; display: flex; align-items: center; justify-content: center; }
    .outer-ring { position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 2px solid transparent; border-top: 2px solid var(--accent); animation: rotate 4s linear infinite; }
    .inner-circle { width: 110px; height: 110px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .water-val { font-size: 32px; color: var(--accent); }
    .energy-card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; width: 80%; text-align: center; }

    .navbar { display: flex; justify-content: space-around; padding: 10px; border-top: 1px solid rgba(255,255,255,0.1); }
    .navbar ha-icon { cursor: pointer; opacity: 0.3; transition: 0.3s; }
    .navbar ha-icon.active { opacity: 1; color: var(--accent); }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
}

if (!customElements.get("solar-master-card")) {
    customElements.define("solar-master-card", SolarMasterCard);
}
window.customCards = window.customCards || [];
window.customCards.push({ type: "solar-master-card", name: "Solar Master Beem V2", preview: true });
