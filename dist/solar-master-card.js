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
        { name: "card_height", label: "Hauteur Carte", selector: { number: { min: 400, max: 1200, step: 10 } } },
        { name: "bg_solar", label: "Image Fond", selector: { text: {} } },
        { name: "total_now", label: "Puissance Instantanée (W)", selector: { entity: {} } },
        { name: "obj_kwh_now", label: "kWh cumulés", selector: { entity: {} } },
        { name: "obj_kwh_target", label: "Objectif kWh", selector: { entity: {} } },
        { name: "total_obj_pct", label: "% Objectif", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [
          { name: `p${i}_name`, label: `Nom P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } },
          { name: `p${i}_extra`, label: `Extra P${i}`, selector: { text: {} } }
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
        { name: "eco_target", label: "Objectif Mensuel (€)", selector: { number: {min:0, max:500} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } },
        { name: "total_day", label: "kWh Jour", selector: { entity: {} } },
        { name: "total_month", label: "kWh Mois", selector: { entity: {} } },
        { name: "total_year", label: "kWh An", selector: { entity: {} } }
      ]
    };
    return html`<div class="tabs">${Object.keys(schemas).map(t => html`<button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>${t.replace('config_', '').toUpperCase()}</button>`)}</div><ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>`;
  }
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
    const currentBg = this._tab === 'solar' ? c.bg_solar : (this._tab === 'batt' ? c.bg_batt : c.bg_stats);
    const panels = [{n:c.p1_name,e:c.p1_w,x:c.p1_extra,c:"#ffc107"},{n:c.p2_name,e:c.p2_w,x:c.p2_extra,c:"#00f9f9"},{n:c.p3_name,e:c.p3_w,x:c.p3_extra,c:"#4caf50"},{n:c.p4_name,e:c.p4_w,x:c.p4_extra,c:"#e91e63"}].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:${c.card_height || 650}px; background: url('${currentBg || ''}') no-repeat center center / cover;">
        <div class="overlay" style="background: rgba(0,0,0,${c.overlay_opacity || 0.7}); backdrop-filter: blur(${c.blur_amount || 2}px);">
            
            <div class="top-nav">
                <div class="t-badge"><ha-icon icon="mdi:flash"></ha-icon> SYSTEME LIVE</div>
                <div class="t-badge green">${this._get(c.eco_money)}€</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="solar-linear">
                        <div class="main-display">
                            <div class="val">${this._get(c.total_now)}<small>W</small></div>
                            <div class="sub">PUISSANCE GÉNÉRÉE</div>
                            <div class="progress-container">
                                <div class="bar-bg"><div class="bar-fill" style="width:${this._get(c.total_obj_pct)}%"></div></div>
                                <div class="bar-labels"><span>0kwh</span><span>${this._get(c.obj_kwh_now)} / ${this._get(c.obj_kwh_target)} kWh</span></div>
                            </div>
                        </div>

                        <div class="panels-linear-row">
                            ${panels.map(p => html`
                                <div class="panel-pill">
                                    <div class="p-circle" style="border-color:${p.c}">
                                        <span style="color:${p.c}">${Math.round(this._get(p.e))}</span>
                                    </div>
                                    <div class="p-info">
                                        <span class="p-name">${p.n}</span>
                                        <span class="p-extra">${p.x}</span>
                                    </div>
                                </div>`)}
                        </div>

                        <div class="diag-grid-compact">
                            ${[1,2,3,4,5,6].map(i => c[`d${i}_entity`] ? html`
                                <div class="diag-card">
                                    <span class="d-l">${c[`d${i}_label`]}</span>
                                    <span class="d-v">${this._get(c[`d${i}_entity`])}<small>${this._getU(c[`d${i}_entity`])}</small></span>
                                </div>` : '')}
                        </div>
                    </div>` 
                
                : this._tab === 'batt' ? html`
                    <div class="batt-view">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="rack-unit">
                                <div class="r-top"><b>${c[`b${i}_n`]}</b><span>${this._get(c[`b${i}_s`])}%</span></div>
                                <div class="r-bar"><div class="r-fill" style="width:${this._get(c[`b${i}_s`])}%"></div></div>
                                <div class="r-bot"><span>TEMP: ${this._get(c[`b${i}_temp`])}°C</span><span>FLUX: ${this._get(c[`b${i}_flow`])}W</span></div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="eco-new-design">
                        <div class="eco-money-card">
                            <div class="eco-header">CUMUL ÉCONOMIES</div>
                            <div class="eco-main-val">${this._get(c.eco_money)}<small>€</small></div>
                            <div class="eco-target-bar">
                                <div class="t-fill" style="width:${(parseFloat(this._get(c.eco_money))/(c.eco_target || 100))*100}%"></div>
                            </div>
                            <div class="eco-target-lbl">OBJECTIF : ${c.eco_target || 100}€</div>
                        </div>
                        <div class="eco-stats-grid">
                            <div class="stat-box"><span>AUJOURD'HUI</span><b>${this._get(c.total_day)}</b><small>kWh</small></div>
                            <div class="stat-box"><span>CE MOIS</span><b>${this._get(c.total_month)}</b><small>kWh</small></div>
                            <div class="stat-box"><span>CETTE ANNÉE</span><b>${this._get(c.total_year)}</b><small>kWh</small></div>
                            <div class="stat-box"><span>CONSO MAISON</span><b>${this._get(c.main_cons_entity)}</b><small>W</small></div>
                        </div>
                    </div>`}
            </div>

            <div class="nav-footer">
                <div class="n-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}><ha-icon icon="mdi:view-dashboard"></ha-icon></div>
                <div class="n-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}><ha-icon icon="mdi:battery-charging"></ha-icon></div>
                <div class="n-btn ${this._tab==='stats'?'active':''}" @click=${()=>this._tab='stats'}><ha-icon icon="mdi:trending-up"></ha-icon></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 30px; overflow: hidden; color: #fff; font-family: 'Inter', sans-serif; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
    .top-nav { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .t-badge { background: rgba(255,255,255,0.1); padding: 6px 14px; border-radius: 12px; font-size: 11px; font-weight: 700; backdrop-filter: blur(5px); }
    .t-badge.green { color: #4caf50; background: rgba(76,175,80,0.1); }
    .content { flex: 1; }

    /* DESIGN PANNEAUX LINEAIRE */
    .main-display { text-align: center; margin-bottom: 30px; }
    .main-display .val { font-size: 58px; font-weight: 900; line-height: 1; color: #ffc107; }
    .main-display .sub { font-size: 10px; opacity: 0.5; letter-spacing: 2px; margin-top: 5px; }
    .progress-container { width: 80%; margin: 15px auto; }
    .bar-bg { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
    .bar-fill { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; }
    .bar-labels { display: flex; justify-content: space-between; font-size: 9px; margin-top: 5px; opacity: 0.6; }

    .panels-linear-row { display: flex; flex-direction: column; gap: 10px; margin-bottom: 25px; }
    .panel-pill { background: rgba(0,0,0,0.4); padding: 8px 15px; border-radius: 50px; display: flex; align-items: center; gap: 15px; border: 1px solid rgba(255,255,255,0.05); }
    .p-circle { width: 45px; height: 45px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 14px; }
    .p-info { display: flex; flex-direction: column; }
    .p-name { font-size: 11px; font-weight: 700; }
    .p-extra { font-size: 9px; opacity: 0.5; }

    .diag-grid-compact { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .diag-card { background: rgba(255,255,255,0.03); padding: 10px; border-radius: 12px; text-align: center; }
    .d-l { display: block; font-size: 8px; opacity: 0.4; margin-bottom: 4px; }
    .d-v { font-size: 13px; font-weight: 800; color: #00f9f9; }

    /* DESIGN ECONOMIES STYLE COMPTEUR */
    .eco-money-card { background: linear-gradient(135deg, rgba(76,175,80,0.2) 0%, rgba(0,0,0,0.5) 100%); padding: 25px; border-radius: 24px; text-align: center; border: 1px solid rgba(76,175,80,0.3); margin-bottom: 20px; }
    .eco-header { font-size: 10px; letter-spacing: 2px; opacity: 0.6; }
    .eco-main-val { font-size: 54px; font-weight: 900; color: #4caf50; margin: 10px 0; }
    .eco-target-bar { height: 10px; background: rgba(0,0,0,0.3); border-radius: 5px; overflow: hidden; margin: 10px 0; }
    .t-fill { height: 100%; background: #4caf50; box-shadow: 0 0 15px #4caf50; }
    .eco-target-lbl { font-size: 10px; opacity: 0.5; font-weight: 700; }
    .eco-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stat-box { background: rgba(0,0,0,0.3); padding: 15px; border-radius: 18px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
    .stat-box span { display: block; font-size: 9px; opacity: 0.4; margin-bottom: 5px; }
    .stat-box b { font-size: 18px; color: #fff; }

    /* BATTERIES RACK */
    .rack-unit { background: rgba(0,0,0,0.4); padding: 15px; border-radius: 15px; margin-bottom: 10px; border-left: 4px solid #4caf50; }
    .r-top { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .r-bar { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
    .r-fill { height: 100%; background: #4caf50; }
    .r-bot { display: flex; justify-content: space-between; font-size: 10px; opacity: 0.5; margin-top: 8px; }

    .nav-footer { display: flex; justify-content: space-around; background: rgba(0,0,0,0.8); padding: 15px; border-radius: 25px; margin-top: auto; }
    .n-btn { opacity: 0.3; cursor: pointer; transition: 0.3s; }
    .n-btn.active { opacity: 1; color: #ffc107; transform: scale(1.2); }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
