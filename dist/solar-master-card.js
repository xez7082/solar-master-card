import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- ÉDITEUR CORRIGÉ ---
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
        { name: "background_image", label: "URL Image de fond (ex: /local/mon-toit.jpg)", selector: { text: {} } },
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

  _translateWeather(state) {
    const map = { 'clear-night': 'Nuit claire', 'cloudy': 'Nuageux', 'fog': 'Brouillard', 'hail': 'Grêle', 'lightning': 'Orage', 'lightning-rainy': 'Orage pluvieux', 'partlycloudy': 'Voilé', 'pouring': 'Averse', 'rainy': 'Pluie', 'snowy': 'Neige', 'sunny': 'Ensoleillé', 'windy': 'Venteux' };
    return map[state.toLowerCase()] || state;
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    const panels = [{n:c.p1_name,e:c.p1_w,x:c.p1_extra,c:"#ffc107"},{n:c.p2_name,e:c.p2_w,x:c.p2_extra,c:"#00f9f9"},{n:c.p3_name,e:c.p3_w,x:c.p3_extra,c:"#4caf50"},{n:c.p4_name,e:c.p4_w,x:c.p4_extra,c:"#e91e63"}].filter(p => p.e && this.hass.states[p.e]);
    const gridVal = parseFloat(this._get(c.grid_flow));

    // Construction dynamique du style de fond
    const bgStyle = c.background_image ? `
      background-image: url('${c.background_image}');
      opacity: ${c.bg_opacity || 0.4};
      filter: blur(${c.bg_blur || 0}px);
    ` : '';

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        <div class="bg-layer" style="${bgStyle}"></div>
        <div class="overlay">
            <div class="top-nav">
                <div class="t-badge"><ha-icon icon="mdi:weather-sunny"></ha-icon> ${this._translateWeather(this._get(c.entity_weather))}</div>
                <div class="t-badge ${gridVal > 0 ? 'export' : 'import'}"><ha-icon icon="mdi:transmission-tower"></ha-icon> ${Math.abs(gridVal)} W</div>
                <div class="t-badge green">${this._get(c.eco_money)}€</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="page">
                        <div class="header-main">
                            <div class="prod-label">PUISSANCE ACTUELLE</div>
                            <div class="big-val">${this._get(c.total_now)}<small>W</small></div>
                            <div class="pct-val">OBJECTIF : ${this._get(c.total_obj_pct)}%</div>
                            <div class="bar-wrap"><div class="bar-f" style="width:${this._get(c.total_obj_pct)}%"></div></div>
                            <div class="solar-sub-info">PRODUCTION JOUR : ${this._get(c.solar_daily_kwh)} kWh</div>
                        </div>
                        <div class="panels-row">
                            ${panels.map(p => html`
                                <div class="hud-item">
                                    <div class="hud-circle" style="border-color:${p.c}33">
                                        <div class="scan" style="border-top-color:${p.c}"></div>
                                        <div class="hud-inner"><span class="x">${p.x || ''}</span><span class="v" style="color:${p.c}">${Math.round(this._get(p.e))}</span><span class="u">WATTS</span></div>
                                        <div class="flow-arrow" style="color:${p.c}">▼</div>
                                    </div>
                                    <div class="hud-n">${p.n}</div>
                                </div>`)}
                        </div>
                        <div class="diag-grid">
                            ${[1,2,3,4,5,6].map(i => c[`d${i}_entity`] ? html`<div class="d-box"><span class="d-l">${c[`d${i}_label`]}</span><span class="d-v">${this._get(c[`d${i}_entity`])}<small>${this._getU(c[`d${i}_entity`])}</small></span></div>` : '')}
                        </div>
                    </div>` 

                : this._tab === 'batt' ? html`
                    <div class="page">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="rack">
                                <div class="r-h"><b>${c[`b${i}_n`]}</b> <span class="soc-v">${this._get(c[`b${i}_s`])}%</span></div>
                                <div class="v-meter">
                                    ${[...Array(25)].map((_, idx) => html`<div class="v-seg ${parseInt(this._get(c[`b${i}_s`])) > (idx * 4) ? 'on' : ''}"></div>`)}
                                </div>
                                <div class="r-f-separated">
                                    <div class="r-f-item"><ha-icon icon="mdi:thermometer"></ha-icon> ${this._get(c[`b${i}_temp`])}°C</div>
                                    <div class="r-f-item"><ha-icon icon="mdi:swap-vertical"></ha-icon> ${this._get(c[`b${i}_flow`])}W</div>
                                </div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="page">
                        <div class="eco-hero">
                            <div class="e-label">GAINS TOTAUX</div>
                            <div class="e-big">${this._get(c.eco_money)}<small>€</small></div>
                            <div class="e-target">Objectif : ${c.eco_target || 0}€ (${Math.round((parseFloat(this._get(c.eco_money))/(c.eco_target || 1)) * 100)}%)</div>
                            <div class="e-bar-wrap"><div class="e-bar-fill" style="width:${Math.min(100, (parseFloat(this._get(c.eco_money))/(c.eco_target || 1)) * 100)}%"></div></div>
                            <div class="e-price-tag">Prix kWh : ${this._get(c.kwh_price)} €</div>
                        </div>
                        <div class="eco-stats-grid">
                            <div class="stat-card"><span class="s-label">JOUR</span><span class="s-value green">${this._get(c.eco_day_euro)}<small>€</small></span></div>
                            <div class="stat-card"><span class="s-label">ANNUEL</span><span class="s-value yellow">${this._get(c.eco_year_euro)}<small>€</small></span></div>
                            <div class="stat-card"><span class="s-label">MAISON</span><span class="s-value">${this._get(c.main_cons_entity)}<small>W</small></span></div>
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
    
    /* FIX IMAGE FOND */
    .bg-layer { 
      position: absolute; 
      top: 0; left: 0; right: 0; bottom: 0; 
      background-size: cover; 
      background-position: center; 
      z-index: 1; 
      transition: all 0.5s ease-in-out; 
    }

    .overlay { 
      height: 100%; 
      display: flex; 
      flex-direction: column; 
      padding: 15px; 
      box-sizing: border-box; 
      position: relative; 
      z-index: 2; /* Devant l'image */
      background: linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%); 
    }
    
    .top-nav { display: flex; gap: 8px; margin-bottom: 20px; }
    .t-badge { background: rgba(255,255,255,0.08); padding: 7px 12px; border-radius: 12px; font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 6px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.1); }
    .t-badge.green { color: #4caf50; margin-left: auto; border: 1px solid rgba(76,175,80,0.3); }
    .export { color: #00f9f9; border: 1px solid rgba(0,249,249,0.3); }
    .import { color: #ff5252; border: 1px solid rgba(255,82,82,0.3); }

    .header-main { text-align: center; margin-bottom: 20px; }
    .big-val { font-size: 58px; font-weight: 900; color: #ffc107; line-height: 0.9; }
    .big-val small { font-size: 18px; margin-left: 4px; opacity: 0.6; }
    .bar-wrap { height: 6px; background: rgba(255,255,255,0.1); width: 60%; margin: 8px auto; border-radius: 10px; overflow: hidden; }
    .bar-f { height: 100%; background: #ffc107; box-shadow: 0 0 15px rgba(255,193,7,0.6); }

    .panels-row { display: flex; justify-content: space-around; margin-bottom: 20px; }
    .hud-circle { width: 80px; height: 80px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
    .scan { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 3.5s linear infinite; top:0; left:0; box-sizing: border-box; }
    .v { font-size: 20px; font-weight: 900; }
    .hud-n { font-size: 9px; font-weight: 800; margin-top: 10px; opacity: 0.7; text-align: center; }

    .diag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .d-box { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); }
    .d-v { font-size: 13px; font-weight: 800; color: #00f9f9; }

    .rack { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 18px; margin-bottom: 10px; border-left: 3px solid #4caf50; backdrop-filter: blur(10px); border-top: 1px solid rgba(255,255,255,0.1); }
    .v-meter { display: flex; gap: 3px; height: 12px; margin: 12px 0; }
    .v-seg { flex: 1; background: rgba(255,255,255,0.08); border-radius: 1px; }
    .v-seg.on { background: #4caf50; box-shadow: 0 0 5px rgba(76,175,80,0.5); }
    .r-f-item { background: rgba(255,255,255,0.05); padding: 6px; border-radius: 8px; font-size: 10px; display: flex; align-items: center; justify-content: center; gap: 4px; }

    .eco-hero { background: rgba(76,175,80,0.05); padding: 15px; border-radius: 20px; text-align: center; border: 1px solid rgba(76,175,80,0.2); margin-bottom: 12px; backdrop-filter: blur(10px); }
    .e-big { font-size: 54px; font-weight: 900; color: #4caf50; line-height: 1; }
    .e-bar-wrap { height: 6px; background: rgba(255,255,255,0.1); border-radius: 10px; margin: 8px 0; overflow: hidden; }
    .e-bar-fill { height: 100%; background: #4caf50; }

    .stat-card { background: rgba(255,255,255,0.05); padding: 12px 5px; border-radius: 16px; text-align: center; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px); }

    .nav-footer { display: flex; justify-content: space-around; background: rgba(20,20,20,0.9); padding: 10px; border-radius: 22px; margin-top: auto; backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); }
    .n-btn { opacity: 0.4; cursor: pointer; transition: 0.4s; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 10px; }
    .n-btn.active { opacity: 1; color: #ffc107; }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: translate(-50%, 0); } 50% { opacity: 0.3; transform: translate(-50%, 3px); } }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
