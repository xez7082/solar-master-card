// On s'assure que le script démarre
console.log("LOG: Chargement de Solar Master Card...");

import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class SolarMasterCard extends LitElement {
  static get properties() { return { hass: {}, config: {} }; }
  
  setConfig(config) {
    this.config = config;
  }

  render() {
    if (!this.hass || !this.config) return html``;
    return html`
      <ha-card>
        <div style="padding: 20px; text-align: center;">
          <h2 style="color: #ffc107;">${this.config.title || 'Solar Master'}</h2>
          <p>Le système est prêt.</p>
          <ha-icon icon="mdi:solar-power" style="--mdc-icon-size: 50px; color: #ffc107;"></ha-icon>
        </div>
      </ha-card>
    `;
  }
}

// CETTE PARTIE EST CRUCIALE :
if (!customElements.get("solar-master-card")) {
  customElements.define("solar-master-card", SolarMasterCard);
  console.log("LOG: Element 'solar-master-card' défini avec succès.");
}

// Enregistrement pour l'interface de sélection des cartes
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master Card",
  preview: true
});
