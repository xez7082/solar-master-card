import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

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
        { name: "card_height", label: "Hauteur Carte", selector: { number: { min: 400, max: 1200, step: 10 } } },
        { name: "bg_solar", label: "Image Fond", selector: { text: {} } },
        { name: "total_now", label: "Puissance Totale (W)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "% Objectif (Sensor)", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [
          { name: `p${i}_name`, label: `Nom P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } },
          { name: `p${i}_extra`, label: `Extra P${i} (ex: 230V)`, selector: { text: {} } }
        ]).flat(),
        ...[1,2,3,4,5,6].map(i => [
          { name: `d${i}_label`, label: `Diag ${i} Nom`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Diag ${i} Entité`, selector: { entity: {} } }
        ]).flat()
      ],
      config_batt: [
        { name: "bg_batt", label: "Image Fond", selector: { text: {} } },
        ...[1,2,3,4].map(i => [
          { name: `b${i}_n`, label: `Nom Bat ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_temp`, label: `Temp Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_flow`, label: `Flux Bat ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      config_stats: [
        { name: "bg_stats", label: "Image Fond", selector: { text: {} } },
        { name: "eco_money", label: "Économies (€)", selector: { entity: {} } },
        { name: "total_day", label: "kWh Jour", selector: { entity: {} } },
        { name: "total_month", label: "kWh Mois", selector: { entity: {} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } }
      ]
    };
    return html`<div class="tabs">${Object.keys(schemas).map(t => html`<button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>${t.replace('config_', '').toUpperCase()}</button>`)}</div><ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>`;
  }
}
if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

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
    const currentBg = this._tab === 'solar' ? c.bg_solar : (this._tab === 'batt' ? c.bg_batt : c.bg_stats);
    const panels = [{n:c.p1_name,e:c.p1_w,x:c.p1_extra,c:"#ffc107"},{n:c.p2_name,e:c.p2_w,x:c.p2_extra,c:"#00f9f9"},{n:c.p3_name,e:c.p3_w,x:c.p3_extra,c:"#4caf50"},{n:c.p4_name,e:c.p4_w,x:c.p4_extra,c:"#e91e63"}].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:${c.card_height || 650}px; background: url('${currentBg || ''}') no-repeat center center / cover;">
        <div class="overlay">
            
            <div class="top-nav">
                <div class="t-badge">MONITORING ACTIF</div>
                <div class="t-badge green">${this._get(c.eco_money)}€</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="solar-linear-view">
                        <div class="header-main">
                            <div class="big-val">${this._get(c.total_now)}<small>W</small></div>
                            <div class="bar-obj"><div class="fill-obj" style="width:${this._get(c.total_obj_pct)}%"></div></div>
                        </div>

                        <div class="panels-horizontal-row">
                            ${panels.map(p => html`
                                <div class="hud-item">
                                    <div class="hud-circle" style="border-color:${p.c}33">
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

                        <div class="diag-compact-row">
                            ${[1,2,3,4,5,6].map(i => c[`d${i}_entity`] ? html`
                                <div class="diag-mini">
                                    <span class="dm-l">${c[`d${i}_label`]}</span>
                                    <span class="dm-v">${this._get(c[`d${i}_entity`])}<small>${this._getU(c[`d${i}_entity`])}</small></span>
                                </div>` : '')}
                        </div>
                    </div>` 
                
                : this._tab === 'batt' ? html`
                    <div class="batt-view">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="batt-card">
                                <div class="bc-head"><b>${c[`b${i}_n`]}</b> <span>${this._get(c[`b${i}_s`])}%</span></div>
                                <div class="bc-bar"><div class="bc-fill" style="width:${this._get(c[`b${i}_s`])}%"></div></div>
                                <div class="bc-foot">${this._get(c[`b${i}_temp`])}°C | ${this._get(c[`b${i}_flow`])}W</div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="eco-view">
                        <div class="eco-hero">
                            <span class="eco-h-l">ÉCONOMIES TOTALES</span>
                            <span class="eco-h-v">${this._get(c.eco_money)}€</span>
                        </div>
                        <div class="eco-grid">
                            <div class="eco-tile"><span>JOUR</span><b>${this._get(c.total_day)}</b></div>
                            <div class="eco-tile"><span>MOIS</span><b>${this._get(c.total_month)}</b></div>
                            <div class="eco-tile"><span>CONSO</span><b>${this._get(c.main_cons_entity)}W</b></div>
                        </div>
                    </div>`}
            </div>

            <div class="nav-footer">
                <div class="n-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}><ha-icon icon="mdi:solar-power"></ha-icon></div>
                <div class="n-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}><ha-icon icon="mdi:battery"></ha-icon></div>
                <div class="n-btn ${this._tab==='stats'?'active':''}" @click=${()=>this._tab='stats'}><ha-icon icon="mdi:chart-line"></ha-icon></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 24px; overflow: hidden; color: #fff; font-family: 'Inter', sans-serif; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; background: rgba(0,0,0,0.7); backdrop-filter: blur(2px); }
    .top-nav { display: flex; justify-content: space-between; margin-bottom: 15px; }
    .t-badge { background: rgba(255,255,255,0.08); padding: 4px 10px; border-radius: 8px; font-size: 10px; font-weight: bold; }
    .t-badge.green { color: #4caf50; }
    
    /* HEADER TOTAL */
    .header-main { text-align: center; margin-bottom: 25px; }
    .big-val { font-size: 50px; font-weight: 900; color: #ffc107; line-height: 1; }
    .bar-obj { height: 4px; background: rgba(255,255,255,0.1); width: 60%; margin: 10px auto; border-radius: 2px; overflow: hidden; }
    .fill-obj { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; }

    /* CERCLES ALIGNÉS HORIZONTALEMENT */
    .panels-horizontal-row { display: flex; justify-content: space-around; gap: 5px; margin-bottom: 25px; overflow-x: auto; padding-bottom: 10px; }
    .hud-item { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 80px; }
    .hud-circle { width: 75px; height: 75px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); }
    .scan-ring { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 3s linear infinite; box-sizing: border-box; top:0; left:0;}
    .hud-data { display: flex; flex-direction: column; align-items: center; line-height: 1; }
    .h-extra { font-size: 7px; opacity: 0.6; margin-bottom: 2px; text-transform: uppercase; }
    .h-val { font-size: 16px; font-weight: 900; }
    .h-unit { font-size: 7px; opacity: 0.4; font-weight: bold; }
    .hud-name { font-size: 9px; font-weight: bold; margin-top: 8px; opacity: 0.8; text-align: center; white-space: nowrap; }

    /* DIAGNOSTIC COMPACT */
    .diag-compact-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: auto; }
    .diag-mini { background: rgba(255,255,255,0.03); padding: 8px; border-radius: 10px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
    .dm-l { display: block; font-size: 7px; opacity: 0.4; text-transform: uppercase; margin-bottom: 2px; }
    .dm-v { font-size: 12px; font-weight: 800; color: #00f9f9; }

    /* BATT & ECO */
    .batt-card { background: rgba(0,0,0,0.4); padding: 12px; border-radius: 12px; margin-bottom: 8px; }
    .bc-bar { height: 5px; background: rgba(255,255,255,0.1); margin: 8px 0; border-radius: 3px; overflow: hidden; }
    .bc-fill { height: 100%; background: #4caf50; }
    .eco-hero { text-align: center; padding: 30px 0; }
    .eco-h-v { display: block; font-size: 45px; font-weight: 900; color: #4caf50; }
    .eco-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .eco-tile { background: rgba(0,0,0,0.3); padding: 15px; border-radius: 12px; text-align: center; }

    .nav-footer { display: flex; justify-content: space-around; background: rgba(0,0,0,0.8); padding: 12px; border-radius: 20px; margin-top: auto; }
    .n-btn { opacity: 0.3; transition: 0.3s; cursor: pointer; }
    .n-btn.active { opacity: 1; color: #ffc107; }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .panels-horizontal-row::-webkit-scrollbar { display: none; }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
