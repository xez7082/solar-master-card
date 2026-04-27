import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- 1. L'ÉDITEUR VISUEL COMPLET ---
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
        { name: "entity_weather", label: "Météo", selector: { entity: { domain: "weather" } } },
        { name: "total_now", label: "Prod. Totale (W)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif Prod (%)", selector: { entity: {} } },
        { name: "grid_flow", label: "Réseau (W)", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [{ name: `p${i}_name`, label: `Nom P${i}` }, { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }]).flat(),
        ...[1,2,3,4,5,6].map(i => [{ name: `d${i}_label`, label: `Diag ${i} Nom` }, { name: `d${i}_entity`, label: `Diag ${i} Entité`, selector: { entity: {} } }]).flat()
      ],
      tab_batt: [
        ...[1,2,3,4].map(i => [
            { name: `b${i}_n`, label: `Nom Batterie ${i}` },
            { name: `b${i}_s`, label: `SOC % Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_v`, label: `Sensor GAUCHE (V) Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_temp`, label: `Température Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_cap`, label: `Capacité Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_a`, label: `Sensor DROITE (A) Bat ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_eco: [
        { name: "eco_money", label: "Total Économisé (€)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gain du Jour (€)", selector: { entity: {} } },
        { name: "eco_year_euro", label: "Gain Annuel (€)", selector: { entity: {} } },
        { name: "kwh_price", label: "Prix kWh (€)", selector: { entity: {} } },
        { name: "eco_target", label: "Objectif (€)", selector: { number: {} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="edit-tabs">
        ${['tab_solar','tab_batt','tab_eco'].map(t => html`<button class="${this._selectedTab===t?'active':''}" @click=${()=>this._selectedTab=t}>${t.replace('tab_','').toUpperCase()}</button>`)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs{display:flex;gap:5px;margin-bottom:15px}button{flex:1;padding:10px;background:#2c2c2c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:bold;font-size:10px}button.active{background:#ffc107;color:#000}`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- 2. LA CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }
  _getU(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].attributes.unit_of_measurement || '' : ''; }
  
  _translateWeather(state) {
    const dict = {
      'sunny': 'Ensoleillé', 'clear-night': 'Nuit Claire', 'cloudy': 'Nuageux',
      'fog': 'Brouillard', 'hail': 'Grêle', 'lightning': 'Orages',
      'partlycloudy': 'Éclaircies', 'pouring': 'Averses', 'rainy': 'Pluvieux',
      'snowy': 'Neige', 'windy': 'Venteux'
    };
    return dict[state.toLowerCase()] || state;
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        <div class="overlay">
          <div class="top-nav">
            <div class="t-badge"><ha-icon icon="mdi:weather-sunny"></ha-icon> ${this._translateWeather(this._get(c.entity_weather))}</div>
            <div class="t-badge"><ha-icon icon="mdi:transmission-tower"></ha-icon> ${this._get(c.grid_flow)} W</div>
            <div class="t-badge green">${this._get(c.eco_money)}€</div>
          </div>

          <div class="main-content">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : this._tab === 'BATTERIE' ? this._renderBattery() : this._renderEco()}
          </div>

          <div class="footer">
            <div class="f-btn ${this._tab==='SOLAIRE'?'active':''}" @click=${()=>this._tab='SOLAIRE'}><ha-icon icon="mdi:solar-power"></ha-icon><span>SOLAIRE</span></div>
            <div class="f-btn ${this._tab==='BATTERIE'?'active':''}" @click=${()=>this._tab='BATTERIE'}><ha-icon icon="mdi:battery-high"></ha-icon><span>BATTERIES</span></div>
            <div class="f-btn ${this._tab==='ECONOMIE'?'active':''}" @click=${()=>this._tab='ECONOMIE'}><ha-icon icon="mdi:finance"></ha-icon><span>ÉCONOMIE</span></div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const panels = [{n:c.p1_name,e:c.p1_w,c:"#ffc107"},{n:c.p2_name,e:c.p2_w,c:"#00f9f9"},{n:c.p3_name,e:c.p3_w,c:"#4caf50"},{n:c.p4_name,e:c.p4_w,c:"#e91e63"}].filter(p => p.e && this.hass.states[p.e]);
    return html`
      <div class="page">
        <div class="header-main">
          <div class="big-val">${this._get(c.total_now)}<small>W</small></div>
          <div class="obj-container">
            <div class="bar-wrap"><div class="bar-f" style="width:${this._get(c.total_obj_pct)}%"></div></div>
            <div class="obj-text">OBJECTIF : ${this._get(c.total_obj_pct)}%</div>
          </div>
        </div>
        <div class="panels-row">
          ${panels.map(p => html`
            <div class="hud-item">
              <div class="hud-circle" style="border-color:${p.c}44">
                <div class="scan" style="border-top-color:${p.c}"></div>
                <div class="val-container"><span class="v" style="color:${p.c}">${Math.round(this._get(p.e))}</span><span class="unit" style="color:${p.c}">W</span></div>
              </div>
              <div class="hud-n">${p.n}</div>
            </div>`)}
        </div>
        <div class="diag-grid">
          ${[1,2,3,4,5,6].map(i => c[`d${i}_entity`] ? html`
            <div class="d-box">
              <span class="d-l">${c[`d${i}_label`]}</span>
              <span class="d-v">${this._get(c[`d${i}_entity`])}<small>${this._getU(c[`d${i}_entity`])}</small></span>
            </div>` : '')}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`
      <div class="page battery-scroll">
        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
          <div class="rack-card">
            <div class="r-h"><span>${c[`b${i}_n`]}</span> <b class="soc-v">${this._get(c[`b${i}_s`])}%</b></div>
            <div class="v-meter">${[...Array(40)].map((_, idx) => html`<div class="v-seg ${parseInt(this._get(c[`b${i}_s`])) > (idx * 2.5) ? 'on' : ''}"></div>`)}</div>
            <div class="r-f-grid-4">
              <div class="r-f-box cyan">${this._get(c[`b${i}_v`])}<small>${this._getU(c[`b${i}_v` ])}</small></div>
              <div class="r-f-box"><ha-icon icon="mdi:thermometer"></ha-icon>${this._get(c[`b${i}_temp`])}°</div>
              <div class="r-f-box"><ha-icon icon="mdi:battery-check"></ha-icon>${this._get(c[`b${i}_cap`])}</div>
              <div class="r-f-box cyan">${this._get(c[`b${i}_a`])}<small>${this._getU(c[`b${i}_a` ])}</small></div>
            </div>
          </div>` : '')}
      </div>`;
  }

  _renderEco() {
    const c = this.config;
    const target = c.eco_target || 1;
    const current = parseFloat(this._get(c.eco_money)) || 0;
    return html`
      <div class="page">
        <div class="eco-hero">
          <div class="e-big">${current}<small>€</small></div>
          <div class="e-target">Objectif Mensuel : ${target}€</div>
          <div class="e-bar-wrap"><div class="e-bar-fill" style="width:${Math.min(100, (current/target)*100)}%"></div></div>
        </div>
        <div class="eco-stats-grid">
          <div class="stat-card"><span class="s-label">AUJOURD'HUI</span><span class="s-value green">${this._get(c.eco_day_euro)}€</span></div>
          <div class="stat-card"><span class="s-label">ANNUEL</span><span class="s-value yellow">${this._get(c.eco_year_euro)}€</span></div>
          <div class="stat-card"><span class="s-label">PRIX KWH</span><span class="s-value">${this._get(c.kwh_price)}€</span></div>
          <div class="stat-card"><span class="s-label">CONSO MAISON</span><span class="s-value">${this._get(c.main_cons_entity)}W</span></div>
        </div>
      </div>`;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 28px; overflow: hidden; border: 1px solid #333; position: relative; font-family: sans-serif; }
    .overlay { 
      height: 100%; display: flex; flex-direction: column; padding: 15px;
      background: radial-gradient(circle at 50% 0%, rgba(26, 42, 58, 0.9) 0%, #000 80%),
                  linear-gradient(rgba(0, 249, 249, 0.03) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0, 249, 249, 0.03) 1px, transparent 1px);
      background-size: 100% 100%, 30px 30px, 30px 30px;
    }
    .top-nav { display: flex; gap: 8px; margin-bottom: 20px; }
    .t-badge { background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 5px; }
    .green { color: #4caf50; margin-left: auto; }
    .header-main { text-align: center; margin-bottom: 25px; }
    .big-val { font-size: 60px; font-weight: 900; color: #ffc107; line-height: 1; }
    .obj-text { font-size: 11px; color: #ffc107; font-weight: 900; margin-top: 8px; }
    .bar-wrap { height: 6px; background: rgba(255,255,255,0.1); width: 180px; margin: 10px auto 0 auto; border-radius: 10px; overflow: hidden; }
    .bar-f { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; }
    .panels-row { display: flex; justify-content: space-around; margin-bottom: 20px; }
    .hud-circle { width: 85px; height: 85px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); }
    .scan { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 4s linear infinite; top:-2px; left:-2px; padding:2px; box-sizing: content-box; }
    .val-container { display: flex; flex-direction: column; align-items: center; z-index: 2; line-height: 1; }
    .v { font-size: 22px; font-weight: 900; }
    .unit { font-size: 10px; font-weight: bold; }
    .hud-n { font-size: 10px; opacity: 0.7; text-align: center; margin-top: 8px; }
    .diag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .d-box { background: rgba(255,255,255,0.03); padding: 10px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
    .d-v { display: block; font-size: 13px; font-weight: bold; color: #00f9f9; }
    .d-l { font-size: 9px; opacity: 0.5; display: block; }
    .battery-scroll { max-height: 480px; overflow-y: auto; padding-right: 5px; }
    .rack-card { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 18px; margin-bottom: 10px; border-left: 4px solid #4caf50; }
    .v-meter { display: flex; gap: 1.5px; height: 8px; margin-bottom: 12px; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.05); }
    .v-seg.on { background: #4caf50; box-shadow: 0 0 4px #4caf50; }
    .r-f-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
    .r-f-box { background: #000; padding: 6px 2px; border-radius: 8px; font-size: 10px; font-weight: bold; text-align: center; border: 1px solid #222; display: flex; align-items: center; justify-content: center; gap: 3px; }
    .cyan { color: #00f9f9; }
    .eco-hero { background: rgba(76,175,80,0.1); padding: 25px; border-radius: 24px; text-align: center; border: 1px solid rgba(76, 175, 80, 0.2); margin-bottom: 20px; }
    .e-big { font-size: 50px; font-weight: 900; color: #4caf50; }
    .e-bar-wrap { height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; margin: 15px 0; overflow: hidden; }
    .e-bar-fill { height: 100%; background: #4caf50; }
    .eco-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-card { background: rgba(255,255,255,0.03); padding: 15px; border-radius: 15px; text-align: center; border: 1px solid #222; }
    .s-value { font-size: 16px; font-weight: bold; display: block; }
    .yellow { color: #ffc107; }
    .footer { display: flex; justify-content: space-around; padding: 15px 0; border-top: 1px solid #222; margin-top: auto; }
    .f-btn { opacity: 0.4; cursor: pointer; display: flex; flex-direction: column; align-items: center; font-size: 9px; font-weight: bold; }
    .f-btn.active { opacity: 1; color: #ffc107; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    ha-icon { --mdc-icon-size: 18px; }
    small { font-size: 9px; margin-left: 2px; opacity: 0.7; }
    .battery-scroll::-webkit-scrollbar { width: 3px; }
    .battery-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
  `;
}

if (!customElements.get("solar-master-card")) {
  customElements.define("solar-master-card", SolarMasterCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "solar-master-card",
    name: "Solar Master Card",
    preview: true,
    description: "L'Intégrale - Solaire, Batteries et Économie"
  });
}
