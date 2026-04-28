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
        { name: "weather_entity", label: "Entité Météo Principale", selector: { entity: { domain: "weather" } } },
        { name: "moon_entity", label: "Entité Lune", selector: { entity: {} } }, // Ajouté pour l'arc lunaire
        ...[1, 2, 3, 4, 5, 6, 7, 8].map(i => [
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
          { name: `b${i}_cap`, label: `Capacité ${i}`, selector: { entity: {} } },
          { name: `b${i}_out`, label: `Watts Entrée/Sortie ${i}`, selector: { entity: {} } },
          { name: `b${i}_s`, label: `Sortie Batt ${i}`, selector: { entity: {} } }, // <--- AJOUTÉ
          { name: `b${i}_t`, label: `Température Batt ${i}`, selector: { entity: {} } } // <--- AJOUTÉ
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
      <ha-card style="height:${c.card_height || 750}px; overflow: hidden; position: relative;">
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

          <div class="nav-bar" style="
            display: flex; 
            justify-content: space-around; 
            background: rgba(0,0,0,0.8); 
            border-top: 1px solid #222; 
            padding: 10px 0; 
            position: relative; 
            z-index: 2;">
            
            <div class="nav-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'} style="text-align:center; cursor:pointer; flex:1; color: ${this._tab === 'SOLAIRE' ? '#ffc107' : '#666'};">
              <ha-icon icon="mdi:solar-power-variant"></ha-icon>
              <div style="font-size: 9px; margin-top: 4px;">SOLAIRE</div>
            </div>

            <div class="nav-btn ${this._tab === 'METEO' ? 'active' : ''}" @click=${() => this._tab = 'METEO'} style="text-align:center; cursor:pointer; flex:1; color: ${this._tab === 'METEO' ? '#00f9f9' : '#666'};">
              <ha-icon icon="mdi:weather-partly-cloudy"></ha-icon>
              <div style="font-size: 9px; margin-top: 4px;">METEO</div>
            </div>

            <div class="nav-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'} style="text-align:center; cursor:pointer; flex:1; color: ${this._tab === 'BATTERIE' ? '#00c853' : '#666'};">
              <ha-icon icon="mdi:battery-charging"></ha-icon>
              <div style="font-size: 9px; margin-top: 4px;">ENERGIE</div>
            </div>

            <div class="nav-btn ${this._tab === 'ECONOMIE' ? 'active' : ''}" @click=${() => this._tab = 'ECONOMIE'} style="text-align:center; cursor:pointer; flex:1; color: ${this._tab === 'ECONOMIE' ? '#e91e63' : '#666'};">
              <ha-icon icon="mdi:chart-areaspline"></ha-icon>
              <div style="font-size: 9px; margin-top: 4px;">ECO</div>
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
    
    // Logique du pourcentage (Sensor dédié ou calcul auto)
    const pct_entity = this._getVal(c.solar_pct_sensor);
    const progress = c.solar_pct_sensor ? parseFloat(pct_entity.val) : Math.min(100, (parseFloat(prod.val) / (parseFloat(target.val) * 1000)) * 100);

    return html`
    
      <div class="page" style="position: relative; z-index: 1;">
        <div class="titan-header">
          <div class="big-val">${prod.val}<small>W</small></div>
          <div class="sub-txt">PUISSANCE PHOTOVOLTAÏQUE</div>
        </div>

        <div class="ruler-box">
          <div class="r-labels">
            <span>OBJECTIF: ${target.val}kWh</span> 
            <b style="color: #ffc107; text-shadow: 0 0 10px rgba(255,193,7,0.5);">${progress.toFixed(1)}%</b>
          </div>
          <div class="r-track">
            ${Array(25).fill().map((_, i) => html`
              <div class="seg ${i < progress / 4 ? 'active' : ''}" 
                   style="${i < progress / 4 ? 'background: #ffc107; box-shadow: 0 0 8px #ffc107;' : 'background: #1a1a1a;'}">
              </div>`)}
          </div>
        </div>

        <div class="neon-circles" style="display: flex; justify-content: space-around; margin-bottom: 30px;">
          ${[1, 2, 3, 4].map(i => {
            const entityId = c[`p${i}_w`] || c[`panel${i}_production`]; // Supporte les deux noms de config
            if(!entityId) return '';
            const v = this._getVal(entityId);
            const clr = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"][i-1];
            return html`
              <div class="n-item" style="text-align: center;">
                <div class="n-circle" style="width: 75px; height: 75px; border-radius: 50%; border: 2px solid ${clr}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); box-shadow: inset 0 0 12px ${clr}, 0 0 10px ${clr}; margin-bottom: 8px; --clr:${clr}">
                   <span class="v" style="font-size: 18px; font-weight: bold; color: #fff;">${Math.round(v.val)}</span>
                   <span class="u" style="font-size: 8px; color: #888;">W</span>
                </div>
                <div class="n-label" style="font-size: 9px; font-weight: bold; color: #aaa; text-transform: uppercase;">${c[`p${i}_name`] || c[`panel${i}_name`] || 'PANEL '+i}</div>
              </div>`;
          })}
        </div>

        <div class="data-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
          ${[4, 5, 6, 7, 8, 9].map(i => {
            if(!c[`d${i}_entity`]) return '';
            const d = this._getVal(c[`d${i}_entity`]);
            return html`
              <div class="d-card" style="background: rgba(10,10,10,0.8); padding: 12px; border-radius: 10px; border: 1px solid #1a1a1a;">
                <span style="font-size: 8px; color: #555; display: block; text-transform: uppercase;">${c[`d${i}_label`]}</span>
                <b style="font-size: 14px; color: #fff;">${d.val}<small style="font-size: 10px; margin-left: 2px; color: #666;">${d.unit}</small></b>
              </div>`;
          })}
        </div>
      </div>`;
  }
  
_renderWeather() {
    const c = this.config;
    const sun = this.hass.states['sun.sun'];
    if (!sun) return html`<div style="color:red;padding:20px;">Soleil introuvable</div>`;

    const elevation = sun.attributes.elevation || 0;
    const azimuth = sun.attributes.azimuth || 0;

    // Traduction française des phases lunaires
    const moonState = this.hass.states[c.moon_entity]?.state;
    const moonPhases = {
      'new_moon': 'Nouvelle\nLune',
      'waxing_crescent': 'Premier\nCroissant',
      'first_quarter': 'Premier\nQuartier',
      'waxing_gibbous': 'Gibbeuse\nCroissante',
      'full_moon': 'Pleine\nLune',
      'waning_gibbous': 'Gibbeuse\nDécroissante',
      'last_quarter': 'Dernier\nQuartier',
      'waning_crescent': 'Dernier\nCroissant'
    };
    const phaseFr = moonPhases[moonState] || moonState || 'Phase\nInconnue';

    /* CALCUL DE POSITION :
       On prend une marge large (de 45° à 315°) pour que le soleil soit visible 
       même s'il ne se lève pas pile à l'Est (90°).
    */
    const sunX = Math.max(25, Math.min(175, 25 + (150 * ((azimuth - 45) / 270))));
    const sunY = 65 - (Math.max(0, elevation) * 0.5); 

    return html`
      <div class="page" style="height: 500px; padding: 12px; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 10px; box-sizing: border-box; position: relative; z-index: 2; pointer-events: none;">
        
        <div style="display: flex; flex-direction: column; gap: 6px; pointer-events: auto;">
          ${[1, 2, 3, 4].map(i => this._renderMiniSensor(i))}
        </div>

        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; pointer-events: none;">
          <svg viewBox="0 0 200 85" style="width: 100%;">
            <text x="20" y="76" fill="#555" font-size="7" font-weight="bold">E</text>
            <text x="175" y="76" fill="#555" font-size="7" font-weight="bold">O</text>
            <text x="97" y="12" fill="#ff9800" font-size="8" font-weight="bold" opacity="0.6">S</text>

            <line x1="30" y1="65" x2="170" y2="65" stroke="rgba(255,255,255,0.1)" stroke-width="1" />
            
            <path d="M 35,65 A 65,50 0 0 1 165,65" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1.5" stroke-dasharray="2,2" />
            
            ${elevation > 0 ? html`
              <line x1="${sunX}" y1="65" x2="${sunX}" y2="${sunY}" stroke="#ffc107" stroke-width="0.5" stroke-dasharray="1,1" opacity="0.6" />
              <foreignObject x="${sunX - 9}" y="${sunY - 9}" width="18" height="18">
                <div style="color: #ffc107; filter: drop-shadow(0 0 4px #ffc107); text-align:center;">
                  <ha-icon icon="mdi:white-balance-sunny" style="--mdc-icon-size: 18px;"></ha-icon>
                </div>
              </foreignObject>
            ` : html`
              <foreignObject x="91" y="45" width="18" height="18">
                <div style="color: #00f9f9; opacity: 0.2; text-align:center;">
                  <ha-icon icon="mdi:moon-waning-crescent" style="--mdc-icon-size: 18px;"></ha-icon>
                </div>
              </foreignObject>
            `}
          </svg>
          
          <div style="display: flex; justify-content: space-between; width: 80%; font-size: 9px; color: #666; margin-top: -8px; font-family: monospace;">
            <span>${sun.attributes.next_rising ? sun.attributes.next_rising.split('T')[1].substring(0, 5) : '--:--'}</span>
            <span style="color: #ffc107; font-weight: bold;">${elevation.toFixed(1)}° | ${azimuth.toFixed(0)}°</span>
            <span>${sun.attributes.next_setting ? sun.attributes.next_setting.split('T')[1].substring(0, 5) : '--:--'}</span>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 6px; pointer-events: auto;">
          ${[5, 6, 7, 8].map(i => this._renderMiniSensor(i))}
        </div>

        <div style="background: rgba(15,15,15,0.8); padding: 8px 12px; border-radius: 10px; border: 1px solid #222; display: flex; align-items: center; gap: 12px; height: 46px; align-self: start; pointer-events: auto;">
          <ha-icon icon="mdi:moon-waning-crescent" style="color: #00f9f9; --mdc-icon-size: 20px;"></ha-icon>
          <div style="display: flex; flex-direction: column; line-height: 1.1;">
            <span style="font-size: 7px; color: #555; text-transform: uppercase; font-weight: bold;">PHASE LUNAIRE</span>
            <span style="font-size: 13px; font-weight: 900; color: #fff; white-space: pre-line;">${phaseFr}</span>
          </div>
        </div>

      </div>`;
  }

  _renderMiniSensor(i) {
    const c = this.config;
    const entityId = c[`w${i}_e`];
    if (!entityId || !this.hass.states[entityId]) return html`<div style="height:46px;"></div>`;
    const s = this._getVal(entityId);
    
    return html`
      <div style="background: rgba(15,15,15,0.8); padding: 8px 12px; border-radius: 10px; border: 1px solid #222; display: flex; align-items: center; gap: 10px; height: 46px; box-sizing: border-box;">
        <ha-icon icon="${c[`w${i}_i`] || 'mdi:circle-small'}" style="color: #00f9f9; --mdc-icon-size: 18px;"></ha-icon>
        <div style="display: flex; flex-direction: column; line-height: 1.1;">
          <span style="font-size: 7px; color: #555; text-transform: uppercase; font-weight: bold;">${c[`w${i}_l`] || 'S'+i}</span>
          <span style="font-size: 14px; font-weight: 900; color: #fff;">${s.val}<small style="font-size: 9px; color: #00f9f9; margin-left: 2px;">${s.unit}</small></span>
        </div>
      </div>`;
  }
  
_renderBattery() {
    const c = this.config;
    return html`
      <div class="page scroll" style="position: relative; z-index: 2;">
        <div class="rack-container" style="display: flex; flex-direction: column; gap: 12px;">
          ${[1, 2, 3, 4].map(i => {
            // Vérification si l'entité principale existe
            if (!c[`b${i}_s`] || !this.hass.states[c[`b${i}_s`]]) return '';
            
            const socVal = this._getVal(c[`b${i}_s`]).val;
            const soc = parseFloat(socVal) || 0;
            const p = this._getVal(c[`b${i}_out`]); // Flux global (charge/décharge)
            const temp = this._getVal(c[`b${i}_t`]); // Température
            const sortie = this._getVal(c[`b${i}_v`]); // C'est ici que tu dois mettre ton sensor de Watts de sortie dans l'éditeur
            
            // Logique de couleur dynamique
            let color = "#f44336";
            if (soc >= 20) color = "#ff9800";
            if (soc >= 50) color = "#ffc107";
            if (soc >= 80) color = "#00c853";
            
            const powerVal = parseFloat(p.val) || 0;

            return html`
              <div class="rack-pro" style="background: rgba(0,0,0,0.7); padding: 12px; border-radius: 10px; border: 1px solid #1a1a1a; border-left: 3px solid ${color}; margin-bottom: 4px;">
                
                <div class="rp-head" style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px;">
                  <span style="font-size: 11px; font-weight: bold; color: #888; letter-spacing: 1px;">${c[`b${i}_n`] || 'BATTERY '+i}</span>
                  <b style="font-size: 16px; color: ${color};">${soc}%</b>
                </div>

                <div class="rp-segments" style="display: flex; gap: 2px; height: 4px; margin-bottom: 12px;">
                  ${Array(30).fill().map((_, idx) => html`
                    <div class="b-seg" style="
                      flex: 1; 
                      background: ${idx < soc / (100/30) ? color : '#111'};
                      box-shadow: ${idx < soc / (100/30) ? '0 0 4px ' + color : 'none'};
                      border-radius: 1px;">
                    </div>
                  `)}
                </div>

                <div class="rp-extras" style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid #1a1a1a;">
                  
                  <div class="ex-item" style="display: flex; align-items: center; gap: 4px;">
                    <ha-icon icon="mdi:thermometer" style="--mdc-icon-size: 14px; color: #00f9f9;"></ha-icon>
                    <span style="font-size: 11px; color: #eee;">${temp.val}<small>${temp.unit || '°C'}</small></span>
                  </div>

                  <div class="ex-item" style="display: flex; align-items: center; gap: 4px;">
                    <ha-icon icon="mdi:lightning-bolt" style="--mdc-icon-size: 14px; color: #ffc107;"></ha-icon>
                    <span style="font-size: 11px; color: #eee;">${sortie.val}<small>W</small></span>
                  </div>

                  <div class="ex-item" style="display: flex; align-items: center; gap: 4px;">
                    <ha-icon icon="${powerVal < 0 ? 'mdi:download' : 'mdi:upload'}" 
                             style="--mdc-icon-size: 14px; color: ${powerVal < 0 ? '#00c853' : '#ff9800'};">
                    </ha-icon>
                    <span style="font-size: 11px; font-weight: bold; color: #fff;">${Math.abs(Math.round(powerVal))}W</span>
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

    /* Ajoute ça dans le CSS */
.bg-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background-size: cover;
    background-position: center;
    z-index: 0;
    pointer-events: none;
}
.view-port { 
    position: relative; 
    z-index: 1; /* Pour que les infos soient au-dessus de l'image */
}

    /* DESIGN TITAN */
    .titan-header { text-align: center; margin-bottom: 30px; }
    .big-val { font-size: 52px; font-weight: 900; color: #ffc107; line-height: 1; text-shadow: 0 0 20px rgba(255,193,7,0.3); }
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
    .bm-soc { font-size: 20px; font-weight: 900; color: #00c853; }
    .bm-flow { font-size: 20px; font-weight: bold; color: #ffc107; }
    .bm-flow.charge { color: #00c853; }
    .rack-pro { background: #0a0a0a; padding: 15px; border-radius: 12px; border: 1px solid #1a1a1a; margin-bottom: 10px; }
    .rp-head { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 8px; }
    .rp-bar { height: 6px; background: #000; border-radius: 3px; overflow: hidden; margin-bottom: 8px; }
    .rp-fill { height: 100%; background: #00c853; }
    .rp-foot { font-size: 10px; color: #555; }

    /* ECO */
    .eco-hero { text-align: center; padding: 30px; background: rgba(76, 175, 80, 0.1); border-radius: 20px; margin-bottom: 20px; }
    .eh-val { font-size: 30px; font-weight: 900; color: #4caf50; }
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
