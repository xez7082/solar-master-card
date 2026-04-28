import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE LA CARTE (Interface V4.0)
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
        { name: "hum_ext", label: "Humidité Ext.", selector: { entity: {} } }
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
           { name: `e${i}_l`, label: `Label Extra ${i}`, selector: { text: {} } },
           { name: `e${i}_e`, label: `Entité Extra ${i}`, selector: { entity: {} } }
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
 * ⚡ CORPS DE LA CARTE (ULTIMATE V4.0)
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
      'lightning-rainy': 'Orageux', 'partlycloudy': 'Partiellement Nuageux', 'pouring': 'Averses', 'rainy': 'Pluie', 
      'snowy': 'Neige', 'snowy-rainy': 'Neige Verglaçante', 'sunny': 'Ensoleillé', 'windy': 'Venteux', 'windy-variant': 'Vent Variable'
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
            <div class="f-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>SOLAIRE</div>
            <div class="f-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}>MÉTÉO</div>
            <div class="f-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}>BATTERIES</div>
            <div class="f-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}>ÉCONOMIE</div>
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

        <div class="cockpit" style="margin-top: 20px;">
          <div class="side">
            <div class="group-title">${c.title_left || 'GAUCHE'}</div>
            ${[4, 5, 6].map(i => this._renderDiag(i, 'l'))}
          </div>
          <div class="center-spacer"></div>
          <div class="side">
            <div class="group-title right">${c.title_right || 'DROITE'}</div>
            ${[7, 8, 9].map(i => this._renderDiag(i, 'r'))}
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
                <div class="hud-sub">${sub.val}<small>${sub.unit}</small></div>
              </div>`;
          })}
        </div>
      </div>`;
  }

  _renderDiag(i, side) {
    const c = this.config;
    if (!c[`d${i}_entity`]) return html`<div class="mini-diag empty"></div>`;
    const d = this._getVal(c[`d${i}_entity`]);
    return html`<div class="mini-diag ${side}"><span class="m-l">${c[`d${i}_label`] || 'CAPTEUR'}</span><span class="m-v">${d.val}<small>${d.unit}</small></span></div>`;
  }

  _renderWeather() {
    const sun = this.hass.states['sun.sun'];
    const weather = this._getVal(this.config.weather_entity);
    const elev = sun ? sun.attributes.elevation : 0;
    const pos = ((elev + 20) / 110) * 100;
    const formatTime = (iso) => iso ? new Date(iso).toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}) : '--:--';

    return html`
      <div class="page p-grid">
        <div class="cockpit-container" style="height: 120px;">
            <svg viewBox="0 0 400 100" preserveAspectRatio="none" class="sun-svg-bg"><path d="M0,90 Q200,-20 400,90" fill="none" stroke="rgba(255,193,7,0.4)" stroke-width="2" stroke-dasharray="5"/></svg>
            <div class="sun-dot" style="left: ${Math.max(5, Math.min(95, pos))}%"><ha-icon icon="mdi:white-balance-sunny"></ha-icon><span>${elev.toFixed(1)}°</span></div>
        </div>
        <div class="astro-card">
            <div class="card-head">ASTRO COCKPIT</div>
            <div class="a-grid">
                <div class="a-item"><ha-icon icon="mdi:compass-outline"></ha-icon>Azimut<b>${sun?.attributes.azimuth}°</b></div>
                <div class="a-item"><ha-icon icon="mdi:angle-acute"></ha-icon>Élévation<b>${elev.toFixed(1)}°</b></div>
                <div class="a-item"><ha-icon icon="mdi:weather-sunset-down"></ha-icon>Coucher<b>${formatTime(sun?.attributes.next_setting)}</b></div>
                <div class="a-item"><ha-icon icon="mdi:weather-night"></ha-icon>Crépuscule<b>${formatTime(sun?.attributes.next_dusk)}</b></div>
            </div>
        </div>
        <div class="astro-card">
            <div class="card-head">MÉTÉO</div>
            <div class="w-row">
                <div class="w-val">${this._getVal(this.config.temp_ext).val}°C</div>
                <div class="w-st">${this._translateWeather(weather.val)}</div>
            </div>
            <div class="w-hum">Humidité: ${this._getVal(this.config.hum_ext).val}%</div>
        </div>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`<div class="page scroll">
      ${[1,2,3,4].map(i => {
        if (!c[`b${i}_s`]) return '';
        const soc = this._getVal(c[`b${i}_s`]);
        const conn = this._getVal(c[`b${i}_conn`]).val.toLowerCase();
        const online = ['on','online','connected','true'].includes(conn);
        return html`
          <div class="rack">
            <div class="r-h"><span>${c[`b${i}_n`] || 'BAT '+i}</span><b>${soc.val}%</b></div>
            <div class="v-meter">${[...Array(10)].map((_, idx) => html`<div class="v-seg ${parseInt(soc.val) > (idx * 10) ? 'on' : ''}"></div>`)}</div>
            <div class="r-stats">
                <div>Capacité: <b>${this._getVal(c[`b${i}_cap`]).val}</b></div>
                <div>Temp: <b>${this._getVal(c[`b${i}_temp`]).val}°</b></div>
                <div>Sortie: <b>${this._getVal(c[`b${i}_out`]).val}</b></div>
                <div style="color:${online?'#4caf50':'#f44336'}">État: <b>${online?'Connecté':'Déconnecté'}</b></div>
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
        <div class="e-sub"><span>JOUR: <b>+${this._getVal(c.eco_day_euro).val}€</b></span><span>ANNÉE: <b>+${this._getVal(c.eco_year_euro).val}€</b></span></div>
      </div>
      <div class="mini-diag" style="width:100%; margin:15px 0; border-left:4px solid #4caf50">
        <span class="m-l">CONSOMMATION MAISON</span><span class="m-v">${this._getVal(c.main_cons).val}W</span>
      </div>
      <div class="extra-eco-grid">
        ${[1,2,3,4,5,6].map(i => {
            if(!c[`e${i}_e`]) return '';
            const e = this._getVal(c[`e${i}_e`]);
            return html`
              <div class="mini-diag">
                <span class="m-l">${c[`e${i}_l`] || 'Extra '+i}</span>
                <span class="m-v">${e.val}<small>${e.unit}</small></span>
              </div>`;
        })}
      </div>
    </div>`;
  }

  static styles = css`
    ha-card { background:#000; color:#fff; border-radius:24px; overflow:hidden; font-family: sans-serif; position:relative; }
    .bg-layer { position:absolute; top:0; left:0; width:100%; height:100%; background-size:cover; opacity:0.3; z-index:0; }
    .overlay { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; padding:20px; background:rgba(0,0,0,0.8); box-sizing:border-box; }
    
    .header-prod { text-align:center; }
    .month-tag { color:#ffc107; font-size:10px; font-weight:bold; letter-spacing:2px; margin-bottom:5px; }
    .big-val-titan { font-size:72px; font-weight:900; color:#ffc107; line-height:0.8; text-shadow:0 0 15px rgba(255,193,7,0.4); }
    .big-val-titan small { font-size:22px; margin-left:5px; }
    .target-container { width:220px; margin:15px auto 0; }
    .target-bar { height:4px; background:rgba(255,255,255,0.1); border-radius:2px; overflow:hidden; }
    .target-fill { height:100%; background:#ffc107; box-shadow:0 0 10px #ffc107; transition: width 1s; }
    .target-text { font-size:9px; color:#aaa; margin-top:5px; text-transform:uppercase; }

    .cockpit { display:flex; justify-content:space-between; align-items:flex-end; }
    .side { flex:1.3; }
    .center-spacer { flex:1; }
    .group-title { font-size:10px; font-weight:900; color:#00f9f9; text-transform:uppercase; margin-bottom:5px; }
    .group-title.right { text-align:right; color:#ffc107; }
    .mini-diag { background:rgba(255,255,255,0.05); padding:8px; border-radius:8px; margin:5px 0; border-left:3px solid #00f9f9; backdrop-filter: blur(5px); }
    .mini-diag.l { border-left:3px solid #00f9f9; }
    .mini-diag.r { border-left:none; border-right:3px solid #ffc107; text-align:right; }
    .m-l { font-size:8px; color:#aaa; display:block; text-transform:uppercase; font-weight:bold; }
    .m-v { font-size:14px; font-weight:bold; }

    .panels-row { display:flex; justify-content:space-around; margin-top:30px; }
    .hud-circle { width:65px; height:65px; border-radius:50%; border:2px solid; position:relative; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.6); }
    .scan { position:absolute; width:100%; height:100%; border:2px solid transparent; border-radius:50%; animation:rotate 4s linear infinite; top:-2px; left:-2px; padding:2px; box-sizing:content-box; }
    @keyframes rotate { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
    .hud-n { font-size:10px; font-weight:bold; text-align:center; margin-top:8px; text-transform:uppercase; }
    .hud-sub { font-size:11px; text-align:center; color:#aaa; }

    .cockpit-container { position:relative; overflow:hidden; }
    .sun-svg-bg { position:absolute; width:100%; height:100%; opacity:0.4; }
    .sun-dot { position:absolute; bottom:15px; transform:translateX(-50%); color:#ffc107; text-align:center; }
    .sun-dot span { font-size:10px; font-weight:bold; display:block; }

    .p-grid { display:flex; flex-direction:column; gap:10px; }
    .astro-card { background:rgba(255,255,255,0.05); padding:12px; border-radius:12px; border:1px solid #333; }
    .card-head { font-size:10px; color:#ffc107; font-weight:bold; margin-bottom:8px; }
    .a-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
    .a-item { font-size:9px; color:#aaa; display:flex; flex-direction:column; }
    .a-item b { font-size:14px; color:#fff; }
    .w-row { display:flex; justify-content:space-between; align-items:center; }
    .w-val { font-size:38px; font-weight:900; }
    .w-st { font-size:12px; color:#ffc107; font-weight:bold; text-transform:uppercase; }

    .rack { background:rgba(255,255,255,0.05); padding:12px; border-radius:12px; margin-bottom:10px; border-left:4px solid #4caf50; }
    .v-meter { display:flex; gap:3px; height:8px; margin:8px 0; }
    .v-seg { flex:1; background:#222; }
    .v-seg.on { background:#4caf50; box-shadow:0 0 5px #4caf50; }
    .r-stats { display:grid; grid-template-columns:1fr 1fr; gap:5px; font-size:10px; color:#aaa; }
    .r-stats b { color:#fff; }

    .eco-hero { background:rgba(76,175,80,0.1); padding:20px; border-radius:15px; text-align:center; border:1px solid #4caf5044; }
    .e-v { font-size:50px; font-weight:900; color:#4caf50; line-height:1; }
    .extra-eco-grid { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }

    .footer { display:flex; justify-content:space-around; padding-top:15px; border-top:1px solid #333; margin-top:auto; }
    .f-btn { cursor:pointer; opacity:0.4; font-size:10px; font-weight:bold; }
    .f-btn.active { opacity:1; color:#ffc107; border-bottom:2px solid #ffc107; padding-bottom:5px; }
    .scroll { overflow-y:auto; padding-right:5px; }
    .scroll::-webkit-scrollbar { width: 4px; }
    .scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
