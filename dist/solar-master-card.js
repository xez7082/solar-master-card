import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- 1. ÉDITEUR ULTRA-COMPLET ---
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
        { name: "entity_weather", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
        { name: "total_now", label: "Puissance Instantanée (W)", selector: { entity: {} } },
        { name: "grid_flow", label: "Flux Réseau (W) - Positif=Export / Négatif=Import", selector: { entity: {} } },
        { name: "obj_kwh_now", label: "kWh cumulés aujourd'hui", selector: { entity: {} } },
        { name: "obj_kwh_target", label: "Objectif kWh (fixe ou sensor)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Sensor Pourcentage Objectif", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau ${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } },
          { name: `p${i}_extra`, label: `Tension/Intensité P${i}`, selector: { text: {} } }
        ]).flat(),
        { name: "diag_title", label: "Titre Diagnostic", selector: { text: {} } },
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
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } },
        { name: "eco_money", label: "Économies (€)", selector: { entity: {} } },
        { name: "total_day", label: "kWh Jour", selector: { entity: {} } },
        { name: "total_month", label: "kWh Mois", selector: { entity: {} } },
        { name: "total_year", label: "kWh An", selector: { entity: {} } }
      ]
    };
    return html`<div class="tabs">${Object.keys(schemas).map(t => html`<button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>${t.replace('config_', '').toUpperCase()}</button>`)}</div><ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>`;
  }
  static styles = css`.tabs{display:flex;gap:4px;margin-bottom:10px}button{flex:1;padding:8px;font-size:10px;background:#222;color:#eee;border:none;border-radius:4px;cursor:pointer}button.active{background:#ffc107;color:#000;font-weight:700}`;
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
    const currentBg = this._tab === 'solar' ? c.bg_solar : (this._tab === 'batt' ? c.bg_batt : c.bg_stats);
    const panels = [{n:c.p1_name,e:c.p1_w,x:c.p1_extra,c:"#ffc107"},{n:c.p2_name,e:c.p2_w,x:c.p2_extra,c:"#00f9f9"},{n:c.p3_name,e:c.p3_w,x:c.p3_extra,c:"#4caf50"},{n:c.p4_name,e:c.p4_w,x:c.p4_extra,c:"#e91e63"}].filter(p => p.e && this.hass.states[p.e]);

    const gridVal = parseFloat(this._get(c.grid_flow));

    return html`
      <ha-card style="height:${c.card_height || 700}px; background: url('${currentBg || ''}') no-repeat center center / cover;">
        <div class="overlay" style="background: rgba(0,0,0,${c.overlay_opacity || 0.6}); backdrop-filter: blur(${c.blur_amount || 0}px);">
            
            <div class="top-nav">
                <div class="t-badge weather">
                   <ha-icon icon="mdi:weather-partly-cloudy"></ha-icon> 
                   ${this.hass.states[c.entity_weather] ? this.hass.states[c.entity_weather].state.toUpperCase() : 'STABLE'}
                </div>
                <div class="t-badge flow ${gridVal > 0 ? 'export' : 'import'}">
                    <ha-icon icon="${gridVal > 0 ? 'mdi:transmission-tower-export' : 'mdi:transmission-tower-import'}"></ha-icon>
                    ${Math.abs(gridVal)} W
                </div>
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
                            <div class="obj-pct-label">RENDEMENT JOURNALIER : ${this._get(c.total_obj_pct)}%</div>
                        </div>

                        <div class="panels-grid grid-${panels.length}">
                            ${panels.map(p => html`
                                <div class="hud-box">
                                    <div class="hud-circle" style="border-color: ${p.c}44;">
                                        <div class="hud-scan-ring" style="border-top-color: ${p.c};"></div>
                                        <div class="hud-inner-data">
                                            <span class="hud-extra">${p.x || '--'}</span>
                                            <span class="hud-val" style="color: ${p.c}">${Math.round(this._get(p.e))}</span>
                                            <span class="hud-unit">WATTS</span>
                                        </div>
                                    </div>
                                    <div class="hud-label">${p.n}</div>
                                </div>`)}
                        </div>

                        <div class="diag-wide-container">
                            <div class="diag-header-row">${c.diag_title || 'DONNÉES TECHNIQUES'}</div>
                            <div class="diag-wide-scroll">
                                ${[1,2,3,4,5,6].map(i => c[`d${i}_entity`] ? html`
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
                                    <span>TEMP: ${this._get(c[`b${i}_temp`])}°C</span>
                                    <span class="${parseFloat(this._get(c[`b${i}_flow`])) < 0 ? 'neg' : 'pos'}">${this._get(c[`b${i}_flow`])}W</span>
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
    ha-card { border-radius: 28px; overflow: hidden; color: #fff; font-family: 'Inter', system-ui; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; }
    
    .top-nav { display: flex; gap: 8px; margin-bottom: 15px; }
    .t-badge { background: rgba(0,0,0,0.5); padding: 6px 12px; border-radius: 12px; font-size: 11px; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; gap: 5px; }
    .t-badge.green { color: #4caf50; margin-left: auto; }
    .t-badge.export { color: #00f9f9; border-color: rgba(0,249,249,0.3); }
    .t-badge.import { color: #ff5252; border-color: rgba(255,82,82,0.3); }

    .content { flex: 1; overflow-y: auto; scrollbar-width: none; }
    .content::-webkit-scrollbar { display: none; }

    /* SOLAR */
    .total-yield-hub { text-align: center; margin-bottom: 20px; background: linear-gradient(180deg, rgba(255,193,7,0.1) 0%, rgba(0,0,0,0.3) 100%); padding: 15px; border-radius: 24px; border: 1px solid rgba(255,193,7,0.2); }
    .total-v { font-size: 52px; font-weight: 900; color: #ffc107; line-height: 0.9; }
    .obj-text-line { font-size: 14px; margin: 10px 0; font-weight: 500; }
    .obj-bar-wrap { height: 8px; background: rgba(255,255,255,0.05); border-radius: 4px; width: 85%; margin: 8px auto; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); }
    .obj-fill { height: 100%; background: linear-gradient(90deg, #ff9800, #ffc107); box-shadow: 0 0 15px rgba(255,193,7,0.5); }
    .obj-pct-label { font-size: 10px; font-weight: 900; opacity: 0.5; letter-spacing: 1.5px; }

    .panels-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
    .hud-circle { width: 105px; height: 105px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; position: relative; background: rgba(0,0,0,0.6); box-shadow: inset 0 0 20px rgba(0,0,0,0.5); }
    .hud-scan-ring { position: absolute; width: 100%; height: 100%; border: 3px solid transparent; border-radius: 50%; animation: rotate 3s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
    .hud-val { font-size: 26px; font-weight: 900; }
    .hud-extra { font-size: 9px; font-weight: 800; opacity: 0.6; margin-bottom: 2px; text-transform: uppercase; }
    .hud-label { font-size: 10px; font-weight: 800; margin-top: 10px; opacity: 0.9; letter-spacing: 1px; }

    /* DIAGNOSTIC WIDE (6 SLOTS) */
    .diag-wide-container { background: rgba(0,0,0,0.7); border-radius: 16px; padding: 12px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    .diag-header-row { font-size: 10px; font-weight: 900; opacity: 0.4; letter-spacing: 2px; margin-bottom: 12px; text-align: center; }
    .diag-wide-scroll { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; row-gap: 15px; }
    .diag-wide-item { display: flex; flex-direction: column; align-items: center; }
    .dw-lbl { font-size: 8px; opacity: 0.5; font-weight: 800; text-transform: uppercase; margin-bottom: 3px; }
    .dw-val { font-size: 14px; font-weight: 900; color: #00f9f9; }

    /* RACK BATTERIE */
    .rack-module { background: rgba(255,255,255,0.03); padding: 15px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 12px; }
    .rack-header { display: flex; align-items: center; gap: 12px; }
    .rack-soc { font-size: 20px; font-weight: 900; color: #4caf50; }
    .rack-vumeter { display: flex; gap: 3px; height: 10px; margin: 12px 0; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.05); border-radius: 2px; }
    .v-seg.on { background: #4caf50; box-shadow: 0 0 8px #4caf50; }

    /* ECO */
    .eco-circle-big { width: 160px; height: 160px; border: 8px solid #4caf50; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); }
    .eco-val { font-size: 48px; font-weight: 900; color: #4caf50; }

    .nav-footer { display: flex; justify-content: space-around; background: rgba(0,0,0,0.9); padding: 14px; border-radius: 24px; border: 1px solid rgba(255,255,255,0.1); margin-top: 15px; }
    .n-btn { opacity: 0.3; transition: 0.4s; cursor: pointer; }
    .n-btn.active { opacity: 1; color: #ffc107; transform: translateY(-3px); }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
