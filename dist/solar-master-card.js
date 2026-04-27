import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- BLOC ÉDITEUR (POUR LES RÉGLAGES) ---
class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {} }; }
  setConfig(config) { this._config = config; }
  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }
  render() {
    if (!this.hass || !this._config) return html``;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${[
          { name: "card_height", label: "Hauteur de la carte (px)", selector: { number: { min: 400, max: 1200 } } },
          { name: "entity_weather", label: "Météo", selector: { entity: { domain: "weather" } } },
          { name: "total_now", label: "Prod. Actuelle (W)", selector: { entity: {} } },
          { name: "total_obj_pct", label: "Objectif (%)", selector: { entity: {} } },
          { name: "grid_flow", label: "Réseau (W)", selector: { entity: {} } },
          { name: "p1_name", label: "Nom Panneau 1" }, { name: "p1_w", label: "Entité P1", selector: { entity: {} } },
          { name: "p2_name", label: "Nom Panneau 2" }, { name: "p2_w", label: "Entité P2", selector: { entity: {} } },
          { name: "p3_name", label: "Nom Panneau 3" }, { name: "p3_w", label: "Entité P3", selector: { entity: {} } },
          { name: "p4_name", label: "Nom Panneau 4" }, { name: "p4_w", label: "Entité P4", selector: { entity: {} } },
          { name: "eco_money", label: "Économies Totales (€)", selector: { entity: {} } }
        ]}
        @value-changed=${this._valueChanged}
      ></ha-form>`;
  }
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- BLOC CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }
  
  _translateWeather(state) {
    const dict = {
      'sunny': 'Ensoleillé', 'clear-night': 'Nuit Claire', 'cloudy': 'Nuageux',
      'fog': 'Brouillard', 'hail': 'Grêle', 'lightning': 'Orages',
      'partlycloudy': 'Éclaircies', 'pouring': 'Averses', 'rainy': 'Pluvieux'
    };
    return dict[state.toLowerCase()] || state;
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    const panels = [
      {n:c.p1_name, e:c.p1_w, c:"#ffc107"}, {n:c.p2_name, e:c.p2_w, c:"#00f9f9"},
      {n:c.p3_name, e:c.p3_w, c:"#4caf50"}, {n:c.p4_name, e:c.p4_w, c:"#e91e63"}
    ].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        <div class="overlay">
          <div class="top-nav">
            <div class="t-badge"><ha-icon icon="mdi:weather-sunny"></ha-icon> ${this._translateWeather(this._get(c.entity_weather))}</div>
            <div class="t-badge"><ha-icon icon="mdi:transmission-tower"></ha-icon> ${this._get(c.grid_flow)} W</div>
            <div class="t-badge green">${this._get(c.eco_money)}€</div>
          </div>

          <div class="main-content">
            ${this._tab === 'SOLAIRE' ? html`
              <div class="page">
                <div class="header-main">
                  <div class="big-val">${this._get(c.total_now)}<small>W</small></div>
                  <div class="obj-container">
                    <div class="bar-wrap"><div class="bar-f" style="width:${this._get(c.total_obj_pct)}%"></div></div>
                    <div class="obj-text">OBJECTIF : ${this._get(c.total_obj_pct)}%</div>
                  </div>
                </div>

                <div class="panels-row">
                  ${panels.map(p => html`
                    <div class="hud-item">
                      <div class="hud-circle" style="border-color:${p.c}44">
                        <div class="scan" style="border-top-color:${p.c}"></div>
                        <div class="val-container">
                          <span class="v" style="color:${p.c}">${Math.round(this._get(p.e))}</span>
                          <span class="unit" style="color:${p.c}">W</span>
                        </div>
                      </div>
                      <div class="hud-n">${p.n}</div>
                    </div>`)}
                </div>
              </div>` : ''}
          </div>

          <div class="footer">
            <div class="f-btn ${this._tab==='SOLAIRE'?'active':''}" @click=${()=>this._tab='SOLAIRE'}><ha-icon icon="mdi:solar-power"></ha-icon><span>SOLAIRE</span></div>
            <div class="f-btn ${this._tab==='BATTERIE'?'active':''}" @click=${()=>this._tab='BATTERIE'}><ha-icon icon="mdi:battery-high"></ha-icon><span>BATTERIES</span></div>
            <div class="f-btn ${this._tab==='ECONOMIE'?'active':''}" @click=${()=>this._tab='ECONOMIE'}><ha-icon icon="mdi:finance"></ha-icon><span>ÉCONOMIE</span></div>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 28px; overflow: hidden; position: relative; border: 1px solid #333; }
    
    /* IMAGE DE FOND (BLUEPRINT/GRID) */
    .overlay { 
      height: 100%; 
      display: flex; 
      flex-direction: column; 
      padding: 15px;
      background: 
        radial-gradient(circle at 50% 0%, rgba(26, 42, 58, 0.8) 0%, #000 70%),
        linear-gradient(rgba(0, 249, 249, 0.05) 1px, transparent 1px),
        linear-gradient(90s, rgba(0, 249, 249, 0.05) 1px, transparent 1px);
      background-size: 100% 100%, 30px 30px, 30px 30px;
    }

    .top-nav { display: flex; gap: 8px; margin-bottom: 20px; }
    .t-badge { background: rgba(255,255,255,0.05); padding: 8px 12px; border-radius: 12px; font-size: 11px; font-weight: 800; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(4px); }
    .green { color: #4caf50; margin-left: auto; }
    .header-main { text-align: center; margin-bottom: 30px; }
    .big-val { font-size: 60px; font-weight: 900; color: #ffc107; text-shadow: 0 0 20px rgba(255,193,7,0.4); }
    .obj-text { font-size: 12px; color: #ffc107; font-weight: bold; margin-top: 8px; }
    .bar-wrap { height: 6px; background: rgba(255,255,255,0.1); width: 200px; margin: 10px auto; border-radius: 10px; }
    .bar-f { height: 100%; background: #ffc107; box-shadow: 0 0 10px #ffc107; border-radius: 10px; }
    .panels-row { display: flex; justify-content: space-around; flex-wrap: wrap; gap: 15px; }
    .hud-circle { width: 90px; height: 90px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); }
    .val-container { display: flex; flex-direction: column; align-items: center; z-index: 2; }
    .v { font-size: 24px; font-weight: 900; }
    .unit { font-size: 10px; font-weight: bold; margin-top: -4px; }
    .scan { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 4s linear infinite; top:-2px; left:-2px; padding:2px; box-sizing: content-box; }
    .footer { display: flex; justify-content: space-around; padding: 15px 0; border-top: 1px solid #222; margin-top: auto; }
    .f-btn { opacity: 0.4; cursor: pointer; text-align: center; font-size: 10px; font-weight: bold; transition: 0.3s; }
    .f-btn.active { opacity: 1; color: #ffc107; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
}

customElements.define("solar-master-card", SolarMasterCard);

// Ajout à la liste Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master Card V60",
  preview: true,
  description: "Dashboard Solaire avec Image de Fond et Unités Fixes"
});
