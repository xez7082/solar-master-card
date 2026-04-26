console.log("%c ☀️ SOLAR MASTER CARD %c v1.0.0 ", "color: white; background: #ffc107; font-weight: 700;", "color: #ffc107; background: #222;");

import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- ÉDITEUR ---
class SolarCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {} }; }
  setConfig(config) { this._config = config; }
  render() {
    if (!this.hass || !this._config) return html``;
    return html`
      <div style="padding: 20px;">
        <p>L'éditeur est en cours de chargement...</p>
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${[{ name: "title", label: "Titre", selector: { text: {} } }]}
          @value-changed=${this._valueChanged}>
        </ha-form>
      </div>
    `;
  }
  _valueChanged(ev) {
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
}
customElements.define("solar-card-editor", SolarCardEditor);

// --- CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {},
      _tab: { type: String }
    };
  }

  constructor() {
    super();
    this._tab = 'status';
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this.config = config;
  }

  getCardSize() { return 3; }

  _get(id) {
    if (!this.hass || !id || !this.hass.states[id]) return '--';
    return this.hass.states[id].state;
  }

  render() {
    if (!this.hass || !this.config) return html``;
    const c = this.config;

    return html`
      <ha-card>
        <div class="main-container">
          <div class="header">${c.title || 'SOLAR SYSTEM'}</div>
          <div class="content">
             <div class="val">${this._get(c.beem_power)} W</div>
             <div class="label">PRODUCTION</div>
          </div>
          <div class="navbar">
            <ha-icon icon="mdi:solar-power" @click=${() => this._tab = 'status'}></ha-icon>
            <ha-icon icon="mdi:battery" @click=${() => this._tab = 'battery'}></ha-icon>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles() {
    return css`
      ha-card { background: #1c1c1c; color: white; border-radius: 15px; padding: 15px; height: 300px; }
      .main-container { height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
      .header { text-align: center; opacity: 0.7; letter-spacing: 2px; }
      .content { text-align: center; padding: 40px 0; }
      .val { font-size: 45px; color: #ffc107; }
      .label { font-size: 12px; opacity: 0.5; }
      .navbar { display: flex; justify-content: space-around; border-top: 1px solid #333; padding-top: 10px; }
      ha-icon { cursor: pointer; --mdc-icon-size: 30px; }
    `;
  }
}

// ENREGISTREMENT
if (!customElements.get("solar-master-card")) {
  customElements.define("solar-master-card", SolarMasterCard);
  console.log("✅ Solar Master Card enregistrée avec succès !");
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master Card",
  preview: true
});
