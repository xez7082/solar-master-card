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
        { name: "bg_solar", label: "Fond Solaire", selector: { text: {} } },
        { name: "total_now", label: "Prod Totale (W)", selector: { entity: {} } },
        { name: "obj_kwh_now", label: "kWh Actuels", selector: { entity: {} } },
        { name: "obj_kwh_target", label: "Objectif kWh", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif %", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau ${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } },
          { name: `p${i}_extra`, label: `Extra P${i} (ex: 230V)`, selector: { text: {} } }
        ]).flat(),
        ...[1,2,3,4].map(i => [
          { name: `d${i}_label`, label: `Label Diag ${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité Diag ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      config_batt: [
        { name: "bg_batt", label: "Fond Batterie", selector: { text: {} } },
        ...[1,2,3,4].map(i => [
          { name: `b${i}_n`, label: `Nom Bat ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_temp`, label: `Temp Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_cap`, label: `Capacité Bat ${i}`, selector: { entity: {} } },
          { name: `b${i}_flow`, label: `Flux Bat ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      config_stats: [
        { name: "bg_stats", label: "Fond Économie", selector: { text: {} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } },
        { name: "eco_money", label: "Économies (€)", selector: { entity: {} } },
        { name: "total_day", label: "Prod Jour (kWh)", selector: { entity: {} } },
        { name: "total_month", label: "Prod Mois (kWh)", selector: { entity: {} } },
        { name: "total_year", label: "Prod An (kWh)", selector: { entity: {} } }
      ]
    };
    return html`<ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>`;
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
    if (!this.config) return html``;
    const c = this.config;
    const currentBg = this._tab === 'solar' ? c.bg_solar : (this._tab === 'batt' ? c.bg_batt : c.bg_stats);
    const panels = [{n:c.p1_name,e:c.p1_w,x:c.p1_extra,c:"#ffc107"},{n:c.p2_name,e:c.p2_w,x:c.p2_extra,c:"#00f9f9"},{n:c.p3_name,e:c.p3_w,x:c.p3_extra,c:"#4caf50"},{n:c.p4_name,e:c.p4_w,x:c.p4_extra,c:"#e91e63"}].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:${c.card_height || 700}px; background: url('${currentBg || ''}') no-repeat center center / cover;">
        <div class="overlay" style="background: rgba(0,0,0,${c.overlay_opacity || 0.6}); backdrop-filter: blur(${c.blur_amount || 0}px);">
            
            <div class="top-nav">
                <div class="t-badge">LIVE MONITORING</div>
                <div class="t-badge green">${this._get(c.eco_money)}€</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="solar-layout">
                        <div class="total-yield-hub">
                            <div class="total-v">${this._get(c.total_now)}<small>W</small></div>
                            <div class="obj-text-line">
                                <b>${this._get(c.obj_kwh_now)}</b> / ${this._get(c.obj_kwh_target)} <small>kWh</small>
                            </div>
                            <div class="obj-bar-wrap"><div class="obj-fill" style="width:${this._get(c.total_obj_pct)}%"></div></div>
                            <div class="obj-pct-label">PRODUCTION JOUR : ${this._get(c.total_obj_pct)}%</div>
                        </div>

                        <div class="panels-grid grid-${panels.length}">
                            ${panels.map(p => html`
                                <div class="hud-box">
                                    <div class="hud-circle" style="border-color: ${p.c}44;">
                                        <div class="hud-scan-ring" style="border-top-color: ${p.c};"></div>
                                        <div class="hud-inner-data">
                                            <span class="hud-extra">${p.x || 'OK'}</span>
                                            <span class="hud-val" style="color: ${p.c}">${Math.round(this._get(p.e))}</span>
                                            <span class="hud-unit">WATTS</span>
                                        </div>
                                    </div>
                                    <div class="hud-label">${p.n}</div>
                                </div>`)}
                        </div>

                        <div class="diag-wide-container">
                            <div class="diag-wide-scroll">
                                ${[1,2,3,4].map(i => c[`d${i}_entity`] ? html`
                                    <div class="diag-wide-item">
                                        <span class="dw-lbl">${c[`d${i}_label`]}</span>
                                        <span class="dw-val">${this._get(c[`d${i}_entity`])}<small>${this._getU(c[`d${i}_entity`])}</small></span>
                                    </div>` : '')}
                            </div>
                        </div>
                    </div>` 
                
                : this._tab === 'batt' ? html`
                    <div class="batt-rack-view">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="rack-module">
                                <div class="rack-header">
                                    <div class="led ${parseInt(this._get(c[`b${i}_s`])) < 20 ? 'red' : 'green'}"></div>
                                    <span class="rack-name">${c[`b${i}_n`]}</span>
                                    <span class="rack-soc">${this._get(c[`b${i}_s`])}%</span>
                                </div>
                                <div class="rack-vumeter">
                                    ${[...Array(10)].map((_, idx) => html`<div class="v-seg ${parseInt(this._get(c[`b${i}_s`])) > (idx * 10) ? 'on' : ''}"></div>`)}
                                </div>
                                <div class="rack-footer">
                                    <span>${this._get(c[`b${i}_temp`])}°C</span>
                                    <span class="${parseFloat(this._get(c[`b${i}_flow`])) < 0 ? 'neg' : 'pos'}">${this._get(c[`b${i}_flow`])}W</span>
                                    <span>${this._get(c[`b${i}_cap`])}</span>
                                </div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="economy-view">
                        <div class="eco-circle-container">
                            <div class="eco-circle-big">
                                <span class="eco-lbl">ÉCONOMIES</span>
                                <span class="eco-val">${this._get(c.eco_money)}<small>€</small></span>
                                <div class="eco-ring-pulse"></div>
                            </div>
                        </div>
                        <div class="eco-grid">
                            <div class="eco-tile"><span>JOUR</span><b>${this._get(c.total_day)}</b><small>kWh</small></div>
                            <div class="eco-tile"><span>MOIS</span><b>${this._get(c.total_month)}</b><small>kWh</small></div>
                            <div class="eco-tile"><span>ANNÉE</span><b>${this._get(c.total_year)}</b><small>kWh</small></div>
                            <div class="eco-tile"><span>CONSO</span><b>${this._get(c.main_cons_entity)}</b><small>W</small></div>
                        </div>
                    </div>`}
            </div>

            <div class="nav-footer">
                <div class="n-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}><ha-icon icon="mdi:solar-power-variant"></ha-icon></div>
                <div class="n-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}><ha-icon icon="mdi:battery-high"></ha-icon></div>
                <div class="n-btn ${this._tab==='stats'?'active':''}" @click=${()=>this._tab='stats'}><ha-icon icon="mdi:finance"></ha-icon></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 28px; overflow: hidden; color: #fff; font-family: 'Segoe UI', system-ui; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; }
    .top-nav { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .t-badge { background: rgba(0,0,0,0.4); padding: 5px 12px; border-radius: 10px; font-size: 11px; font-weight: bold; }
    .t-badge.green { color: #4caf50; border: 1px solid rgba(76,175,80,0.3); }
    .content { flex: 1; overflow-y: auto; scrollbar-width: none; }
    .content::-webkit-scrollbar { display: none; }

    /* SOLAR LAYOUT */
    .total-yield-hub { text-align: center; margin-bottom: 15px; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.05); }
    .total-v { font-size: 48px; font-weight: 900; color: #ffc107; line-height: 1; }
    .obj-text-line { font-size: 13px; margin: 5px 0; opacity: 0.8; }
    .obj-bar-wrap { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; width: 70%; margin: 5px auto; overflow: hidden; }
    .obj-fill { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; }
    .obj-pct-label { font-size: 8px; font-weight: 900; opacity: 0.4; letter-spacing: 1px; }

    .panels-grid { display: grid; gap: 10px; justify-items: center; margin-bottom: 20px; }
    .grid-4 { grid-template-columns: 1fr 1fr; }
    .hud-circle { width: 95px; height: 95px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; position: relative; background: rgba(0,0,0,0.5); }
    .hud-scan-ring { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 4s linear infinite; }
    .hud-val { font-size: 22px; font-weight: 900; }
    .hud-extra { font-size: 8px; opacity: 0.7; margin-bottom: 1px; }
    .hud-inner-data { display: flex; flex-direction: column; align-items: center; line-height: 1; }
    .hud-label { font-size: 9px; font-weight: bold; margin-top: 6px; opacity: 0.8; text-transform: uppercase; }

    /* DIAGNOSTIC VERSION LONGUEUR (HORIZONTALE) */
    .diag-wide-container { margin-top: auto; background: rgba(0,0,0,0.5); border-radius: 12px; padding: 10px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden; }
    .diag-wide-scroll { display: flex; justify-content: space-around; align-items: center; gap: 15px; }
    .diag-wide-item { display: flex; flex-direction: column; align-items: center; min-width: 60px; border-right: 1px solid rgba(255,255,255,0.1); padding-right: 15px; }
    .diag-wide-item:last-child { border: none; padding: 0; }
    .dw-lbl { font-size: 8px; opacity: 0.5; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
    .dw-val { font-size: 13px; font-weight: 900; color: #00f9f9; }
    .dw-val small { font-size: 8px; margin-left: 1px; opacity: 0.6; color: #fff; }

    /* BATT RACK */
    .rack-module { background: rgba(0,0,0,0.6); padding: 10px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 8px; }
    .rack-soc { font-size: 16px; font-weight: 900; color: #4caf50; }
    .rack-vumeter { display: flex; gap: 2px; height: 6px; margin: 8px 0; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.05); }
    .v-seg.on { background: #4caf50; }
    .rack-footer { display: flex; justify-content: space-between; font-size: 9px; opacity: 0.7; }

    /* ECO CIRCLE */
    .eco-circle-big { width: 140px; height: 140px; border-radius: 50%; border: 5px solid #4caf50; background: rgba(0,0,0,0.5); display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
    .eco-val { font-size: 38px; font-weight: 900; color: #4caf50; }
    .eco-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .eco-tile { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 15px; text-align: center; }

    /* NAV */
    .nav-footer { display: flex; justify-content: space-around; background: rgba(0,0,0,0.8); padding: 10px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.15); margin-top: 10px; }
    .n-btn { opacity: 0.3; transition: 0.3s; cursor: pointer; }
    .n-btn.active { opacity: 1; color: #ffc107; }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
