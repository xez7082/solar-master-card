import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- ÉDITEUR (Identique) ---
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
        { name: "background_image", label: "URL Image de fond", selector: { text: {} } },
        { name: "bg_opacity", label: "Opacité Image (0.1 à 1)", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "bg_blur", label: "Flou Image (px)", selector: { number: { min: 0, max: 20, step: 1 } } },
        { name: "entity_weather", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "grid_flow", label: "Flux Réseau (W)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif (%)", selector: { entity: {} } },
        { name: "solar_daily_kwh", label: "Prod Jour (kWh)", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [{ name: `p${i}_name`, label: `Nom P${i}` }, { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }, { name: `p${i}_extra`, label: `Info P${i}` }]).flat(),
        ...[1,2,3,4,5,6].map(i => [{ name: `d${i}_label`, label: `Diag ${i} Nom` }, { name: `d${i}_entity`, label: `Diag ${i} Entité`, selector: { entity: {} } }]).flat()
      ],
      config_batt: [
        ...[1,2,3,4].map(i => [{ name: `b${i}_n`, label: `Nom Bat ${i}` }, { name: `b${i}_s`, label: `SOC % Bat ${i}`, selector: { entity: {} } }, { name: `b${i}_temp`, label: `Temp Bat ${i}`, selector: { entity: {} } }, { name: `b${i}_flow`, label: `Flux Bat ${i}`, selector: { entity: {} } }]).flat()
      ],
      config_stats: [
        { name: "eco_money", label: "Gains Totaux (€)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gains Jour (€)", selector: { entity: {} } },
        { name: "eco_year_euro", label: "Gains Annuels (€)", selector: { entity: {} } },
        { name: "kwh_price", label: "Prix du kWh (€)", selector: { entity: {} } },
        { name: "eco_target", label: "Objectif Mensuel (€)", selector: { number: {min:0, max:1000} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } }
      ]
    };
    return html`
      <div class="tabs">
        ${['config_solar','config_batt','config_stats'].map(t => html`<button class="${this._selectedTab===t?'active':''}" @click=${()=>this._selectedTab=t}>${t === 'config_solar' ? 'SOLAIRE' : t === 'config_batt' ? 'BATTERIES' : 'ÉCONOMIE'}</button>`)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.tabs{display:flex;gap:5px;margin-bottom:15px}button{flex:1;padding:10px;background:#2c2c2c;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:10px;font-weight:bold}button.active{background:#ffc107;color:#000}`;
}
if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- CARTE PRINCIPALE ---
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
    const bgStyle = c.background_image ? `background-image: url('${c.background_image}'); opacity: ${c.bg_opacity || 0.4}; filter: blur(${c.bg_blur || 0}px);` : '';

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        <div class="bg-layer" style="${bgStyle}"></div>
        <div class="overlay">
            <div class="top-nav">
                <div class="t-badge"><ha-icon icon="mdi:weather-sunny"></ha-icon> ${this._get(c.entity_weather)}</div>
                <div class="t-badge ${gridVal > 0 ? 'export' : 'import'}"><ha-icon icon="mdi:transmission-tower"></ha-icon> ${Math.abs(gridVal)} W</div>
                <div class="t-badge green">${this._get(c.eco_money)}€</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="page">
                        <div class="header-main">
                            <div class="big-val">${this._get(c.total_now)}<small>W</small></div>
                            <div class="bar-wrap"><div class="bar-f" style="width:${this._get(c.total_obj_pct)}%"></div></div>
                        </div>
                        <div class="panels-row">
                            ${panels.map(p => html`
                                <div class="hud-item">
                                    <div class="hud-circle" style="border-color:${p.c}44">
                                        <div class="scan" style="border-top-color:${p.c}"></div>
                                        <div class="hud-inner">
                                            <span class="v" style="color:${p.c}">${Math.round(this._get(p.e))}</span>
                                            <span class="u">WATTS</span>
                                        </div>
                                    </div>
                                    <div class="hud-n">${p.n}</div>
                                </div>`)}
                        </div>
                        <div class="diag-grid">
                            ${[1,2,3,4,5,6].map(i => c[`d${i}_entity`] ? html`<div class="d-box"><span class="d-l">${c[`d${i}_label`]}</span><span class="d-v">${this._get(c[`d${i}_entity`])}<small>${this._getU(c[`d${i}_entity`])}</small></span></div>` : '')}
                        </div>
                    </div>` 

                : this._tab === 'batt' ? html`
                    <div class="page battery-page">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="rack-mini">
                                <div class="r-h">
                                   <span class="r-n">${c[`b${i}_n`]}</span>
                                   <span class="soc-v">${this._get(c[`b${i}_s`])}%</span>
                                </div>
                                <div class="v-meter">
                                    ${[...Array(45)].map((_, idx) => html`<div class="v-seg ${parseInt(this._get(c[`b${i}_s`])) > (idx * 2.22) ? 'on' : ''}"></div>`)}
                                </div>
                                <div class="r-f-grid">
                                    <div class="r-f-box"><ha-icon icon="mdi:thermometer"></ha-icon> ${this._get(c[`b${i}_temp`])}°C</div>
                                    <div class="r-f-box"><ha-icon icon="mdi:swap-vertical"></ha-icon> ${this._get(c[`b${i}_flow`])}W</div>
                                </div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="page">
                        <div class="eco-hero">
                            <div class="e-big">${this._get(c.eco_money)}<small>€</small></div>
                            <div class="e-target">Objectif : ${c.eco_target || 0}€</div>
                            <div class="e-bar-wrap"><div class="e-bar-fill" style="width:${Math.min(100, (parseFloat(this._get(c.eco_money))/(c.eco_target || 1)) * 100)}%"></div></div>
                        </div>
                        <div class="eco-stats-grid">
                            <div class="stat-card"><span class="s-label">JOUR</span><span class="s-value green">${this._get(c.eco_day_euro)}€</span></div>
                            <div class="stat-card"><span class="s-label">ANNUEL</span><span class="s-value yellow">${this._get(c.eco_year_euro)}€</span></div>
                            <div class="stat-card"><span class="s-label">CONSO</span><span class="s-value">${this._get(c.main_cons_entity)}W</span></div>
                        </div>
                    </div>`}
            </div>

            <div class="nav-footer">
                <div class="n-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}><ha-icon icon="mdi:solar-power"></ha-icon><span>Solaire</span></div>
                <div class="n-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}><ha-icon icon="mdi:battery-charging-high"></ha-icon><span>Batteries</span></div>
                <div class="n-btn ${this._tab==='stats'?'active':''}" @click=${()=>this._tab='stats'}><ha-icon icon="mdi:finance"></ha-icon><span>Économie</span></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 28px; overflow: hidden; background: #000; color: #fff; font-family: 'Inter', sans-serif; position: relative; }
    .bg-layer { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-size: cover; background-position: center; z-index: 1; transition: 0.5s; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 12px; box-sizing: border-box; position: relative; z-index: 2; background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%); }
    
    .top-nav { display: flex; gap: 8px; margin-bottom: 15px; }
    .t-badge { background: rgba(255,255,255,0.1); padding: 6px 10px; border-radius: 10px; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(10px); }
    .t-badge.green { color: #4caf50; margin-left: auto; }

    .header-main { text-align: center; margin-bottom: 20px; }
    .big-val { font-size: 52px; font-weight: 900; color: #ffc107; line-height: 1; }
    .big-val small { font-size: 18px; margin-left: 5px; }
    .bar-wrap { height: 6px; background: rgba(255,255,255,0.1); width: 60%; margin: 8px auto; border-radius: 10px; overflow: hidden; }
    .bar-f { height: 100%; background: #ffc107; }

    .panels-row { display: flex; justify-content: space-around; margin-bottom: 20px; }
    .hud-circle { width: 85px; height: 85px; border-radius: 50%; border: 3px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); }
    .scan { position: absolute; width: 100%; height: 100%; border: 3px solid transparent; border-radius: 50%; animation: rotate 3s linear infinite; top:0; left:0; box-sizing: border-box; }
    .v { font-size: 20px; font-weight: 900; }
    .u { display: block; font-size: 7px; opacity: 0.5; font-weight: 900; }
    .hud-n { font-size: 10px; font-weight: 800; margin-top: 8px; text-align: center; }

    .diag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .d-box { background: rgba(255,255,255,0.06); padding: 8px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
    .d-v { font-size: 13px; font-weight: 800; color: #00f9f9; }
    .d-l { display: block; font-size: 9px; opacity: 0.6; }

    /* --- BATTERIES : COMPACT 480PX MAX --- */
    .battery-page { max-height: 480px; overflow-y: auto; padding-right: 5px; }
    .rack-mini { background: rgba(255,255,255,0.06); padding: 10px 12px; border-radius: 15px; margin-bottom: 8px; border-left: 3px solid #4caf50; backdrop-filter: blur(8px); }
    .r-h { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
    .r-n { font-size: 12px; font-weight: 800; opacity: 0.9; }
    .soc-v { color: #4caf50; font-weight: 900; font-size: 13px; }
    .v-meter { display: flex; gap: 1px; height: 5px; margin-bottom: 10px; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.04); width: 0.4px; } 
    .v-seg.on { background: #4caf50; box-shadow: 0 0 2px rgba(76,175,80,0.8); }
    .r-f-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .r-f-box { background: rgba(0,0,0,0.2); padding: 5px; border-radius: 8px; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 4px; border: 1px solid rgba(255,255,255,0.03); }

    .eco-hero { background: rgba(76,175,80,0.1); padding: 20px; border-radius: 20px; text-align: center; margin-bottom: 15px; }
    .e-big { font-size: 48px; font-weight: 900; color: #4caf50; }
    .e-bar-wrap { height: 8px; background: rgba(255,255,255,0.1); border-radius: 10px; margin: 10px 0; overflow: hidden; }
    .e-bar-fill { height: 100%; background: #4caf50; }

    .stat-card { background: rgba(255,255,255,0.06); padding: 10px; border-radius: 15px; text-align: center; }
    .s-value { font-size: 14px; font-weight: 900; }
    .s-label { font-size: 9px; opacity: 0.6; display: block; }

    .nav-footer { display: flex; justify-content: space-around; background: rgba(15,15,15,0.95); padding: 10px; border-radius: 20px; margin-top: auto; border: 1px solid rgba(255,255,255,0.05); }
    .n-btn { opacity: 0.4; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; font-size: 10px; }
    .n-btn.active { opacity: 1; color: #ffc107; }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    
    /* Scrollbar discrète */
    .battery-page::-webkit-scrollbar { width: 3px; }
    .battery-page::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
