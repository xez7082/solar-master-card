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
  static get properties() { return { hass: {}, _config: {}, _selectedTab: { type: String } }; }
  constructor() { super(); this._selectedTab = 'tab_solar'; }
  setConfig(config) { this._config = config; }

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
        { name: "bg_opacity", label: "Opacité Fond", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "conso_entity", label: "Entité Consommation (W)", selector: { entity: {} } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "solar_target", label: "Objectif Jour (kWh)", selector: { entity: {} } },
        { name: "solar_pct_sensor", label: "Sensor Objectif %", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `Label Extra ${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité Extra ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [
        ...[1, 2, 3, 4].map(i => [
          { name: `b${i}_n`, label: `Nom Batt ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
          { name: `b${i}_v`, label: `Watts Sortie ${i}`, selector: { entity: {} } },
          { name: `b${i}_out`, label: `Flux Global ${i}`, selector: { entity: {} } },
          { name: `b${i}_t`, label: `Température ${i}`, selector: { entity: {} } }
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
      tab_eco: [
        { name: "eco_money", label: "Économies (€)", selector: { entity: {} } },
        { name: "main_cons", label: "Conso Maison (W)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gain Jour (€)", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="edit-tabs">
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>SOLAIRE</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIE</button>
        <button class="${this._selectedTab === 'tab_weather' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_weather'}>METEO</button>
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
      <ha-card style="height: 500px; overflow: hidden; background: #000; position: relative;">
        <div style="height: 500px; display: flex; flex-direction: column;">
          
          ${c.bg_url ? html`<div style="background-image: url('${c.bg_url}'); opacity: ${c.bg_opacity || 0.3}; position: absolute; top:0; left:0; width:100%; height:100%; background-size:cover; pointer-events: none;"></div>` : ''}

          <div style="height: 430px; position: relative; z-index: 1; overflow: hidden; padding: 5px; box-sizing: border-box;">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : ''}
            ${this._tab === 'BATTERIE' ? this._renderBattery() : ''}
            ${this._tab === 'METEO' ? this._renderWeather() : ''}
            ${this._tab === 'ECONOMIE' ? this._renderEco() : ''}
          </div>

          <div class="nav-bar" style="height: 70px; display: flex; justify-content: space-around; align-items: center; background: rgba(0,0,0,0.9); border-top: 1px solid #222; position: relative; z-index: 2;">
            <div class="nav-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}><ha-icon icon="mdi:solar-power-variant"></ha-icon><span>SOLAIRE</span></div>
            <div class="nav-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}><ha-icon icon="mdi:battery-charging"></ha-icon><span>ENERGIE</span></div>
            <div class="nav-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon><span>METEO</span></div>
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
      <div style="height: 420px; display: flex; flex-direction: column; justify-content: space-between; padding: 5px;">
        <div style="display: flex; justify-content: space-between; align-items: center; height: 50px;">
          <div style="flex:1; text-align:center;">${consoVal > 0 ? html`<span style="color:#ff4444; font-size:14px; font-weight:bold;"><ha-icon icon="mdi:transmission-tower"></ha-icon><br>${consoVal}W</span>` : ''}</div>
          <div style="flex:1; text-align:center; background:rgba(255,193,7,0.1); border-radius:10px; border:1px solid #ffc107; padding:4px;">
            <small style="font-size:8px; color:#aaa;">PRODUCTION</small><br><b style="font-size:18px; color:#ffc107;">${prod.val}W</b>
          </div>
          <div style="flex:1; text-align:center;">${consoVal < 0 ? html`<span style="color:#00ff00; font-size:14px; font-weight:bold;"><ha-icon icon="mdi:export"></ha-icon><br>${Math.abs(consoVal)}W</span>` : ''}</div>
        </div>

        <div style="height:4px; display:flex; gap:2px; margin: 10px 0;">
          ${Array(20).fill().map((_, i) => html`<div style="flex:1; background:${i < progress/5 ? '#ffc107' : '#222'}; border-radius:1px;"></div>`)}
        </div>

        <div style="display: flex; justify-content: space-around;">
          ${[1,2,3,4].map(i => {
            if(!c[`p${i}_w`]) return '';
            const v = this._getVal(c[`p${i}_w`]);
            return html`<div style="text-align:center;"><div style="width:58px; height:58px; border-radius:50%; border:2px solid #ffc107; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,0,0,0.6); box-shadow: 0 0 10px rgba(255,193,7,0.2);"><b style="font-size:13px;">${Math.round(v.val)}</b><small style="font-size:8px;">W</small></div><div style="font-size:8px; margin-top:4px; color:#888;">${c[`p${i}_name`] || 'P'+i}</div></div>`;
          })}
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px; height: 130px;">
          ${[4,5,6,7,8,9].map(i => {
            if(!c[`d${i}_entity`]) return '';
            const d = this._getVal(c[`d${i}_entity`]);
            return html`<div style="background:rgba(255,255,255,0.05); padding:6px; border-radius:8px; text-align:center; border:1px solid #222;"><small style="font-size:7px; color:#777; display:block; text-transform:uppercase;">${c[`d${i}_label`]}</small><b style="font-size:11px;">${d.val}${d.unit}</b></div>`;
          })}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`
      <div style="height: 420px; display: flex; flex-direction: column; gap: 8px; padding: 5px;">
        ${[1, 2, 3, 4].map(i => {
          if (!c[`b${i}_s`]) return '';
          const soc = parseFloat(this._getVal(c[`b${i}_s`]).val) || 0;
          const power = parseFloat(this._getVal(c[`b${i}_out`]).val) || 0;
          const clr = soc > 80 ? '#00c853' : (soc > 20 ? '#ffc107' : '#f44336');
          return html`
            <div style="height: 90px; background: rgba(20,20,20,0.8); padding: 10px; border-radius: 12px; border-left: 5px solid ${clr}; border: 1px solid #222; display: flex; flex-direction: column; justify-content: center;">
              <div style="display:flex; justify-content:space-between; margin-bottom:5px;"><span style="font-size:12px; font-weight:bold;">${c[`b${i}_n`] || 'BAT '+i}</span><b style="color:${clr}; font-size:14px;">${soc}%</b></div>
              <div style="height:5px; background:#111; display:flex; gap:1px; margin-bottom:8px;">
                ${Array(20).fill().map((_, idx) => html`<div style="flex:1; background:${idx < soc/5 ? clr : '#111'};"></div>`)}
              </div>
              <div style="display:flex; justify-content:space-between; font-size:11px; color:#aaa;">
                <span><ha-icon icon="mdi:thermometer" style="--mdc-icon-size:14px;"></ha-icon> ${this._getVal(c[`b${i}_t`]).val}°C</span>
                <span><ha-icon icon="mdi:lightning-bolt" style="--mdc-icon-size:14px;"></ha-icon> ${this._getVal(c[`b${i}_v`]).val}W</span>
                <span style="color:#fff; font-weight:bold;">${Math.abs(power)}W</span>
              </div>
            </div>`;
        })}
      </div>`;
  }

  _renderWeather() {
    return html`
      <div style="height: 420px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 5px; align-items: center;">
        <div style="display:flex; flex-direction:column; gap:5px;">
          ${[1,2,3,4,5,6].map(i => {
            if(!this.config[`w${i}_e`]) return '';
            return html`
              <div style="height:58px; background:rgba(30,30,30,0.8); border-radius:10px; padding:8px; display:flex; align-items:center; gap:10px; border:1px solid #333;">
                <ha-icon icon="${this.config[`w${i}_i`] || 'mdi:eye'}" style="color:#00f9f9; --mdc-icon-size:22px;"></ha-icon>
                <div><small style="font-size:8px; display:block; color:#777;">${this.config[`w${i}_l`]}</small><b style="font-size:14px;">${this._getVal(this.config[`w${i}_e`]).val}</b></div>
              </div>`;
          })}
        </div>
        <div style="text-align:center; padding:10px;">
           <ha-icon icon="mdi:moon-waning-crescent" style="--mdc-icon-size:60px; color:#ffc107;"></ha-icon>
           <div style="margin-top:15px; background:rgba(0,0,0,0.5); padding:10px; border-radius:10px; border:1px solid #333;">
             <small style="color:#888;">PHASE LUNAIRE</small><br><b style="font-size:12px;">${this._getVal(this.config.moon_entity).val}</b>
           </div>
        </div>
      </div>`;
  }

  _renderEco() {
    return html`
      <div style="height: 420px; display: flex; flex-direction: column; gap: 15px; padding: 20px; justify-content: center;">
        <div style="text-align:center; padding:30px 10px; background:rgba(76,175,80,0.1); border-radius:20px; border:1px solid #4caf50;">
          <small style="color:#aaa;">ÉCONOMIES TOTALES</small><br><b style="font-size:40px; color:#4caf50;">${this._getVal(this.config.eco_money).val}€</b>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
          <div style="background:#111; padding:20px; border-radius:15px; text-align:center; border:1px solid #222;">
            <small style="color:#777;">CONSO MAISON</small><br><b style="font-size:18px;">${this._getVal(this.config.main_cons).val}W</b>
          </div>
          <div style="background:#111; padding:20px; border-radius:15px; text-align:center; border:1px solid #222;">
            <small style="color:#777;">GAIN JOUR</small><br><b style="font-size:18px; color:#ffc107;">${this._getVal(this.config.eco_day_euro).val}€</b>
          </div>
        </div>
      </div>`;
  }

  static styles = css`
    .nav-bar { border-top: 1px solid #222; }
    .nav-btn { color: #555; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: 0.3s; }
    .nav-btn.active { color: #ffc107; text-shadow: 0 0 10px rgba(255,193,7,0.5); }
    .nav-btn ha-icon { --mdc-icon-size: 26px; }
    .nav-btn span { font-size: 9px; margin-top: 4px; font-weight: bold; letter-spacing: 1px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
