import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- 1. ÉDITEUR ---
class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _selectedTab: { type: String } }; }
  constructor() { super(); this._selectedTab = 'config_solar'; }
  setConfig(config) { this._config = config; }
  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
  render() {
    if (!this.hass || !this._config) return html``;
    const schemas = {
      config_solar: [
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 400, max: 1200, step: 10 } } },
        { name: "entity_weather", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "grid_flow", label: "Flux Réseau (W)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif (%)", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [
          { name: `p${i}_name`, label: `Nom P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } },
          { name: `p${i}_extra`, label: `Info P${i}`, selector: { text: {} } }
        ]).flat(),
        ...[1,2,3,4,5,6].map(i => [{ name: `d${i}_label`, label: `Diag ${i} Nom` }, { name: `d${i}_entity`, label: `Diag ${i} Entité`, selector: { entity: {} } }]).flat()
      ],
      config_batt: [
        ...[1,2,3,4].map(i => [
          { name: `b${i}_n`, label: `Nom Bat ${i}` },
          { name: `b${i}_s`, label: `SOC % Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_temp`, label: `Temp Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_flow`, label: `Flux Bat ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      config_stats: [
        { name: "eco_money", label: "Gains (€)", selector: { entity: {} } },
        { name: "eco_target", label: "Objectif (€)", selector: { number: {min:0, max:1000} } },
        { name: "total_day", label: "kWh Jour", selector: { entity: {} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } }
      ]
    };
    return html`
      <div class="tabs">
        ${['config_solar','config_batt','config_stats'].map(t => html`<button class="${this._selectedTab===t?'active':''}" @click=${()=>this._selectedTab=t}>${t.split('_')[1].toUpperCase()}</button>`)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.tabs{display:flex;gap:5px;margin-bottom:15px}button{flex:1;padding:10px;background:#2c2c2c;color:#fff;border:none;border-radius:5px;cursor:pointer}button.active{background:#ffc107;color:#000}`;
}
if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- 2. CARTE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'solar'; }
  setConfig(config) { this.config = config; }
  
  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }
  _getU(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].attributes.unit_of_measurement || '' : ''; }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    const panels = [{n:c.p1_name,e:c.p1_w,x:c.p1_extra,c:"#ffc107"},{n:c.p2_name,e:c.p2_w,x:c.p2_extra,c:"#00f9f9"},{n:c.p3_name,e:c.p3_w,x:c.p3_extra,c:"#4caf50"},{n:c.p4_name,e:c.p4_w,x:c.p4_extra,c:"#e91e63"}].filter(p => p.e && this.hass.states[p.e]);
    const gridVal = parseFloat(this._get(c.grid_flow));
    const gridUnit = this._getU(c.grid_flow) || 'W';

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        <div class="overlay">
            
            <div class="top-nav">
                <div class="t-badge"><ha-icon icon="mdi:cloud-outline"></ha-icon> ${this._get(c.entity_weather)}</div>
                <div class="t-badge ${gridVal > 0 ? 'export' : 'import'}">
                    <ha-icon icon="mdi:transmission-tower"></ha-icon> ${Math.abs(gridVal)} ${gridUnit}
                </div>
                <div class="t-badge green">${this._get(c.eco_money)}€</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="page">
                        <div class="header-main">
                            <div class="big-val">${this._get(c.total_now)}<small>W</small></div>
                            <div class="pct-val">OBJECTIF : ${this._get(c.total_obj_pct)}%</div>
                            <div class="bar-wrap"><div class="bar-f" style="width:${this._get(c.total_obj_pct)}%"></div></div>
                        </div>

                        <div class="panels-row">
                            ${panels.map(p => html`
                                <div class="hud-item">
                                    <div class="hud-circle" style="border-color:${p.c}33">
                                        <div class="scan" style="border-top-color:${p.c}"></div>
                                        <div class="hud-inner">
                                            <span class="x">${p.x || ''}</span>
                                            <span class="v" style="color:${p.c}">${Math.round(this._get(p.e))}</span>
                                            <span class="u">WATTS</span>
                                        </div>
                                    </div>
                                    <div class="hud-n">${p.n}</div>
                                </div>`)}
                        </div>

                        <div class="diag-grid">
                            ${[1,2,3,4,5,6].map(i => c[`d${i}_entity`] ? html`
                                <div class="d-box"><span class="d-l">${c[`d${i}_label`]}</span><span class="d-v">${this._get(c[`d${i}_entity`])}<small>${this._getU(c[`d${i}_entity`])}</small></span></div>` : '')}
                        </div>
                    </div>` 

                : this._tab === 'batt' ? html`
                    <div class="page">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="rack">
                                <div class="r-h"><b>${c[`b${i}_n`]}</b> <span>${this._get(c[`b${i}_s`])}%</span></div>
                                <div class="v-meter">
                                    ${[...Array(15)].map((_, idx) => html`<div class="v-seg ${parseInt(this._get(c[`b${i}_s`])) > (idx * 6.6) ? 'on' : ''}"></div>`)}
                                </div>
                                <div class="r-f"><span>${this._get(c[`b${i}_temp`])}°C</span> <span>${this._get(c[`b${i}_flow`])}W</span></div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="page">
                        <div class="eco-hero">
                            <div class="e-title">TOTAL ÉCONOMISÉ</div>
                            <div class="e-big">${this._get(c.eco_money)}<small>€</small></div>
                            <div class="e-bar"><div class="e-fill" style="width:${(parseFloat(this._get(c.eco_money))/(c.eco_target || 100))*100}%"></div></div>
                        </div>
                        <div class="eco-stats">
                            <div class="stat-card">
                                <span class="s-label">PROD. JOUR</span>
                                <span class="s-value">${this._get(c.total_day)} <small>kWh</small></span>
                            </div>
                            <div class="stat-card">
                                <span class="s-label">CONSO MAISON</span>
                                <span class="s-value">${this._get(c.main_cons_entity)} <small>W</small></span>
                            </div>
                        </div>
                    </div>`}
            </div>

            <div class="nav-footer">
                <div class="n-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}><ha-icon icon="mdi:solar-power"></ha-icon></div>
                <div class="n-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}><ha-icon icon="mdi:battery-charging-high"></ha-icon></div>
                <div class="n-btn ${this._tab==='stats'?'active':''}" @click=${()=>this._tab='stats'}><ha-icon icon="mdi:currency-eur"></ha-icon></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 24px; overflow: hidden; background: #050505; color: #fff; font-family: 'Segoe UI', Roboto, sans-serif; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; }
    
    .top-nav { display: flex; gap: 8px; margin-bottom: 20px; }
    .t-badge { background: rgba(255,255,255,0.07); padding: 6px 12px; border-radius: 10px; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 5px; }
    .t-badge.green { color: #4caf50; margin-left: auto; }
    .export { color: #00f9f9; box-shadow: inset 0 0 10px rgba(0,249,249,0.1); }
    .import { color: #ff5252; }

    .header-main { text-align: center; margin-bottom: 25px; }
    .big-val { font-size: 58px; font-weight: 900; color: #ffc107; line-height: 1; }
    .pct-val { font-size: 14px; font-weight: 800; color: #ffc107; margin-top: 15px; }
    .bar-wrap { height: 6px; background: rgba(255,255,255,0.1); width: 65%; margin: 8px auto; border-radius: 3px; overflow: hidden; }
    .bar-f { height: 100%; background: #ffc107; box-shadow: 0 0 15px #ffc107; }

    .panels-row { display: flex; justify-content: space-around; margin-bottom: 25px; }
    .hud-circle { width: 82px; height: 82px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); }
    .scan { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 3s linear infinite; top:0; left:0; box-sizing: border-box; }
    .hud-inner { text-align: center; line-height: 1; }
    .x { display: block; font-size: 7px; opacity: 0.5; margin-bottom: 2px; }
    .v { font-size: 20px; font-weight: 900; }
    .u { display: block; font-size: 7px; opacity: 0.3; font-weight: bold; margin-top: 2px; }
    .hud-n { font-size: 10px; font-weight: bold; margin-top: 10px; opacity: 0.7; text-align: center; }

    .diag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .d-box { background: rgba(255,255,255,0.03); padding: 10px; border-radius: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
    .d-l { display: block; font-size: 8px; opacity: 0.4; text-transform: uppercase; margin-bottom: 3px; }
    .d-v { font-size: 13px; font-weight: 800; color: #00f9f9; }

    .rack { background: rgba(255,255,255,0.03); padding: 15px; border-radius: 15px; margin-bottom: 12px; }
    .v-meter { display: flex; gap: 4px; height: 14px; margin: 10px 0; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.05); border-radius: 2px; }
    .v-seg.on { background: #4caf50; box-shadow: 0 0 8px #4caf50; }

    /* ECONOMIE LISIBILITÉ AMÉLIORÉE */
    .eco-hero { background: linear-gradient(180deg, rgba(76,175,80,0.15), transparent); padding: 30px; border-radius: 25px; text-align: center; border: 1px solid rgba(76,175,80,0.2); margin-bottom: 20px; }
    .e-big { font-size: 60px; font-weight: 900; color: #4caf50; text-shadow: 0 0 20px rgba(76,175,80,0.4); }
    .eco-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .stat-card { background: rgba(76,175,80,0.08); padding: 20px; border-radius: 20px; text-align: center; border: 1px solid rgba(76,175,80,0.1); }
    .s-label { display: block; font-size: 10px; font-weight: 800; opacity: 0.6; letter-spacing: 1px; margin-bottom: 10px; color: #4caf50; }
    .s-value { font-size: 24px; font-weight: 900; color: #fff; }
    .s-value small { font-size: 12px; opacity: 0.5; margin-left: 4px; }

    .nav-footer { display: flex; justify-content: space-around; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 22px; margin-top: auto; }
    .n-btn { opacity: 0.2; cursor: pointer; transition: 0.4s; }
    .n-btn.active { opacity: 1; color: #ffc107; transform: scale(1.1); }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
