import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE LA CARTE (Version 3.6 FR)
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
        { name: "bg_opacity", label: "Opacité (0.1 à 1.0)", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "title_left", label: "Titre Groupe Gauche", selector: { text: {} } },
        { name: "title_right", label: "Titre Groupe Droite", selector: { text: {} } },
        { name: "total_now", label: "Entité Production Totale (W)", selector: { entity: {} } },
        { name: "solar_target", label: "Entité Objectif du jour (W)", selector: { entity: {} } },
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `Label Capteur D${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité D${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Entité Watts P${i}`, selector: { entity: {} } },
          { name: `p${i}_sub_label`, label: `Label Info Bas P${i}`, selector: { text: {} } },
          { name: `p${i}_sub`, label: `Entité Info Bas P${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [...[1, 2, 3, 4].map(i => [
        { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
        { name: `b${i}_s`, label: `Entité SOC % ${i}`, selector: { entity: {} } },
        { name: `b${i}_cap`, label: `Entité Capacité ${i}`, selector: { entity: {} } },
        { name: `b${i}_temp`, label: `Entité Température ${i}`, selector: { entity: {} } },
        { name: `b${i}_out`, label: `Entité Sortie (W/A) ${i}`, selector: { entity: {} } },
        { name: `b${i}_conn`, label: `Entité État Connexion ${i}`, selector: { entity: {} } }
      ]).flat()],
      tab_eco: [
        { name: "eco_money", label: "Total Économies (€)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gain Jour (€)", selector: { entity: {} } },
        { name: "eco_year_euro", label: "Gain Année (€)", selector: { entity: {} } },
        { name: "kwh_price", label: "Prix du kWh (€)", selector: { entity: {} } },
        { name: "main_cons_entity", label: "Conso Maison (W)", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="edit-tabs">
        <button class="${this._selectedTab === 'tab_solar' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_solar'}>SOLAIRE</button>
        <button class="${this._selectedTab === 'tab_batt' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_batt'}>BATTERIES</button>
        <button class="${this._selectedTab === 'tab_eco' ? 'active' : ''}" @click=${() => this._selectedTab = 'tab_eco'}>ÉCONOMIE</button>
      </div>
      <div class="editor-container">
        <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
      </div>
    `;
  }

  static styles = css`
    .edit-tabs { display: flex; gap: 8px; margin-bottom: 20px; border-bottom: 1px solid #444; padding-bottom: 10px; }
    button { flex: 1; padding: 10px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
    button.active { background: #ffc107; color: black; }
    ha-form { --primary-text-color: #ffffff; }
  `;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CORPS DE LA CARTE (V3.6 FULL + OBJECTIFS)
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
      <ha-card style="height:${c.card_height || 650}px;">
        ${c.bg_url ? html`<div class="bg-layer" style="background-image:url('${c.bg_url}'); opacity:${c.bg_opacity || 0.4};"></div>` : ''}
        <div class="overlay">
          <div class="main-content">
            ${this._tab === 'SOLAIRE' ? this._renderSolar() : 
              this._tab === 'BATTERIE' ? this._renderBattery() : this._renderEco()}
          </div>
          <div class="footer">
            <div class="f-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}>Solaire</div>
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
    const sun = this.hass.states['sun.sun'];
    const elev = sun ? sun.attributes.elevation : 0;
    const azi = sun ? sun.attributes.azimuth : 0;
    const pos = ((elev + 20) / 110) * 100;

    // Calcul de la barre d'objectif
    const currentVal = parseFloat(prod.val) || 0;
    const targetVal = parseFloat(target.val) || 1; // Évite division par 0
    const progress = Math.min(100, (currentVal / targetVal) * 100);

    return html`
      <div class="page">
        <div class="header-prod">
            <div class="c-label">PRODUCTION ACTUELLE</div>
            <div class="big-val-titan">${prod.val}<small>W</small></div>
            
            <div class="target-container">
                <div class="target-bar">
                    <div class="target-fill" style="width: ${progress}%"></div>
                </div>
                <div class="target-labels">
                    <span>Objectif: ${target.val}${target.unit}</span>
                    <span>${progress.toFixed(0)}%</span>
                </div>
            </div>
        </div>

        <div class="cockpit-container">
            <svg viewBox="0 0 400 100" preserveAspectRatio="none" class="sun-svg-bg"><path d="M0,90 Q200,-20 400,90" fill="none" stroke="rgba(255,193,7,0.3)" stroke-width="2" stroke-dasharray="5"/></svg>
            <div class="sun-dot" style="left: ${Math.max(5, Math.min(95, pos))}%">
                <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
                <span>${elev.toFixed(1)}°</span>
                <small>Azi: ${azi.toFixed(0)}°</small>
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
                <div class="hud-sub-val" style="color:${colors[i-1]}">${sub.val}<small>${sub.unit}</small></div>
              </div>`;
          })}
        </div>
      </div>`;
  }

  _renderDiag(i, side) {
    const c = this.config;
    if (!c[`d${i}_entity`]) return html`<div class="mini-diag empty"></div>`;
    const d = this._getVal(c[`d${i}_entity`]);
    return html`<div class="mini-diag ${side}"><span class="m-l">${c[`d${i}_label`] || 'INFO'}</span><span class="m-v">${d.val}<small>${d.unit}</small></span></div>`;
  }

  _renderBattery() {
    const c = this.config;
    return html`<div class="page scroll">
      ${[1, 2, 3, 4].map(i => {
        if (!c[`b${i}_s`]) return '';
        const soc = this._getVal(c[`b${i}_s`]);
        const conn = this._getVal(c[`b${i}_conn`]);
        const isOnline = ['on', 'online', 'connected', 'vrai', 'true'].includes(conn.val.toLowerCase());
        return html`
          <div class="rack">
            <div class="r-h"><span>${c[`b${i}_n`] || 'BATTERIE '+i}</span><span class="soc-pct">${soc.val}%</span></div>
            <div class="v-meter">${[...Array(10)].map((_, idx) => html`<div class="v-seg ${parseInt(soc.val) > (idx * 10) ? 'on' : ''}"></div>`)}</div>
            <div class="r-grid-compact">
              <div class="r-item"><span>CAPACITÉ</span><br><b>${this._getVal(c[`b${i}_cap`]).val}</b></div>
              <div class="r-item"><span>TEMP.</span><br><b>${this._getVal(c[`b${i}_temp`]).val}°</b></div>
              <div class="r-item"><span>SORTIE</span><br><b>${this._getVal(c[`b${i}_out`]).val}</b></div>
              <div class="r-item"><span>CONNEXION</span><br><b style="color:${isOnline ? '#4caf50' : '#f44336'}">${isOnline ? 'OK' : 'OFF'}</b></div>
            </div>
          </div>`;
      })}
    </div>`;
  }

  _renderEco() {
    const c = this.config;
    return html`<div class="page">
      <div class="eco-main-card">
        <div class="e-header">ÉCONOMIES RÉALISÉES</div>
        <div class="e-value-big">${this._getVal(c.eco_money).val}€</div>
        <div class="e-stats-row">
            <div class="e-stat"><span>JOUR</span><b>+${this._getVal(c.eco_day_euro).val}€</b></div>
            <div class="e-stat"><span>ANNÉE</span><b>+${this._getVal(c.eco_year_euro).val}€</b></div>
        </div>
      </div>
      <div class="eco-details-grid">
        <div class="e-detail"><span>PRIX KWH</span><b>${this._getVal(c.kwh_price).val}€</b></div>
        <div class="e-detail"><span>CONSO MAISON</span><b>${this._getVal(c.main_cons_entity).val}W</b></div>
      </div>
    </div>`;
  }

  static styles = css`
    ha-card { background:#000; color:#fff; border-radius:24px; overflow:hidden; position:relative; font-family: 'Segoe UI', Roboto, sans-serif; }
    .bg-layer { position:absolute; top:0; left:0; width:100%; height:100%; background-size:cover; background-position: center; z-index:0; }
    .overlay { position:relative; z-index:1; height:100%; display:flex; flex-direction:column; padding:20px; background:rgba(0,0,0,0.75); box-sizing:border-box; }
    
    .header-prod { text-align: center; margin-bottom: 10px; z-index: 2; }
    .big-val-titan { font-size:72px; font-weight:900; color:#ffc107; line-height:0.8; text-shadow: 0 0 15px rgba(255,193,7,0.4); }
    .big-val-titan small { font-size: 22px; margin-left: 5px; }
    .c-label { font-size: 11px; color: #ffc107; font-weight: bold; letter-spacing: 1px; }

    /* Styles Barre Objectif */
    .target-container { width: 220px; margin: 10px auto 0; }
    .target-bar { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; overflow: hidden; }
    .target-fill { height: 100%; background: linear-gradient(90deg, #ffc107, #00f9f9); transition: width 1s ease-in-out; }
    .target-labels { display: flex; justify-content: space-between; font-size: 9px; margin-top: 4px; color: #aaa; font-weight: bold; text-transform: uppercase; }

    .cockpit-container { position: relative; height: 160px; margin-top: 5px; }
    .sun-svg-bg { position: absolute; width: 100%; height: 100%; opacity: 0.25; }
    .sun-dot { position: absolute; bottom: 10px; transform: translateX(-50%); color: #ffc107; text-align: center; z-index: 5; }
    .sun-dot span { font-size: 11px; font-weight: bold; display: block; }
    .sun-dot small { font-size: 8px; opacity: 0.8; }

    .cockpit { display: flex; justify-content: space-between; align-items: flex-end; height: 100%; position: relative; z-index: 2; }
    .side { flex: 1.3; }
    .center-spacer { flex: 1; }
    .group-title { font-size: 10px; font-weight: 900; color: #00f9f9; text-transform: uppercase; margin-bottom: 5px; }
    .group-title.right { text-align: right; color: #ffc107; }

    .mini-diag { background: rgba(0,0,0,0.5); padding: 8px; border-radius: 8px; margin: 5px 0; border-left: 3px solid #00f9f9; backdrop-filter: blur(5px); }
    .mini-diag.r { border-left: none; border-right: 3px solid #ffc107; text-align: right; }
    .m-l { font-size: 9px; color: #aaa; display: block; text-transform: uppercase; font-weight: bold; }
    .m-v { font-size: 14px; font-weight: bold; }

    .panels-row { display: flex; justify-content: space-around; margin-top: 30px; }
    .hud-circle { width: 65px; height: 65px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); }
    .scan { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 4s linear infinite; top: -2px; left: -2px; padding: 2px; box-sizing: content-box; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .hud-n { font-size: 10px; font-weight: bold; text-align: center; margin-top: 8px; text-transform: uppercase; }
    .hud-sub-val { font-size: 11px; text-align: center; font-weight: bold; }

    .rack { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; margin-bottom: 15px; border-left: 4px solid #4caf50; }
    .v-meter { display: flex; gap: 4px; height: 8px; margin: 10px 0; }
    .v-seg { flex: 1; background: #222; border-radius: 1px; }
    .v-seg.on { background: #4caf50; box-shadow: 0 0 5px #4caf50; }
    .r-grid-compact { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; }
    .r-item span { font-size: 8px; color: #aaa; font-weight: bold; text-transform: uppercase; }
    .r-item b { font-size: 12px; }

    .eco-main-card { background: linear-gradient(145deg, rgba(76,175,80,0.15), rgba(0,0,0,0.4)); border: 1px solid #4caf5033; border-radius: 20px; padding: 20px; text-align: center; margin-bottom: 20px; }
    .e-value-big { font-size: 58px; font-weight: 900; color: #4caf50; }
    .e-stats-row { display: flex; justify-content: space-around; margin-top: 15px; border-top: 1px solid #333; padding-top: 15px; }
    .eco-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .e-detail { background: rgba(255,255,255,0.03); padding: 15px; border-radius: 15px; text-align: center; border: 1px solid #444; }

    .footer { display: flex; justify-content: space-around; padding-top: 15px; border-top: 1px solid #333; margin-top: auto; }
    .f-btn { cursor: pointer; opacity: 0.5; font-size: 11px; font-weight: bold; text-transform: uppercase; transition: 0.3s; }
    .f-btn.active { opacity: 1; color: #ffc107; border-bottom: 2px solid #ffc107; padding-bottom: 5px; }
    .scroll { overflow-y: auto; max-height: 480px; }
  `;
}

customElements.define("solar-master-card", SolarMasterCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master v3.6 GOALS",
  description: "Dashboard Solaire avec Objectifs du jour."
});
