import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR COMPLET
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
        { name: "bg_url", label: "URL de l'image de fond", selector: { text: {} } },
        { name: "bg_opacity", label: "Opacité du fond (0.1 à 1)", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "conso_entity", label: "Capteur Consommation/Import (W)", selector: { entity: {} } },
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
        { name: "weather_entity", label: "Entité Météo Principale", selector: { entity: { domain: "weather" } } },
        { name: "moon_entity", label: "Entité Lune", selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => [
           { name: `w${i}_l`, label: `Label Météo ${i}`, selector: { text: {} } },
           { name: `w${i}_e`, label: `Entité Météo ${i}`, selector: { entity: {} } },
           { name: `w${i}_i`, label: `Icone Météo ${i} (mdi:...)`, selector: { text: {} } }
        ]).flat()
      ],
      tab_batt: [
        { name: "batt_total_power", label: "Flux Total Batteries (W)", selector: { entity: {} } },
        { name: "batt_avg_soc", label: "SOC Moyen Global (%)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
          { name: `b${i}_t`, label: `Température ${i}`, selector: { entity: {} } },
          { name: `b${i}_v`, label: `Puissance Sortie (W) ${i}`, selector: { entity: {} } },
          { name: `b${i}_out`, label: `Flux E/S (W) ${i}`, selector: { entity: {} } },
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
      <ha-card style="height:${c.card_height || 500}px; overflow: hidden; position: relative;">
        <div class="card-wrapper" style="height: 100%; display: flex; flex-direction: column;">
          
          ${c.bg_url ? html`
            <div class="bg-overlay" style="
              background-image: url('${c.bg_url}'); 
              opacity: ${c.bg_opacity || 0.3}; 
              position: absolute; top:0; left:0; width:100%; height:100%; 
              background-size:cover; background-position:center; 
              z-index: 0; pointer-events: none;">
            </div>` : ''}

          <div class="view-port" style="flex: 1; position: relative; z-index: 1; overflow-y: auto;">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : ''}
            ${this._tab === 'METEO' ? this._renderWeather() : ''}
            ${this._tab === 'BATTERIE' ? this._renderBattery() : ''}
            ${this._tab === 'ECONOMIE' ? this._renderEco() : ''}
          </div>

          <div class="nav-bar">
            <div class="nav-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>
              <ha-icon icon="mdi:solar-power-variant"></ha-icon>
              <span>SOLAIRE</span>
            </div>
            <div class="nav-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'}>
              <ha-icon icon="mdi:weather-partly-cloudy"></ha-icon>
              <span>METEO</span>
            </div>
            <div class="nav-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}>
              <ha-icon icon="mdi:battery-charging"></ha-icon>
              <span>BATTERIE</span>
            </div>
            <div class="nav-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'}>
              <ha-icon icon="mdi:chart-areaspline"></ha-icon>
              <span>ECO</span>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);
    const target = this._getVal(c.solar_target);
    const pct_entity = this._getVal(c.solar_pct_sensor);
    
    // Calcul de la progression (permet de dépasser 100%)
    const progress = c.solar_pct_sensor ? parseFloat(pct_entity.val) : (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100;
    const moisActuel = new Date().toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();

    const consoState = c.conso_entity ? this.hass.states[c.conso_entity] : null; 
    const consoVal = consoState ? parseFloat(consoState.state) : 0;
    const consoDisplay = Math.abs(consoVal).toFixed(0);

    return html`
      <div class="page" style="display: flex; flex-direction: column; gap: 8px; padding: 5px 10px; box-sizing: border-box;">
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="flex: 1; text-align: center;">
            ${consoVal > 0 ? html`<div style="color: #ff4444; font-weight: 900;"><ha-icon icon="mdi:transmission-tower" style="--mdc-icon-size: 20px;"></ha-icon><br><span style="font-size: 18px;">${consoDisplay} W</span></div>` : ''}
          </div>

          <div style="flex: 1.5; text-align: center; background: rgba(255,255,255,0.05); padding: 5px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);">
            <div style="font-size: 10px; color: #ffc107; text-transform: uppercase; font-weight: bold; margin-bottom: -2px;">${moisActuel}</div>
            <span style="font-size: 30px; font-weight: 900; color: #ffc107; line-height: 1;">${prod.val} <small style="font-size: 12px;">W</small></span>
            <div style="display: flex; justify-content: center; gap: 8px; border-top: 1px solid rgba(255,255,255,0.1); margin-top: 2px; padding-top: 2px;">
              <span style="font-size: 11px; color: #aaa;">OBJECTIF: <b style="color: #fff;">${target.val} kWh </b></span>
              <span style="font-size: 11px; color: #aaa;">RÉALISÉ: <b style="color: #00f9f9;">${Math.round(progress)} %</b></span>
            </div>
          </div>

          <div style="flex: 1; text-align: center;">
            ${consoVal < 0 ? html`<div style="color: #00ff00; font-weight: 900;"><ha-icon icon="mdi:export" style="--mdc-icon-size: 20px;"></ha-icon><br><span style="font-size: 18px;">${consoDisplay} W</span></div>` : ''}
          </div>
        </div>

        <div style="margin: 2px 0;">
          <div style="display: flex; gap: 2px; height: 6px;">
            ${Array(20).fill().map((_, i) => html`
              <div style="flex:1; background: ${i < (Math.min(100, progress)/5) ? '#ffc107' : '#1a1a1a'}; border-radius: 1px;"></div>
            `)}
          </div>
        </div>

        <div class="neon-circles" style="display: flex; justify-content: space-around; margin: 2px 0;">
          ${[1, 2, 3, 4].map(i => {
            const entityId = c[`p${i}_w`] || c[`panel${i}_production`];
            if(!entityId) return '';
            const v = this._getVal(entityId);
            const clr = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"][i-1];
            return html`
              <div class="n-item" style="text-align: center;">
                <div class="n-circle" style="width: 82px; height: 82px; border-radius: 50%; border: 3px solid ${clr}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.7); box-shadow: inset 0 0 12px ${clr}, 0 0 8px rgba(0,0,0,0.8); margin-bottom: 2px; --clr: ${clr}">
                   <span style="font-size: 24px; font-weight: 900; color: #fff; line-height: 1;">${Math.round(v.val)}</span>
                   <span style="font-size: 11px; color: #aaa; font-weight: bold; text-transform: uppercase;">Watts</span>
                </div>
                <div style="font-size: 11px; font-weight: bold; color: #fff; text-transform: uppercase; letter-spacing: 0.5px;">${c[`p${i}_name`] || 'P'+i}</div>
              </div>`;
          })}
        </div>

        <div class="data-grid">
          ${[4, 5, 6, 7, 8, 9].map(i => {
            const entityId = c[`d${i}_entity`];
            if(!entityId) return '';
            const d = this._getVal(entityId);
            return html`
              <div class="d-card">
                <span>${c[`d${i}_label`] || 'DATA '+i}</span>
                <b>${d.val}<small style="color: #00f9f9;">${d.unit}</small></b>
              </div>`;
          })}
        </div>
      </div>
    `;
  }

  _renderWeather() {
    const c = this.config;
    const sun = this.hass.states['sun.sun'];
    if (!sun) return html`<div style="color:red;padding:20px;">ENTITÉ SUN INTROUVABLE</div>`;

    const elevation = sun.attributes.elevation ?? 0;
    const azimuth = sun.attributes.azimuth ?? 0;
    const sunX = 30 + ((azimuth / 360) * 140); 
    const sunY = 55 - (Math.max(0, elevation) * 0.4);

    const moonState = this.hass.states[c.moon_entity]?.state;
    const moonTranslations = {
      'new_moon': 'Nouvelle lune', 'waxing_crescent': 'Premier croissant', 'first_quarter': 'Premier quartier',
      'waxing_gibbous': 'Gibbeuse croissante', 'full_moon': 'Pleine lune', 'waning_gibbous': 'Gibbeuse décroissante',
      'last_quarter': 'Dernier quartier', 'waning_crescent': 'Dernier croissant'
    };
    const phaseFr = moonTranslations[moonState] || moonState || 'N/A';
  
    return html`
      <div class="page" style="display: flex; flex-direction: column; gap: 10px; padding: 5px;">
        <div style="background: rgba(255,255,255,0.03); border-radius: 12px; padding: 10px; border: 1px solid rgba(255,255,255,0.1);">
          <svg viewBox="0 0 200 70" style="width: 100%; height: 80px; overflow: visible;">
            <line x1="20" y1="60" x2="180" y2="60" stroke="rgba(255,255,255,0.2)" stroke-width="1" />
            <path d="M 30,60 A 70,40 0 0 1 170,60" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2" stroke-dasharray="4,4" />
            <circle cx="${sunX}" cy="${sunY}" r="6" fill="#ffc107" style="filter: drop-shadow(0 0 8px #ffc107);" />
          </svg>
          <div style="display: flex; justify-content: space-between; font-size: 12px; color: #eee; margin-top: -5px; padding: 0 15px; font-weight: bold;">
              <span>${sun.attributes.next_rising?.split('T')[1].substring(0, 5)}</span>
              <span style="color:#ffc107; font-size: 14px;">${elevation.toFixed(1)}°</span>
              <span>${sun.attributes.next_setting?.split('T')[1].substring(0, 5)}</span>
          </div>
        </div>

        <div style="background: rgba(255,255,255,0.03); padding: 10px 15px; border-radius: 8px; display: flex; align-items: center; gap: 12px; border: 1px solid rgba(255,255,255,0.05);">
           <ha-icon icon="mdi:moon-waning-crescent" style="color: #00f9f9; --mdc-icon-size: 22px;"></ha-icon>
           <span style="font-size: 14px; color: white; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${phaseFr}</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px;">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => this._renderMiniSensor(i))}
        </div>
      </div>
    `;
  }

  _renderMiniSensor(i) {
    const c = this.config;
    const entityId = c[`w${i}_e`];
    if (!entityId || !this.hass.states[entityId]) return html``;
    const stateObj = this.hass.states[entityId];
    return html`
      <div class="mini-sensor">
        <ha-icon icon="${c[`w${i}_i`] || 'mdi:circle-small'}"></ha-icon>
        <span class="mini-label">${c[`w${i}_l`] || 'S'+i}</span>
        <span class="mini-val">${stateObj.state}<small>${stateObj.attributes.unit_of_measurement || ''}</small></span>
      </div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`
      <div class="page scroll">
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`b${i}_s`] || !this.hass.states[c[`b${i}_s`]]) return '';
            const soc = parseFloat(this._getVal(c[`b${i}_s`]).val) || 0;
            const p = this._getVal(c[`b${i}_out`]);
            const temp = this._getVal(c[`b${i}_t`]);
            const sortie = this._getVal(c[`b${i}_v`]);
            let color = soc >= 80 ? "#00c853" : soc >= 50 ? "#ffc107" : soc >= 20 ? "#ff9800" : "#f44336";
            const powerVal = parseFloat(p.val) || 0;

            return html`
              <div class="rack-pro" style="border-left: 3px solid ${color};">
                <div class="rp-head">
                  <span>${c[`b${i}_n`] || 'BATTERY '+i}</span>
                  <b style="color: ${color};">${soc}%</b>
                </div>
                <div class="rp-segments">
                  ${Array(30).fill().map((_, idx) => html`<div style="flex: 1; height: 4px; border-radius: 1px; background: ${idx < soc / (100/30) ? color : '#111'}; box-shadow: ${idx < soc / (100/30) ? '0 0 4px ' + color : 'none'};"></div>`)}
                </div>
                <div class="rp-extras">
                  <div class="ex-item"><ha-icon icon="mdi:thermometer"></ha-icon> ${temp.val}${temp.unit || '°C'}</div>
                  <div class="ex-item"><ha-icon icon="mdi:lightning-bolt"></ha-icon> ${sortie.val}W</div>
                  <div class="ex-item"><ha-icon icon="${powerVal < 0 ? 'mdi:download' : 'mdi:upload'}" style="color: ${powerVal < 0 ? '#00c853' : '#ff9800'};"></ha-icon> ${Math.abs(Math.round(powerVal))}W</div>
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
            <div class="es-card"><span>GAIN JOUR</span><b>${this._getVal(c.eco_day_euro).val} €</b></div>
            <div class="es-card"><span>GAIN ANNÉE</span><b>${this._getVal(c.eco_year_euro).val} €</b></div>
            ${[1,2,3,4,5,6].map(i => {
                if(!c[`e${i}_e`]) return '';
                const e = this._getVal(c[`e${i}_e`]);
                return html`<div class="es-card"><span>${c[`e${i}_l`]}</span><b>${e.val}${e.unit}</b></div>`;
            })}
        </div>
      </div>`;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 24px; overflow: hidden; font-family: sans-serif; }
    .card-wrapper { height: 100%; display: flex; flex-direction: column; background: #0a0a0a; position: relative; }
    .view-port { flex: 1; padding: 15px; overflow-y: auto; z-index: 1; }
    .page { display: flex; flex-direction: column; height: 100%; }
    .scroll::-webkit-scrollbar { width: 4px; }
    .scroll::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
    .nav-bar { display: flex; justify-content: space-around; background: rgba(0,0,0,0.9); border-top: 1px solid #222; padding: 10px 0; z-index: 2; }
    .nav-btn { text-align: center; cursor: pointer; flex: 1; color: #666; transition: 0.3s; }
    .nav-btn.active { transform: translateY(-3px); }
    .nav-btn.active[style*="SOLAIRE"] { color: #ffc107 !important; }
    .nav-btn:nth-child(1).active { color: #ffc107; }
    .nav-btn:nth-child(2).active { color: #00f9f9; }
    .nav-btn:nth-child(3).active { color: #00c853; }
    .nav-btn:nth-child(4).active { color: #e91e63; }
    .nav-btn span { font-size: 9px; display: block; margin-top: 4px; font-weight: bold; }
    
    .n-circle { display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .data-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .d-card { background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; text-align: center; border: 1px solid #111; }
    .d-card span { font-size: 8px; color: #666; display: block; text-transform: uppercase; }
    .d-card b { font-size: 14px; }
    .mini-sensor { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; text-align: center; border: 1px solid #111; height: 55px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .mini-sensor ha-icon { color: #00f9f9; --mdc-icon-size: 18px; }
    .mini-label { font-size: 9px; color: #aaa; font-weight: bold; }
    .mini-val { font-size: 18px; font-weight: 900; }
    .mini-val small { font-size: 10px; color: #00f9f9; }
    .rack-pro { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; border: 1px solid #111; margin-bottom: 5px; }
    .rp-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
    .rp-segments { display: flex; gap: 2px; margin-bottom: 10px; }
    .rp-extras { display: flex; justify-content: space-between; font-size: 11px; border-top: 1px solid #222; padding-top: 8px; }
    .ex-item { display: flex; align-items: center; gap: 4px; }
    .ex-item ha-icon { --mdc-icon-size: 14px; }
    .eco-hero { text-align: center; padding: 20px; background: rgba(76, 175, 80, 0.1); border-radius: 15px; margin-bottom: 15px; }
    .eh-val { font-size: 32px; font-weight: 900; color: #4caf50; }
    .eh-sub { font-size: 10px; color: #666; letter-spacing: 1px; }
    .conso-bar { display: flex; justify-content: space-between; background: #111; padding: 12px; border-radius: 10px; margin-bottom: 15px; font-size: 13px; }
    .eco-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .es-card { background: #0a0a0a; padding: 10px; border-radius: 8px; border: 1px solid #1a1a1a; display: flex; justify-content: space-between; font-size: 11px; }
    .es-card span { color: #666; font-size: 9px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
