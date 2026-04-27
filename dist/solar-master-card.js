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
        { name: "bg_url", label: "URL Image de Fond", selector: { text: {} } },
        { name: "bg_blur", label: "Flou (px)", selector: { number: { min: 0, max: 20 } } },
        { name: "bg_opacity", label: "Opacité (0.1 à 1.0)", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "entity_weather", label: "Météo", selector: { entity: { domain: "weather" } } },
        { name: "total_now", label: "Prod. Totale (W)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif Prod (%)", selector: { entity: {} } },
        { name: "grid_flow", label: "Réseau (W)", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [{ name: `p${i}_name`, label: `Nom P${i}` }, { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }]).flat(),
        ...[1,2,3,4,5,6].map(i => [{ name: `d${i}_label`, label: `Diag ${i} Nom` }, { name: `d${i}_entity`, label: `Diag ${i} Entité`, selector: { entity: {} } }]).flat()
      ],
      tab_batt: [...[1,2,3,4].map(i => [{ name: `b${i}_n`, label: `Nom Bat ${i}` }, { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } }, { name: `b${i}_v`, label: `Volt G ${i}`, selector: { entity: {} } }, { name: `b${i}_temp`, label: `Temp ${i}`, selector: { entity: {} } }, { name: `b${i}_cap`, label: `Cap ${i}`, selector: { entity: {} } }, { name: `b${i}_a`, label: `Amp D ${i}`, selector: { entity: {} } }]).flat()],
      tab_eco: [{ name: "eco_money", label: "Total (€)", selector: { entity: {} } }, { name: "eco_day_euro", label: "Jour (€)", selector: { entity: {} } }, { name: "eco_year_euro", label: "An (€)", selector: { entity: {} } }, { name: "kwh_price", label: "Prix kWh", selector: { entity: {} } }, { name: "eco_target", label: "Objectif (€)", selector: { number: {} } }]
    };
    return html`
      <div class="edit-tabs">
        ${['tab_solar','tab_batt','tab_eco'].map(t => html`<button class="${this._selectedTab===t?'active':''}" @click=${()=>this._selectedTab=t}>${t.replace('tab_','').toUpperCase()}</button>`)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs{display:flex;gap:5px;margin-bottom:15px}button{flex:1;padding:8px;background:#2c2c2c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-weight:bold;font-size:10px}button.active{background:#ffc107;color:#000}`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }
  _t(s) {
    const dict = {'sunny':'Ensoleillé','clear-night':'Nuit Claire','cloudy':'Nuageux','fog':'Brouillard','hail':'Grêle','lightning':'Orages','partlycloudy':'Éclaircies','pouring':'Averses','rainy':'Pluvieux','snowy':'Neige','windy':'Venteux'};
    return dict[s?.toLowerCase()] || s || 'Inconnu';
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        ${c.bg_url ? html`<div class="custom-bg" style="background-image:url('${c.bg_url}');filter:blur(${c.bg_blur || 0}px);opacity:${c.bg_opacity || 0.5};"></div>` : ''}
        <div class="overlay">
          <div class="top-nav">
            <div class="t-badge"><ha-icon icon="mdi:weather-sunny"></ha-icon> ${this._t(this._get(c.entity_weather))}</div>
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
    return html`<div class="page">
      <div class="header-main">
        <div class="big-val">${this._get(c.total_now)}<small>W</small></div>
        <div class="bar-wrap"><div class="bar-f" style="width:${this._get(c.total_obj_pct)}%"></div></div>
        <div class="obj-text">OBJECTIF : ${this._get(c.total_obj_pct)}%</div>
      </div>
      <div class="panels-row">${panels.map(p => html`<div class="hud-item"><div class="hud-circle" style="border-color:${p.c}44"><div class="scan" style="border-top-color:${p.c}"></div><div class="val-container"><span class="v" style="color:${p.c}">${Math.round(this._get(p.e))}</span><span class="unit" style="color:${p.c}">W</span></div></div><div class="hud-n">${p.n}</div></div>`)}</div>
      <div class="diag-grid">${[1,2,3,4,5,6].map(i => c[`d${i}_entity`] ? html`<div class="d-box"><span class="d-l">${c[`d${i}_label`]}</span><span class="d-v">${this._get(c[`d${i}_entity`])}</span></div>` : '')}</div>
    </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`<div class="page battery-scroll">${[1,2,3,4].map(i => c[`b${i}_s`] ? html`<div class="rack-card"><div class="r-h"><span>${c[`b${i}_n`]}</span> <b class="soc-v">${this._get(c[`b${i}_s`])}%</b></div><div class="v-meter">${[...Array(40)].map((_, idx) => html`<div class="v-seg ${parseInt(this._get(c[`b${i}_s`])) > (idx * 2.5) ? 'on' : ''}"></div>`)}</div><div class="r-f-grid-4"><div class="r-f-box cyan">${this._get(c[`b${i}_v`])}V</div><div class="r-f-box">${this._get(c[`b${i}_temp`])}°</div><div class="r-f-box">${this._get(c[`b${i}_cap`])}</div><div class="r-f-box cyan">${this._get(c[`b${i}_a`])}A</div></div></div>` : '')}</div>`;
  }

  _renderEco() {
    const c = this.config;
    const cur = parseFloat(this._get(c.eco_money)) || 0;
    return html`<div class="page"><div class="eco-hero"><div class="e-big">${cur}<small>€</small></div><div class="e-bar-wrap"><div class="e-bar-fill" style="width:${Math.min(100,(cur/(c.eco_target||1))*100)}%"></div></div><div class="e-target">Objectif : ${c.eco_target || 0}€</div></div></div>`;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 28px; overflow: hidden; position: relative; border: 1px solid #333; font-family: sans-serif; }
    .custom-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; z-index: 0; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; position: relative; z-index: 1; background: radial-gradient(circle at 50% 0%, rgba(26, 42, 58, 0.7) 0%, rgba(0,0,0,0.8) 80%); }
    .top-nav { display: flex; gap: 8px; margin-bottom: 20px; }
    .t-badge { background: rgba(0,0,0,0.6); padding: 8px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px); display: flex; align-items: center; gap: 5px; }
    .green { color: #4caf50; margin-left: auto; }
    .header-main { text-align: center; margin-bottom: 25px; }
    .big-val { font-size: 60px; font-weight: 900; color: #ffc107; line-height: 1; }
    .bar-wrap { height: 6px; background: rgba(255,255,255,0.1); width: 180px; margin: 15px auto 5px auto; border-radius: 10px; overflow: hidden; }
    .bar-f { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; }
    .panels-row { display: flex; justify-content: space-around; margin-bottom: 15px; }
    .hud-circle { width: 80px; height: 80px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); }
    .scan { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 4s linear infinite; top:-2px; left:-2px; padding:2px; box-sizing: content-box; }
    .val-container { display: flex; flex-direction: column; align-items: center; line-height: 1; }
    .v { font-size: 20px; font-weight: 900; }
    .unit { font-size: 10px; }
    .diag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .d-box { background: rgba(0,0,0,0.6); padding: 8px; border-radius: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
    .d-v { display: block; font-size: 12px; font-weight: bold; color: #00f9f9; }
    .d-l { font-size: 8px; opacity: 0.5; display: block; }
    .footer { display: flex; justify-content: space-around; padding: 10px 0; border-top: 1px solid #333; margin-top: auto; }
    .f-btn { opacity: 0.5; cursor: pointer; display: flex; flex-direction: column; align-items: center; font-size: 9px; }
    .f-btn.active { opacity: 1; color: #ffc107; }
    .rack-card { background: rgba(0,0,0,0.6); padding: 12px; border-radius: 15px; margin-bottom: 8px; border-left: 4px solid #4caf50; }
    .v-meter { display: flex; gap: 1px; height: 6px; margin: 8px 0; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.1); }
    .v-seg.on { background: #4caf50; }
    .r-f-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
    .r-f-box { background: #000; padding: 4px; border-radius: 5px; font-size: 9px; text-align: center; border: 1px solid #333; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    ha-icon { --mdc-icon-size: 18px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
