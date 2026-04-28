import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE LA CARTE (Version 3.7 FR)
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
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 400, max: 1200 } } },
        { name: "total_now", label: "Entité Production Totale (W)", selector: { entity: {} } },
        { name: "solar_target", label: "Entité Objectif du jour (kWh)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Entité Watts P${i}`, selector: { entity: {} } },
          { name: `p${i}_sub`, label: `Entité Info Bas P${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_weather: [
        { name: "weather_entity", label: "Entité Météo (weather.xxx)", selector: { entity: {} } },
        { name: "temp_entity", label: "Entité Température Extérieure", selector: { entity: {} } },
        { name: "hum_entity", label: "Entité Humidité", selector: { entity: {} } }
      ],
      tab_batt: [...[1, 2, 3, 4].map(i => [
        { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
        { name: `b${i}_s`, label: `Entité SOC % ${i}`, selector: { entity: {} } },
        { name: `b${i}_out`, label: `Entité Sortie (W/A) ${i}`, selector: { entity: {} } }
      ]).flat()],
      tab_eco: [
        { name: "eco_money", label: "Total Économies (€)", selector: { entity: {} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="edit-tabs">
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>SOLAIRE</button>
        <button class="${this._selectedTab === 'tab_weather' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_weather'}>MÉTÉO</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIES</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ÉCONOMIE</button>
      </div>
      <div class="editor-container">
        <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
      </div>
    `;
  }

  static styles = css`
    .edit-tabs { display: flex; gap: 5px; margin-bottom: 15px; }
    button { flex: 1; padding: 8px; background: #222; color: #eee; border: 1px solid #444; border-radius: 4px; cursor: pointer; font-size: 10px; }
    button.active { background: #ffc107; color: #000; border-color: #ffc107; }
  `;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CORPS DE LA CARTE (Version 3.7)
 * ==========================================
 */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '', attr: {} };
    const s = this.hass.states[id];
    return { val: s.state, unit: s.attributes.unit_of_measurement || '', attr: s.attributes };
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    
    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        <div class="overlay">
          <div class="main-content">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : 
              this._tab === 'METEO' ? this._renderWeather() :
              this._tab === 'BATTERIE' ? this._renderBattery() : this._renderEco()}
          </div>
          <div class="footer">
            <div class="f-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>Solaire</div>
            <div class="f-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}>Météo</div>
            <div class="f-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}>Batteries</div>
            <div class="f-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}>Éco</div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const target = this._getVal(c.solar_target);
    const monthName = new Date().toLocaleString('fr-FR', { month: 'long' });

    const currentW = parseFloat(prod.val) || 0;
    const targetKwh = parseFloat(target.val) || 1;
    const progress = Math.min(100, (currentW / (targetKwh * 1000)) * 100);

    return html`
      <div class="page">
        <div class="month-tag">${monthName.toUpperCase()}</div>
        <div class="header-prod">
            <div class="c-label">PRODUCTION ACTUELLE</div>
            <div class="big-val-titan">${prod.val}<small>W</small></div>
            
            <div class="target-box">
                <div class="target-bar"><div class="target-fill" style="width: ${progress}%"></div></div>
                <div class="target-info">
                    <span>Objectif: <b>${targetKwh} kWh</b></span>
                    <span>Progression: <b>${progress.toFixed(1)}%</b></span>
                </div>
            </div>
        </div>

        <div class="panels-row">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`p${i}_w`]) return '';
            const val = this._getVal(c[`p${i}_w`]);
            const sub = this._getVal(c[`p${i}_sub`]);
            const colors = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"];
            return html`
              <div class="hud-item">
                <div class="hud-circle" style="border-color:${colors[i-1]}44">
                  <div class="scan" style="border-top-color:${colors[i-1]}"></div>
                  <div class="v" style="color:${colors[i-1]}">${Math.round(val.val)}</div>
                </div>
                <div class="hud-n">${c[`p${i}_name`] || 'P'+i}</div>
                <div class="hud-sub-val">${sub.val}<small>${sub.unit}</small></div>
              </div>`;
          })}
        </div>
      </div>`;
  }

  _renderWeather() {
    const sun = this.hass.states['sun.sun'];
    const weather = this._getVal(this.config.weather_entity);
    const temp = this._getVal(this.config.temp_entity);
    
    const formatTime = (iso) => {
        if(!iso) return "--:--";
        return new Date(iso).toLocaleTimeString('fr-FR', {hour: '2-digit', minute:'2-digit'});
    };

    return html`
      <div class="page">
        <div class="weather-grid">
            <div class="astro-card">
                <div class="astro-title">ASTRONOMIE</div>
                <div class="astro-row">
                    <div class="astro-item"><ha-icon icon="mdi:compass-outline"></ha-icon><span>AZIMUT</span><b>${sun ? sun.attributes.azimuth : '--'}°</b></div>
                    <div class="astro-item"><ha-icon icon="mdi:angle-acute"></ha-icon><span>ÉLÉVATION</span><b>${sun ? sun.attributes.elevation : '--'}°</b></div>
                </div>
                <div class="astro-row">
                    <div class="astro-item"><ha-icon icon="mdi:weather-sunset-down"></ha-icon><span>COUCHER</span><b>${formatTime(sun?.attributes.next_setting)}</b></div>
                    <div class="astro-item"><ha-icon icon="mdi:weather-night"></ha-icon><span>CRÉPUSCULE</span><b>${formatTime(sun?.attributes.next_dusk)}</b></div>
                </div>
            </div>

            <div class="weather-card">
                <div class="astro-title">MÉTÉO ACTUELLE</div>
                <div class="w-main">
                    <ha-icon icon="mdi:thermometer"></ha-icon>
                    <span>${temp.val}°C</span>
                </div>
                <div class="w-status">${weather.val.toUpperCase()}</div>
                <div class="w-sub">Humidité: ${this._getVal(this.config.hum_entity).val}%</div>
            </div>
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`<div class="page scroll">
      ${[1, 2, 3, 4].map(i => {
        if (!c[`b${i}_s`]) return '';
        const soc = this._getVal(c[`b${i}_s`]);
        return html`
          <div class="rack">
            <div class="r-h"><span>${c[`b${i}_n`] || 'BATTERIE '+i}</span><span class="soc-pct">${soc.val}%</span></div>
            <div class="v-meter">${[...Array(10)].map((_, idx) => html`<div class="v-seg ${parseInt(soc.val) > (idx * 10) ? 'on' : ''}"></div>`)}</div>
            <div class="r-grid-compact">
                <div class="r-item"><span>SORTIE</span><br><b>${this._getVal(c[`b${i}_out`]).val}</b></div>
            </div>
          </div>`;
      })}
    </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`<div class="page">
      <div class="eco-main-card">
        <div class="e-header">ÉCONOMIES TOTALES</div>
        <div class="e-value-big">${this._getVal(c.eco_money).val}€</div>
      </div>
      <div class="eco-details-grid">
        <div class="e-detail"><span>CONSO MAISON</span><b>${this._getVal(c.main_cons_entity).val}W</b></div>
      </div>
    </div>`;
  }

  static styles = css`
    ha-card { background:#000; color:#fff; border-radius:20px; overflow:hidden; font-family: sans-serif; }
    .overlay { height:100%; display:flex; flex-direction:column; padding:15px; background:rgba(0,0,0,0.85); box-sizing:border-box; }
    
    .month-tag { text-align: center; color: #ffc107; font-size: 10px; font-weight: bold; letter-spacing: 2px; margin-bottom: 5px; }
    .header-prod { text-align: center; margin-bottom: 20px; }
    .big-val-titan { font-size:60px; font-weight:900; color:#ffc107; line-height:1; }
    .big-val-titan small { font-size: 18px; }
    .c-label { font-size: 10px; opacity: 0.7; font-weight: bold; }

    .target-box { width: 80%; margin: 15px auto; }
    .target-bar { height: 6px; background: #222; border-radius: 3px; overflow: hidden; }
    .target-fill { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; }
    .target-info { display: flex; justify-content: space-between; font-size: 10px; margin-top: 5px; color: #aaa; }

    .panels-row { display: flex; justify-content: space-around; margin-top: 20px; }
    .hud-circle { width: 50px; height: 50px; border-radius: 50%; border: 2px solid; display: flex; align-items: center; justify-content: center; }
    .hud-n { font-size: 9px; font-weight: bold; margin-top: 5px; text-align: center; }
    .hud-sub-val { font-size: 10px; text-align: center; color: #aaa; }

    /* Météo Styles */
    .weather-grid { display: flex; flex-direction: column; gap: 15px; }
    .astro-card, .weather-card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; border: 1px solid #333; }
    .astro-title { font-size: 10px; color: #ffc107; font-weight: bold; margin-bottom: 10px; }
    .astro-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .astro-item { display: flex; flex-direction: column; width: 45%; }
    .astro-item span { font-size: 8px; color: #aaa; }
    .astro-item b { font-size: 14px; }
    .w-main { font-size: 30px; font-weight: bold; text-align: center; }
    .w-status { text-align: center; color: #ffc107; font-weight: bold; font-size: 12px; }
    .w-sub { text-align: center; font-size: 10px; color: #aaa; margin-top: 5px; }

    .rack { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; margin-bottom: 10px; }
    .v-meter { display: flex; gap: 2px; height: 5px; margin: 5px 0; }
    .v-seg { flex: 1; background: #222; }
    .v-seg.on { background: #4caf50; }

    .footer { display: flex; justify-content: space-around; padding-top: 15px; border-top: 1px solid #333; margin-top: auto; }
    .f-btn { cursor: pointer; opacity: 0.5; font-size: 10px; font-weight: bold; text-transform: uppercase; }
    .f-btn.active { opacity: 1; color: #ffc107; }
    .scroll { overflow-y: auto; max-height: 450px; }
  `;
}

customElements.define("solar-master-card", SolarMasterCard);
