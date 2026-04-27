import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================================
 * ÉDITEUR DE LA CARTE (VISUAL EDITOR)
 * ==========================================================
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
        { name: "title_left", label: "Titre Colonne Gauche (d4-d6)", selector: { text: {} } },
        { name: "title_right", label: "Titre Colonne Droite (d7-d9)", selector: { text: {} } },
        { name: "total_now", label: "Production Actuelle (W)", selector: { entity: {} } },
        { name: "total_obj_pct", label: "Objectif Production (%)", selector: { entity: {} } },
        ...[1, 2, 3, 4].map(i => [
          { name: `p${i}_name`, label: `Nom Panneau ${i}` },
          { name: `p${i}_w`, label: `Entité Watts P${i}`, selector: { entity: {} } }
        ]).flat(),
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => [
          { name: `d${i}_label`, label: `Diag ${i} Label` },
          { name: `d${i}_entity`, label: `Diag ${i} Entité`, selector: { entity: {} } }
        ]).flat()
      ],
      tab_batt: [...[1, 2, 3, 4].map(i => [
        { name: `b${i}_n`, label: `Nom Batterie ${i}` },
        { name: `b${i}_s`, label: `SOC % ${i}`, selector: { entity: {} } },
        { name: `b${i}_v`, label: `Voltage ${i}`, selector: { entity: {} } }
      ]).flat()],
      tab_eco: [{ name: "eco_money", label: "Total Économisé (€)", selector: { entity: {} } }]
    };

    return html`
      <div class="edit-tabs">
        ${['tab_solar', 'tab_batt', 'tab_eco'].map(t => html`
          <button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>
            ${t.replace('tab_', '').toUpperCase()}
          </button>
        `)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }

  static styles = css`
    .edit-tabs { display: flex; gap: 8px; margin-bottom: 20px; }
    button { flex: 1; padding: 10px; background: #2c2c2c; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 11px; }
    button.active { background: #ffc107; color: black; }
  `;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================================
 * CARTE PRINCIPALE (MAIN CARD)
 * ==========================================================
 */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  _smartGet(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '' };
    const stateObj = this.hass.states[id];
    const raw = stateObj.state;
    const unit = stateObj.attributes.unit_of_measurement || '';
    return { val: raw, unit: unit };
  }

  _renderMiniDiag(i) {
    const c = this.config;
    const d = this._smartGet(c[`d${i}_entity`]);
    if (!c[`d${i}_entity`]) return html`<div class="mini-diag empty"></div>`;
    return html`
      <div class="mini-diag">
        <span class="m-l">${c[`d${i}_label`]}</span>
        <span class="m-v">${d.val}<small>${d.unit}</small></span>
      </div>
    `;
  }

  _renderWideSunTracker() {
    if (!this.hass.states['sun.sun']) return html``;
    const sun = this.hass.states['sun.sun'];
    const elev = sun.attributes.elevation || 0;
    const progress = ((elev + 20) / 110) * 100;
    return html`
      <div class="wide-sun-container">
        <svg viewbox="0 0 400 40" class="wide-sun-svg"><path d="M10,35 Q200,0 390,35" class="wide-sun-path" /></svg>
        <div class="sun-mover" style="left: ${Math.max(5, Math.min(92, progress))}%; bottom: ${Math.max(2, Math.min(35, (elev/90)*30 + 10))}px;">
           <ha-icon icon="mdi:white-balance-sunny"></ha-icon>
           <span class="sun-val">${elev.toFixed(1)}°</span>
        </div>
      </div>
    `;
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    const totalProd = this._smartGet(c.total_now);
    const panels = [
      { n: c.p1_name, e: c.p1_w, c: "#ffc107" },
      { n: c.p2_name, e: c.p2_w, c: "#00f9f9" },
      { n: c.p3_name, e: c.p3_w, c: "#4caf50" },
      { n: c.p4_name, e: c.p4_w, c: "#e91e63" }
    ].filter(p => p.e && this.hass.states[p.e]);

    return html`
      <ha-card style="height:${c.card_height || 650}px;">
        ${c.bg_url ? html`<div class="custom-bg" style="background-image:url('${c.bg_url}');"></div>` : ''}
        <div class="overlay">
          
          <div class="main-content">
            ${this._tab === 'SOLAIRE' ? html`
              <div class="page">
                ${this._renderWideSunTracker()}

                <div class="cockpit-container">
                  <div class="cockpit-side">
                    ${c.title_left ? html`<div class="side-title">${c.title_left}</div>` : ''}
                    <div class="side-items">
                      ${this._renderMiniDiag(4)}
                      ${this._renderMiniDiag(5)}
                      ${this._renderMiniDiag(6)}
                    </div>
                  </div>

                  <div class="total-block">
                    <div class="big-val">${totalProd.val}<small>${totalProd.unit || 'W'}</small></div>
                    <div class="perf-bar"><div class="perf-fill" style="width:${this.hass.states[c.total_obj_pct]?.state || 0}%"></div></div>
                    <div class="perf-label">OBJECTIF : ${this.hass.states[c.total_obj_pct]?.state || 0}%</div>
                  </div>

                  <div class="cockpit-side">
                    ${c.title_right ? html`<div class="side-title right">${c.title_right}</div>` : ''}
                    <div class="side-items">
                      ${this._renderMiniDiag(7)}
                      ${this._renderMiniDiag(8)}
                      ${this._renderMiniDiag(9)}
                    </div>
                  </div>
                </div>

                <div class="panels-row">
                  ${panels.map(p => {
                    const s = this._smartGet(p.e);
                    return html`
                      <div class="hud-item">
                        <div class="hud-circle" style="border-color:${p.c}44">
                          <div class="scan" style="border-top-color:${p.c}"></div>
                          <div class="val-container"><span class="v" style="color:${p.c}">${Math.round(s.val)}</span><span class="unit" style="color:${p.c}">${s.unit || 'W'}</span></div>
                        </div>
                        <div class="hud-n">${p.n}</div>
                      </div>`;
                  })}
                </div>

                <div class="diag-grid">
                  ${[1, 2, 3].map(i => {
                    const d = this._smartGet(c[`d${i}_entity`]);
                    return c[`d${i}_entity`] ? html`<div class="d-box"><span class="d-l">${c[`d${i}_label`]}</span><span class="d-v">${d.val}<small>${d.unit}</small></span></div>` : '';
                  })}
                </div>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <div class="f-btn ${this._tab === 'SOLAIRE' ? 'active' : ''}" @click=${() => this._tab = 'SOLAIRE'}><ha-icon icon="mdi:solar-power"></ha-icon><span>SOLAIRE</span></div>
            <div class="f-btn ${this._tab === 'BATTERIE' ? 'active' : ''}" @click=${() => this._tab = 'BATTERIE'}><ha-icon icon="mdi:battery-high"></ha-icon><span>BATTERIES</span></div>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    ha-card { background: #000; color: #fff; border-radius: 28px; overflow: hidden; position: relative; border: 1px solid #333; }
    .custom-bg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; opacity: 0.4; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 15px; position: relative; z-index: 1; background: radial-gradient(circle at 50% 0%, rgba(26, 42, 58, 0.7) 0%, rgba(0,0,0,0.8) 80%); }
    
    .wide-sun-container { width: 100%; height: 40px; position: relative; margin-bottom: 5px; }
    .wide-sun-path { fill: none; stroke: rgba(255,193,7,0.2); stroke-width: 1.5; stroke-dasharray: 3,3; }
    .sun-mover { position: absolute; display: flex; flex-direction: column; align-items: center; transition: all 1s; }
    .sun-mover ha-icon { --mdc-icon-size: 20px; color: #ffc107; filter: drop-shadow(0 0 5px #ffc107); }
    .sun-val { font-size: 8px; font-weight: bold; }

    /* Cockpit Layout */
    .cockpit-container { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 25px; min-height: 110px; }
    .cockpit-side { flex: 1; display: flex; flex-direction: column; justify-content: center; height: 100%; }
    .side-title { font-size: 9px; font-weight: 900; color: #00f9f9; letter-spacing: 1px; margin-bottom: 8px; border-bottom: 1px solid rgba(0,249,249,0.2); padding-bottom: 2px; text-transform: uppercase; }
    .side-title.right { color: #ffc107; border-bottom-color: rgba(255,193,7,0.2); text-align: right; }
    .side-items { display: flex; flex-direction: column; gap: 6px; }

    .total-block { text-align: center; width: 160px; padding: 0 10px; }
    .big-val { font-size: 48px; font-weight: 900; color: #ffc107; line-height: 0.9; }
    .perf-bar { width: 100%; height: 3px; background: rgba(255,255,255,0.1); border-radius: 3px; margin: 10px 0; overflow: hidden; }
    .perf-fill { height: 100%; background: #ffc107; box-shadow: 0 0 8px #ffc107; }
    .perf-label { font-size: 8px; opacity: 0.5; font-weight: bold; }

    .mini-diag { background: rgba(255,255,255,0.05); padding: 5px 8px; border-radius: 8px; display: flex; flex-direction: column; border: 1px solid rgba(255,255,255,0.1); }
    .m-l { font-size: 7px; opacity: 0.5; text-transform: uppercase; }
    .m-v { font-size: 11px; font-weight: bold; }
    .mini-diag.empty { visibility: hidden; height: 32px; }

    .panels-row { display: flex; justify-content: space-around; margin-bottom: 25px; }
    .hud-circle { width: 80px; height: 80px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); }
    .scan { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 4s linear infinite; top:-2px; left:-2px; padding:2px; box-sizing: content-box; }
    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .v { font-size: 20px; font-weight: 900; }
    .unit { font-size: 10px; }
    .hud-n { font-size: 9px; text-align: center; margin-top: 8px; opacity: 0.8; }
    
    .diag-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
    .d-box { background: rgba(0,0,0,0.4); padding: 10px; border-radius: 12px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
    .d-v { font-size: 13px; font-weight: bold; color: #00f9f9; }
    .d-l { font-size: 8px; opacity: 0.5; display: block; }
    
    .footer { display: flex; justify-content: space-around; padding: 10px 0; border-top: 1px solid #333; margin-top: auto; }
    .f-btn { opacity: 0.4; cursor: pointer; display: flex; flex-direction: column; align-items: center; font-size: 10px; }
    .f-btn.active { opacity: 1; color: #ffc107; }
    small { font-size: 10px; opacity: 0.7; margin-left: 2px; }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
