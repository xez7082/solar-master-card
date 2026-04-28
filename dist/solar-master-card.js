import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE LA CARTE (Interface V4.1)
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
        { name: "title_left", label: "Titre Gauche", selector: { text: {} } },
        { name: "title_right", label: "Titre Droite", selector: { text: {} } },
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `Label D${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité D${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } },
          { name: `p${i}_sub`, label: `Info Bas P${i}`, selector: { entity: {} } }
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
        { name: `b${i}_temp`, label: `Température ${i}`, selector: { entity: {} } },
        { name: `b${i}_out`, label: `Sortie ${i}`, selector: { entity: {} } },
        { name: `b${i}_conn`, label: `Connexion ${i}`, selector: { entity: {} } }
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
        <button class="${this._selectedTab === 'tab_weather' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_weather'}>MÉTÉO/ASTRO</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIES</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ÉCONOMIE</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs { display: flex; gap: 4px; margin-bottom: 15px; } button { flex: 1; padding: 8px; font-size: 8px; cursor: pointer; background: #222; color: #fff; border: 1px solid #444; border-radius: 4px; } button.active { background: #ffc107; color: #000; }`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CORPS DE LA CARTE (ULTIMATE V4.1)
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
      'lightning-rainy': 'Orageux', 'partlycloudy': 'Éclaircies', 'pouring': 'Fortes Pluies', 'rainy': 'Pluie', 
      'snowy': 'Neige', 'sunny': 'Ensoleillé', 'windy': 'Vent'
    };
    return dict[state.toLowerCase()] || state;
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
            <div class="f-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>Solaire</div>
            <div class="f-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}>Météo</div>
            <div class="f-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}>Batteries</div>
            <div class="f-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}>Économie</div>
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
    const progress = Math.min(100, (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100);

    return html`
      <div class="page">
        <div class="header-prod">
            <div class="month-tag">${month}</div>
            <div class="big-val-titan">${prod.val}<small>W</small></div>
            <div class="target-container">
                <div class="target-bar"><div class="target-fill" style="width:${progress}%"></div></div>
                <div class="target-text">Objectif: <b>${target.val} kWh</b> • <b>${progress.toFixed(1)}%</b></div>
            </div>
        </div>

        <div class="cockpit">
          <div class="side">
            <div class="group-title">${c.title_left || 'GROUPE A'}</div>
            ${[4, 5, 6].map(i => this._renderDiag(i, 'l'))}
          </div>
          <div class="center-spacer"></div>
          <div class="side">
            <div class="group-title right">${c.title_right || 'GROUPE B'}</div>
            ${[7, 8, 9].map(i => this._renderDiag(i, 'r'))}
          </div>
        </div>

        <div class="panels-row">
          ${[1, 2, 3, 4].map(i => {
            const val = this._getVal(c[`p${i}_w`]);
            const sub = this._getVal(c[`p${i}_sub`]);
            if (!c[`p${i}_w`]) return '';
            return html`
              <div class="hud-item">
                <div class="hud-circle" style="border-color:${["#ffc107", "#00f9f9", "#4caf50", "#e91e63"][i-1]}">
                  <div class="scan"></div>
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
    const pos = ((elev + 20) / 110) * 100;
    const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '--:--';

    return html`
      <div class="page scroll">
        <div class="weather-hero">
            <svg viewBox="0 0 400 120" class="sun-svg-bg"><path d="M0,100 Q200,-40 400,100" fill="none" stroke="#ffc107" stroke-width="3" stroke-dasharray="8"/></svg>
            <div class="sun-dot" style="left: ${pos}%"><ha-icon icon="mdi:white-balance-sunny"></ha-icon></div>
            <div class="temp-big">${this._getVal(c.temp_ext).val}°<small>C</small></div>
            <div class="weather-status-text">${this._translateWeather(weather.val)}</div>
        </div>

        <div class="astro-row-mini">
            <div class="a-box"><span>COUCHER</span><b>${formatTime(sun?.attributes.next_setting)}</b></div>
            <div class="a-box"><span>ÉLÉVATION</span><b>${elev.toFixed(1)}°</b></div>
            <div class="a-box"><span>AZIMUT</span><b>${sun?.attributes.azimuth}°</b></div>
        </div>

        <div class="weather-grid-8">
            ${[1,2,3,4,5,6,7,8].map(i => {
                if(!c[`w${i}_e`]) return '';
                const e = this._getVal(c[`w${i}_e`]);
                return html`
                <div class="w-sensor-card">
                    <span class="w-label">${c[`w${i}_l`] || 'Info '+i}</span>
                    <span class="w-value">${e.val}<small>${e.unit}</small></span>
                </div>`;
            })}
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`<div class="page scroll">
      ${[1,2,3,4].map(i => {
        if (!c[`b${i}_s`]) return '';
        const soc = this._getVal(c[`b${i}_s`]);
        return html`
          <div class="rack">
            <div class="r-h"><span>${c[`b${i}_n`] || 'BAT '+i}</span><b>${soc.val}%</b></div>
            <div class="v-meter">${[...Array(10)].map((_, idx) => html`<div class="v-seg ${parseInt(soc.val) > (idx * 10) ? 'on' : ''}"></div>`)}</div>
            <div class="r-stats">
                <div>Cap: <b>${this._getVal(c[`b${i}_cap`]).val}</b></div>
                <div>Sortie: <b>${this._getVal(c[`b${i}_out`]).val}</b></div>
            </div>
          </div>`;
      })}
    </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`<div class="page scroll">
      <div class="eco-hero">
        <div class="e-l">GAIN TOTAL</div>
        <div class="e-v">${this._getVal(c.eco_money).val}€</div>
        <div class="e-sub">JOUR: <b>${this._getVal(c.eco_day_euro).val}€</b> • ANNEE: <b>${this._getVal(c.eco_year_euro).val}€</b></div>
      </div>
      
      <div class="section-title">CONSOMMATION TEMPS RÉEL</div>
      <div class="main-cons-card">
        <ha-icon icon="mdi:flash"></ha-icon>
        <span class="m-v">${this._getVal(c.main_cons).val}<small>W</small></span>
      </div>

      <div class="section-title">CAPTEURS ÉCONOMIE</div>
      <div class="extra-eco-grid">
        ${[1,2,3,4,5,6].map(i => {
            if(!c[`e${i}_e`]) return '';
            const e = this._getVal(c[`e${i}_e`]);
            return html`
              <div class="eco-extra-card">
                <span class="e-label">${c[`e${i}_l`] || 'Extra '+i}</span>
                <span class="e-val">${e.val}<small>${e.unit}</small></span>
              </div>`;
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
    ha-card { background:#000; color:#fff; border-radius:24px; overflow:hidden; font-family: sans-serif; position:relative; }
    .bg-layer { position:absolute; top:0; left:0; width:100%; height:100%; background-size:cover; opacity:0.25; z-index:0; }
    .overlay { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; padding:20px; background:rgba(0,0,0,0.85); box-sizing:border-box; }
    
    /* Header Solar */
    .header-prod { text-align:center; margin-bottom:20px; }
    .month-tag { color:#ffc107; font-size:10px; font-weight:bold; letter-spacing:3px; }
    .big-val-titan { font-size:75px; font-weight:900; color:#ffc107; line-height:1; }
    .target-container { width:220px; margin:10px auto; }
    .target-bar { height:4px; background:rgba(255,255,255,0.1); border-radius:2px; }
    .target-fill { height:100%; background:#ffc107; box-shadow:0 0 10px #ffc107; transition:1s; }
    .target-text { font-size:9px; color:#aaa; margin-top:5px; text-transform:uppercase; }

    /* Cockpit Design */
    .cockpit { display:flex; justify-content:space-between; margin-bottom:20px; }
    .side { flex:1.2; }
    .center-spacer { flex:1; }
    .group-title { font-size:9px; font-weight:bold; color:#00f9f9; margin-bottom:8px; letter-spacing:1px; }
    .group-title.right { text-align:right; color:#ffc107; }
    .mini-diag { background:rgba(255,255,255,0.03); padding:8px; border-radius:10px; margin:6px 0; border-left:3px solid #00f9f9; }
    .mini-diag.r { border-left:none; border-right:3px solid #ffc107; text-align:right; }
    .m-l { font-size:8px; color:#aaa; display:block; text-transform:uppercase; }
    .m-v { font-size:15px; font-weight:bold; }

    /* Météo Design */
    .weather-hero { position:relative; height:140px; text-align:center; overflow:hidden; }
    .sun-svg-bg { position:absolute; width:100%; top:20px; left:0; }
    .sun-dot { position:absolute; top:20px; color:#ffc107; transform:translateX(-50%); }
    .temp-big { font-size:60px; font-weight:900; margin-top:40px; }
    .weather-status-text { color:#ffc107; font-weight:bold; text-transform:uppercase; font-size:12px; }
    .astro-row-mini { display:flex; justify-content:space-around; background:rgba(255,193,7,0.1); padding:10px; border-radius:12px; margin:15px 0; }
    .a-box { text-align:center; }
    .a-box span { font-size:8px; color:#aaa; display:block; }
    .a-box b { font-size:12px; }
    .weather-grid-8 { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .w-sensor-card { background:rgba(255,255,255,0.05); padding:12px; border-radius:12px; border:1px solid #333; }
    .w-label { font-size:8px; color:#aaa; display:block; text-transform:uppercase; }
    .w-value { font-size:14px; font-weight:bold; color:#00f9f9; }

    /* Économie Design */
    .eco-hero { background:linear-gradient(180deg, rgba(76,175,80,0.2) 0%, transparent 100%); padding:20px; border-radius:20px; text-align:center; margin-bottom:20px; }
    .e-v { font-size:55px; font-weight:900; color:#4caf50; }
    .section-title { font-size:10px; font-weight:bold; color:#aaa; margin:15px 0 8px; border-left:2px solid #4caf50; padding-left:8px; }
    .main-cons-card { background:#111; padding:15px; border-radius:15px; display:flex; align-items:center; justify-content:center; gap:15px; border:1px solid #4caf5044; }
    .main-cons-card ha-icon { color:#4caf50; --mdc-icon-size:30px; }
    .extra-eco-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .eco-extra-card { background:rgba(255,255,255,0.03); padding:12px; border-radius:12px; border:1px solid #222; }
    .e-label { font-size:8px; color:#888; display:block; text-transform:uppercase; }
    .e-val { font-size:14px; font-weight:bold; color:#4caf50; }

    /* Panels HUD */
    .panels-row { display:flex; justify-content:space-around; margin-top:20px; }
    .hud-circle { width:60px; height:60px; border-radius:50%; border:2px solid; display:flex; align-items:center; justify-content:center; position:relative; }
    .hud-n { font-size:9px; font-weight:bold; text-align:center; margin-top:5px; }

    /* Base */
    .footer { display:flex; justify-content:space-around; padding-top:15px; border-top:1px solid #222; margin-top:auto; }
    .f-btn { cursor:pointer; opacity:0.4; font-size:10px; font-weight:bold; text-transform:uppercase; }
    .f-btn.active { opacity:1; color:#ffc107; border-bottom:2px solid #ffc107; padding-bottom:5px; }
    .scroll { overflow-y:auto; padding-right:5px; }
    .scroll::-webkit-scrollbar { width:3px; }
    .scroll::-webkit-scrollbar-thumb { background:#444; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
