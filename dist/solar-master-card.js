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
        { name: "background_image", label: "URL Image de fond", selector: { text: {} } },
        { name: "bg_opacity", label: "Opacité Image (0.1 à 1)", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "bg_blur", label: "Flou Image (px)", selector: { number: { min: 0, max: 20, step: 1 } } },
        { name: "bg_contrast", label: "Netteté/Contraste (0.5 à 2)", selector: { number: { min: 0.5, max: 2, step: 0.1 } } },
        { name: "entity_weather", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "grid_flow", label: "Flux Réseau (W)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif (%)", selector: { entity: {} } },
        { name: "solar_daily_kwh", label: "Prod Jour (kWh)", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [{ name: `p${i}_name`, label: `Nom P${i}` }, { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }, { name: `p${i}_extra`, label: `Info P${i}` }]).flat()
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

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        ${c.background_image ? html`
            <div class="bg-img" style="
                background-image: url('${c.background_image}'); 
                opacity: ${c.bg_opacity || 0.4}; 
                filter: blur(${c.bg_blur || 2}px) contrast(${c.bg_contrast || 1});
            "></div>` : ''}
        
        <div class="overlay">
            <div class="top-nav">
                <div class="t-badge"><ha-icon icon="mdi:weather-sunny"></ha-icon> ${this._get(c.entity_weather)}</div>
                <div class="t-badge ${gridVal > 0 ? 'export' : 'import'}">
                    <ha-icon icon="mdi:transmission-tower"></ha-icon> ${Math.abs(gridVal)} W
                </div>
                <div class="t-badge green">${this._get(c.eco_money)}€</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="page slide-in">
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
                                        <div class="flow-arrow" style="color:${p.c}">▼</div>
                                    </div>
                                    <div class="hud-n">${p.n}</div>
                                </div>`)}
                        </div>
                    </div>` 

                : this._tab === 'batt' ? html`
                    <div class="page slide-in">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="rack">
                                <div class="r-h"><b>${c[`b${i}_n`]}</b> <span class="soc-v">${this._get(c[`b${i}_s`])}%</span></div>
                                <div class="v-meter">
                                    ${[...Array(15)].map((_, idx) => html`<div class="v-seg ${parseInt(this._get(c[`b${i}_s`])) > (idx * 6.6) ? 'on' : ''}"></div>`)}
                                </div>
                                <div class="r-f-separated">
                                    <div class="r-f-item"><ha-icon icon="mdi:thermometer"></ha-icon> ${this._get(c[`b${i}_temp`])}°C</div>
                                    <div class="r-f-item"><ha-icon icon="mdi:swap-vertical"></ha-icon> ${this._get(c[`b${i}_flow`])}W</div>
                                </div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="page slide-in">
                        <div class="eco-hero">
                            <div class="e-big">${this._get(c.eco_money)}<small>€</small></div>
                            <div class="e-price-tag">Prix kWh : ${this._get(c.kwh_price)} €</div>
                        </div>
                        <div class="eco-stats-grid">
                            <div class="stat-card"><span class="s-label">JOUR</span><span class="s-value green">${this._get(c.eco_day_euro)}€</span></div>
                            <div class="stat-card"><span class="s-label">ANNUEL</span><span class="s-value yellow">${this._get(c.eco_year_euro)}€</span></div>
                            <div class="stat-card"><span class="s-label">MAISON</span><span class="s-value">${this._get(c.main_cons_entity)}W</span></div>
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
    ha-card { border-radius: 28px; overflow: hidden; background: #000; color: #fff; position: relative; }
    .bg-img { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background-size: cover; background-position: center; transition: 0.5s; z-index: 0; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; position: relative; z-index: 1; background: linear-gradient(180deg, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.7) 100%); }
    
    .t-badge { background: rgba(0,0,0,0.6); backdrop-filter: blur(10px); padding: 7px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); font-size: 11px; font-weight: 800; display: flex; align-items: center; gap: 6px; }
    .t-badge.green { color: #4caf50; margin-left: auto; border: 1px solid rgba(76,175,80,0.3); }
    .big-val { font-size: 62px; font-weight: 900; color: #ffc107; text-align: center; }
    .hud-circle { background: rgba(0,0,0,0.5); backdrop-filter: blur(8px); width: 84px; height: 84px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; }
    .rack, .stat-card, .d-box { background: rgba(0,0,0,0.6); backdrop-filter: blur(12px); border-radius: 18px; border: 1px solid rgba(255,255,255,0.1); padding: 15px; margin-bottom: 10px; }
    .nav-footer { background: rgba(0,0,0,0.7); backdrop-filter: blur(20px); display: flex; justify-content: space-around; padding: 12px; border-radius: 25px; margin-top: auto; border: 1px solid rgba(255,255,255,0.1); }
    
    .scan { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 3.5s linear infinite; top:0; left:0; box-sizing: border-box; }
    .flow-arrow { position: absolute; bottom: -8px; left: 50%; transform: translateX(-50%); font-size: 10px; animation: pulse 1.5s infinite; }
    .n-btn { opacity: 0.4; cursor: pointer; transition: 0.3s; display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .n-btn.active { opacity: 1; color: #ffc107; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .slide-in { animation: slideIn 0.3s ease-out; }
    @keyframes slideIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
