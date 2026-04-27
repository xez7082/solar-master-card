import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _selectedTab: { type: String } }; }
  constructor() { super(); this._selectedTab = 'solar'; }
  setConfig(config) { this._config = config; }
  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
  render() {
    if (!this.hass || !this._config) return html``;
    const schemas = {
      solar: [
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 400, max: 1200 } } },
        { name: "entity_weather", label: "Météo (Entité)", selector: { entity: { domain: "weather" } } },
        { name: "total_now", label: "Production Actuelle (W)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif Production (%)", selector: { entity: {} } },
        { name: "grid_flow", label: "Réseau (W)", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [{ name: `p${i}_name`, label: `Nom P${i}` }, { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }]).flat(),
        ...[1,2,3,4,5,6].map(i => [{ name: `d${i}_label`, label: `Diag ${i} Nom` }, { name: `d${i}_entity`, label: `Diag ${i} Entité`, selector: { entity: {} } }]).flat()
      ],
      batt: [
        ...[1,2,3,4].map(i => [
            { name: `b${i}_n`, label: `Nom Batterie ${i}` },
            { name: `b${i}_s`, label: `SOC % Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_v`, label: `Sensor GAUCHE (V) ${i}`, selector: { entity: {} } },
            { name: `b${i}_temp`, label: `Température ${i}`, selector: { entity: {} } },
            { name: `b${i}_cap`, label: `Capacité ${i}`, selector: { entity: {} } },
            { name: `b${i}_a`, label: `Sensor DROITE (A) ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      eco: [
        { name: "eco_money", label: "Total Économisé (€)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gain Jour (€)", selector: { entity: {} } },
        { name: "eco_year_euro", label: "Gain Annuel (€)", selector: { entity: {} } },
        { name: "kwh_price", label: "Prix kWh (€)", selector: { entity: {} } },
        { name: "eco_target", label: "Objectif Mensuel (€)", selector: { number: {} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } }
      ]
    };
    return html`
      <div class="tabs">
        ${['solar','batt','eco'].map(t => html`<button class="${this._selectedTab===t?'active':''}" @click=${()=>this._selectedTab=t}>${t.toUpperCase()}</button>`)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.tabs{display:flex;gap:5px;margin-bottom:15px}button{flex:1;padding:10px;background:#2c2c2c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:bold}button.active{background:#ffc107;color:#000}`;
}
if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }
  
  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }
  _getU(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].attributes.unit_of_measurement || '' : ''; }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    const panels = [{n:c.p1_name,e:c.p1_w,c:"#ffc107"},{n:c.p2_name,e:c.p2_w,c:"#00f9f9"},{n:c.p3_name,e:c.p3_w,c:"#4caf50"},{n:c.p4_name,e:c.p4_w,c:"#e91e63"}].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        <div class="overlay">
            <div class="top-nav">
                <div class="t-badge"><ha-icon icon="mdi:weather-sunny"></ha-icon> ${this._get(c.entity_weather)}</div>
                <div class="t-badge"><ha-icon icon="mdi:transmission-tower"></ha-icon> ${this._get(c.grid_flow)} W</div>
                <div class="t-badge green">${this._get(c.eco_money)}€</div>
            </div>

            <div class="main-content">
                ${this._tab === 'SOLAIRE' ? html`
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
                                        <div class="val-container"><span class="v" style="color:${p.c}">${Math.round(this._get(p.e))}</span></div>
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
                    </div>`

                : this._tab === 'BATTERIE' ? html`
                    <div class="page battery-scroll">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="rack-card">
                                <div class="r-h"><span>${c[`b${i}_n`]}</span> <b class="soc-v">${this._get(c[`b${i}_s`])}%</b></div>
                                <div class="v-meter">${[...Array(40)].map((_, idx) => html`<div class="v-seg ${parseInt(this._get(c[`b${i}_s`])) > (idx * 2.5) ? 'on' : ''}"></div>`)}</div>
                                <div class="r-f-grid-4">
                                    <div class="r-f-box cyan">${this._get(c[`b${i}_v`])}<small>${this._getU(c[`b${i}_v`])}</small></div>
                                    <div class="r-f-box"><ha-icon icon="mdi:thermometer"></ha-icon>${this._get(c[`b${i}_temp`])}°</div>
                                    <div class="r-f-box"><ha-icon icon="mdi:battery-check"></ha-icon>${this._get(c[`b${i}_cap`])}</div>
                                    <div class="r-f-box cyan">${this._get(c[`b${i}_a`])}<small>${this._getU(c[`b${i}_a`])}</small></div>
                                </div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="page">
                        <div class="eco-hero">
                            <div class="e-big">${this._get(c.eco_money)}<small>€</small></div>
                            <div class="e-target">Objectif Mensuel : ${c.eco_target || 0}€</div>
                            <div class="e-bar-wrap"><div class="e-bar-fill" style="width:${Math.min(100, (parseFloat(this._get(c.eco_money))/(c.eco_target || 1)) * 100)}%"></div></div>
                        </div>
                        <div class="eco-stats-grid">
                            <div class="stat-card"><span class="s-label">AUJOURD'HUI</span><span class="s-value green">${this._get(c.eco_day_euro)}€</span></div>
                            <div class="stat-card"><span class="s-label">ANNUEL</span><span class="s-value yellow">${this._get(c.eco_year_euro)}€</span></div>
                            <div class="stat-card"><span class="s-label">PRIX KWH</span><span class="s-value">${this._get(c.kwh_price)}€</span></div>
                            <div class="stat-card"><span class="s-label">CONSO MAISON</span><span class="s-value">${this._get(c.main_cons_entity)}W</span></div>
                        </div>
                    </div>`}
            </div>

            <div class="footer">
                <div class="f-btn ${this._tab==='SOLAIRE'?'active':''}" @click=${()=>this._tab='SOLAIRE'}><ha-icon icon="mdi:solar-power"></ha-icon><span>SOLAIRE</span></div>
                <div class="f-btn ${this._tab==='BATTERIE'?'active':''}" @click=${()=>this._tab='BATTERIE'}><ha-icon icon="mdi:battery-high"></ha-icon><span>BATTERIES</span></div>
                <div class="f-btn ${this._tab==='ECONOMIE'?'active':''}" @click=${()=>this._tab='ECONOMIE'}><ha-icon icon="mdi:finance"></ha-icon><span>ÉCONOMIE</span></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 28px; font-family: 'Inter', sans-serif; overflow: hidden; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; background: radial-gradient(circle at top right, #1a1a1a 0%, #000 100%); }
    .top-nav { display: flex; gap: 8px; margin-bottom: 15px; }
    .t-badge { background: rgba(255,255,255,0.08); padding: 8px 12px; border-radius: 12px; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 6px; border: 1px solid rgba(255,255,255,0.1); }
    .t-badge.green { color: #4caf50; margin-left: auto; border-color: #4caf5044; }
    .header-main { text-align: center; margin-bottom: 20px; }
    .big-val { font-size: 64px; font-weight: 900; color: #ffc107; line-height: 1; }
    .obj-text { font-size: 11px; color: #ffc107; margin-top: 5px; font-weight: 900; letter-spacing: 1px; }
    .bar-wrap { height: 6px; background: rgba(255,255,255,0.1); width: 60%; margin: 10px auto 0 auto; border-radius: 10px; overflow: hidden; }
    .bar-f { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; }
    .panels-row { display: flex; justify-content: space-around; margin-bottom: 25px; }
    .hud-circle { width: 85px; height: 85px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); }
    .scan { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 3s linear infinite; top:-2px; left:-2px; padding:2px; box-sizing: content-box; }
    .val-container { position: absolute; width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; z-index: 2; }
    .v { font-size: 22px; font-weight: 900; text-align: center; }
    .hud-n { font-size: 10px; font-weight: 800; margin-top: 8px; text-align: center; opacity: 0.7; }
    .diag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .d-box { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
    .d-v { display: block; font-size: 14px; font-weight: 800; color: #00f9f9; }
    .d-l { font-size: 9px; opacity: 0.5; display: block; }
    .battery-scroll { max-height: 480px; overflow-y: auto; }
    .rack-card { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 18px; margin-bottom: 10px; border-left: 4px solid #4caf50; }
    .soc-v { color: #4caf50; font-size: 15px; }
    .v-meter { display: flex; gap: 1.5px; height: 8px; margin-bottom: 12px; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.05); }
    .v-seg.on { background: #4caf50; box-shadow: 0 0 4px #4caf50; }
    .r-f-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
    .r-f-box { background: #000; padding: 8px 2px; border-radius: 8px; font-size: 10px; font-weight: 700; text-align: center; border: 1px solid #222; }
    .cyan { color: #00f9f9; }
    .eco-hero { background: rgba(76,175,80,0.1); padding: 25px; border-radius: 24px; text-align: center; border: 1px solid #4caf5033; margin-bottom: 20px; }
    .eco-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; text-align: center; border: 1px solid #222; }
    .s-value { font-size: 16px; font-weight: 900; display: block; }
    .green { color: #4caf50; }
    .yellow { color: #ffc107; }
    .footer { display: flex; justify-content: space-around; padding: 15px 0; border-top: 1px solid #222; margin-top: auto; }
    .f-btn { opacity: 0.3; cursor: pointer; display: flex; flex-direction: column; align-items: center; font-size: 9px; font-weight: bold; }
    .f-btn.active { opacity: 1; color: #ffc107; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    ha-icon { --mdc-icon-size: 20px; }
  `;
}

if (!customElements.get("solar-master-card")) {
  customElements.define("solar-master-card", SolarMasterCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "solar-master-card",
    name: "Solar Master Card",
    preview: true,
    description: "Carte Solaire, Batteries et Économies"
  });
}
