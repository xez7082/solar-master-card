import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================================
 * ÉDITEUR (VISUAL EDITOR)
 * ==========================================================
 */
class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _selectedTab: { type: String } }; }
  
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
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 400, max: 1200 } } },
        { name: "title_left", label: "Titre Groupe Gauche", selector: { text: {} } },
        { name: "title_right", label: "Titre Groupe Droite", selector: { text: {} } },
        { name: "total_now", label: "Production Actuelle (W)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif Production (%)", selector: { entity: {} } },
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `NOM du Diagnostic d${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `ENTITÉ du Diagnostic d${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [...[1, 2, 3, 4].map(i => [
        { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
        { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
        { name: `b${i}_v`, label: `Voltage ${i}`, selector: { entity: {} } },
        { name: `b${i}_a`, label: `Ampérage ${i}`, selector: { entity: {} } },
        { name: `b${i}_temp`, label: `Température ${i}`, selector: { entity: {} } }
      ]).flat()],
      tab_eco: [
        { name: "eco_money", label: "Total Économisé (€)", selector: { entity: {} } },
        { name: "eco_target", label: "Objectif Financier (€)", selector: { number: { min: 0 } } },
        { name: "eco_day_euro", label: "Gain du Jour (€)", selector: { entity: {} } },
        { name: "eco_year_euro", label: "Gain Annuel (€)", selector: { entity: {} } },
        { name: "main_cons_entity", label: "Consommation Maison (W)", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="edit-tabs">
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>SOLAIRE</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIES</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ÉCONOMIE</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }

  static styles = css`
    .edit-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
    button { flex: 1; padding: 12px; background: #2c2c2c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }
    button.active { background: #ffc107; color: black; }
  `;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================================
 * CARTE PRINCIPALE
 * ==========================================================
 */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  
  static getStubConfig() {
    return {
      card_height: 600,
      title_left: "Entrées",
      title_right: "Sorties",
      d4_label: "Tension PV1",
      d5_label: "Tension PV2"
    };
  }

  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  
  constructor() { super(); this._tab = 'SOLAIRE'; }
  
  setConfig(config) { this.config = config; }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '' };
    const s = this.hass.states[id];
    return { val: s.state, unit: s.attributes.unit_of_measurement || '' };
  }

  _renderMiniDiag(i, side) {
    const c = this.config;
    const label = c[`d${i}_label`] || `Diag ${i}`;
    const entityId = c[`d${i}_entity`];
    if (!entityId) return html`<div class="mini-diag empty"></div>`;
    const data = this._getVal(entityId);
    return html`
      <div class="mini-diag ${side}">
        <span class="m-l">${label}</span>
        <span class="m-v">${data.val}<small>${data.unit}</small></span>
      </div>`;
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    return html`
      <ha-card style="height:${c.card_height || 600}px;">
        <div class="overlay">
          <div class="main-content">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : this._tab === 'BATTERIE' ? this._renderBattery() : this._renderEco()}
          </div>
          <div class="footer">
            <div class="f-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>SOLAIRE</div>
            <div class="f-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}>BATTERIES</div>
            <div class="f-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}>ÉCONOMIE</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const obj = this.hass.states[c.total_obj_pct]?.state || 0;
    return html`
      <div class="page">
        <div class="cockpit">
          <div class="side">
            <div class="side-title">${c.title_left}</div>
            ${[4, 5, 6].map(i => this._renderMiniDiag(i, 'l'))}
          </div>
          <div class="center">
            <div class="big-val">${prod.val}<small>${prod.unit || 'W'}</small></div>
            <div class="bar"><div class="fill" style="width:${obj}%"></div></div>
          </div>
          <div class="side">
            <div class="side-title right">${c.title_right}</div>
            ${[7, 8, 9].map(i => this._renderMiniDiag(i, 'r'))}
          </div>
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`<div class="page scroll">
      ${[1, 2, 3, 4].map(i => {
        if (!c[`b${i}_s`]) return '';
        const soc = this._getVal(c[`b${i}_s`]);
        return html`
          <div class="rack">
            <div class="r-h">${c[`b${i}_n`] || 'RACK '+i} <span>${soc.val}%</span></div>
            <div class="v-meter">${[...Array(10)].map((_, idx) => html`<div class="v-seg ${parseInt(soc.val) > (idx * 10) ? 'on' : ''}"></div>`)}</div>
            <div class="r-grid">
              <span>${this._getVal(c[`b${i}_v`]).val}V</span>
              <span>${this._getVal(c[`b${i}_a`]).val}A</span>
              <span>${this._getVal(c[`b${i}_temp`]).val}°C</span>
            </div>
          </div>`;
      })}
    </div>`;
  }

  _renderEco() {
    const c = this.config;
    const money = this._getVal(c.eco_money);
    const target = c.eco_target || 1000;
    const pct = Math.min(100, (parseFloat(money.val) / target) * 100);
    return html`<div class="page">
      <div class="eco-hero">
        <div class="e-val">${money.val}€</div>
        <div class="e-bar"><div class="e-fill" style="width:${pct}%"></div></div>
        <div class="e-sub">Objectif: ${target}€</div>
      </div>
      <div class="eco-grid">
        <div class="e-card">JOUR: ${this._getVal(c.eco_day_euro).val}€</div>
        <div class="e-card">ANNÉE: ${this._getVal(c.eco_year_euro).val}€</div>
        <div class="e-card">MAISON: ${this._getVal(c.main_cons_entity).val}W</div>
      </div>
    </div>`;
  }

  static styles = css`
    ha-card { background: #000; color: white; border-radius: 20px; overflow: hidden; font-family: sans-serif; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; background: linear-gradient(180deg, #131c25 0%, #000 100%); }
    .cockpit { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; }
    .side { flex: 1; }
    .side-title { font-size: 10px; color: #00f9f9; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; }
    .side-title.right { text-align: right; color: #ffc107; }
    .mini-diag { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; margin-bottom: 6px; border-left: 3px solid #00f9f9; }
    .mini-diag.r { border-left: none; border-right: 3px solid #ffc107; text-align: right; }
    .m-l { font-size: 8px; opacity: 0.7; display: block; font-weight: bold; }
    .m-v { font-size: 13px; font-weight: bold; }
    .center { text-align: center; width: 140px; }
    .big-val { font-size: 45px; font-weight: 900; color: #ffc107; }
    .bar { height: 4px; background: #222; border-radius: 4px; margin-top: 10px; overflow: hidden; }
    .fill { height: 100%; background: #ffc107; }
    .footer { display: flex; justify-content: space-around; padding-top: 20px; border-top: 1px solid #333; margin-top: auto; }
    .f-btn { cursor: pointer; opacity: 0.5; font-size: 10px; font-weight: bold; }
    .f-btn.active { opacity: 1; color: #ffc107; }
    .rack { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; margin-bottom: 10px; border-left: 4px solid #4caf50; }
    .r-h { display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; }
    .v-meter { display: flex; gap: 2px; height: 5px; margin: 10px 0; }
    .v-seg { flex: 1; background: #222; }
    .v-seg.on { background: #4caf50; }
    .r-grid { display: flex; justify-content: space-between; font-size: 11px; color: #00f9f9; }
    .eco-hero { text-align: center; padding: 25px; background: rgba(76,175,80,0.1); border-radius: 15px; margin-bottom: 20px; }
    .e-val { font-size: 40px; font-weight: bold; color: #4caf50; }
    .e-bar { height: 8px; background: #222; border-radius: 10px; margin: 15px 0; }
    .e-fill { height: 100%; background: #4caf50; }
    .eco-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .e-card { background: rgba(255,255,255,0.03); padding: 10px; border-radius: 8px; text-align: center; font-size: 10px; }
    .scroll { overflow-y: auto; }
    .empty { visibility: hidden; height: 40px; }
    small { font-size: 12px; margin-left: 2px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);

// Ajout pour que HA reconnaisse la carte dans la liste
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master Card",
  description: "Une carte complète pour le solaire, batteries et économies."
});
