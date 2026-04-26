import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- ÉDITEUR VISUEL AVEC LABELS PERSONNALISÉS ---
class SolarMasterCardEditor extends LitElement {
  static get properties() { return { hass: {}, _config: {}, _selectedTab: { type: String } }; }
  constructor() { super(); this._selectedTab = 'solar_main'; }
  setConfig(config) { this._config = config; }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;
    const config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const schemas = {
      solar_main: [
        { name: "title", label: "Titre de la carte", selector: { text: {} } },
        { name: "total_now", label: "Prod Totale Instantanée (W)", selector: { entity: { domain: "sensor" } } },
        { name: "total_obj", label: "Objectif Prod Jour (kWh)", selector: { entity: { domain: "sensor" } } },
        { name: "total_month", label: "Prod Totale Mois (kWh)", selector: { entity: { domain: "sensor" } } },
        { name: "total_year", label: "Prod Totale Année (kWh)", selector: { entity: { domain: "sensor" } } },
        { name: "background", label: "Image de fond (URL)", selector: { text: {} } }
      ],
      panneaux: [
        { name: "p1_name", label: "Nom Panneau 1", selector: { text: {} } },
        { name: "p1_w", label: "Entité Watts P1", selector: { entity: { domain: "sensor" } } },
        { name: "p1_d", label: "Entité Jour P1", selector: { entity: { domain: "sensor" } } },
        { name: "p2_name", label: "Nom Panneau 2", selector: { text: {} } },
        { name: "p2_w", label: "Entité Watts P2", selector: { entity: { domain: "sensor" } } },
        { name: "p2_d", label: "Entité Jour P2", selector: { entity: { domain: "sensor" } } },
        { name: "p3_name", label: "Nom Panneau 3", selector: { text: {} } },
        { name: "p3_w", label: "Entité Watts P3", selector: { entity: { domain: "sensor" } } },
        { name: "p3_d", label: "Entité Jour P3", selector: { entity: { domain: "sensor" } } }
      ],
      batteries: [
        { name: "b1_n", label: "Nom Batterie 1", selector: { text: {} } },
        { name: "b1_s", label: "Entité SOC % B1", selector: { entity: {} } },
        { name: "b2_n", label: "Nom Batterie 2", selector: { text: {} } },
        { name: "b2_s", label: "Entité SOC % B2", selector: { entity: {} } },
        { name: "b3_n", label: "Nom Batterie 3", selector: { text: {} } },
        { name: "b3_s", label: "Entité SOC % B3", selector: { entity: {} } }
      ],
      economy: [
        { name: "e1_n", label: "Nom Éco 1", selector: { text: {} } },
        { name: "e1_e", label: "Entité Éco 1", selector: { entity: {} } },
        { name: "e2_n", label: "Nom Éco 2", selector: { text: {} } },
        { name: "e2_e", label: "Entité Éco 2", selector: { entity: {} } },
        { name: "e3_n", label: "Nom Éco 3", selector: { text: {} } },
        { name: "e3_e", label: "Entité Éco 3", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="editor-tabs">
        ${Object.keys(schemas).map(t => html`
          <button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => this._selectedTab = t}>
            ${t.toUpperCase()}
          </button>
        `)}
      </div>
      <div class="editor-form">
        <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
      </div>
    `;
  }
  static styles = css`
    .editor-tabs { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 20px; }
    button { background: #333; color: #fff; border: 1px solid #444; padding: 6px 10px; cursor: pointer; font-size: 10px; border-radius: 4px; }
    button.active { background: #ffc107; color: #000; font-weight: bold; }
    .editor-form { background: #222; padding: 15px; border-radius: 8px; }
  `;
}

if (!customElements.get("solar-master-card-editor")) customElements.define("solar-master-card-editor", SolarMasterCardEditor);

// --- CARTE PRINCIPALE ---
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }
  constructor() { super(); this._tab = 'solar'; }
  setConfig(config) { this.config = config; }

  _get(id) { return (this.hass && id && this.hass.states[id]) ? this.hass.states[id].state : '0'; }

  _renderRow(name, sensorW, sensorD) {
    if (!sensorW) return html``;
    const valW = parseInt(this._get(sensorW));
    return html`
      <div class="row">
        <div class="icon-circle ${valW > 5 ? 'active' : ''}"><ha-icon icon="mdi:solar-panel"></ha-icon></div>
        <div class="info">
            <div class="name-text">${name || 'Solaire'}</div>
            <div class="bar-bg"><div class="bar" style="width:${Math.min(valW/12, 100)}%"></div></div>
        </div>
        <div class="badges">
            <div class="badge"><b>${valW}W</b><small>NOW</small></div>
            <div class="badge green"><b>${this._get(sensorD)}</b><small>JOUR</small></div>
        </div>
      </div>`;
  }

  _renderTab() {
    const c = this.config;
    if (this._tab === 'solar') {
      return html`
        <div class="header-stats">
          <div class="stat"><b>${this._get(c.total_now)}W</b><small>ACTUEL</small></div>
          <div class="stat"><b>${this._get(c.total_obj)}</b><small>OBJET.</small></div>
          <div class="stat"><b>${this._get(c.total_month)}</b><small>MOIS</small></div>
          <div class="stat"><b>${this._get(c.total_year)}</b><small>ANNÉE</small></div>
        </div>
        <div class="scroll-area">
          ${[1,2,3,4,5].map(i => this._renderRow(c[`p${i}_name`], c[`p${i}_w`], c[`p${i}_d`]))}
        </div>`;
    }
    if (this._tab === 'bat') {
      return html`<div class="scroll-area">
        ${[1,2,3,4,5].map(i => c[`b${i}_s`] ? html`
          <div class="row">
            <ha-icon icon="mdi:battery-high" style="color:#4caf50"></ha-icon>
            <div class="info">${c[`b${i}_n`] || 'Batterie'} <div class="bar-bg"><div class="bar" style="width:${this._get(c[`b${i}_s`])}%; background:#4caf50"></div></div></div>
            <div class="badge-val"><b>${this._get(c[`b${i}_s`])}%</b></div>
          </div>` : '')}
      </div>`;
    }
    if (this._tab === 'eco') {
        return html`<div class="grid-eco">
            ${[1,2,3,4,5,6,7,8,9,10].map(i => c[`e${i}_e`] ? html`
                <div class="eco-card">
                    <div class="eco-val">${this._get(c[`e${i}_e`])}</div>
                    <div class="eco-name">${c[`e${i}_n`]}</div>
                </div>
            ` : '')}
        </div>`;
    }
  }

  render() {
    return html`
      <ha-card>
        <div class="main" style="background-image:url('${this.config.background}')">
          <div class="overlay">
            <div class="title">${this.config.title || 'SOLAR MASTER'}</div>
            <div class="content">${this._renderTab()}</div>
            <div class="nav">
              <ha-icon class="${this._tab==='solar'?'active':''}" icon="mdi:solar-power" @click=${()=>this._tab='solar'}></ha-icon>
              <ha-icon class="${this._tab==='bat'?'active':''}" icon="mdi:battery-charging" @click=${()=>this._tab='bat'}></ha-icon>
              <ha-icon class="${this._tab==='eco'?'active':''}" icon="mdi:cash-100" @click=${()=>this._tab='eco'}></ha-icon>
            </div>
          </div>
        </div>
      </ha-card>`;
  }

  static styles = css`
    ha-card { border-radius: 25px; overflow: hidden; background: #000; height: 520px; color: #fff; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .main { height: 100%; background-size: cover; background-position: center; }
    .overlay { height: 100%; background: rgba(0,0,0,0.7); backdrop-filter: blur(12px); display: flex; flex-direction: column; padding: 20px; box-sizing: border-box; }
    .title { text-align: center; font-size: 10px; letter-spacing: 4px; opacity: 0.5; margin-bottom: 15px; font-weight: 800; }
    .content { flex: 1; overflow: hidden; }
    .header-stats { display: flex; justify-content: space-around; background: rgba(255,255,255,0.05); padding: 12px; border-radius: 15px; margin-bottom: 20px; border: 1px solid rgba(255,255,255,0.1); }
    .stat { text-align: center; }
    .stat b { display: block; font-size: 13px; color: #ffc107; }
    .stat small { font-size: 8px; opacity: 0.5; font-weight: bold; }
    .scroll-area { overflow-y: auto; height: 100%; padding-right: 8px; }
    .scroll-area::-webkit-scrollbar { width: 4px; }
    .scroll-area::-webkit-scrollbar-thumb { background: rgba(255,193,7,0.2); border-radius: 10px; }
    .row { display: flex; align-items: center; background: rgba(255,255,255,0.05); margin-bottom: 10px; padding: 12px; border-radius: 16px; gap: 12px; border: 1px solid rgba(255,255,255,0.05); }
    .icon-circle { width: 34px; height: 34px; border-radius: 50%; background: rgba(255,193,7,0.1); display: flex; align-items: center; justify-content: center; }
    .icon-circle.active { color: #ffc107; box-shadow: 0 0 15px rgba(255,193,7,0.3); }
    .info { flex: 1; }
    .name-text { font-size: 11px; font-weight: 800; opacity: 0.9; margin-bottom: 4px; }
    .bar-bg { height: 5px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
    .bar { height: 100%; background: #ffc107; border-radius: 3px; transition: width 1s ease-in-out; }
    .badges { display: flex; gap: 6px; }
    .badge { background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 8px; text-align: center; min-width: 45px; border: 1px solid rgba(255,255,255,0.05); }
    .badge b { display: block; font-size: 10px; color: #ffc107; }
    .badge small { font-size: 7px; opacity: 0.5; font-weight: bold; }
    .badge.green b { color: #4caf50; }
    .badge-val b { font-size: 14px; color: #4caf50; }
    .grid-eco { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .eco-card { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.1); }
    .eco-val { font-size: 16px; color: #4caf50; font-weight: 800; }
    .eco-name { font-size: 9px; opacity: 0.5; margin-top: 4px; font-weight: bold; }
    .nav { display: flex; justify-content: space-around; padding: 15px 0; border-top: 1px solid rgba(255,255,255,0.1); }
    .nav ha-icon { opacity: 0.2; cursor: pointer; transition: 0.3s; --mdc-icon-size: 26px; }
    .nav ha-icon.active { opacity: 1; color: #ffc107; filter: drop-shadow(0 0 5px #ffc107); }
  `;
}

if (!customElements.get("solar-master-card")) customElements.define("solar-master-card", SolarMasterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "solar-master-card", name: "Solar Master Ultra Custom", preview: true });
