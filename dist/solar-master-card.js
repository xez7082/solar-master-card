console.log("☀️ SOLAR MASTER CARD v1.0.0 chargé");

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
        <ha-form
          .hass=${this.hass}
          .data=${this._config}
          .schema=${[{ name: "title", label: "Titre de la carte", selector: { text: {} } }]}
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

// PROTECTION ENREGISTREMENT ÉDITEUR
if (!customElements.get("solar-card-editor")) {
    customElements.define("solar-card-editor", SolarCardEditor);
}

// --- CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static get properties() { return { hass: {}, config: {} }; }
  
  static getConfigElement() {
    return document.createElement("solar-card-editor");
  }

  setConfig(config) {
    this.config = config;
  }

  render() {
    if (!this.hass || !this.config) return html``;
    return html`
      <ha-card>
        <div style="padding: 20px; text-align: center;">
          <h2 style="color: #ffc107;">${this.config.title || 'Solar Master'}</h2>
          <p>Système Solar Storage Détecté</p>
          <ha-icon icon="mdi:solar-power" style="--mdc-icon-size: 60px; color: #ffc107;"></ha-icon>
        </div>
      </ha-card>
    `;
  }
}

// PROTECTION ENREGISTREMENT CARTE
if (!customElements.get("solar-master-card")) {
    customElements.define("solar-master-card", SolarMasterCard);
}

// CONFIGURATION HACS
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master Card",
  preview: true
});
