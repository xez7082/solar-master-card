import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE LA CARTE (V4.4)
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
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>SOLAIRE</button>
        <button class="${this._selectedTab === 'tab_weather' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_weather'}>MÉTÉO</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATT</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ÉCO</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs { display: flex; gap: 4px; margin-bottom: 15px; } button { flex: 1; padding: 10px; font-size: 10px; cursor: pointer; background: #1a1a1a; color: #666; border: 1px solid #333; border-radius: 6px; font-weight: bold; } button.active { background: #ffc107; color: #000; border-color: #ffc107; }`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CORPS DE LA CARTE (ULTIMATE V4.4)
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
            <div class="f-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}><ha-icon icon="mdi:solar-power"></ha-icon><span>Solaire</span></div>
            <div class="f-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}><ha-icon icon="mdi:weather-cloudy"></ha-icon><span>Météo</span></div>
            <div class="f-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}><ha-icon icon="mdi:battery-90"></ha-icon><span>Stock</span></div>
            <div class="f-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}><ha-icon icon="mdi:currency-eur"></ha-icon><span>Éco</span></div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const target = this._getVal(c.solar_target);
    
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
            <div class="big-val-titan">${prod.val}<small>W</small></div>
            <div class="target-container">
                <div class="target-bar"><div class="target-fill" style="width:${progress}%"></div></div>
                <div class="target-row">
                    <span>Objectif: <b>${target.val} kWh</b></span>
                    <span class="pct-val">${progress.toFixed(1)}%</span>
                </div>
            </div>
        </div>

        <div class="cockpit">
          <div class="side">${[4, 5, 6].map(i => this._renderDiag(i, 'l'))}</div>
          <div class="center-spacer"></div>
          <div class="side">${[7, 8, 9].map(i => this._renderDiag(i, 'r'))}</div>
        </div>

        <div class="panels-grid">
          ${[1, 2, 3, 4].map(i => {
            const val = this._getVal(c[`p${i}_w`]);
            if (!c[`p${i}_w`]) return '';
            return html`
              <div class="panel-box">
                <div class="p-val" style="color:${["#ffc107", "#00f9f9", "#4caf50", "#e91e63"][i-1]}">${Math.round(val.val)}<small>W</small></div>
                <div class="p-name">${c[`p${i}_name`] || 'Panel '+i}</div>
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
        <div class="weather-hero-v4">
            <div class="w-main-row">
                <div class="w-temp">${this._getVal(c.temp_ext).val}<small>°C</small></div>
                <div class="w-icon-box">
                    <ha-icon icon="${weather.attr?.forecast ? 'mdi:weather-partly-cloudy' : 'mdi:weather-sunny'}"></ha-icon>
                    <div class="w-desc">${this._translateWeather(weather.val)}</div>
                </div>
            </div>
            <div class="w-sub-row">
                <span><ha-icon icon="mdi:water-percent"></ha-icon> Humidité: ${this._getVal(c.hum_ext).val}%</span>
                <span><ha-icon icon="mdi:weather-sunset-down"></ha-icon> Coucher: ${formatTime(sun?.attributes.next_setting)}</span>
            </div>
        </div>

        <div class="astro-bar">
            <div class="astro-item"><span>Azimut</span><b>${sun?.attributes.azimuth}°</b></div>
            <div class="astro-item"><span>Élévation</span><b>${elev.toFixed(1)}°</b></div>
            <div class="astro-item"><span>Lever</span><b>${formatTime(sun?.attributes.next_rising)}</b></div>
        </div>

        <div class="weather-grid-8">
            ${[1,2,3,4,5,6,7,8].map(i => {
                if(!c[`w${i}_e`]) return '';
                const e = this._getVal(c[`w${i}_e`]);
                return html`<div class="w-card"><span class="w-l">${c[`w${i}_l`]}</span><span class="w-v">${e.val}<small>${e.unit}</small></span></div>`;
            })}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`<div class="page scroll">
      <div class="section-title">ÉTAT DES UNITÉS DE STOCKAGE</div>
      ${[1,2,3,4].map(i => {
        if (!c[`b${i}_s`]) return '';
        const soc = this._getVal(c[`b${i}_s`]);
        const out = this._getVal(c[`b${i}_out`]);
        return html`
          <div class="rack-v3">
            <div class="r-top">
                <span class="r-name">${c[`b${i}_n`] || 'UNITE '+i}</span>
                <span class="r-soc">${soc.val}%</span>
            </div>
            <div class="r-bar"><div class="r-fill" style="width:${soc.val}%; background:${soc.val < 15 ? '#f44336' : '#4caf50'}"></div></div>
            <div class="r-bot">
                <span>Cap: <b>${this._getVal(c[`b${i}_cap`]).val}</b></span>
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
        <div class="e-l">VALEUR TOTALE ÉCONOMISÉE</div>
        <div class="e-v">${this._getVal(c.eco_money).val}€</div>
        <div class="e-sub">JOUR: <b>${this._getVal(c.eco_day_euro).val}€</b> • ANNEE: <b>${this._getVal(c.eco_year_euro).val}€</b></div>
      </div>
      
      <div class="main-cons-card">
        <span class="m-l">MAISON</span>
        <span class="m-v">${this._getVal(c.main_cons).val}<small>W</small></span>
      </div>

      <div class="extra-eco-grid">
        ${[1,2,3,4,5,6].map(i => {
            if(!c[`e${i}_e`]) return '';
            const e = this._getVal(c[`e${i}_e`]);
            return html`<div class="eco-card"><span class="e-label">${c[`e${i}_l`]}</span><span class="e-val">${e.val}<small>${e.unit}</small></span></div>`;
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
    ha-card { background:#000; color:#fff; border-radius:24px; overflow:hidden; font-family: 'Inter', sans-serif; position:relative; }
    .bg-layer { position:absolute; top:0; left:0; width:100%; height:100%; background-size:cover; opacity:0.1; z-index:0; }
    .overlay { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; padding:20px; background:rgba(0,0,0,0.9); box-sizing:border-box; }
    
    /* Solar */
    .header-prod { text-align:center; margin-bottom:15px; }
    .big-val-titan { font-size:80px; font-weight:900; color:#ffc107; line-height:1; }
    .target-container { width:100%; max-width:300px; margin:10px auto; }
    .target-bar { height:6px; background:#222; border-radius:3px; overflow:hidden; }
    .target-fill { height:100%; background:#ffc107; box-shadow: 0 0 10px #ffc107; }
    .target-row { display:flex; justify-content:space-between; font-size:11px; margin-top:5px; color:#aaa; }
    .pct-val { color:#4caf50; font-weight:bold; }

    /* Météo Horizon V4.4 */
    .weather-hero-v4 { background:rgba(255,255,255,0.05); padding:20px; border-radius:16px; margin-bottom:15px; border:1px solid #333; }
    .w-main-row { display:flex; justify-content:space-between; align-items:center; }
    .w-temp { font-size:50px; font-weight:900; }
    .w-icon-box { text-align:right; color:#ffc107; }
    .w-icon-box ha-icon { --mdc-icon-size: 45px; }
    .w-desc { font-size:14px; font-weight:bold; text-transform:uppercase; }
    .w-sub-row { display:flex; gap:15px; margin-top:10px; font-size:12px; color:#aaa; border-top:1px solid #222; padding-top:10px; }

    .astro-bar { display:flex; justify-content:space-around; background:rgba(0,249,249,0.05); padding:10px; border-radius:12px; margin-bottom:15px; }
    .astro-item { text-align:center; }
    .astro-item span { font-size:9px; color:#aaa; display:block; text-transform:uppercase; }
    .astro-item b { font-size:13px; color:#00f9f9; }

    .weather-grid-8 { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .w-card { background:rgba(255,255,255,0.03); padding:12px; border-radius:12px; border:1px solid #222; }
    .w-l { font-size:9px; color:#888; display:block; text-transform:uppercase; }
    .w-v { font-size:15px; font-weight:bold; color:#ffc107; }

    /* Batteries */
    .rack-v3 { background:rgba(255,255,255,0.03); padding:15px; border-radius:12px; margin-bottom:10px; border-left:4px solid #4caf50; }
    .r-top { display:flex; justify-content:space-between; margin-bottom:5px; }
    .r-name { font-size:11px; font-weight:bold; color:#aaa; }
    .r-soc { font-size:18px; font-weight:bold; }
    .r-bar { height:8px; background:#111; border-radius:4px; margin:8px 0; }
    .r-fill { height:100%; border-radius:4px; transition:0.5s; }
    .r-bot { display:flex; justify-content:space-between; font-size:10px; color:#888; }

    /* Grid Solar */
    .panels-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:15px; }
    .panel-box { background:rgba(255,255,255,0.03); padding:12px; border-radius:12px; text-align:center; border:1px solid #222; }
    .p-val { font-size:18px; font-weight:bold; }
    .p-name { font-size:10px; color:#aaa; }

    /* Cockpit */
    .cockpit { display:flex; justify-content:space-between; margin:15px 0; }
    .mini-diag { background:rgba(255,255,255,0.04); padding:10px; border-radius:10px; width:110px; border-left:3px solid #00f9f9; }
    .mini-diag.r { border-left:none; border-right:3px solid #ffc107; text-align:right; }

    /* Footer */
    .footer { display:flex; justify-content:space-around; padding-top:15px; border-top:1px solid #222; margin-top:auto; }
    .f-btn { cursor:pointer; opacity:0.3; text-align:center; transition:0.3s; }
    .f-btn.active { opacity:1; color:#ffc107; }
    .f-btn ha-icon { --mdc-icon-size:24px; }
    .f-btn span { display:block; font-size:9px; font-weight:bold; text-transform:uppercase; margin-top:2px; }

    .scroll { overflow-y:auto; }
    .scroll::-webkit-scrollbar { width:3px; }
    .scroll::-webkit-scrollbar-thumb { background:#333; }
    
    .eco-hero { text-align:center; padding:20px; background:rgba(76,175,80,0.1); border-radius:15px; margin-bottom:15px; }
    .e-v { font-size:55px; font-weight:900; color:#4caf50; }
    .main-cons-card { background:#0a0a0a; padding:15px; border-radius:12px; text-align:center; border:1px solid #4caf5033; margin-bottom:15px; }
    .extra-eco-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .eco-card { background:rgba(255,255,255,0.03); padding:12px; border-radius:10px; }
    .section-title { font-size:10px; color:#aaa; margin:10px 0; font-weight:bold; text-transform:uppercase; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
