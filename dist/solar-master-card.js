import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================================
 * ÉDITEUR DE LA CARTE (VISUAL EDITOR)
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
        { name: "bg_blur", label: "Flou de l'image (px)", selector: { number: { min: 0, max: 20 } } },
        { name: "bg_opacity", label: "Opacité Image (0.1 à 1.0)", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "entity_weather", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
        { name: "total_now", label: "Production Actuelle (W)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif Production (%)", selector: { entity: {} } },
        { name: "grid_flow", label: "Réseau / Grid (W)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau ${i}` },
          { name: `p${i}_w`, label: `Entité Watts P${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[1, 2, 3, 4, 5, 6].map(i => [
          { name: `d${i}_label`, label: `Diag ${i} Label` },
          { name: `d${i}_entity`, label: `Diag ${i} Entité`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [...[1, 2, 3, 4].map(i => [
        { name: `b${i}_n`, label: `Nom Batterie ${i}` },
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
    button { flex: 1; padding: 10px; background: #2c2c2c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px; transition: 0.3s; }
    button.active { background: #ffc107; color: black; }
  `;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================================
 * CARTE PRINCIPALE (MAIN CARD)
 * ==========================================================
 */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _smartGet(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '' };
    const stateObj = this.hass.states[id];
    const raw = stateObj.state;
    const attrUnit = stateObj.attributes.unit_of_measurement || '';
    
    if (isNaN(raw)) {
      const match = raw.match(/^([0-9.,-]+)\s*(.*)$/);
      if (match) return { val: match[1], unit: match[2] || attrUnit };
    }
    return { val: raw, unit: attrUnit };
  }

  _getRaw(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }

  _translateWeather(s) {
    const dict = { 'sunny': 'Ensoleillé', 'clear-night': 'Nuit Claire', 'cloudy': 'Nuageux', 'fog': 'Brouillard', 'hail': 'Grêle', 'lightning': 'Orages', 'partlycloudy': 'Éclaircies', 'pouring': 'Averses', 'rainy': 'Pluvieux', 'snowy': 'Neige', 'windy': 'Venteux' };
    return dict[s?.toLowerCase()] || s || 'Inconnu';
  }

  _renderSunWidget() {
    if (!this.hass.states['sun.sun']) return html``;
    const sun = this.hass.states['sun.sun'];
    const elev = sun.attributes.elevation || 0;
    const progress = ((elev + 90) / 180) * 100;
    const isNight = elev < 0;
    
    return html`
      <div class="sun-widget">
        <svg viewbox="0 0 100 45" class="sun-svg">
          <path d="M5,40 Q50,0 95,40" class="sun-track-path" />
        </svg>
        <ha-icon 
          icon="${isNight ? 'mdi:weather-night' : 'mdi:white-balance-sunny'}" 
          class="sun-icon-move ${isNight ? 'night' : ''}"
          style="left: ${Math.max(5, Math.min(85, progress))}%; bottom: ${Math.max(5, Math.min(30, elev < 0 ? 5 : (elev/90)*30))}px;">
        </ha-icon>
        <div class="sun-label-min">SUN ELEV: ${elev.toFixed(1)}°</div>
      </div>
    `;
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    const totalEco = this._smartGet(c.eco_money);

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        ${c.bg_url ? html`<div class="custom-bg" style="background-image:url('${c.bg_url}'); filter:blur(${c.bg_blur || 0}px); opacity:${c.bg_opacity || 0.5};"></div>` : ''}
        
        <div class="overlay">
          <div class="top-nav">
            <div class="t-badge"><ha-icon icon="mdi:weather-sunny"></ha-icon> ${this._translateWeather(this._getRaw(c.entity_weather))}</div>
            <div class="t-badge"><ha-icon icon="mdi:transmission-tower"></ha-icon> ${this._smartGet(c.grid_flow).val} W</div>
            <div class="t-badge green">${totalEco.val}${totalEco.unit || '€'}</div>
          </div>

          <div class="main-content">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : this._tab === 'BATTERIE' ? this._renderBattery() : this._renderEco()}
          </div>

          <div class="footer">
            <div class="f-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}><ha-icon icon="mdi:solar-power"></ha-icon><span>SOLAIRE</span></div>
            <div class="f-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}><ha-icon icon="mdi:battery-high"></ha-icon><span>BATTERIES</span></div>
            <div class="f-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}><ha-icon icon="mdi:finance"></ha-icon><span>ÉCONOMIE</span></div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const totalProd = this._smartGet(c.total_now);
    const panels = [
      { n: c.p1_name, e: c.p1_w, c: "#ffc107" },
      { n: c.p2_name, e: c.p2_w, c: "#00f9f9" },
      { n: c.p3_name, e: c.p3_w, c: "#4caf50" },
      { n: c.p4_name, e: c.p4_w, c: "#e91e63" }
    ].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <div class="page">
        <div class="solar-header-row">
          <div class="total-block">
            <div class="big-val">${totalProd.val}<small>${totalProd.unit || 'W'}</small></div>
            <div class="bar-wrap"><div class="bar-f" style="width:${this._getRaw(c.total_obj_pct)}%"></div></div>
            <div class="obj-text">OBJECTIF PROD : ${this._getRaw(c.total_obj_pct)}%</div>
          </div>
          
          ${this._renderSunWidget()}
        </div>

        <div class="panels-row">
          ${panels.map(p => {
            const s = this._smartGet(p.e);
            return html`
              <div class="hud-item">
                <div class="hud-circle" style="border-color:${p.c}44">
                  <div class="scan" style="border-top-color:${p.c}"></div>
                  <div class="val-container"><span class="v" style="color:${p.c}">${Math.round(s.val)}</span><span class="unit" style="color:${p.c}">${s.unit || 'W'}</span></div>
                </div>
                <div class="hud-n">${p.n}</div>
              </div>`;
          })}
        </div>
        <div class="diag-grid">
          ${[1, 2, 3, 4, 5, 6].map(i => {
            const d = this._smartGet(c[`d${i}_entity`]);
            return c[`d${i}_entity`] ? html`<div class="d-box"><span class="d-l">${c[`d${i}_label`]}</span><span class="d-v">${d.val}<small>${d.unit}</small></span></div>` : '';
          })}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`
      <div class="page battery-scroll">
        ${[1, 2, 3, 4].map(i => {
          if (!c[`b${i}_s`]) return '';
          const soc = this._smartGet(c[`b${i}_s`]);
          const v = this._smartGet(c[`b${i}_v`]);
          const a = this._smartGet(c[`b${i}_a`]);
          const t = this._smartGet(c[`b${i}_temp`]);
          const cap = this._smartGet(c[`b${i}_cap`]);
          return html`
            <div class="rack-card">
              <div class="r-h"><span>${c[`b${i}_n`]}</span> <b class="soc-v">${soc.val}%</b></div>
              <div class="v-meter">${[...Array(40)].map((_, idx) => html`<div class="v-seg ${parseInt(soc.val) > (idx * 2.5) ? 'on' : ''}"></div>`)}</div>
              <div class="r-f-grid-4">
                <div class="r-f-box cyan">${v.val}${v.unit || 'V'}</div>
                <div class="r-f-box">${t.val}${t.unit || '°'}</div>
                <div class="r-f-box">${cap.val}${cap.unit}</div>
                <div class="r-f-box cyan">${a.val}${a.unit || 'A'}</div>
              </div>
            </div>`;
        })}
      </div>`;
  }

  _renderEco() {
    const c = this.config;
    const cur = this._smartGet(c.eco_money);
    const day = this._smartGet(c.eco_day_euro);
    const year = this._smartGet(c.eco_year_euro);
    const price = this._smartGet(c.kwh_price);
    const cons = this._smartGet(c.main_cons_entity);
    const target = c.eco_target || 1;

    return html`
      <div class="page">
        <div class="eco-hero">
          <div class="e-big">${cur.val}<small>${cur.unit || '€'}</small></div>
          <div class="e-bar-wrap"><div class="e-bar-fill" style="width:${Math.min(100, (parseFloat(cur.val) / target) * 100)}%"></div></div>
          <div class="e-target">Objectif : ${target}€</div>
        </div>
        <div class="eco-stats-grid">
          <div class="stat-card"><span class="s-label">JOUR</span><span class="s-value green">${day.val}${day.unit}</span></div>
          <div class="stat-card"><span class="s-label">ANNUEL</span><span class="s-value yellow">${year.val}${year.unit}</span></div>
          <div class="stat-card"><span class="s-label">PRIX KWH</span><span class="s-value">${price.val}${price.unit}</span></div>
          <div class="stat-card"><span class="s-label">CONSO MAISON</span><span class="s-value">${cons.val}${cons.unit}</span></div>
        </div>
      </div>`;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 28px; overflow: hidden; position: relative; border: 1px solid #333; font-family: sans-serif; }
    .custom-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; z-index: 0; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 20px; position: relative; z-index: 1; background: radial-gradient(circle at 50% 0%, rgba(26, 42, 58, 0.7) 0%, rgba(0,0,0,0.8) 80%); }
    .top-nav { display: flex; gap: 10px; margin-bottom: 25px; }
    .t-badge { background: rgba(0,0,0,0.6); padding: 10px 15px; border-radius: 14px; font-size: 12px; font-weight: bold; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(5px); display: flex; align-items: center; gap: 8px; }
    .green { color: #4caf50; margin-left: auto; }
    
    /* Solar Header Row */
    .solar-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding: 0 10px; }
    .total-block { text-align: left; }
    .big-val { font-size: 58px; font-weight: 900; color: #ffc107; line-height: 1; }
    .bar-wrap { height: 5px; background: rgba(255,255,255,0.1); width: 140px; margin: 10px 0 5px 0; border-radius: 10px; overflow: hidden; }
    .bar-f { height: 100%; background: #ffc107; box-shadow: 0 0 15px #ffc107; }
    .obj-text { font-size: 9px; opacity: 0.5; font-weight: bold; }

    /* Sun Widget Side Box */
    .sun-widget { width: 110px; height: 65px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; position: relative; overflow: hidden; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; padding-bottom: 5px; }
    .sun-svg { width: 80%; position: absolute; top: 10px; }
    .sun-track-path { fill: none; stroke: rgba(255,193,7,0.2); stroke-width: 2; stroke-dasharray: 2,2; }
    .sun-icon-move { position: absolute; --mdc-icon-size: 18px; color: #ffc107; filter: drop-shadow(0 0 5px #ffc107); transition: all 1s ease-in-out; }
    .sun-icon-move.night { color: #81d4fa; filter: drop-shadow(0 0 5px #0277bd); }
    .sun-label-min { font-size: 8px; opacity: 0.6; font-weight: bold; letter-spacing: 0.5px; }

    .panels-row { display: flex; justify-content: space-around; margin-bottom: 25px; }
    .hud-circle { width: 85px; height: 85px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); }
    .scan { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 4s linear infinite; top:-2px; left:-2px; padding:2px; box-sizing: content-box; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .val-container { display: flex; flex-direction: column; align-items: center; line-height: 1; }
    .v { font-size: 22px; font-weight: 900; }
    .unit { font-size: 11px; }
    .hud-n { font-size: 10px; text-align: center; margin-top: 8px; opacity: 0.8; }
    .diag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .d-box { background: rgba(0,0,0,0.6); padding: 10px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
    .d-v { display: block; font-size: 14px; font-weight: bold; color: #00f9f9; }
    .d-l { font-size: 9px; opacity: 0.5; display: block; margin-bottom: 2px; }
    .footer { display: flex; justify-content: space-around; padding: 15px 0; border-top: 1px solid #333; margin-top: auto; }
    .f-btn { opacity: 0.4; cursor: pointer; display: flex; flex-direction: column; align-items: center; font-size: 10px; transition: 0.3s; }
    .f-btn.active { opacity: 1; color: #ffc107; }
    .rack-card { background: rgba(0,0,0,0.6); padding: 15px; border-radius: 18px; margin-bottom: 10px; border-left: 5px solid #4caf50; }
    .v-meter { display: flex; gap: 2px; height: 8px; margin: 12px 0; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.1); border-radius: 1px; }
    .v-seg.on { background: #4caf50; box-shadow: 0 0 5px #4caf50; }
    .r-f-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .r-f-box { background: #000; padding: 6px; border-radius: 8px; font-size: 10px; text-align: center; border: 1px solid #333; }
    .cyan { color: #00f9f9; }
    .eco-hero { background: rgba(76,175,80,0.1); padding: 25px; border-radius: 24px; text-align: center; border: 1px solid rgba(76,175,80,0.2); margin-bottom: 25px; }
    .e-big { font-size: 50px; font-weight: 900; color: #4caf50; }
    .e-bar-wrap { height: 10px; background: rgba(255,255,255,0.1); border-radius: 10px; margin: 18px 0; overflow: hidden; }
    .e-bar-fill { height: 100%; background: #4caf50; box-shadow: 0 0 10px #4caf50; }
    .eco-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stat-card { background: rgba(0,0,0,0.5); padding: 15px; border-radius: 18px; text-align: center; border: 1px solid #333; }
    .s-label { font-size: 9px; opacity: 0.5; display: block; margin-bottom: 4px; }
    .s-value { font-size: 18px; font-weight: bold; }
    .yellow { color: #ffc107; }
    small { font-size: 14px; opacity: 0.7; margin-left: 4px; }
    ha-icon { --mdc-icon-size: 20px; }
    .battery-scroll { overflow-y: auto; max-height: 400px; padding-right: 5px; }
    .battery-scroll::-webkit-scrollbar { width: 4px; }
    .battery-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
