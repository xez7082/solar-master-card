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
        { name: "bg_url", label: "URL Image de Fond", selector: { text: {} } },
        { name: "bg_opacity", label: "Luminosité Fond (0.1 à 1)", selector: { number: { min: 0, max: 1, step: 0.1, mode: "slider" } } },
        { name: "bg_blur", label: "Flou Fond (px)", selector: { number: { min: 0, max: 20, step: 1, mode: "slider" } } },
        { name: "title_left", label: "Titre Groupe Gauche", selector: { text: {} } },
        { name: "title_right", label: "Titre Groupe Droite", selector: { text: {} } },
        { name: "total_now", label: "Production Actuelle (W)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau ${i}` },
          { name: `p${i}_w`, label: `Entité Watts P${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `NOM Diag d${i}` },
          { name: `d${i}_entity`, label: `ENTITÉ Diag d${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [...[1, 2, 3, 4].map(i => [
        { name: `b${i}_n`, label: `Nom Batterie ${i}` },
        { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
        { name: `b${i}_v`, label: `Voltage ${i}`, selector: { entity: {} } },
        { name: `b${i}_a`, label: `Ampérage ${i}`, selector: { entity: {} } },
        { name: `b${i}_temp`, label: `Température ${i}`, selector: { entity: {} } }
      ]).flat()],
      tab_eco: [
        { name: "eco_money", label: "Total Économisé (€)", selector: { entity: {} } },
        { name: "eco_target", label: "Objectif (€)", selector: { number: { min: 0 } } },
        { name: "eco_day_euro", label: "Gain Jour (€)", selector: { entity: {} } },
        { name: "eco_year_euro", label: "Gain An (€)", selector: { entity: {} } },
        { name: "kwh_price", label: "Tarif EDF au kWh (€)", selector: { entity: {} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } }
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
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '' };
    const s = this.hass.states[id];
    return { val: s.state, unit: s.attributes.unit_of_measurement || '' };
  }

  _renderSun() {
    if (!this.hass.states['sun.sun']) return html``;
    const elev = this.hass.states['sun.sun'].attributes.elevation || 0;
    const pos = ((elev + 20) / 110) * 100;
    return html`
      <div class="sun-track">
        <svg viewBox="0 0 400 40"><path d="M10,35 Q200,0 390,35" fill="none" stroke="rgba(255,193,7,0.2)" stroke-dasharray="4"/></svg>
        <div class="sun-ico" style="left:${Math.max(5, Math.min(92, pos))}%;">
          <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
          <span>${elev.toFixed(1)}°</span>
        </div>
      </div>`;
  }

  _renderMiniDiag(i, side) {
    const c = this.config;
    if (!c[`d${i}_entity`]) return html`<div class="mini-diag empty"></div>`;
    const data = this._getVal(c[`d${i}_entity`]);
    return html`
      <div class="mini-diag ${side}">
        <span class="m-l">${c[`d${i}_label`] || `Diag ${i}`}</span>
        <span class="m-v">${data.val}<small>${data.unit}</small></span>
      </div>`;
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        ${c.bg_url ? html`<div class="bg-layer" style="background-image:url('${c.bg_url}'); opacity:${c.bg_opacity || 0.4}; filter:blur(${c.bg_blur || 0}px);"></div>` : ''}
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
    return html`
      <div class="page">
        ${this._renderSun()}
        <div class="cockpit">
          <div class="side">
            <div class="side-title">${c.title_left}</div>
            ${[4, 5, 6].map(i => this._renderMiniDiag(i, 'l'))}
          </div>
          <div class="center">
            <div class="big-val">${prod.val}<small>${prod.unit || 'W'}</small></div>
          </div>
          <div class="side">
            <div class="side-title right">${c.title_right}</div>
            ${[7, 8, 9].map(i => this._renderMiniDiag(i, 'r'))}
          </div>
        </div>
        <div class="panels-row">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`p${i}_w`]) return '';
            const s = this._getVal(c[`p${i}_w`]);
            const colors = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"];
            return html`
              <div class="hud-item">
                <div class="hud-circle" style="border-color:${colors[i-1]}44">
                  <div class="scan" style="border-top-color:${colors[i-1]}"></div>
                  <div class="v" style="color:${colors[i-1]}">${Math.round(s.val)}</div>
                </div>
                <div class="hud-n">${c[`p${i}_name`] || 'P'+i}</div>
              </div>`;
          })}
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
            <div class="r-h"><span>${c[`b${i}_n`] || 'BAT '+i}</span> <b>${soc.val}%</b></div>
            <div class="v-meter">${[...Array(10)].map((_, idx) => html`<div class="v-seg ${parseInt(soc.val) > (idx * 10) ? 'on' : ''}"></div>`)}</div>
            <div class="r-grid">
              <div class="r-item"><span>V</span><br><b>${this._getVal(c[`b${i}_v`]).val}</b></div>
              <div class="r-item"><span>A</span><br><b>${this._getVal(c[`b${i}_a`]).val}</b></div>
              <div class="r-item"><span>TEMP</span><br><b>${this._getVal(c[`b${i}_temp`]).val}</b></div>
            </div>
          </div>`;
      })}
    </div>`;
  }

  _renderEco() {
    const c = this.config;
    const money = this._getVal(c.eco_money);
    const target = c.eco_target || 1000;
    const kwh = this._getVal(c.kwh_price);
    return html`<div class="page">
      <div class="eco-hero">
        <div class="e-val">${money.val}€</div>
        <div class="e-bar"><div class="e-fill" style="width:${Math.min(100, (parseFloat(money.val)/target)*100)}%"></div></div>
        <div class="e-sub">Objectif: ${target}€</div>
      </div>
      <div class="eco-grid">
        <div class="e-card"><span>JOUR</span><br><b>${this._getVal(c.eco_day_euro).val}€</b></div>
        <div class="e-card"><span>AN</span><br><b>${this._getVal(c.eco_year_euro).val}€</b></div>
        <div class="e-card"><span>TARIF kWh</span><br><b>${kwh.val}€</b></div>
        <div class="e-card"><span>MAISON</span><br><b>${this._getVal(c.main_cons_entity).val}W</b></div>
      </div>
    </div>`;
  }

  static styles = css`
    ha-card { background: #000; color: white; border-radius: 24px; overflow: hidden; position: relative; font-family: sans-serif; }
    .bg-layer { position: absolute; top:0; left:0; width:100%; height:100%; background-size:cover; background-position:center; z-index:0; }
    .overlay { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; padding:20px; background: radial-gradient(circle at 50% 0%, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.8) 100%); box-sizing: border-box;}
    .main-content { flex:1; }
    .sun-track { position:relative; height:40px; width:100%; margin-bottom:10px; }
    .sun-ico { position:absolute; bottom:5px; display:flex; flex-direction:column; align-items:center; transition: 1s; }
    .sun-ico ha-icon { --mdc-icon-size: 18px; color: #ffc107; }
    .sun-ico span { font-size: 8px; font-weight: bold; }
    .cockpit { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; }
    .side { flex:1; }
    .side-title { font-size:10px; color:#00f9f9; font-weight:900; margin-bottom:8px; text-transform:uppercase; }
    .side-title.right { text-align:right; color:#ffc107; }
    .mini-diag { background:rgba(0,0,0,0.6); padding:8px; border-radius:8px; margin-bottom:5px; border-left:4px solid #00f9f9; backdrop-filter:blur(5px); }
    .mini-diag.r { border-left:none; border-right:4px solid #ffc107; text-align:right; }
    .m-l { font-size:8px; opacity:0.6; display:block; font-weight:bold; }
    .m-v { font-size:13px; font-weight:900; }
    .center { text-align:center; width:140px; }
    .big-val { font-size:48px; font-weight:900; color:#ffc107; }
    .panels-row { display:flex; justify-content:space-around; margin-top:20px; }
    .hud-circle { width:65px; height:65px; border-radius:50%; border:2px solid; position:relative; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); }
    .scan { position:absolute; width:100%; height:100%; border:2px solid transparent; border-radius:50%; animation:rotate 4s linear infinite; top:-2px; left:-2px; padding:2px; box-sizing:content-box; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .v { font-size:14px; font-weight:bold; }
    .hud-n { font-size:9px; margin-top:5px; text-align:center; font-weight:bold; opacity:0.8; }
    .rack { background:rgba(0,0,0,0.7); padding:12px; border-radius:15px; margin-bottom:10px; border-left:4px solid #4caf50; }
    .v-meter { display:flex; gap:2px; height:5px; margin:10px 0; }
    .v-seg { flex:1; background:rgba(255,255,255,0.1); }
    .v-seg.on { background:#4caf50; box-shadow:0 0 5px #4caf50; }
    .r-grid { display:grid; grid-template-columns: 1fr 1fr 1fr; text-align:center; }
    .r-item span { font-size:8px; opacity:0.6; }
    .r-item b { font-size:11px; color:#00f9f9; }
    .eco-hero { text-align:center; padding:20px; background:rgba(76,175,80,0.1); border-radius:15px; margin-bottom:15px; }
    .e-val { font-size:40px; font-weight:900; color:#4caf50; }
    .e-bar { height:8px; background:rgba(255,255,255,0.1); border-radius:10px; margin:10px 0; overflow:hidden; }
    .e-fill { height:100%; background:#4caf50; }
    .eco-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .e-card { background:rgba(0,0,0,0.6); padding:10px; border-radius:10px; text-align:center; }
    .e-card span { font-size:8px; opacity:0.7; }
    .footer { display:flex; justify-content:space-around; padding:15px 0; border-top:1px solid rgba(255,255,255,0.1); margin-top:auto; }
    .f-btn { cursor:pointer; opacity:0.4; font-size:10px; font-weight:900; transition:0.3s; }
    .f-btn.active { opacity:1; color:#ffc107; }
    .scroll { overflow-y:auto; max-height:400px; }
    .empty { visibility:hidden; height:40px; }
    small { font-size:10px; margin-left:2px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);

window.customCards = window.customCards || [];
window.customCards.push({ type: "solar-master-card", name: "Solar Master Card", description: "Version 1.8.0 - Full Features" });
