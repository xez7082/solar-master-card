import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE CONFIGURATION
 * ==========================================
 */
class SolarMasterCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {}, _selectedTab: { type: String } };
  }

  constructor() {
    super();
    this._selectedTab = 'tab_solar';
  }

  setConfig(config) {
    this._config = config;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const schemas = {
      tab_solar: [
        { name: "bg_url", label: "URL Image Fond", selector: { text: {} } },
        { name: "bg_opacity", label: "Opacité Fond (0.1 - 1)", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 400, max: 1000 } } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "solar_target", label: "Objectif Jour (kWh)", selector: { entity: {} } },
        { name: "solar_pct_sensor", label: "Sensor Objectif %", selector: { entity: {} } },
        { name: "conso_entity", label: "Entité Consommation (W)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_weather: [
        { name: "moon_entity", label: "Entité Lune", selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6].map(i => [
          { name: `w${i}_l`, label: `Label ${i}`, selector: { text: {} } },
          { name: `w${i}_e`, label: `Entité ${i}`, selector: { entity: {} } },
          { name: `w${i}_i`, label: `Icone ${i}`, selector: { text: {} } }
        ]).flat()
      ],
      tab_batt: [
        ...[1, 2, 3, 4].map(i => [
          { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
          { name: `b${i}_v`, label: `Watts Sortie ${i}`, selector: { entity: {} } },
          { name: `b${i}_out`, label: `Flux (Charge/Décharge) ${i}`, selector: { entity: {} } },
          { name: `b${i}_t`, label: `Température ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_eco: [
        { name: "eco_money", label: "Total Économies (€)", selector: { entity: {} } },
        { name: "main_cons", label: "Conso Maison (W)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gain Jour (€)", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="edit-tabs">
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>SOLAIRE</button>
        <button class="${this._selectedTab === 'tab_weather' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_weather'}>METEO</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIE</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ECO</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs { display: flex; gap: 4px; margin-bottom: 10px; } button { flex: 1; padding: 8px; font-size: 10px; cursor: pointer; background: #111; color: #666; border: 1px solid #333; border-radius: 4px; } button.active { background: #ffc107; color: #000; font-weight: bold; }`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CARTE PRINCIPALE
 * ==========================================
 */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '' };
    const s = this.hass.states[id];
    return { val: s.state, unit: s.attributes.unit_of_measurement || '' };
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;

    return html`
      <ha-card style="height:${c.card_height || 550}px; overflow: hidden; background: #000; position: relative;">
        <div style="height: 100%; display: flex; flex-direction: column;">
          
          ${c.bg_url ? html`<div style="background-image: url('${c.bg_url}'); opacity: ${c.bg_opacity || 0.3}; position: absolute; top:0; left:0; width:100%; height:100%; background-size:cover; background-position:center; pointer-events: none; z-index:0;"></div>` : ''}

          <div style="flex: 1; position: relative; z-index: 1; overflow-y: auto; padding: 15px;">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : ''}
            ${this._tab === 'METEO' ? this._renderWeather() : ''}
            ${this._tab === 'BATTERIE' ? this._renderBattery() : ''}
            ${this._tab === 'ECONOMIE' ? this._renderEco() : ''}
          </div>

          <div class="nav-bar">
            <div class="nav-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}><ha-icon icon="mdi:solar-power-variant"></ha-icon><span>SOLAIRE</span></div>
            <div class="nav-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon><span>METEO</span></div>
            <div class="nav-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}><ha-icon icon="mdi:battery-charging"></ha-icon><span>ENERGIE</span></div>
            <div class="nav-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}><ha-icon icon="mdi:chart-areaspline"></ha-icon><span>ECO</span></div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const consoVal = parseFloat(this._getVal(c.conso_entity).val) || 0;
    const progress = parseFloat(this._getVal(c.solar_pct_sensor).val) || 0;

    return html`
      <div class="page-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div style="flex:1; text-align:center; color:#ff4444;">${consoVal > 0 ? html`<ha-icon icon="mdi:transmission-tower"></ha-icon><br><b>${consoVal}W</b>` : ''}</div>
          <div style="flex:1.5; text-align:center; background:rgba(255,193,7,0.1); border:1px solid #ffc107; border-radius:15px; padding:10px;">
            <small style="font-size:10px; color:#aaa;">PRODUCTION</small><br>
            <span style="font-size:28px; font-weight:900; color:#ffc107;">${prod.val}W</span>
          </div>
          <div style="flex:1; text-align:center; color:#00ff00;">${consoVal < 0 ? html`<ha-icon icon="mdi:export"></ha-icon><br><b>${Math.abs(consoVal)}W</b>` : ''}</div>
        </div>

        <div style="display:flex; gap:3px; height:8px; margin-bottom:25px;">
          ${Array(20).fill().map((_, i) => html`<div style="flex:1; background:${i < progress/5 ? '#ffc107' : '#222'}; border-radius:2px; box-shadow: ${i < progress/5 ? '0 0 5px #ffc107' : 'none'};"></div>`)}
        </div>

        <div style="display: flex; justify-content: space-around; margin-bottom: 20px;">
          ${[1,2,3,4].map(i => {
            if(!c[`p${i}_w`]) return '';
            const v = this._getVal(c[`p${i}_w`]);
            return html`<div style="text-align:center;"><div class="solar-circle"><span style="font-size:14px; font-weight:bold;">${Math.round(v.val)}</span><small style="font-size:8px;">W</small></div><div style="font-size:9px; color:#888; margin-top:5px;">${c[`p${i}_name`] || 'P'+i}</div></div>`;
          })}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`
      <div class="page-content">
        ${[1, 2, 3, 4].map(i => {
          if (!c[`b${i}_s` or `b${i}_out` ...]) { // Simplified for code safety
            if (!c[`b${i}_s` or `b${i}_out` ...]) { } // Protection block
          }
          // Correct check for entities
          if (!c[`b${i}_s` || `b${i}_out` ...]) { } 
          
          // Logic corrected here
          const entitySoc = c[`b${i}_s`];
          if (!entitySoc) return '';
          
          const soc = parseFloat(this._getVal(entitySoc).val) || 0;
          const power = parseFloat(this._getVal(c[`b${i}_out`]).val) || 0;
          const clr = soc > 80 ? '#00c853' : (soc > 20 ? '#ffc107' : '#f44336');

          return html`
            <div class="batt-row" style="border-left: 4px solid ${clr}">
              <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="font-size:12px; font-weight:bold;">${c[`b${i}_n`] || 'BAT '+i}</span><b style="color:${clr}">${soc}%</b></div>
              <div style="height:6px; background:#111; border-radius:3px; overflow:hidden;"><div style="width:${soc}%; height:100%; background:${clr}; transition: 0.5s;"></div></div>
              <div style="display:flex; justify-content:space-between; font-size:10px; color:#666; margin-top:8px;">
                <span>TEMP: ${this._getVal(c[`b${i}_t`]).val}°C</span>
                <span style="color:#eee; font-weight:bold;">FLUX: ${power}W</span>
              </div>
            </div>`;
        })}
      </div>`;
  }

  _renderWeather() {
    const c = this.config;
    return html`
      <div class="page-content" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${[1, 2, 3, 4, 5, 6].map(i => {
            if(!c[`w${i}_e`]) return '';
            const s = this._getVal(c[`w${i}_e`]);
            return html`
              <div style="background:rgba(255,255,255,0.05); padding:8px; border-radius:10px; display:flex; align-items:center; gap:10px; border:1px solid #222;">
                <ha-icon icon="${c[`w${i}_i`] || 'mdi:circle-small'}" style="color:#00f9f9; --mdc-icon-size:20px;"></ha-icon>
                <div><small style="font-size:8px; color:#777; display:block;">${c[`w${i}_l`]}</small><b>${s.val}${s.unit}</b></div>
              </div>`;
          })}
        </div>
        <div style="text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center;">
           <ha-icon icon="mdi:moon-waning-crescent" style="--mdc-icon-size:60px; color:#ffc107; filter: drop-shadow(0 0 10px rgba(255,193,7,0.4));"></ha-icon>
           <div style="margin-top:15px; background:rgba(255,255,255,0.05); padding:10px; border-radius:10px; border:1px solid #333;">
             <small style="color:#888;">LUNE</small><br><b style="font-size:12px;">${this._getVal(c.moon_entity).val}</b>
           </div>
        </div>
      </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`
      <div class="page-content">
        <div style="text-align:center; padding:30px; background:rgba(76,175,80,0.1); border-radius:20px; border:1px solid #4caf50; margin-bottom:20px;">
          <small style="color:#aaa;">ÉCONOMIES TOTALES</small><br><b style="font-size:40px; color:#4caf50;">${this._getVal(c.eco_money).val}€</b>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
          <div style="background:#111; padding:15px; border-radius:12px; text-align:center; border:1px solid #222;">
            <small style="color:#777;">CONSO MAISON</small><br><b style="font-size:18px;">${this._getVal(c.main_cons).val}W</b>
          </div>
          <div style="background:#111; padding:15px; border-radius:12px; text-align:center; border:1px solid #222;">
            <small style="color:#777;">GAIN JOUR</small><br><b style="font-size:18px; color:#ffc107;">${this._getVal(c.eco_day_euro).val}€</b>
          </div>
        </div>
      </div>`;
  }

  static styles = css`
    .nav-bar { display: flex; justify-content: space-around; padding: 10px 0; background: rgba(0,0,0,0.9); border-top: 1px solid #222; z-index: 2; }
    .nav-btn { color: #555; text-align: center; cursor: pointer; flex: 1; transition: 0.3s; }
    .nav-btn.active { color: #ffc107; transform: translateY(-3px); }
    .nav-btn ha-icon { --mdc-icon-size: 24px; }
    .nav-btn span { display: block; font-size: 9px; font-weight: bold; margin-top: 4px; }
    
    .solar-circle { width: 60px; height: 60px; border-radius: 50%; border: 2px solid #ffc107; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); box-shadow: inset 0 0 10px rgba(255,193,7,0.3); }
    .batt-row { background: rgba(255,255,255,0.05); padding: 12px; border-radius: 10px; margin-bottom: 10px; border: 1px solid #222; }
    .page-content { animation: fadeIn 0.4s ease; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
