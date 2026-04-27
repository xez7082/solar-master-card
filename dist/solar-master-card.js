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
        { name: "weather_entity", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
        { name: "title_left", label: "Titre Groupe Gauche", selector: { text: {} } },
        { name: "title_right", label: "Titre Groupe Droite", selector: { text: {} } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "prod_obj_pct", label: "Objectif Production (%)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau ${i}` },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } },
          { name: `p${i}_sub`, label: `Info Sous Cercle P${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `NOM Diag d${i}` },
          { name: `d${i}_entity`, label: `ENTITÉ Diag d${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [...[1, 2, 3, 4].map(i => [
        { name: `b${i}_n`, label: `Nom Batterie ${i}` },
        { name: `b${i}_s`, label: `SOC % (Traits) ${i}`, selector: { entity: {} } },
        { name: `b${i}_v`, label: `Sortie/Voltage ${i}`, selector: { entity: {} } },
        { name: `b${i}_a`, label: `Niveau/Ampérage ${i}`, selector: { entity: {} } },
        { name: `b${i}_temp`, label: `Température ${i}`, selector: { entity: {} } },
        { name: `b${i}_cap`, label: `Capacité ${i}`, selector: { entity: {} } }
      ]).flat()],
      tab_eco: [
        { name: "eco_money", label: "Total Économisé (€)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gain Jour (€)", selector: { entity: {} } },
        { name: "eco_year_euro", label: "Gain An (€)", selector: { entity: {} } },
        { name: "kwh_price", label: "Tarif EDF/kWh (€)", selector: { entity: {} } },
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

  _renderWeather() {
    const eid = this.config.weather_entity;
    if (!eid || !this.hass.states[eid]) return html`<div class="weather-grid empty">MÉTÉO INDISP.</div>`;
    const s = this.hass.states[eid];
    return html`
      <div class="weather-grid">
        <ha-icon icon="mdi:weather-${s.state.replace('partlycloudy', 'partly-cloudy')}"></ha-icon>
        <div class="w-temp">${s.attributes.temperature}°C</div>
      </div>`;
  }

  _renderMiniDiag(i, side) {
    const c = this.config;
    if (!c[`d${i}_entity`]) return html`<div class="mini-diag empty"></div>`;
    const d = this._getVal(c[`d${i}_entity`]);
    return html`<div class="mini-diag ${side}"><span class="m-l">${c[`d${i}_label`]}</span><span class="m-v">${d.val}<small>${d.unit}</small></span></div>`;
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        ${c.bg_url ? html`<div class="bg-layer" style="background-image:url('${c.bg_url}'); opacity:0.4;"></div>` : ''}
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
    const objVal = parseFloat(this._getVal(c.prod_obj_pct).val) || 0;
    const sunElev = this.hass.states['sun.sun'] ? this.hass.states['sun.sun'].attributes.elevation.toFixed(1) : "0";

    return html`
      <div class="page">
        <div class="top-bar">${this._renderWeather()}</div>

        <div class="cockpit">
          <div class="side">
            <div class="side-head">${c.title_left}</div>
            ${[4, 5, 6].map(i => this._renderMiniDiag(i, 'l'))}
          </div>
          
          <div class="center">
            <div class="sun-bg-text">${sunElev}°</div>
            <div class="big-val">${prod.val}<small>W</small></div>
            <div class="obj-bar-container">
               <div class="obj-fill" style="width: ${Math.min(100, objVal)}%"></div>
               <span class="obj-label">OBJECTIF ${objVal}%</span>
            </div>
          </div>

          <div class="side right-align">
            <div class="side-head right">${c.title_right}</div>
            ${[7, 8, 9].map(i => this._renderMiniDiag(i, 'r'))}
          </div>
        </div>

        <div class="panels-row">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`p${i}_w`]) return '';
            const s = this._getVal(c[`p${i}_w`]);
            const sub = this._getVal(c[`p${i}_sub`]);
            const colors = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"];
            return html`
              <div class="hud-item">
                <div class="hud-circle" style="border-color:${colors[i-1]}44">
                  <div class="scan" style="border-top-color:${colors[i-1]}"></div>
                  <div class="v" style="color:${colors[i-1]}">${Math.round(s.val)}</div>
                </div>
                <div class="hud-n">${c[`p${i}_name`] || 'P'+i}</div>
                <div class="hud-sub">${sub.val}${sub.unit}</div>
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
            <div class="r-h"><span>${c[`b${i}_n`] || 'BAT '+i}</span> <span class="soc-pct">${soc.val}%</span></div>
            <div class="v-meter">${[...Array(10)].map((_, idx) => html`<div class="v-seg ${parseInt(soc.val) > (idx * 10) ? 'on' : ''}"></div>`)}</div>
            <div class="r-grid-compact">
              <div class="r-item"><span>CAPACITÉ</span><br><b>${this._getVal(c[`b${i}_cap`]).val}</b></div>
              <div class="r-item"><span>TEMP</span><br><b>${this._getVal(c[`b${i}_temp`]).val}°</b></div>
              <div class="r-item"><span>SORTIE</span><br><b>${this._getVal(c[`b${i}_v`]).val}V</b></div>
              <div class="r-item"><span>NIVEAU</span><br><b>${this._getVal(c[`b${i}_a`]).val}A</b></div>
            </div>
          </div>`;
      })}
    </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`<div class="page">
      <div class="eco-hero"><div class="e-val">${this._getVal(c.eco_money).val}€</div><span>Économies Totales</span></div>
      <div class="eco-grid">
        <div class="e-card"><span>JOUR</span><br><b>${this._getVal(c.eco_day_euro).val}€</b></div>
        <div class="e-card"><span>AN</span><br><b>${this._getVal(c.eco_year_euro).val}€</b></div>
        <div class="e-card"><span>TARIF kWh</span><br><b>${this._getVal(c.kwh_price).val}€</b></div>
        <div class="e-card"><span>MAISON</span><br><b>${this._getVal(c.main_cons_entity).val}W</b></div>
      </div>
    </div>`;
  }

  static styles = css`
    ha-card { background:#000; color:#fff; border-radius:24px; overflow:hidden; position:relative; font-family:sans-serif; }
    .bg-layer { position:absolute; top:0; left:0; width:100%; height:100%; background-size:cover; z-index:0; }
    .overlay { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; padding:15px; background:rgba(0,0,0,0.7); box-sizing:border-box; }
    .main-content { flex:1; }
    
    .top-bar { margin-bottom: 10px; }
    .weather-grid { display: inline-flex; align-items: center; gap: 8px; background: rgba(0,249,249,0.1); padding: 5px 12px; border-radius: 10px; border: 1px solid rgba(0,249,249,0.3); color: #00f9f9; font-weight: bold; }
    .weather-grid ha-icon { --mdc-icon-size: 20px; }
    
    .cockpit { display:flex; justify-content:space-between; align-items:center; }
    .side { flex:1; }
    .side-head { font-size: 10px; font-weight: 900; color: #00f9f9; margin-bottom: 5px; text-transform: uppercase; }
    .side-head.right { text-align: right; color: #ffc107; }
    .right-align { text-align:right; }
    
    .mini-diag { background:rgba(255,255,255,0.05); padding:6px; border-radius:6px; margin:3px 0; border-left:3px solid #00f9f9; max-width:95px; backdrop-filter: blur(5px); }
    .mini-diag.r { border-left:none; border-right:3px solid #ffc107; margin-left:auto; }
    .m-l { font-size:7px; opacity:0.6; display:block; text-transform:uppercase; font-weight: 800; }
    .m-v { font-size:11px; font-weight:bold; }
    
    .center { text-align:center; width:140px; position: relative; }
    .sun-bg-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 50px; font-weight: 900; opacity: 0.1; color: #ffc107; pointer-events: none; z-index: -1; }
    .big-val { font-size:45px; font-weight:900; color:#ffc107; line-height: 1; text-shadow: 0 0 15px rgba(255,193,7,0.3); }
    
    .obj-bar-container { position: relative; height: 14px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-top: 10px; overflow: hidden; border: 1px solid rgba(255,193,7,0.4); }
    .obj-fill { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; }
    .obj-label { position: absolute; width: 100%; left: 0; top: 0; font-size: 8px; font-weight: 900; line-height: 14px; color: #000; text-align: center; }

    .panels-row { display:flex; justify-content:space-around; margin-top:20px; }
    .hud-circle { width:58px; height:58px; border-radius:50%; border:2px solid; position:relative; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); }
    .scan { position:absolute; width:100%; height:100%; border:2px solid transparent; border-radius:50%; animation:rotate 4s linear infinite; top:-2px; left:-2px; padding:2px; box-sizing:content-box; }
    @keyframes rotate { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
    .hud-n { font-size:9px; text-align:center; margin-top:5px; font-weight:bold; }
    .hud-sub { font-size:10px; text-align:center; color:#00f9f9; font-weight:bold; }

    .rack { background:rgba(255,255,255,0.05); padding:10px; border-radius:12px; margin-bottom:8px; border-left:4px solid #4caf50; }
    .r-h { display:flex; justify-content:space-between; font-weight:bold; font-size:12px; }
    .v-meter { display:flex; gap:2px; height:5px; margin:8px 0; }
    .v-seg { flex:1; background:#222; }
    .v-seg.on { background:#4caf50; box-shadow:0 0 4px #4caf50; }
    .r-grid-compact { display:grid; grid-template-columns:repeat(4, 1fr); text-align:center; font-size:10px; }
    
    .footer { display:flex; justify-content:space-around; border-top:1px solid #333; padding-top:15px; margin-top:auto; }
    .f-btn { cursor:pointer; opacity:0.5; font-size:10px; font-weight:bold; }
    .f-btn.active { opacity:1; color:#ffc107; }
    .scroll { overflow-y:auto; max-height:450px; }
    small { font-size:12px; margin-left:2px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "solar-master-card", name: "Solar Master Card", description: "v2.1.0 - Signature Style" });
