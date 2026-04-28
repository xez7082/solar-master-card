import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR COMPLET (Toutes les options)
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
        // Dans schemas -> tab_solar, ajoute ces 3 lignes :
        { name: "bg_url", label: "URL de l'image de fond", selector: { text: {} } },
        { name: "bg_opacity", label: "Opacité du fond (0.1 à 1)", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "solar_pct_sensor", label: "Sensor Pourcentage Objectif (%)", selector: { entity: {} } },
        { name: "card_height", label: "Hauteur Carte (px)", selector: { number: { min: 400, max: 1200 } } },
        { name: "total_now", label: "Production Totale (W)", selector: { entity: {} } },
        { name: "solar_target", label: "Objectif Jour (kWh)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau ${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts Panneau ${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `Info Extra ${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité Extra ${i}`, selector: { entity: {} } }
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
      tab_batt: [
        // À ajouter dans tab_batt pour chaque batterie (exemple pour b1, répète pour b2, b3, b4)
        { name: "b1_v", label: "Voltage Batt 1", selector: { entity: {} } },
        { name: "b1_t", label: "Temp Batt 1", selector: { entity: {} } },
        { name: "batt_total_power", label: "Flux Total Batteries (W)", selector: { entity: {} } },
        { name: "batt_avg_soc", label: "SOC Moyen Global (%)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
          { name: `b${i}_cap`, label: `Capacité ${i}`, selector: { entity: {} } },
          { name: `b${i}_out`, label: `Watts Entrée/Sortie ${i}`, selector: { entity: {} } }
        ]).flat()
      ],
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
        <button class="${this._selectedTab === 'tab_weather' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_weather'}>METEO</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIES</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ECO</button>
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.edit-tabs { display: flex; gap: 4px; margin-bottom: 15px; } button { flex: 1; padding: 10px; font-size: 10px; cursor: pointer; background: #111; color: #666; border: 1px solid #333; border-radius: 4px; } button.active { background: #ffc107; color: #000; border-color: #ffc107; font-weight: bold; }`;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CARTE ULTIME (V8 OMNI)
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
      <ha-card style="height:${c.card_height || 750}px;">
        <div class="card-wrapper">
          
          ${c.bg_url ? html`
            <div class="bg-overlay" style="
              background-image: url('${c.bg_url}'); 
              opacity: ${c.bg_opacity || 0.3}; 
              position: absolute; top:0; left:0; width:100%; height:100%; 
              background-size:cover; background-position:center; 
              z-index: 0; pointer-events: none;">
            </div>` : ''}

          <div class="view-port" style="position: relative; z-index: 1;">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : 
              this._tab === 'METEO' ? this._renderWeather() :
              this._tab === 'BATTERIE' ? this._renderBattery() : this._renderEco()}
          </div>

          <div class="nav-bar" style="position: relative; z-index: 2;">
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
    const target = this._getVal(c.solar_target);
    const progress = Math.min(100, (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100);

    return html`
      <div class="page">
        <div class="titan-header">
          <div class="big-val">${prod.val}<small>W</small></div>
          <div class="sub-txt">PUISSANCE PHOTOVOLTAÏQUE</div>
        </div>

        <div class="ruler-box">
          <div class="r-labels"><span>OBJECTIF: ${target.val}kWh</span> <b>${progress.toFixed(1)}%</b></div>
          <div class="r-track">
            ${Array(25).fill().map((_, i) => html`<div class="seg ${i < progress / 4 ? 'active' : ''}"></div>`)}
          </div>
        </div>

        <div class="neon-circles">
          ${[1, 2, 3, 4].map(i => {
            if(!c[`p${i}_w`]) return '';
            const v = this._getVal(c[`p${i}_w`]);
            const clr = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"][i-1];
            return html`
              <div class="n-item">
                <div class="n-circle" style="--clr:${clr}">
                   <span class="v">${Math.round(v.val)}</span><span class="u">W</span>
                </div>
                <div class="n-label">${c[`p${i}_name`] || 'PANEL '+i}</div>
              </div>`;
          })}
        </div>

        <div class="data-grid">
          ${[4, 5, 6, 7, 8, 9].map(i => {
            if(!c[`d${i}_entity`]) return '';
            const d = this._getVal(c[`d${i}_entity`]);
            return html`<div class="d-card"><span>${c[`d${i}_label`]}</span><b>${d.val}<small>${d.unit}</small></b></div>`;
          })}
        </div>
      </div>`;
  }

  _renderWeather() {
    const c = this.config;
    const sun = this.hass.states['sun.sun'];
    const weather = this._getVal(c.weather_entity);
    return html`
      <div class="page scroll">
        <div class="weather-hero">
            <div class="wh-temp">${this._getVal(c.temp_ext).val}°</div>
            <div class="wh-icon"><ha-icon icon="mdi:weather-partly-cloudy"></ha-icon></div>
        </div>
        
        <div class="sun-cockpit">
            <div class="sc-item"><span>AZIMUT</span><b>${sun?.attributes.azimuth.toFixed(1)}°</b></div>
            <div class="sc-item"><span>ELEVATION</span><b>${sun?.attributes.elevation.toFixed(1)}°</b></div>
            <div class="sc-item"><span>HUMIDITÉ</span><b>${this._getVal(c.hum_ext).val}%</b></div>
        </div>

        <div class="weather-grid-8">
            ${[1,2,3,4,5,6,7,8].map(i => {
                if(!c[`w${i}_e`]) return '';
                const e = this._getVal(c[`w${i}_e`]);
                return html`<div class="w-tile"><span>${c[`w${i}_l`]}</span><b>${e.val}${e.unit}</b></div>`;
            })}
        </div>
      </div>`;
  }

_renderBattery() {
    const c = this.config;
    return html`
      <div class="page scroll" style="position: relative; z-index: 2;">
        <div class="rack-container" style="display: flex; flex-direction: column; gap: 15px;">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`b${i}_s`]) return '';
            
            const soc = parseFloat(this._getVal(c[`b${i}_s`]).val);
            const p = this._getVal(c[`b${i}_out`]);
            const extra1 = this._getVal(c[`b${i}_v`]); // Sensor Voltage
            const extra2 = this._getVal(c[`b${i}_t`]); // Sensor Température
            
            // Logique de couleur
            let color = "#f44336";
            if (soc >= 20) color = "#ff9800";
            if (soc >= 50) color = "#ffc107";
            if (soc >= 80) color = "#00c853";
            
            return html`
              <div class="rack-pro" style="background: rgba(10,10,10,0.8); padding: 15px; border-radius: 12px; border: 1px solid #1a1a1a; border-left: 4px solid ${color};">
                
                <div class="rp-head" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span style="font-size: 12px; font-weight: bold; color: #aaa;">${c[`b${i}_n`] || 'RACK '+i}</span>
                  <b style="font-size: 18px; color: ${color}; text-shadow: 0 0 10px ${color}55;">${soc}%</b>
                </div>

                <div class="rp-segments" style="display: flex; gap: 3px; height: 8px; margin-bottom: 12px;">
                  ${Array(20).fill().map((_, idx) => html`
                    <div class="b-seg" style="
                      flex: 1; 
                      border-radius: 1px; 
                      background: ${idx < soc / 5 ? color : '#1a1a1a'};
                      box-shadow: ${idx < soc / 5 ? '0 0 5px ' + color : 'none'};
                      opacity: ${idx < soc / 5 ? '1' : '0.3'};">
                    </div>
                  `)}
                </div>

                <div class="rp-extras" style="display: flex; justify-content: space-between; border-top: 1px solid #222; pt: 10px; margin-top: 5px; padding-top: 10px;">
                  
                  <div class="ex-item" style="display: flex; align-items: center; gap: 5px;">
                    <ha-icon icon="mdi:flash" style="--mdc-icon-size: 14px; color: #ffc107;"></ha-icon>
                    <span style="font-size: 11px;">${extra1.val}<small>${extra1.unit}</small></span>
                  </div>

                  <div class="ex-item" style="display: flex; align-items: center; gap: 5px;">
                    <ha-icon icon="mdi:thermometer" style="--mdc-icon-size: 14px; color: #00f9f9;"></ha-icon>
                    <span style="font-size: 11px;">${extra2.val}<small>${extra2.unit}</small></span>
                  </div>

                  <div class="ex-item" style="display: flex; align-items: center; gap: 5px;">
                    <ha-icon icon="${parseFloat(p.val) < 0 ? 'mdi:arrow-down-bold' : 'mdi:arrow-up-bold'}" 
                             style="--mdc-icon-size: 14px; color: ${parseFloat(p.val) < 0 ? '#00c853' : '#ffc107'};">
                    </ha-icon>
                    <span style="font-size: 11px; font-weight: bold;">${Math.abs(p.val)}W</span>
                  </div>

                </div>
              </div>`;
          })}
        </div>
      </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`
      <div class="page scroll">
        <div class="eco-hero">
            <div class="eh-val">${this._getVal(c.eco_money).val}€</div>
            <div class="eh-sub">GAIN TOTAL RÉALISÉ</div>
        </div>
        <div class="conso-bar">
            <span>CONSO MAISON</span>
            <b>${this._getVal(c.main_cons).val} W</b>
        </div>
        <div class="eco-stats-grid">
            <div class="es-card"><span>JOUR</span><b>${this._getVal(c.eco_day_euro).val}€</b></div>
            <div class="es-card"><span>ANNÉE</span><b>${this._getVal(c.eco_year_euro).val}€</b></div>
            ${[1,2,3,4,5,6].map(i => {
                if(!c[`e${i}_e`]) return '';
                const e = this._getVal(c[`e${i}_e`]);
                return html`<div class="es-card"><span>${c[`e${i}_l`]}</span><b>${e.val}${e.unit}</b></div>`;
            })}
        </div>
      </div>`;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 24px; overflow: hidden; font-family: 'Inter', sans-serif; }
    .card-wrapper { height: 100%; display: flex; flex-direction: column; background: linear-gradient(180deg, #0a0a0a 0%, #000 100%); }
    .view-port { flex: 1; padding: 25px; overflow: hidden; position: relative; }
    .page { height: 100%; display: flex; flex-direction: column; }
    .scroll { overflow-y: auto; }
    .scroll::-webkit-scrollbar { width: 4px; }
    .scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }

    /* DESIGN TITAN */
    .titan-header { text-align: center; margin-bottom: 30px; }
    .big-val { font-size: 82px; font-weight: 900; color: #ffc107; line-height: 1; text-shadow: 0 0 20px rgba(255,193,7,0.3); }
    .big-val small { font-size: 24px; color: #fff; opacity: 0.6; }
    .sub-txt { font-size: 10px; letter-spacing: 4px; color: #666; margin-top: 10px; }

    /* RULER SEGMENTS */
    .ruler-box { margin-bottom: 35px; }
    .r-labels { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; color: #888; }
    .r-track { display: flex; gap: 3px; height: 10px; }
    .seg { flex: 1; background: #1a1a1a; border-radius: 1px; }
    .seg.active { background: #ffc107; box-shadow: 0 0 8px #ffc107; }

    /* NEON CIRCLES */
    .neon-circles { display: flex; justify-content: space-around; margin-bottom: 30px; }
    .n-item { text-align: center; }
    .n-circle { 
        width: 70px; height: 70px; border-radius: 50%; border: 2px solid var(--clr); 
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.6); box-shadow: inset 0 0 12px var(--clr), 0 0 10px var(--clr);
        margin-bottom: 8px;
    }
    .n-circle .v { font-size: 18px; font-weight: bold; }
    .n-circle .u { font-size: 8px; color: #888; }
    .n-label { font-size: 9px; font-weight: bold; color: #666; }

    /* GRID & CARDS */
    .data-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .d-card { background: #0a0a0a; padding: 12px; border-radius: 10px; border: 1px solid #1a1a1a; }
    .d-card span { font-size: 8px; color: #555; display: block; text-transform: uppercase; }
    .d-card b { font-size: 14px; }

    /* WEATHER */
    .weather-hero { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
    .wh-temp { font-size: 60px; font-weight: 900; }
    .wh-icon ha-icon { --mdc-icon-size: 50px; color: #ffc107; }
    .sun-cockpit { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: #0a0a0a; padding: 15px; border-radius: 15px; border: 1px solid #1a1a1a; margin-bottom: 20px; }
    .sc-item span { font-size: 8px; color: #666; display: block; }
    .sc-item b { font-size: 14px; color: #00f9f9; }
    .weather-grid-8 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .w-tile { background: #0a0a0a; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; font-size: 11px; border: 1px solid #1a1a1a; }

    /* BATTERY */
    .batt-master { display: flex; justify-content: space-between; background: #0d1a0d; padding: 20px; border-radius: 15px; margin-bottom: 20px; border: 1px solid #1a331a; }
    .bm-soc { font-size: 40px; font-weight: 900; color: #00c853; }
    .bm-flow { font-size: 20px; font-weight: bold; color: #ffc107; }
    .bm-flow.charge { color: #00c853; }
    .rack-pro { background: #0a0a0a; padding: 15px; border-radius: 12px; border: 1px solid #1a1a1a; margin-bottom: 10px; }
    .rp-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
    .rp-bar { height: 6px; background: #000; border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
    .rp-fill { height: 100%; background: #00c853; }
    .rp-foot { font-size: 10px; color: #555; }

    /* ECO */
    .eco-hero { text-align: center; padding: 30px; background: rgba(76, 175, 80, 0.1); border-radius: 20px; margin-bottom: 20px; }
    .eh-val { font-size: 50px; font-weight: 900; color: #4caf50; }
    .conso-bar { display: flex; justify-content: space-between; background: #111; padding: 15px; border-radius: 12px; margin-bottom: 20px; }
    .eco-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .es-card { background: #0a0a0a; padding: 12px; border-radius: 10px; display: flex; justify-content: space-between; border: 1px solid #1a1a1a; }
    .es-card span { font-size: 9px; color: #666; }

    /* NAVBAR */
    .nav-bar { height: 75px; background: #050505; display: flex; justify-content: space-around; align-items: center; border-top: 1px solid #111; }
    .nav-btn { color: #444; display: flex; flex-direction: column; align-items: center; cursor: pointer; transition: 0.3s; }
    .nav-btn.active { color: #ffc107; transform: translateY(-5px); }
    .nav-btn ha-icon { --mdc-icon-size: 24px; }
    .nav-btn span { font-size: 9px; font-weight: bold; margin-top: 5px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
