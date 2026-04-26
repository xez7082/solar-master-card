import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- ÉDITEUR VISUEL COMPLET ---
class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _selectedTab: { type: String } }; }
  constructor() { super(); this._selectedTab = 'solar_main'; }
  setConfig(config) { this._config = config; }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const schemas = {
      solar_main: [
        { name: "title", label: "Titre de la carte", selector: { text: {} } },
        { name: "total_now", label: "Prod Totale Instantanée (W)", selector: { entity: { domain: "sensor" } } },
        { name: "total_obj", label: "Objectif Prod Jour (kWh)", selector: { entity: { domain: "sensor" } } },
        { name: "total_month", label: "Prod Totale Mois (kWh)", selector: { entity: { domain: "sensor" } } },
        { name: "total_year", label: "Prod Totale Année (kWh)", selector: { entity: { domain: "sensor" } } },
        { name: "background", label: "Image de fond (URL)", selector: { text: {} } }
      ],
      beem_units: [
        { name: "beem_m_w", label: "Beem Maison - Watts", selector: { entity: { domain: "sensor" } } },
        { name: "beem_m_d", label: "Beem Maison - Jour (kWh)", selector: { entity: { domain: "sensor" } } },
        { name: "beem_s_w", label: "Beem Spa - Watts", selector: { entity: { domain: "sensor" } } },
        { name: "beem_s_d", label: "Beem Spa - Jour (kWh)", selector: { entity: { domain: "sensor" } } },
        { name: "beem_i_w", label: "Beem IBC - Watts", selector: { entity: { domain: "sensor" } } },
        { name: "beem_i_d", label: "Beem IBC - Jour (kWh)", selector: { entity: { domain: "sensor" } } }
      ],
      batteries: [
        { name: "bat1_soc", label: "Bat 1 - SOC %", selector: { entity: {} } },
        { name: "bat1_pwr", label: "Bat 1 - Watts", selector: { entity: {} } },
        { name: "bat2_soc", label: "Bat 2 - SOC %", selector: { entity: {} } },
        { name: "bat2_pwr", label: "Bat 2 - Watts", selector: { entity: {} } },
        { name: "bat3_soc", label: "Bat 3 - SOC %", selector: { entity: {} } },
        { name: "bat4_soc", label: "Bat 4 - SOC %", selector: { entity: {} } },
        { name: "bat5_soc", label: "Bat 5 - SOC %", selector: { entity: {} } }
      ],
      economy: [
        { name: "eco1_ent", label: "Eco 1 - Entité", selector: { entity: {} } }, { name: "eco1_nom", label: "Eco 1 - Nom", selector: { text: {} } },
        { name: "eco2_ent", label: "Eco 2 - Entité", selector: { entity: {} } }, { name: "eco2_nom", label: "Eco 2 - Nom", selector: { text: {} } },
        { name: "eco3_ent", label: "Eco 3 - Entité", selector: { entity: {} } }, { name: "eco3_nom", label: "Eco 3 - Nom", selector: { text: {} } },
        { name: "eco4_ent", label: "Eco 4 - Entité", selector: { entity: {} } }, { name: "eco4_nom", label: "Eco 4 - Nom", selector: { text: {} } },
        { name: "eco5_ent", label: "Eco 5 - Entité", selector: { entity: {} } }, { name: "eco5_nom", label: "Eco 5 - Nom", selector: { text: {} } }
      ],
      objectifs: [
        { name: "obj1_ent", label: "Objectif 1 - Capteur", selector: { entity: {} } }, { name: "obj1_target", label: "Cible (ex: 100%)", selector: { text: {} } },
        { name: "obj2_ent", label: "Objectif 2 - Capteur", selector: { entity: {} } }, { name: "obj2_target", label: "Cible", selector: { text: {} } }
      ]
    };

    return html`
      <div class="editor-tabs">
        ${Object.keys(schemas).map(t => html`
          <button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>
            ${t.replace('_', ' ').toUpperCase()}
          </button>
        `)}
      </div>
      <div class="editor-form">
        <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
      </div>
    `;
  }
  static styles = css`
    .editor-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 20px; }
    button { background: #333; color: #fff; border: 1px solid #444; padding: 6px 10px; cursor: pointer; font-size: 9px; border-radius: 4px; transition: 0.2s; }
    button.active { background: #ffc107; color: #000; border-color: #ffc107; font-weight: bold; }
    .editor-form { background: #222; padding: 15px; border-radius: 8px; }
  `;
}

if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'solar'; }
  setConfig(config) { this.config = config; }

  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }

  _renderPanel(name, w, d) {
    if (!w) return html``;
    const valW = parseInt(this._get(w));
    return html`
      <div class="row">
        <div class="icon-circle ${valW > 5 ? 'active' : ''}"><ha-icon icon="mdi:solar-panel"></ha-icon></div>
        <div class="info"><div>${name}</div><div class="bar-bg"><div class="bar" style="width:${Math.min(valW/12, 100)}%"></div></div></div>
        <div class="badge">NOW<b>${valW}W</b></div>
        <div class="badge green">JOUR<b>${this._get(d)}</b></div>
      </div>`;
  }

  _renderTab() {
    const c = this.config;
    if (this._tab === 'solar') {
      return html`
        <div class="header-stats">
          <div><small>NOW</small><br>${this._get(c.total_now)}W</div>
          <div><small>OBJ</small><br>${this._get(c.total_obj)}</div>
          <div><small>MOIS</small><br>${this._get(c.total_month)}</div>
          <div><small>AN</small><br>${this._get(c.total_year)}</div>
        </div>
        <div class="scroll-area">
          ${this._renderPanel("Maison", c.beem_m_w, c.beem_m_d)}
          ${this._renderPanel("Spa", c.beem_s_w, c.beem_s_d)}
          ${this._renderPanel("IBC", c.beem_i_w, c.beem_i_d)}
        </div>`;
    }
    if (this._tab === 'bat') {
      return html`<div class="scroll-area">
        ${[1,2,3,4,5].map(i => c[`bat${i}_soc`] ? html`
          <div class="row">
            <ha-icon icon="mdi:battery"></ha-icon>
            <div class="info">Pack ${i} <div class="bar-bg"><div class="bar" style="width:${this._get(c[`bat${i}_soc`])}%"></div></div></div>
            <div class="badge">${this._get(c[`bat${i}_soc`])}%</div>
          </div>` : '')}
      </div>`;
    }
    if (this._tab === 'eco') {
        return html`<div class="grid-eco">
            ${[1,2,3,4,5].map(i => c[`eco${i}_ent`] ? html`
                <div class="eco-card"><b>${this._get(c[`eco${i}_ent`])}</b><br><small>${c[`eco${i}_nom`]}</small></div>
            ` : '')}
        </div>`;
    }
  }

  render() {
    return html`
      <ha-card style="height:500px">
        <div class="main" style="background-image:url('${this.config.background}')">
          <div class="overlay">
            <div class="title">${this.config.title || 'SOLAR MASTER'}</div>
            <div class="content">${this._renderTab()}</div>
            <div class="nav">
              <ha-icon class="${this._tab==='solar'?'active':''}" icon="mdi:solar-power" @click=${()=>this._tab='solar'}></ha-icon>
              <ha-icon class="${this._tab==='bat'?'active':''}" icon="mdi:battery-charging" @click=${()=>this._tab='bat'}></ha-icon>
              <ha-icon class="${this._tab==='eco'?'active':''}" icon="mdi:cash-100" @click=${()=>this._tab='eco'}></ha-icon>
            </div>
          </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 20px; overflow: hidden; background: #000; color: #fff; font-family: sans-serif; }
    .main { height: 100%; background-size: cover; }
    .overlay { height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; }
    .title { text-align: center; font-size: 10px; letter-spacing: 3px; opacity: 0.6; margin-bottom: 10px; }
    .content { flex: 1; overflow: hidden; }
    .header-stats { display: flex; justify-content: space-between; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; margin-bottom: 15px; text-align: center; font-size: 12px; }
    .header-stats small { font-size: 8px; opacity: 0.5; }
    .scroll-area { overflow-y: auto; height: 100%; padding-right: 5px; }
    .row { display: flex; align-items: center; background: rgba(255,255,255,0.05); margin-bottom: 8px; padding: 10px; border-radius: 12px; gap: 10px; }
    .icon-circle { width: 30px; height: 30px; border-radius: 50%; background: rgba(255,193,7,0.1); display: flex; align-items: center; justify-content: center; }
    .icon-circle.active { color: #ffc107; box-shadow: 0 0 10px #ffc10744; }
    .info { flex: 1; font-size: 11px; font-weight: bold; }
    .bar-bg { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 4px; }
    .bar { height: 100%; background: #ffc107; border-radius: 2px; }
    .badge { background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 6px; font-size: 8px; text-align: center; }
    .badge b { display: block; font-size: 10px; color: #ffc107; }
    .green b { color: #4caf50; }
    .grid-eco { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .eco-card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
    .nav { display: flex; justify-content: space-around; padding-top: 10px; border-top: 1px solid #ffffff1a; }
    .nav ha-icon { opacity: 0.3; cursor: pointer; }
    .nav ha-icon.active { opacity: 1; color: #ffc107; }
  `;
}

if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "solar-master-card", name: "Solar Master Visual Editor", preview: true });
