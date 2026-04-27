import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- ÉDITEUR COMPLET ---
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
        { name: "card_height", label: "Hauteur Totale Carte (px)", selector: { number: { min: 400, max: 1200, step: 10 } } },
        { name: "entity_weather", label: "Météo", selector: { entity: { domain: "weather" } } },
        { name: "total_now", label: "Prod Totale (W)", selector: { entity: {} } },
        { name: "grid_flow", label: "Réseau (W)", selector: { entity: {} } },
        ...[1,2,3,4].map(i => [{ name: `p${i}_name`, label: `Nom P${i}` }, { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }]).flat()
      ],
      config_batt: [
        ...[1,2,3,4].map(i => [
            { name: `b${i}_n`, label: `Nom Bat ${i}` },
            { name: `b${i}_s`, label: `SOC % Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_v`, label: `Volt (Gauche) Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_temp`, label: `Temp Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_cap`, label: `Capacité Bat ${i}`, selector: { entity: {} } },
            { name: `b${i}_a`, label: `Amp (Droite) Bat ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      config_stats: [
        { name: "eco_money", label: "Total Économisé (€)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gain Jour (€)", selector: { entity: {} } },
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
    const panels = [1,2,3,4].map(i => ({n:c[`p${i}_name`], e:c[`p${i}_w`] })).filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        <div class="overlay">
            <div class="top-nav">
                <div class="t-badge"><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon> ${this._get(c.entity_weather)}</div>
                <div class="t-badge"><ha-icon icon="mdi:transmission-tower"></ha-icon> ${this._get(c.grid_flow)}W</div>
            </div>

            <div class="main-content">
                ${this._tab === 'solar' ? html`
                    <div class="page">
                        <div class="big-display">
                            <span class="val">${this._get(c.total_now)}</span><span class="unit">WATTS</span>
                        </div>
                        <div class="p-grid">
                            ${panels.map(p => html`
                                <div class="p-item">
                                    <div class="p-val">${Math.round(this._get(p.e))}</div>
                                    <div class="p-name">${p.n}</div>
                                </div>
                            `)}
                        </div>
                    </div>`

                : this._tab === 'batt' ? html`
                    <div class="page battery-scroll">
                        ${[1,2,3,4].map(i => c[`b${i}_s`] ? html`
                            <div class="b-card">
                                <div class="b-head"><span>${c[`b${i}_n`]}</span> <b>${this._get(c[`b${i}_s`])}%</b></div>
                                <div class="led-bar">
                                    ${[...Array(40)].map((_, idx) => html`<div class="led ${parseInt(this._get(c[`b${i}_s`])) > (idx * 2.5) ? 'on' : ''}"></div>`)}
                                </div>
                                <div class="b-stats">
                                    <div class="s-box cyan">${this._get(c[`b${i}_v`])}<small>${this._getU(c[`b${i}_v`])}</small></div>
                                    <div class="s-box"><ha-icon icon="mdi:thermometer"></ha-icon>${this._get(c[`b${i}_temp`])}°</div>
                                    <div class="s-box"><ha-icon icon="mdi:battery-check"></ha-icon>${this._get(c[`b${i}_cap`])}<small>${this._getU(c[`b${i}_cap`])}</small></div>
                                    <div class="s-box cyan">${this._get(c[`b${i}_a`])}<small>${this._getU(c[`b${i}_a`])}</small></div>
                                </div>
                            </div>` : '')}
                    </div>`

                : html`
                    <div class="page">
                        <div class="eco-box">
                            <div class="eco-val">${this._get(c.eco_money)}€</div>
                            <div class="eco-label">ÉCONOMIE TOTALE</div>
                        </div>
                        <div class="stat-row">
                            <div class="stat-item"><span>JOUR</span><b>${this._get(c.eco_day_euro)}€</b></div>
                            <div class="stat-item"><span>CONSO</span><b>${this._get(c.main_cons_entity)}W</b></div>
                        </div>
                    </div>`}
            </div>

            <div class="footer">
                <div class="f-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}><ha-icon icon="mdi:solar-power"></ha-icon></div>
                <div class="f-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}><ha-icon icon="mdi:battery"></ha-icon></div>
                <div class="f-btn ${this._tab==='stats'?'active':''}" @click=${()=>this._tab='stats'}><ha-icon icon="mdi:chart-line"></ha-icon></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 24px; font-family: sans-serif; overflow: hidden; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; }
    
    .top-nav { display: flex; gap: 10px; margin-bottom: 20px; }
    .t-badge { background: #1a1a1a; padding: 8px 12px; border-radius: 12px; font-size: 11px; font-weight: bold; display: flex; align-items: center; gap: 6px; border: 1px solid #333; }

    .main-content { flex-grow: 1; min-height: 0; }
    
    /* SOLAIRE */
    .big-display { text-align: center; padding: 20px 0; }
    .big-display .val { font-size: 50px; font-weight: 900; color: #ffc107; }
    .big-display .unit { font-size: 14px; opacity: 0.5; margin-left: 8px; }
    .p-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .p-item { background: #111; padding: 15px; border-radius: 15px; text-align: center; border: 1px solid #222; }
    .p-val { font-size: 18px; font-weight: bold; color: #ffc107; }
    .p-name { font-size: 10px; opacity: 0.6; margin-top: 4px; }

    /* BATTERIES : HAUTEUR FIXE 480PX AVEC SCROLL */
    .battery-scroll { max-height: 480px; overflow-y: auto; padding-right: 5px; }
    .b-card { background: #111; padding: 12px; border-radius: 16px; margin-bottom: 10px; border-left: 4px solid #4caf50; }
    .b-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
    .led-bar { display: flex; gap: 1.5px; height: 6px; margin-bottom: 10px; }
    .led { flex: 1; background: #222; height: 100%; border-radius: 1px; }
    .led.on { background: #4caf50; box-shadow: 0 0 3px #4caf50; }
    .b-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
    .s-box { background: #000; padding: 6px 2px; border-radius: 6px; font-size: 10px; text-align: center; display: flex; align-items: center; justify-content: center; gap: 2px; font-weight: bold; }
    .cyan { color: #00f9f9; }
    small { font-size: 7px; opacity: 0.7; }

    /* STATS */
    .eco-box { background: #1a1a1a; padding: 30px; border-radius: 20px; text-align: center; border: 1px solid #333; margin-bottom: 15px; }
    .eco-val { font-size: 40px; font-weight: 900; color: #4caf50; }
    .eco-label { font-size: 10px; opacity: 0.5; margin-top: 5px; }
    .stat-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-item { background: #111; padding: 15px; border-radius: 15px; display: flex; flex-direction: column; align-items: center; }
    .stat-item span { font-size: 9px; opacity: 0.5; }
    .stat-item b { font-size: 16px; color: #fff; }

    /* FOOTER */
    .footer { display: flex; justify-content: space-around; padding: 15px 0; border-top: 1px solid #222; margin-top: 10px; }
    .f-btn { opacity: 0.3; cursor: pointer; transition: 0.3s; }
    .f-btn.active { opacity: 1; color: #ffc107; }
    
    ha-icon { --mdc-icon-size: 20px; }
    .s-box ha-icon { --mdc-icon-size: 12px; }

    .battery-scroll::-webkit-scrollbar { width: 3px; }
    .battery-scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
