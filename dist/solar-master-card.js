import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- 1. ÉDITEUR AVEC ONGLETS ---
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
        { name: "obj_kwh_now", label: "kWh Cumulés Jour", selector: { entity: {} } },
        { name: "obj_kwh_target", label: "Objectif kWh Jour", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau ${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } },
          { name: `p${i}_extra`, label: `Info P${i} (Tension/Intensité)`, selector: { text: {} } }
        ]).flat(),
        ...[1,2,3,4,5,6].map(i => [
          { name: `d${i}_label`, label: `Diag ${i} Label`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Diag ${i} Entité`, selector: { entity: {} } }
        ]).flat()
      ],
      config_batt: [
        ...[1,2,3,4].map(i => [
          { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % Batterie ${i}`, selector: { entity: {} } },
          { name: `b${i}_temp`, label: `Température Batterie ${i}`, selector: { entity: {} } },
          { name: `b${i}_flow`, label: `Flux Batterie ${i} (W)`, selector: { entity: {} } }
        ]).flat()
      ],
      config_stats: [
        { name: "eco_money", label: "Économies Cumulées (€)", selector: { entity: {} } },
        { name: "eco_target", label: "Objectif Économie Mensuel (€)", selector: { number: {min:0, max:1000} } },
        { name: "total_day", label: "Prod Jour (kWh)", selector: { entity: {} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="editor-tabs">
        <button class="${this._selectedTab === 'config_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'config_solar'}>SOLAIRE</button>
        <button class="${this._selectedTab === 'config_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'config_batt'}>BATTERIES</button>
        <button class="${this._selectedTab === 'config_stats' ? 'active' : ''}" @click=${() => this._selectedTab = 'config_stats'}>ECONOMIE</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }

  static styles = css`
    .editor-tabs { display: flex; gap: 5px; margin-bottom: 15px; }
    button { flex: 1; padding: 10px; border-radius: 4px; border: none; background: #2c2c2c; color: white; cursor: pointer; font-weight: bold; font-size: 11px; }
    button.active { background: #ffc107; color: black; }
  `;
}
if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- 2. CARTE PRINCIPALE ---
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

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        <div class="overlay">
            
            <div class="top-nav">
                <div class="t-badge"><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon> ${this._get(c.entity_weather)}</div>
                <div class="t-badge ${gridVal > 0 ? 'export' : 'import'}">
                    <ha-icon icon="mdi:transmission-tower"></ha-icon> ${Math.abs(gridVal)} W
                </div>
                <div class="t-badge green">${this._get(c.eco_money)}€</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="page">
                        <div class="header-main">
                            <div class="big-val">${this._get(c.total_now)}<small>W</small></div>
                            <div class="pct-tag">OBJECTIF : ${this._get(c.total_obj_pct)}%</div>
                            <div class="bar-container"><div class="bar-fill" style="width:${this._get(c.total_obj_pct)}%"></div></div>
                            <div class="obj-sub">${this._get(c.obj_kwh_now)} / ${this._get(c.obj_kwh_target)} kWh</div>
                        </div>

                        <div class="panels-horizontal">
                            ${panels.map(p => html`
                                <div class="hud-item">
                                    <div class="hud-circle" style="border-color:${p.c}44">
                                        <div class="scan-ring" style="border-top-color:${p.c}"></div>
                                        <div class="hud-data">
                                            <span class="h-extra">${p.x || '--'}</span>
                                            <span class="h-val" style="color:${p.c}">${Math.round(this._get(p.e))}</span>
                                            <span class="h-unit">W</span>
                                        </div>
                                    </div>
                                    <div class="hud-name">${p.n}</div>
                                </div>`)}
                        </div>

                        <div class="diag-wide-row">
                            ${[1,2,3,4,5,6].map(i => c[`d${i}_entity`] ? html`
                                <div class="diag-card">
                                    <span class="d-l">${c[`d${i}_label`]}</span>
                                    <span class="d-v">${this._get(c[`d${i}_entity`])}<small>${this._getU(c[`d${i}_entity`])}</small></span>
                                </div>` : '')}
                        </div>
                    </div>` 

                : this._tab === 'batt' ? html`
                    <div class="page">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="rack-unit">
                                <div class="r-head"><b>${c[`b${i}_n`]}</b> <span>${this._get(c[`b${i}_s`])}%</span></div>
                                <div class="segment-bar">
                                    ${[...Array(15)].map((_, idx) => html`<div class="seg ${parseInt(this._get(c[`b${i}_s`])) > (idx * 6.6) ? 'on' : ''}"></div>`)}
                                </div>
                                <div class="r-foot"><span>${this._get(c[`b${i}_temp`])}°C</span> <span>${this._get(c[`b${i}_flow`])}W</span></div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="page">
                        <div class="eco-neon-card">
                            <div class="eco-title">ÉCONOMIES RÉALISÉES</div>
                            <div class="eco-val">${this._get(c.eco_money)}<small>€</small></div>
                            <div class="eco-bar"><div class="eco-fill" style="width:${(parseFloat(this._get(c.eco_money))/(c.eco_target || 100))*100}%"></div></div>
                        </div>
                        <div class="eco-grid">
                            <div class="e-tile"><span>JOUR</span><b>${this._get(c.total_day)}</b><small>kWh</small></div>
                            <div class="e-tile"><span>CONSO</span><b>${this._get(c.main_cons_entity)}</b><small>W</small></div>
                        </div>
                    </div>`}
            </div>

            <div class="nav-footer">
                <div class="n-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}><ha-icon icon="mdi:solar-power"></ha-icon></div>
                <div class="n-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}><ha-icon icon="mdi:battery-charging-100"></ha-icon></div>
                <div class="n-btn ${this._tab==='stats'?'active':''}" @click=${()=>this._tab='stats'}><ha-icon icon="mdi:leaf"></ha-icon></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 24px; overflow: hidden; background: #080808; color: #fff; font-family: sans-serif; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; }
    
    /* NAV TOP */
    .top-nav { display: flex; gap: 10px; margin-bottom: 15px; }
    .t-badge { background: rgba(255,255,255,0.05); padding: 5px 12px; border-radius: 10px; font-size: 10px; font-weight: bold; display: flex; align-items: center; gap: 5px; }
    .t-badge.green { color: #4caf50; margin-left: auto; }
    .export { color: #00f9f9; border: 1px solid rgba(0,249,249,0.2); }
    .import { color: #ff5252; border: 1px solid rgba(255,82,82,0.2); }

    /* HEADER */
    .header-main { text-align: center; margin-bottom: 20px; }
    .big-val { font-size: 52px; font-weight: 900; color: #ffc107; line-height: 1; }
    .pct-tag { font-size: 13px; font-weight: bold; color: #ffc107; margin-top: 10px; }
    .bar-container { height: 5px; background: rgba(255,255,255,0.1); width: 60%; margin: 8px auto; border-radius: 3px; overflow: hidden; }
    .bar-fill { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; }
    .obj-sub { font-size: 11px; opacity: 0.5; }

    /* HUD PANELS HORIZONTAL */
    .panels-horizontal { display: flex; justify-content: space-around; margin-bottom: 20px; }
    .hud-circle { width: 78px; height: 78px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
    .scan-ring { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 4s linear infinite; top:0; left:0; box-sizing: border-box; }
    .hud-data { text-align: center; line-height: 1.1; }
    .h-extra { display: block; font-size: 7px; opacity: 0.5; }
    .h-val { font-size: 18px; font-weight: 900; }
    .h-unit { font-size: 8px; opacity: 0.4; }
    .hud-name { font-size: 9px; font-weight: bold; margin-top: 8px; opacity: 0.7; text-align: center; }

    /* DIAGNOSTIC LARGEUR */
    .diag-wide-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .diag-card { background: rgba(255,255,255,0.03); padding: 8px; border-radius: 8px; text-align: center; }
    .d-l { display: block; font-size: 7px; opacity: 0.4; }
    .d-v { font-size: 12px; font-weight: 800; color: #00f9f9; }

    /* BATT SEGMENTS */
    .rack-unit { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; margin-bottom: 10px; }
    .r-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
    .segment-bar { display: flex; gap: 3px; height: 12px; }
    .seg { flex: 1; background: rgba(255,255,255,0.05); }
    .seg.on { background: #4caf50; box-shadow: 0 0 5px #4caf50; }
    .r-foot { display: flex; justify-content: space-between; font-size: 10px; margin-top: 8px; opacity: 0.6; }

    /* ECO NEON */
    .eco-neon-card { background: linear-gradient(180deg, rgba(76,175,80,0.1), transparent); padding: 25px; border-radius: 20px; text-align: center; border: 1px solid rgba(76,175,80,0.2); margin-bottom: 15px; }
    .eco-val { font-size: 50px; font-weight: 900; color: #4caf50; margin: 10px 0; }
    .eco-bar { height: 6px; background: rgba(0,0,0,0.3); border-radius: 3px; overflow: hidden; }
    .eco-fill { height: 100%; background: #4caf50; }
    .eco-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .e-tile { background: rgba(255,255,255,0.03); padding: 15px; border-radius: 15px; text-align: center; }

    /* FOOTER */
    .nav-footer { display: flex; justify-content: space-around; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 20px; margin-top: auto; }
    .n-btn { opacity: 0.3; cursor: pointer; transition: 0.3s; }
    .n-btn.active { opacity: 1; color: #ffc107; }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
