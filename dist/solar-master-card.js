import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE LA CARTE (V4.3)
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
        { name: "bg_url", label: "URL Image de Fond", selector: { text: {} } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "solar_target", label: "Objectif (kWh)", selector: { entity: {} } },
        { name: "solar_pct_entity", label: "Sensor Pourcentage (Optionnel)", selector: { entity: {} } },
        { name: "title_left", label: "Titre Gauche", selector: { text: {} } },
        { name: "title_right", label: "Titre Droite", selector: { text: {} } },
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `Label D${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité D${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_weather: [
        { name: "weather_entity", label: "Entité Météo", selector: { entity: { domain: "weather" } } },
        { name: "temp_ext", label: "Température Ext.", selector: { entity: {} } },
        { name: "hum_ext", label: "Humidité Ext.", selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => [
           { name: `w${i}_l`, label: `Label Météo ${i}`, selector: { text: {} } },
           { name: `w${i}_e`, label: `Entité Météo ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [...[1, 2, 3, 4].map(i => [
        { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
        { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
        { name: `b${i}_cap`, label: `Capacité ${i}`, selector: { entity: {} } },
        { name: `b${i}_out`, label: `Sortie ${i}`, selector: { entity: {} } }
      ]).flat()],
      tab_eco: [
        { name: "eco_money", label: "Économies Totales (€)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gain Jour (€)", selector: { entity: {} } },
        { name: "eco_year_euro", label: "Gain Année (€)", selector: { entity: {} } },
        { name: "main_cons", label: "Conso Maison (W)", selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6].map(i => [
           { name: `e${i}_l`, label: `Label Éco ${i}`, selector: { text: {} } },
           { name: `e${i}_e`, label: `Entité Éco ${i}`, selector: { entity: {} } }
        ]).flat()
      ]
    };

    return html`
      <div class="edit-tabs">
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>PROD</button>
        <button class="${this._selectedTab === 'tab_weather' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_weather'}>METEO</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATT</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ECO</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs { display: flex; gap: 4px; margin-bottom: 15px; } button { flex: 1; padding: 10px; font-size: 10px; cursor: pointer; background: #1a1a1a; color: #666; border: 1px solid #333; border-radius: 6px; font-weight: bold; } button.active { background: #ffc107; color: #000; border-color: #ffc107; }`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CORPS DE LA CARTE (ULTIMATE V4.3)
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
    return { val: s.state, unit: s.attributes.unit_of_measurement || '', attr: s.attributes };
  }

  _translateWeather(state) {
    const dict = {
      'clear-night': 'Nuit Claire', 'cloudy': 'Nuageux', 'fog': 'Brouillard', 'hail': 'Grêle', 'lightning': 'Orages', 
      'lightning-rainy': 'Orageux', 'partlycloudy': 'Éclaircies', 'pouring': 'Averses', 'rainy': 'Pluie', 
      'snowy': 'Neige', 'sunny': 'Ensoleillé', 'windy': 'Vent'
    };
    return dict[state?.toLowerCase()] || state || 'Inconnu';
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        ${c.bg_url ? html`<div class="bg-layer" style="background-image:url('${c.bg_url}');"></div>` : ''}
        <div class="overlay">
          <div class="main-content">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : 
              this._tab === 'METEO' ? this._renderWeather() :
              this._tab === 'BATTERIE' ? this._renderBattery() : this._renderEco()}
          </div>
          <div class="footer">
            <div class="f-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}><ha-icon icon="mdi:solar-power"></ha-icon></div>
            <div class="f-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon></div>
            <div class="f-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}><ha-icon icon="mdi:battery-high"></ha-icon></div>
            <div class="f-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}><ha-icon icon="mdi:cash-multiple"></ha-icon></div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const target = this._getVal(c.solar_target);
    const month = new Date().toLocaleString('fr-FR', { month: 'long' }).toUpperCase();
    
    // LOGIQUE POURCENTAGE (SENSOR OU AUTO)
    let pctVal;
    if (c.solar_pct_entity) {
        pctVal = parseFloat(this._getVal(c.solar_pct_entity).val) || 0;
    } else {
        pctVal = (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100;
    }
    const progress = Math.min(100, pctVal);

    return html`
      <div class="page">
        <div class="header-prod">
            <div class="month-tag">${month}</div>
            <div class="big-val-titan">${prod.val}<small>W</small></div>
            <div class="target-container">
                <div class="target-bar"><div class="target-fill" style="width:${progress}%"></div></div>
                <div class="target-row">
                    <span>Objectif: <b>${target.val} kWh</b></span>
                    <span class="pct-badge">${progress.toFixed(1)}%</span>
                </div>
            </div>
        </div>

        <div class="cockpit">
          <div class="side">${[4, 5, 6].map(i => this._renderDiag(i, 'l'))}</div>
          <div class="center-spacer"></div>
          <div class="side">${[7, 8, 9].map(i => this._renderDiag(i, 'r'))}</div>
        </div>

        <div class="panels-row">
          ${[1, 2, 3, 4].map(i => {
            const val = this._getVal(c[`p${i}_w`]);
            if (!c[`p${i}_w`]) return '';
            return html`
              <div class="hud-item">
                <div class="hud-circle" style="border-color:${["#ffc107", "#00f9f9", "#4caf50", "#e91e63"][i-1]}">
                  <div class="v">${Math.round(val.val)}</div>
                </div>
                <div class="hud-n">${c[`p${i}_name`] || 'P'+i}</div>
              </div>`;
          })}
        </div>
      </div>`;
  }

  _renderWeather() {
    const c = this.config;
    const sun = this.hass.states['sun.sun'];
    const weather = this._getVal(c.weather_entity);
    const elev = sun ? sun.attributes.elevation : 0;
    const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '--:--';

    return html`
      <div class="page scroll">
        <div class="weather-radar-container">
            <div class="radar-circle">
                <div class="weather-icon-main">
                    <ha-icon icon="${weather.attr?.forecast ? 'mdi:weather-partly-cloudy' : 'mdi:weather-sunny'}"></ha-icon>
                    <div class="main-temp">${this._getVal(c.temp_ext).val}°</div>
                </div>
                <div class="radar-scan"></div>
            </div>
            <div class="weather-info-overlay">
                <div class="w-status">${this._translateWeather(weather.val)}</div>
                <div class="w-hum">Humidité: ${this._getVal(c.hum_ext).val}%</div>
            </div>
        </div>

        <div class="astro-grid-new">
            <div class="astro-card-new"><ha-icon icon="mdi:weather-sunset-up"></ha-icon><span>Lever</span><b>${formatTime(sun?.attributes.next_rising)}</b></div>
            <div class="astro-card-new"><ha-icon icon="mdi:weather-sunset-down"></ha-icon><span>Coucher</span><b>${formatTime(sun?.attributes.next_setting)}</b></div>
            <div class="astro-card-new"><ha-icon icon="mdi:angle-acute"></ha-icon><span>Élévation</span><b>${elev.toFixed(1)}°</b></div>
            <div class="astro-card-new"><ha-icon icon="mdi:compass-outline"></ha-icon><span>Azimut</span><b>${sun?.attributes.azimuth}°</b></div>
        </div>

        <div class="weather-grid-8">
            ${[1,2,3,4,5,6,7,8].map(i => {
                if(!c[`w${i}_e`]) return '';
                const e = this._getVal(c[`w${i}_e`]);
                return html`<div class="w-sensor-pill"><span class="w-l">${c[`w${i}_l`]}</span><span class="w-v">${e.val}<small>${e.unit}</small></span></div>`;
            })}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`<div class="page scroll">
      <div class="section-title">ÉTAT DU STOCKAGE</div>
      ${[1,2,3,4].map(i => {
        if (!c[`b${i}_s`]) return '';
        const soc = this._getVal(c[`b${i}_s`]);
        const out = this._getVal(c[`b${i}_out`]);
        return html`
          <div class="rack-v2">
            <div class="rack-info">
                <div class="rack-name">${c[`b${i}_n`] || 'BAT '+i}</div>
                <div class="rack-soc-val">${soc.val}%</div>
            </div>
            <div class="rack-gauge">
                <div class="rack-gauge-fill" style="width:${soc.val}%; background:${soc.val < 20 ? '#f44336' : '#4caf50'}"></div>
            </div>
            <div class="rack-footer">
                <span>Capacité: <b>${this._getVal(c[`b${i}_cap`]).val}</b></span>
                <span>Flux: <b style="color:#ffc107">${out.val}${out.unit}</b></span>
            </div>
          </div>`;
      })}
    </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`<div class="page scroll">
      <div class="eco-hero">
        <div class="e-l">ÉCONOMIES RÉALISÉES</div>
        <div class="e-v">${this._getVal(c.eco_money).val}€</div>
        <div class="e-sub">JOUR: <b>${this._getVal(c.eco_day_euro).val}€</b> • ANNEE: <b>${this._getVal(c.eco_year_euro).val}€</b></div>
      </div>
      
      <div class="main-cons-card">
        <span class="m-l">PUISSANCE CONSOMMÉE</span>
        <span class="m-v">${this._getVal(c.main_cons).val}<small>W</small></span>
      </div>

      <div class="extra-eco-grid">
        ${[1,2,3,4,5,6].map(i => {
            if(!c[`e${i}_e`]) return '';
            const e = this._getVal(c[`e${i}_e`]);
            return html`<div class="eco-pill"><span class="e-label">${c[`e${i}_l`]}</span><span class="e-val">${e.val}<small>${e.unit}</small></span></div>`;
        })}
      </div>
    </div>`;
  }

  _renderDiag(i, side) {
    const c = this.config;
    if (!c[`d${i}_entity`]) return html`<div class="mini-diag empty"></div>`;
    const d = this._getVal(c[`d${i}_entity`]);
    return html`<div class="mini-diag ${side}"><span class="m-l">${c[`d${i}_label`]}</span><span class="m-v">${d.val}<small>${d.unit}</small></span></div>`;
  }

  static styles = css`
    ha-card { background:#000; color:#fff; border-radius:28px; overflow:hidden; font-family: 'Inter', sans-serif; position:relative; }
    .bg-layer { position:absolute; top:0; left:0; width:100%; height:100%; background-size:cover; opacity:0.1; z-index:0; }
    .overlay { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; padding:25px; background:radial-gradient(circle at top, rgba(30,30,30,0.7) 0%, rgba(0,0,0,0.95) 100%); box-sizing:border-box; }
    
    /* Solar V4.3 */
    .header-prod { text-align:center; margin-bottom:20px; }
    .big-val-titan { font-size:85px; font-weight:900; color:#ffc107; line-height:0.9; text-shadow: 0 0 20px rgba(255,193,7,0.3); }
    .target-container { width:100%; max-width:280px; margin:15px auto; }
    .target-bar { height:8px; background:rgba(255,255,255,0.05); border-radius:4px; overflow:hidden; }
    .target-fill { height:100%; background:linear-gradient(90deg, #ff9800, #ffc107); box-shadow: 0 0 10px #ffc107; transition: width 1s ease-in-out; }
    .target-row { display:flex; justify-content:space-between; align-items:center; margin-top:8px; font-size:11px; color:#888; }
    .pct-badge { background:#ffc107; color:#000; padding:2px 8px; border-radius:10px; font-weight:900; }

    /* Météo Radar Design */
    .weather-radar-container { position:relative; height:180px; display:flex; align-items:center; justify-content:center; margin-bottom:20px; }
    .radar-circle { width:140px; height:140px; border: 1px solid rgba(255,193,7,0.2); border-radius:50%; position:relative; display:flex; align-items:center; justify-content:center; }
    .radar-scan { position:absolute; width:100%; height:100%; border-radius:50%; border-top: 2px solid #ffc107; animation: radar 4s linear infinite; }
    @keyframes radar { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .weather-icon-main { text-align:center; z-index:2; }
    .weather-icon-main ha-icon { --mdc-icon-size: 50px; color:#ffc107; filter: drop-shadow(0 0 10px #ffc107); }
    .main-temp { font-size:32px; font-weight:900; }
    .weather-info-overlay { position:absolute; bottom:0; text-align:center; width:100%; }
    .w-status { font-weight:bold; color:#ffc107; text-transform:uppercase; font-size:12px; letter-spacing:1px; }
    .w-hum { font-size:10px; color:#888; }

    .astro-grid-new { display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; }
    .astro-card-new { background:rgba(255,255,255,0.03); padding:10px; border-radius:12px; display:flex; flex-direction:column; align-items:center; border: 1px solid #222; }
    .astro-card-new ha-icon { color:#00f9f9; --mdc-icon-size: 20px; margin-bottom:5px; }
    .astro-card-new span { font-size:8px; color:#888; text-transform:uppercase; }
    .astro-card-new b { font-size:13px; }

    .weather-grid-8 { display:grid; grid-template-columns: 1fr 1fr; gap:8px; }
    .w-sensor-pill { background:rgba(255,193,7,0.05); padding:8px 12px; border-radius:20px; display:flex; justify-content:space-between; border: 1px solid rgba(255,193,7,0.1); }
    .w-l { font-size:9px; color:#aaa; }
    .w-v { font-size:11px; font-weight:bold; color:#ffc107; }

    /* Rack Batteries V4.3 */
    .rack-v2 { background:rgba(255,255,255,0.02); border: 1px solid #1a1a1a; padding:15px; border-radius:16px; margin-bottom:12px; }
    .rack-info { display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; }
    .rack-name { font-size:12px; font-weight:bold; color:#aaa; }
    .rack-soc-val { font-size:20px; font-weight:900; color:#4caf50; }
    .rack-gauge { height:6px; background:#111; border-radius:3px; overflow:hidden; margin-bottom:10px; }
    .rack-gauge-fill { height:100%; box-shadow: 0 0 10px rgba(76,175,80,0.5); transition: 0.5s; }
    .rack-footer { display:flex; justify-content:space-between; font-size:10px; color:#666; }

    /* Cockpit */
    .cockpit { display:flex; justify-content:space-between; margin:20px 0; }
    .mini-diag { background:rgba(255,255,255,0.03); padding:10px; border-radius:12px; width:100px; border-left: 3px solid #00f9f9; }
    .mini-diag.r { border-left:none; border-right:3px solid #ffc107; text-align:right; }

    /* Footer */
    .footer { display:flex; justify-content:space-around; align-items:center; padding-top:20px; border-top: 1px solid #222; margin-top:auto; }
    .f-btn { cursor:pointer; opacity:0.3; transition: 0.3s; color:#fff; }
    .f-btn.active { opacity:1; color:#ffc107; transform: translateY(-3px); }
    .f-btn ha-icon { --mdc-icon-size: 26px; }

    .scroll { overflow-y:auto; padding-right:8px; }
    .scroll::-webkit-scrollbar { width:4px; }
    .scroll::-webkit-scrollbar-thumb { background:#222; border-radius:10px; }
    
    .eco-hero { text-align:center; padding:25px; background:linear-gradient(180deg, rgba(76,175,80,0.1) 0%, transparent 100%); border-radius:20px; margin-bottom:20px; }
    .e-v { font-size:60px; font-weight:900; color:#4caf50; }
    .main-cons-card { background:#0a0a0a; padding:18px; border-radius:18px; text-align:center; border: 1px solid rgba(76,175,80,0.2); margin-bottom:15px; }
    .extra-eco-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .eco-pill { background:rgba(255,255,255,0.03); padding:12px; border-radius:12px; border: 1px solid #1a1a1a; }
    .e-val { font-size:14px; font-weight:bold; color:#4caf50; display:block; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
