import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- ÉDITEUR ---
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
    const schema = [
      { name: "card_height", label: "Hauteur Carte", selector: { number: { min: 400, max: 1200, step: 10 } } },
      { name: "total_now", label: "Puissance Totale (W)", selector: { entity: {} } },
      { name: "total_obj_pct", label: "Objectif (%)", selector: { entity: {} } },
      { name: "obj_kwh_now", label: "kWh Actuels", selector: { entity: {} } },
      { name: "obj_kwh_target", label: "Objectif kWh", selector: { entity: {} } },
      { name: "entity_weather", label: "Météo", selector: { entity: { domain: "weather" } } },
      { name: "grid_flow", label: "Flux Réseau (W)", selector: { entity: {} } },
      { name: "eco_money", label: "Économies (€)", selector: { entity: {} } },
      ...[1,2,3,4].map(i => [
        { name: `p${i}_name`, label: `Nom Panneau ${i}`, selector: { text: {} } },
        { name: `p${i}_w`, label: `Watts P${i}`, selector: { entity: {} } }
      ]).flat()
    ];
    return html`<ha-form .hass=${this.hass} .data=${this._config} .schema=${schema} @value-changed=${this._valueChanged}></ha-form>`;
  }
}
if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- CARTE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'solar'; }
  setConfig(config) { this.config = config; }
  
  _get(id) { 
    if (!this.hass || !id || !this.hass.states[id]) return '0';
    return this.hass.states[id].state; 
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    const panels = [{n:c.p1_name,e:c.p1_w,c:"#ffc107"},{n:c.p2_name,e:c.p2_w,c:"#00f9f9"},{n:c.p3_name,e:c.p3_w,c:"#4caf50"},{n:c.p4_name,e:c.p4_w,c:"#e91e63"}].filter(p => p.e && this.hass.states[p.e]);
    const gridVal = parseFloat(this._get(c.grid_flow));
    const pct = this._get(c.total_obj_pct);

    return html`
      <ha-card style="height:${c.card_height || 600}px;">
        <div class="overlay">
            
            <div class="top-nav">
                <div class="t-badge"><ha-icon icon="mdi:weather-sunny"></ha-icon> ${this._get(c.entity_weather)}</div>
                <div class="t-badge ${gridVal > 0 ? 'export' : 'import'}">
                    <ha-icon icon="mdi:transmission-tower"></ha-icon> ${Math.abs(gridVal)} W
                </div>
                <div class="t-badge green">${this._get(c.eco_money)}€</div>
            </div>

            <div class="content">
                ${this._tab === 'solar' ? html`
                    <div class="solar-page">
                        <div class="header-main">
                            <div class="big-val">${this._get(c.total_now)}<small>W</small></div>
                            
                            <div class="pct-display">OBJECTIF : ${pct}%</div>
                            
                            <div class="bar-obj"><div class="fill-obj" style="width:${pct}%"></div></div>
                            <div class="obj-text">${this._get(c.obj_kwh_now)} / ${this._get(c.obj_kwh_target)} kWh</div>
                        </div>

                        <div class="panels-row">
                            ${panels.map(p => html`
                                <div class="hud-item">
                                    <div class="hud-circle" style="border-color:${p.c}33">
                                        <div class="scan-ring" style="border-top-color:${p.c}"></div>
                                        <span class="h-val" style="color:${p.c}">${Math.round(this._get(p.e))}</span>
                                    </div>
                                    <div class="hud-name">${p.n}</div>
                                </div>`)}
                        </div>
                    </div>` 
                : ''}
            </div>

            <div class="nav-footer">
                <div class="n-btn ${this._tab==='solar'?'active':''}" @click=${()=>this._tab='solar'}><ha-icon icon="mdi:solar-power"></ha-icon></div>
                <div class="n-btn ${this._tab==='batt'?'active':''}" @click=${()=>this._tab='batt'}><ha-icon icon="mdi:battery"></ha-icon></div>
                <div class="n-btn ${this._tab==='stats'?'active':''}" @click=${()=>this._tab='stats'}><ha-icon icon="mdi:leaf"></ha-icon></div>
            </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 24px; overflow: hidden; background: #0f0f0f; color: #fff; }
    .overlay { height: 100%; display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
    .top-nav { display: flex; justify-content: space-between; margin-bottom: 20px; }
    .t-badge { background: rgba(255,255,255,0.05); padding: 5px 12px; border-radius: 10px; font-size: 11px; font-weight: bold; }
    .t-badge.green { color: #4caf50; }
    .header-main { text-align: center; margin-bottom: 30px; }
    .big-val { font-size: 56px; font-weight: 900; color: #ffc107; line-height: 1; }
    
    .pct-display { font-size: 14px; font-weight: 800; color: #ffc107; margin-top: 15px; letter-spacing: 1px; }
    .bar-obj { height: 6px; background: rgba(255,255,255,0.1); width: 70%; margin: 8px auto; border-radius: 3px; overflow: hidden; }
    .fill-obj { height: 100%; background: #ffc107; box-shadow: 0 0 10px rgba(255,193,7,0.5); }
    .obj-text { font-size: 11px; opacity: 0.6; }

    .panels-row { display: flex; justify-content: space-around; gap: 10px; }
    .hud-circle { width: 80px; height: 80px; border-radius: 50%; border: 2px solid; position: relative; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.4); }
    .scan-ring { position: absolute; width: 100%; height: 100%; border: 2px solid transparent; border-radius: 50%; animation: rotate 4s linear infinite; top:0; left:0; box-sizing: border-box; }
    .h-val { font-size: 20px; font-weight: 900; }
    .hud-name { font-size: 10px; font-weight: bold; margin-top: 10px; opacity: 0.7; text-align: center; }

    .nav-footer { display: flex; justify-content: space-around; background: rgba(255,255,255,0.05); padding: 15px; border-radius: 20px; margin-top: auto; }
    .n-btn { opacity: 0.3; cursor: pointer; }
    .n-btn.active { opacity: 1; color: #ffc107; }

    @keyframes rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `;
}
if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
