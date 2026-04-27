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
          { name: `d${i}_label`, label: `NOM Diag d${i}`, selector: { text: {} } },
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
        ${c.bg_url ? html`
          <div class="bg-layer" style="
            background-image: url('${c.bg_url}');
            opacity: ${c.bg_opacity || 0.4};
            filter: blur(${c.bg_blur || 0}px);
          "></div>
        ` : ''}

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
    const panels = [
      { n: c.p1_name, e: c.p1_w, c: "#ffc107" }, { n: c.p2_name, e: c.p2_w, c: "#00f9f9" },
      { n: c.p3_name, e: c.p3_w, c: "#4caf50" }, { n: c.p4_name, e: c.p4_w, c: "#e91e63" }
    ].filter(p => p.e);

    return html`
      <div class="page">
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
          ${panels.map(p => {
            const s = this._getVal(p.e);
            return html`
              <div class="hud-item">
                <div class="hud-circle" style="border-color:${p.c}44">
                  <div class="scan" style="border-top-color:${p.c}"></div>
                  <div class="v" style="color:${p.c}">${Math.round(s.val)}<small>${s.unit}</small></div>
                </div>
                <div class="hud-n">${p.n}</div>
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
        const v = this._getVal(c[`b${i}_v`]);
        const a = this._getVal(c[`b${i}_a`]);
        const t = this._getVal(c[`b${i}_temp`]);
        return html`
          <div class="rack">
            <div class="r-h"><span>${c[`b${i}_n`] || 'BAT '+i}</span> <b>${soc.val}%</b></div>
            <div class="v-meter">${[...Array(10)].map((_, idx) => html`<div class="v-seg ${parseInt(soc.val) > (idx * 10) ? 'on' : ''}"></div>`)}</div>
            <div class="r-grid">
              <div class="r-item"><span>TENSION</span><br><b>${v.val}${v.unit}</b></div>
              <div class="r-item"><span>COURANT</span><br><b>${a.val}${a.unit}</b></div>
              <div class="r-item"><span>TEMP</span><br><b>${t.val}${t.unit}</b></div>
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
        <div class="e-sub">Objectif: ${target}€ (${Math.round(pct)}%)</div>
      </div>
      <div class="eco-grid">
        <div class="e-card"><span>JOUR</span><br><b>${this._getVal(c.eco_day_euro).val}€</b></div>
        <div class="e-card"><span>ANNÉE</span><br><b>${this._getVal(c.eco_year_euro).val}€</b></div>
        <div class="e-card"><span>CONSO MAISON</span><br><b>${this._getVal(c.main_cons_entity).val}W</b></div>
      </div>
    </div>`;
  }

  static styles = css`
    ha-card { background: #000; color: white; border-radius: 24px; overflow: hidden; position: relative; font-family: 'Segoe UI', Roboto, sans-serif; }
    .bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; z-index: 0; transition: 0.5s; }
    .overlay { position: relative; z-index: 1; height: 100%; display: flex; flex-direction: column; padding: 20px; background: radial-gradient(circle at 50% 0%, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%); }
    .main-content { flex: 1; }
    
    .cockpit { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; margin-bottom: 25px; }
    .side { flex: 1; }
    .side-title { font-size: 10px; color: #00f9f9; font-weight: 900; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px; }
    .side-title.right { text-align: right; color: #ffc107; }
    
    .mini-diag { background: rgba(0,0,0,0.5); padding: 8px 12px; border-radius: 8px; margin-bottom: 6px; border-left: 4px solid #00f9f9; backdrop-filter: blur(5px); }
    .mini-diag.r { border-left: none; border-right: 4px solid #ffc107; text-align: right; }
    .m-l { font-size: 8px; opacity: 0.6; display: block; font-weight: bold; }
    .m-v { font-size: 14px; font-weight: 900; }
    
    .center { text-align: center; width: 150px; }
    .big-val { font-size: 50px; font-weight: 900; color: #ffc107; text-shadow: 0 0 20px rgba(255,193,7,0.4); }
    
    .panels-row { display: flex; justify-content: space-around; margin-top: 20px; }
    .hud-circle { width: 75px; height: 75px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); }
    .scan { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 4s linear infinite; top:-2px; left:-2px; padding:2px; box-sizing: content-box; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .v { font-size: 14px; font-weight: bold; }
    .hud-n { font-size: 10px; margin-top: 8px; text-align: center; font-weight: bold; }

    .rack { background: rgba(0,0,0,0.6); padding: 15px; border-radius: 15px; margin-bottom: 12px; border-left: 5px solid #4caf50; backdrop-filter: blur(5px); }
    .r-h { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; }
    .v-meter { display: flex; gap: 3px; height: 6px; margin: 12px 0; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.1); border-radius: 2px; }
    .v-seg.on { background: #4caf50; box-shadow: 0 0 8px #4caf50; }
    .r-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; text-align: center; margin-top: 10px; }
    .r-item span { font-size: 8px; opacity: 0.6; }
    .r-item b { font-size: 12px; color: #00f9f9; }

    .eco-hero { text-align: center; padding: 30px; background: rgba(76,175,80,0.15); border-radius: 20px; margin-bottom: 20px; backdrop-filter: blur(10px); }
    .e-val { font-size: 45px; font-weight: 900; color: #4caf50; }
    .e-bar { height: 10px; background: rgba(255,255,255,0.1); border-radius: 10px; margin: 15px 0; overflow: hidden; }
    .e-fill { height: 100%; background: #4caf50; box-shadow: 0 0 15px #4caf50; }
    .eco-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
    .e-card { background: rgba(0,0,0,0.5); padding: 12px; border-radius: 12px; text-align: center; border-bottom: 3px solid #4caf50; }
    .e-card span { font-size: 8px; opacity: 0.7; }
    .e-card b { font-size: 13px; }

    .footer { display: flex; justify-content: space-around; padding: 15px 0; border-top: 1px solid rgba(255,255,255,0.1); }
    .f-btn { cursor: pointer; opacity: 0.4; font-size: 11px; font-weight: 900; letter-spacing: 1px; transition: 0.3s; }
    .f-btn.active { opacity: 1; color: #ffc107; transform: scale(1.1); }
    
    .scroll { overflow-y: auto; max-height: 420px; padding-right: 5px; }
    .empty { visibility: hidden; height: 45px; }
    small { font-size: 10px; margin-left: 2px; opacity: 0.8; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master Card",
  description: "Version 1.7.0 - Full Background & Advanced Features"
});
