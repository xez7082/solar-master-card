import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- ÉDITEUR DE CONFIGURATION (L'interface visuelle dans HA) ---
class SolarCardEditor extends LitElement {
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
        { name: "title", label: "Nom du Système", selector: { text: {} } },
        { name: "background", label: "Image de fond (URL)", selector: { text: {} } }
      ],
      marstek: [
        { name: "marstek_soc", label: "Entité SOC Marstek", selector: { entity: { domain: "sensor" } } },
        { name: "marstek_temp", label: "Entité Température Marstek", selector: { entity: { domain: "sensor" } } }
      ],
      beem: [
        { name: "beem_power", label: "Puissance Beem (W)", selector: { entity: { domain: "sensor" } } },
        { name: "beem_day", label: "Production Jour Beem", selector: { entity: { domain: "sensor" } } }
      ]
    };

    return html`
      <div class="editor-tabs">
        ${Object.keys(schemas).map(t => html`
          <button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>
            ${t.toUpperCase()}
          </button>
        `)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.editor-tabs { display: flex; gap: 5px; margin-bottom: 15px; } button { padding: 8px; cursor: pointer; border-radius: 4px; border: none; background: #444; color: white; } button.active { background: #ffc107; color: black; font-weight: bold; }`;
}
customElements.define("solar-card-editor", SolarCardEditor);

// --- CARTE PRINCIPALE (Le Dashboard) ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'status'; }
  setConfig(config) { this.config = config; }

  _get(id) { return (this.hass && this.hass.states[id]) ? this.hass.states[id].state : '--'; }

  render() {
    const c = this.config;
    return html`
      <ha-card>
        <div class="glass-container">
          <div class="header">${c.title || 'SOLAR SYSTEM'}</div>
          
          <div class="content">
            ${this._tab === 'status' ? html`
              <div class="solar-stats">
                <div class="gauge">
                  <div class="val">${this._get(c.beem_power)} W</div>
                  <div class="label">PRODUCTION ACTUELLE</div>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="navbar">
            <ha-icon class="${this._tab==='status'?'active':''}" icon="mdi:solar-power" @click=${()=>this._tab='status'}></ha-icon>
            <ha-icon class="${this._tab==='battery'?'active':''}" icon="mdi:battery-charging" @click=${()=>this._tab='battery'}></ha-icon>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card { background: #1c1c1c; color: white; border-radius: 20px; overflow: hidden; height: 400px; }
    .glass-container { padding: 20px; height: 100%; display: flex; flex-direction: column; justify-content: space-between; background: linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.8)); }
    .header { text-align: center; font-size: 12px; letter-spacing: 3px; opacity: 0.7; }
    .solar-stats { text-align: center; }
    .val { font-size: 40px; color: #ffc107; font-weight: 200; }
    .navbar { display: flex; justify-content: space-around; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; }
    ha-icon { cursor: pointer; opacity: 0.4; }
    ha-icon.active { opacity: 1; color: #ffc107; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);

// Enregistrement pour HACS
window.customCards = window.customCards || [];
window.customCards.push({ type: "solar-master-card", name: "Solar Master Ultra", preview: true });
