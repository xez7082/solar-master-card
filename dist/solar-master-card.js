import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 EDITEUR DE LA CARTE (Interface FR)
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
        { name: "card_height", label: "Hauteur de la carte (px)", selector: { number: { min: 400, max: 1200 } } },
        { name: "bg_url", label: "URL de l'image de fond", selector: { text: {} } },
        { name: "bg_opacity", label: "Opacité du fond", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "title_left", label: "Titre Groupe Gauche", selector: { text: {} } },
        { name: "title_right", label: "Titre Groupe Droite", selector: { text: {} } },
        { name: "total_now", label: "Entité Production Totale (W)", selector: { entity: {} } },
        ...[4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `Nom Capteur D${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité D${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Entité Watts P${i}`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [...[1, 2, 3, 4].map(i => [
        { name: `b${i}_n`, label: `Nom Batterie ${i}`, selector: { text: {} } },
        { name: `b${i}_s`, label: `Entité SOC % ${i}`, selector: { entity: {} } },
        { name: `b${i}_cap`, label: `Entité Capacité ${i}`, selector: { entity: {} } },
        { name: `b${i}_temp`, label: `Entité Température ${i}`, selector: { entity: {} } },
        { name: `b${i}_out`, label: `Entité Sortie (A ou W) ${i}`, selector: { entity: {} } },
        { name: `b${i}_conn`, label: `Entité État Connexion ${i}`, selector: { entity: {} } }
      ]).flat()],
      tab_eco: [
        { name: "eco_money", label: "Entité Total (€)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Entité Jour (€)", selector: { entity: {} } },
        { name: "eco_year_euro", label: "Entité Année (€)", selector: { entity: {} } },
        { name: "kwh_price", label: "Entité Prix kWh", selector: { entity: {} } },
        { name: "main_cons_entity", label: "Entité Conso Maison (W)", selector: { entity: {} } }
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
    .edit-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
    button { flex: 1; padding: 10px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; }
    button.active { background: #ffc107; color: black; }
    ha-form { --primary-text-color: #ffffff; }
  `;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ CORPS DE LA CARTE (Version 3.4 FR)
 * ==========================================
 */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '-', unit: '' };
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
    const sun = this.hass.states['sun.sun'];
    const elev = sun ? sun.attributes.elevation : 0;
    const pos = ((elev + 20) / 110) * 100;

    return html`
      <div class="page">
        <div class="header-prod">
            <div class="c-label">PRODUCTION ACTUELLE</div>
            <div class="big-val-titan">${prod.val}<small>W</small></div>
        </div>

        <div class="cockpit-container">
            <svg viewBox="0 0 400 100" preserveAspectRatio="none" class="sun-svg-bg"><path d="M0,90 Q200,-20 400,90" fill="none" stroke="rgba(255,193,7,0.3)" stroke-width="2" stroke-dasharray="5"/></svg>
            <div class="sun-dot" style="left: ${Math.max(5, Math.min(95, pos))}%">
                <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
                <span>${elev.toFixed(1)}°</span>
            </div>
            <div class="cockpit">
              <div class="side">${[4, 5, 6].map(i => this._renderDiag(i, 'l'))}</div>
              <div class="center-spacer"></div>
              <div class="side">${[7, 8, 9].map(i => this._renderDiag(i, 'r'))}</div>
            </div>
        </div>

        <div class="panels-row">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`p${i}_w`]) return '';
            const val = this._getVal(c[`p${i}_w`]);
            const colors = ["#ffc107", "#00f9f9", "#4caf50", "#e91e63"];
            return html`
              <div class="hud-item">
                <div class="hud-circle" style="border-color:${colors[i-1]}44">
                  <div class="scan" style="border-top-color:${colors[i-1]}"></div>
                  <div class="v" style="color:${colors[i-1]}">${Math.round(val.val)}</div>
                </div>
                <div class="hud-n">${c[`p${i}_name`] || 'P'+i}</div>
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

  _renderBattery() {
    const c = this.config;
    return html`<div class="page scroll">
      ${[1, 2, 3, 4].map(i => {
        if (!c[`b${i}_s`]) return '';
        const soc = this._getVal(c[`b${i}_s`]);
        const conn = this._getVal(c[`b${i}_conn`]);
        const isOnline = conn.val.toLowerCase() === 'on' || conn.val.toLowerCase() === 'online' || conn.val.toLowerCase() === 'connected';

        return html`
          <div class="rack">
            <div class="r-h">
              <span>${c[`b${i}_n`] || 'BATTERIE '+i}</span> 
              <span class="soc-pct">${soc.val}%</span>
            </div>
            <div class="v-meter">
              ${[...Array(10)].map((_, idx) => html`<div class="v-seg ${parseInt(soc.val) > (idx * 10) ? 'on' : ''}"></div>`)}
            </div>
            <div class="r-grid-compact">
              <div class="r-item"><span>CAPACITÉ</span><br><b>${this._getVal(c[`b${i}_cap`]).val}</b></div>
              <div class="r-item"><span>TEMP.</span><br><b>${this._getVal(c[`b${i}_temp`]).val}°</b></div>
              <div class="r-item"><span>SORTIE</span><br><b>${this._getVal(c[`b${i}_out`]).val}</b></div>
              <div class="r-item">
                <span>CONNEXION</span><br>
                <b style="color:${isOnline ? '#4caf50' : '#f44336'}">${isOnline ? 'OK' : 'OFF'}</b>
              </div>
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
    
    .header-prod { text-align: center; margin-bottom: 5px; }
    .big-val-titan { font-size:70px; font-weight:900; color:#ffc107; line-height:0.8; text-shadow: 0 0 15px rgba(255,193,7,0.3); }
    .big-val-titan small { font-size: 20px; margin-left: 4px; }
    .c-label { font-size: 10px; color: #ffc107; font-weight: bold; letter-spacing: 1px; }

    .cockpit-container { position: relative; height: 160px; }
    .sun-svg-bg { position: absolute; width: 100%; height: 100%; opacity: 0.2; }
    .sun-dot { position: absolute; bottom: 15px; transform: translateX(-50%); color: #ffc107; text-align: center; }
    .sun-dot span { font-size: 11px; font-weight: bold; display: block; }
    
    .cockpit { display: flex; justify-content: space-between; align-items: flex-end; height: 100%; }
    .side { flex: 1.2; }
    .center-spacer { flex: 1; }
    .mini-diag { background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; margin: 4px 0; border-left: 3px solid #00f9f9; }
    .mini-diag.r { border-left: none; border-right: 3px solid #ffc107; text-align: right; }
    .m-l { font-size: 9px; color: #aaa; display: block; text-transform: uppercase; }
    .m-v { font-size: 14px; font-weight: bold; }

    .rack { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; margin-bottom: 15px; border-left: 4px solid #4caf50; }
    .v-meter { display: flex; gap: 4px; height: 10px; margin: 12px 0; }
    .v-seg { flex: 1; background: #222; border-radius: 2px; }
    .v-seg.on { background: #4caf50; box-shadow: 0 0 5px #4caf50; }
    .r-grid-compact { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; text-align: center; }
    .r-item span { font-size: 8px; color: #aaa; font-weight: bold; }
    .r-item b { font-size: 12px; }

    .eco-main-card { background: rgba(76,175,80,0.1); border-radius: 20px; padding: 20px; text-align: center; margin-bottom: 15px; }
    .e-value-big { font-size: 55px; font-weight: 900; color: #4caf50; }
    .eco-details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .e-detail { background: rgba(255,255,255,0.03); padding: 12px; border-radius: 12px; text-align: center; }

    .footer { display: flex; justify-content: space-around; padding-top: 15px; border-top: 1px solid #333; margin-top: auto; }
    .f-btn { cursor: pointer; opacity: 0.5; font-size: 11px; font-weight: bold; text-transform: uppercase; transition: 0.3s; }
    .f-btn.active { opacity: 1; color: #ffc107; border-bottom: 2px solid #ffc107; }
    .scroll { overflow-y: auto; max-height: 450px; }
  `;
}

customElements.define("solar-master-card", SolarMasterCard);
