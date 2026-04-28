import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class SolarMasterCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {}, _selectedTab: { type: String } };
  }
  constructor() { super(); this._selectedTab = 'tab_solar'; }
  setConfig(config) { this._config = config; }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const schemas = {
      tab_solar: [
        { name: "bg_url", label: "URL Image", selector: { text: {} } },
        { name: "card_height", label: "Hauteur (px)", selector: { number: { min: 400, max: 1000 } } },
        { name: "total_now", label: "Prod Totale (W)", selector: { entity: {} } },
        { name: "conso_entity", label: "Conso (W)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [
        ...[1, 2, 3, 4].map(i => [
          { name: `b${i}_n`, label: `Nom Bat ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
          { name: `b${i}_out`, label: `Watts Flux ${i}`, selector: { entity: {} } }
        ]).flat()
      ]
    };
    return html`
      <div class="edit-tabs">
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>SOLAIRE</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIE</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs { display: flex; gap: 4px; margin-bottom: 10px; } button { flex: 1; padding: 8px; cursor: pointer; background: #111; color: #666; border: 1px solid #333; border-radius: 4px; } button.active { background: #ffc107; color: #000; }`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '' };
    const s = this.hass.states[id];
    return { val: s.state, unit: s.attributes.unit_of_measurement || '' };
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    return html`
      <ha-card style="height:${c.card_height || 500}px; background: #000; color: white; overflow: hidden; position: relative;">
        ${c.bg_url ? html`<div style="background-image: url('${c.bg_url}'); opacity: 0.3; position: absolute; inset:0; background-size:cover; z-index:0;"></div>` : ''}
        <div style="height: 100%; display: flex; flex-direction: column; position: relative; z-index:1;">
          <div style="flex: 1; padding: 20px; overflow-y: auto;">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : this._renderBattery()}
          </div>
          <div class="nav">
            <div class="n-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>SOLAIRE</div>
            <div class="n-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}>BATTERIE</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    return html`
      <div style="text-align: center;">
        <div style="font-size: 32px; color: #ffc107; font-weight: bold;">${prod.val} W</div>
        <div style="font-size: 10px; color: #aaa;">PRODUCTION ACTUELLE</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 20px;">
          ${[1,2,3,4].map(i => c[`p${i}_w`] ? html`<div style="background: #111; padding: 10px; border-radius: 8px;">${c[`p${i}_name`]}: ${this._getVal(c[`p${i}_w`]).val}W</div>` : '')}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`
      <div>
        ${[1,2,3,4].map(i => {
          if(!c[`b${i}_s`]) return '';
          const soc = this._getVal(c[`b${i}_s`]).val;
          return html`
            <div style="margin-bottom: 15px;">
              <div style="display:flex; justify-content:between;"><span>${c[`b${i}_n`] || 'Bat '+i}</span><span>${soc}%</span></div>
              <div style="height:8px; background:#222; border-radius:4px; margin-top:5px;">
                <div style="height:100%; width:${soc}%; background:#00c853; border-radius:4px;"></div>
              </div>
            </div>`;
        })}
      </div>`;
  }

  static styles = css`
    .nav { display: flex; background: #0a0a0a; border-top: 1px solid #222; }
    .n-btn { flex: 1; padding: 15px; text-align: center; cursor: pointer; color: #555; font-size: 12px; font-weight: bold; }
    .n-btn.active { color: #ffc107; background: #111; }
  `;
}

customElements.define("solar-master-card", SolarMasterCard);
// Ajout de la config pour l'UI de sélection
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master Card",
  description: "Carte avancée pour le suivi solaire et batteries"
});
