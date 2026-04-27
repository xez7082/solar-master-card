import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

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
        { name: `b${i}_temp`, label: `Température ${i}`, selector: { entity: {} } },
        { name: `b${i}_cap`, label: `Capacité ${i}`, selector: { entity: {} } }
      ]).flat()],
      tab_eco: [
        { name: "eco_money", label: "Total Économisé (€)", selector: { entity: {} } },
        { name: "eco_target", label: "Objectif Financier (€)", selector: { number: { min: 0 } } },
        { name: "eco_day_euro", label: "Gain du Jour (€)", selector: { entity: {} } },
        { name: "eco_year_euro", label: "Gain Annuel (€)", selector: { entity: {} } },
        { name: "kwh_price", label: "Prix du kWh (€)", selector: { entity: {} } },
        { name: "main_cons_entity", label: "Consommation Maison (W)", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="edit-tabs">
        ${['tab_solar', 'tab_batt', 'tab_eco'].map(t => html`
          <button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>
            ${t.replace('tab_', '').toUpperCase()}
          </button>
        `)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }

  static styles = css`
    .edit-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
    button { flex: 1; padding: 10px; background: #2c2c2c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px; }
    button.active { background: #ffc107; color: black; }
  `;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _smartGet(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '' };
    const stateObj = this.hass.states[id];
    return { val: stateObj.state, unit: stateObj.attributes.unit_of_measurement || '' };
  }

  _renderMiniDiag(i, side) {
    const c = this.config;
    const label = c[`d${i}_label`];
    const entity = c[`d${i}_entity`];
    if (!entity) return html`<div class="mini-diag empty"></div>`;
    const d = this._smartGet(entity);
    return html`
      <div class="mini-diag ${side}">
        <span class="m-l">${label || `Diag ${i}`}</span>
        <span class="m-v">${d.val}<small>${d.unit}</small></span>
      </div>`;
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    return html`
      <ha-card style="height:${c.card_height || 650}px;">
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
    const totalProd = this._smartGet(c.total_now);
    return html`
      <div class="page">
        <div class="cockpit-container">
          <div class="cockpit-side left">
            <div class="side-title">${c.title_left}</div>
            ${[4, 5, 6].map(i => this._renderMiniDiag(i, 'l'))}
          </div>
          <div class="total-block">
            <div class="big-val">${totalProd.val}<small>${totalProd.unit || 'W'}</small></div>
          </div>
          <div class="cockpit-side right">
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
        const soc = this._smartGet(c[`b${i}_s`]);
        const v = this._smartGet(c[`b${i}_v`]);
        const a = this._smartGet(c[`b${i}_a`]);
        return html`
          <div class="rack">
            <div class="r-h">${c[`b${i}_n`] || 'BAT '+i} <b>${soc.val}%</b></div>
            <div class="v-meter">${[...Array(10)].map((_, idx) => html`<div class="v-seg ${parseInt(soc.val) > (idx * 10) ? 'on' : ''}"></div>`)}</div>
            <div class="r-grid"><span>${v.val}V</span><span>${a.val}A</span><span>${this._smartGet(c[`b${i}_temp`]).val}°C</span></div>
          </div>`;
      })}
    </div>`;
  }

  _renderEco() {
    const c = this.config;
    const cur = this._smartGet(c.eco_money);
    return html`<div class="page">
      <div class="eco-hero"><div class="e-big">${cur.val}€</div><span>Total Économisé</span></div>
      <div class="eco-grid">
        <div class="e-card">JOUR: ${this._smartGet(c.eco_day_euro).val}€</div>
        <div class="e-card">AN: ${this._smartGet(c.eco_year_euro).val}€</div>
        <div class="e-card">KWH: ${this._smartGet(c.kwh_price).val}€</div>
        <div class="e-card">CONSO: ${this._smartGet(c.main_cons_entity).val}W</div>
      </div>
    </div>`;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 20px; overflow: hidden; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; background: linear-gradient(180deg, #1a2632 0%, #000 100%); }
    .cockpit-container { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
    .side-title { font-size: 10px; color: #00f9f9; margin-bottom: 8px; font-weight: bold; }
    .side-title.right { text-align: right; color: #ffc107; }
    .mini-diag { background: rgba(255,255,255,0.05); padding: 6px; border-radius: 4px; margin-bottom: 4px; border-left: 3px solid #00f9f9; }
    .mini-diag.r { border-left: none; border-right: 3px solid #ffc107; text-align: right; }
    .m-l { font-size: 8px; opacity: 0.6; display: block; }
    .m-v { font-size: 12px; font-weight: bold; }
    .big-val { font-size: 45px; font-weight: 900; color: #ffc107; text-align: center; }
    .footer { display: flex; justify-content: space-around; padding-top: 15px; border-top: 1px solid #333; margin-top: auto; }
    .f-btn { cursor: pointer; opacity: 0.5; font-size: 10px; font-weight: bold; }
    .f-btn.active { opacity: 1; color: #ffc107; }
    .rack { background: #111; padding: 10px; border-radius: 10px; margin-bottom: 8px; }
    .v-meter { display: flex; gap: 2px; height: 4px; margin: 8px 0; }
    .v-seg { flex: 1; background: #222; }
    .v-seg.on { background: #4caf50; }
    .r-grid { display: flex; justify-content: space-between; font-size: 10px; color: #00f9f9; }
    .eco-hero { text-align: center; padding: 20px; background: rgba(76,175,80,0.1); border-radius: 15px; margin-bottom: 15px; }
    .e-big { font-size: 35px; font-weight: bold; color: #4caf50; }
    .eco-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .e-card { background: #111; padding: 10px; border-radius: 8px; font-size: 11px; text-align: center; }
    .scroll { overflow-y: auto; }
    .empty { visibility: hidden; height: 35px; }
    small { font-size: 10px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
