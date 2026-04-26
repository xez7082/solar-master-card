import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- ÉDITEUR CONFIGURATION ---
class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _selectedTab: { type: String } }; }
  constructor() { super(); this._selectedTab = 'solar'; }
  setConfig(config) { this._config = config; }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const schemas = {
      solar: [
        { name: "total_now", label: "Prod Totale Instantanée (W)", selector: { entity: { domain: "sensor" } } },
        { name: "total_obj", label: "Objectif Prod Jour (kWh)", selector: { entity: { domain: "sensor" } } },
        { name: "total_month", label: "Prod Totale Mois (kWh)", selector: { entity: { domain: "sensor" } } },
        { name: "total_year", label: "Prod Totale Année (kWh)", selector: { entity: { domain: "sensor" } } }
      ],
      batteries: [
        { name: "bat_count", label: "Nombre de batteries (1-5)", selector: { number: { min: 1, max: 5, mode: "box" } } },
        { name: "bat1_soc", label: "Batterie 1 SOC (%)", selector: { entity: {} } },
        { name: "bat1_pwr", label: "Batterie 1 Watts", selector: { entity: {} } }
      ],
      eco: [
        { name: "eco_label", label: "Titre Section Économies", selector: { text: {} } },
        { name: "eco1", label: "Sensor Éco 1", selector: { entity: {} } },
        { name: "eco2", label: "Sensor Éco 2", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="editor-tabs">
        ${Object.keys(schemas).map(t => html`<button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>${t.toUpperCase()}</button>`)}
      </div>
      <p style="font-size: 10px; color: #aaa;">Note: Configurez les entités Beem et additionnelles via le YAML pour plus de 5 entités.</p>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }
  static styles = css`.editor-tabs { display: flex; gap: 5px; margin-bottom: 10px; } button { background: #444; color: #fff; border: none; padding: 5px; cursor: pointer; font-size: 10px; border-radius: 4px; } button.active { background: #ffc107; color: #000; }`;
}

if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'solar'; }
  setConfig(config) { this.config = config; }

  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }
  _attr(id, attr) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].attributes[attr] : ''; }

  // Template pour une ligne de panneau (Type Beem)
  _renderPanelRow(name, sensorW, sensorD, sensorM) {
    const valW = parseInt(this._get(sensorW));
    const pct = Math.min((valW / 1200) * 100, 100);
    return html`
      <div class="beem-row">
        <div class="beem-shape ${valW > 5 ? 'active' : ''}"><ha-icon icon="mdi:solar-panel"></ha-icon></div>
        <div class="beem-info">
            <div class="beem-name">${name}</div>
            <div class="beem-progress"><div class="beem-bar" style="width: ${pct}%"></div></div>
        </div>
        <div class="beem-badges">
            <div class="b-badge">DAY<span>${this._get(sensorD)}</span></div>
            <div class="b-badge">NOW<span>${valW}W</span></div>
        </div>
      </div>`;
  }

  _renderTab() {
    const c = this.config;
    
    // --- ONGLET SOLAIRE ---
    if (this._tab === 'solar') {
        return html`
          <div class="tab-content scroll">
            <div class="solar-grid-header">
                <div class="stat-box"><span>ACTUEL</span><br><b>${this._get(c.total_now)} W</b></div>
                <div class="stat-box"><span>OBJ.</span><br><b>${this._get(c.total_obj)}</b></div>
                <div class="stat-box"><span>MOIS</span><br><b>${this._get(c.total_month)}</b></div>
                <div class="stat-box"><span>AN</span><br><b>${this._get(c.total_year)}</b></div>
            </div>
            ${this._renderPanelRow("Beem Maison", c.beem_m_w, c.beem_m_d, c.beem_m_m)}
            ${this._renderPanelRow("Beem Spa", c.beem_s_w, c.beem_s_d, c.beem_s_m)}
            ${this._renderPanelRow("Beem IBC", c.beem_i_w, c.beem_i_d, c.beem_i_m)}
            ${c.extra_panels ? c.extra_panels.map(p => this._renderPanelRow(p.name, p.w, p.d, p.m)) : ''}
          </div>`;
    }

    // --- ONGLET BATTERIES ---
    if (this._tab === 'bat') {
        const bats = [];
        for(let i=1; i <= (c.bat_count || 1); i++) {
            bats.push({soc: c[`bat${i}_soc`], pwr: c[`bat${i}_pwr`]});
        }
        return html`
          <div class="tab-content scroll">
            ${bats.map((b, i) => html`
                <div class="bat-row">
                    <ha-icon icon="mdi:battery-high"></ha-icon>
                    <div class="bat-label">Pack ${i+1}</div>
                    <div class="bat-bar-bg"><div class="bat-bar" style="width:${this._get(b.soc)}%"></div></div>
                    <div class="bat-val">${this._get(b.soc)}% <small>(${this._get(b.pwr)}W)</small></div>
                </div>
            `)}
          </div>`;
    }

    // --- ONGLET ÉCONOMIES ---
    if (this._tab === 'eco') {
        return html`
          <div class="tab-content grid-2 scroll">
            ${c.eco_sensors ? c.eco_sensors.map(s => html`
                <div class="eco-card">
                    <div class="eco-val">${this._get(s.entity)}<small>${this._attr(s.entity, 'unit_of_measurement')}</small></div>
                    <div class="eco-name">${s.name}</div>
                </div>
            `) : html`<p>Configurez "eco_sensors" en YAML</p>`}
          </div>`;
    }

    // --- ONGLET OBJECTIFS ---
    if (this._tab === 'obj') {
        return html`
          <div class="tab-content scroll">
             ${c.obj_sensors ? c.obj_sensors.map(s => html`
                <div class="obj-row">
                    <span>${s.name}</span>
                    <div class="obj-val">${this._get(s.entity)} / ${s.target}</div>
                </div>
             `) : ''}
          </div>`;
    }
  }

  render() {
    const c = this.config;
    return html`
      <ha-card style="height: ${c.card_height || '500px'}">
        <div class="bg" style="background-image: url('${c.background}');">
          <div class="glass-overlay">
            <div class="content">${this._renderTab()}</div>
            <div class="navbar">
                <ha-icon class="${this._tab==='solar'?'active':''}" icon="mdi:solar-power" @click=${()=>this._tab='solar'}></ha-icon>
                <ha-icon class="${this._tab==='bat'?'active':''}" icon="mdi:battery-charging-100" @click=${()=>this._tab='bat'}></ha-icon>
                <ha-icon class="${this._tab==='eco'?'active':''}" icon="mdi:cash-multiple" @click=${()=>this._tab='eco'}></ha-icon>
                <ha-icon class="${this._tab==='obj'?'active':''}" icon="mdi:target" @click=${()=>this._tab='obj'}></ha-icon>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  static styles = css`
    :host { --accent: #ffc107; }
    ha-card { border-radius: 20px; overflow: hidden; background: #000; color: #fff; }
    .bg { height: 100%; background-size: cover; background-position: center; }
    .glass-overlay { height: 100%; background: rgba(0,0,0,0.75); backdrop-filter: blur(15px); display: flex; flex-direction: column; padding: 15px; box-sizing: border-box; }
    .content { flex: 1; overflow: hidden; }
    .scroll { overflow-y: auto; height: 100%; padding-right: 5px; }
    .scroll::-webkit-scrollbar { width: 3px; }
    .scroll::-webkit-scrollbar-thumb { background: rgba(255,193,7,0.3); border-radius: 10px; }

    /* SOLAR TAB */
    .solar-grid-header { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-bottom: 15px; text-align: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 10px; }
    .stat-box span { font-size: 8px; opacity: 0.5; }
    .stat-box b { font-size: 11px; color: var(--accent); }
    
    .beem-row { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 10px; display: flex; align-items: center; margin-bottom: 8px; border: 1px solid rgba(255,255,255,0.05); }
    .beem-shape { width: 35px; height: 35px; border-radius: 50%; background: rgba(255,193,7,0.1); display: flex; align-items: center; justify-content: center; margin-right: 10px; }
    .beem-shape.active { box-shadow: 0 0 10px rgba(255,193,7,0.4); animation: pulse 2s infinite; }
    .beem-info { flex: 1; }
    .beem-name { font-size: 11px; font-weight: bold; }
    .beem-progress { height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 5px; }
    .beem-bar { height: 100%; background: var(--accent); border-radius: 2px; }
    .beem-badges { display: flex; gap: 5px; }
    .b-badge { background: rgba(255,255,255,0.05); padding: 3px 8px; border-radius: 6px; font-size: 7px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
    .b-badge span { display: block; font-size: 9px; color: var(--accent); font-weight: bold; }

    /* BATTERY TAB */
    .bat-row { display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.03); padding: 12px; border-radius: 10px; margin-bottom: 5px; }
    .bat-bar-bg { flex: 1; height: 8px; background: #222; border-radius: 4px; overflow: hidden; }
    .bat-bar { height: 100%; background: linear-gradient(90deg, #f44336, #4caf50); }
    .bat-val { font-size: 10px; width: 70px; text-align: right; }

    /* ECO TAB */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .eco-card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.05); }
    .eco-val { font-size: 16px; color: #4caf50; font-weight: bold; }
    .eco-name { font-size: 9px; opacity: 0.5; margin-top: 5px; }

    /* NAV */
    .navbar { display: flex; justify-content: space-around; padding: 15px 0; border-top: 1px solid rgba(255,255,255,0.1); }
    .navbar ha-icon { cursor: pointer; opacity: 0.3; transition: 0.3s; }
    .navbar ha-icon.active { opacity: 1; color: var(--accent); }

    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
  `;
}

if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
