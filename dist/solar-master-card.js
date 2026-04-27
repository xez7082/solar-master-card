import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/* =========================================================
   🧠 EDITOR
========================================================= */

class SolarMasterCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      _config: {},
      _selectedTab: { type: String }
    };
  }

  constructor() {
    super();
    this._selectedTab = "tab_solar";
  }

  setConfig(config) {
    this._config = config;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) return;

    const config = { ...this._config, ...ev.detail.value };

    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true
    }));
  }

  _section(title) {
    return {
      type: "grid",
      schema: [{ type: "markdown", content: `## ${title}` }]
    };
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const schemas = {
      tab_solar: [
        this._section("🎨 Apparence"),
        { name: "card_height", selector: { number: { min: 400, max: 1200 } } },
        { name: "bg_url", selector: { text: {} } },
        { name: "bg_opacity", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "bg_blur", selector: { number: { min: 0, max: 20 } } },

        this._section("⚡ Production"),
        { name: "total_now_label", selector: { text: {} } },
        { name: "total_now", selector: { entity: {} } },

        this._section("📡 Capteurs"),
        ...[4,5,6,7,8,9].flatMap(i => [
          { name: `d${i}_label`, selector: { text: {} } },
          { name: `d${i}_entity`, selector: { entity: {} } }
        ]),

        this._section("🔵 Cercles"),
        ...[1,2,3,4].flatMap(i => [
          { name: `p${i}_name`, selector: { text: {} } },
          { name: `p${i}_w`, selector: { entity: {} } },
          { name: `p${i}_sub_label`, selector: { text: {} } },
          { name: `p${i}_sub`, selector: { entity: {} } }
        ])
      ],

      tab_batt: [
        this._section("🔋 Batteries"),
        ...[1,2,3,4].flatMap(i => [
          { name: `b${i}_n`, selector: { text: {} } },
          { name: `b${i}_s`, selector: { entity: {} } },
          { name: `b${i}_cap`, selector: { entity: {} } },
          { name: `b${i}_temp`, selector: { entity: {} } },
          { name: `b${i}_v`, selector: { entity: {} } },
          { name: `b${i}_a`, selector: { entity: {} } }
        ])
      ],

      tab_eco: [
        this._section("💰 Économie"),
        { name: "eco_money_label", selector: { text: {} } },
        { name: "eco_money", selector: { entity: {} } },
        { name: "eco_day_label", selector: { text: {} } },
        { name: "eco_day_euro", selector: { entity: {} } },
        { name: "eco_year_label", selector: { text: {} } },
        { name: "eco_year_euro", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="tabs">
        <button @click=${() => this._selectedTab = "tab_solar"}>SOLAIRE</button>
        <button @click=${() => this._selectedTab = "tab_batt"}>BATTERIES</button>
        <button @click=${() => this._selectedTab = "tab_eco"}>ÉCO</button>
      </div>

      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${schemas[this._selectedTab]}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }

  static styles = css`
    .tabs { display:flex; gap:6px; margin-bottom:10px; }
    button { flex:1; padding:8px; background:#333; color:#fff; border:none; border-radius:6px; }
  `;
}

customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/* =========================================================
   ⚡ CARD
========================================================= */

class SolarMasterCard extends LitElement {

  static getConfigElement() {
    return document.createElement("solar-master-card-editor");
  }

  static get properties() {
    return {
      hass: {},
      config: {},
      _tab: { type: String }
    };
  }

  constructor() {
    super();
    this._tab = "SOLAIRE";
  }

  setConfig(config) {
    this.config = config;
  }

  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) {
      return { val: "0", unit: "" };
    }
    const s = this.hass.states[id];
    return {
      val: s.state,
      unit: s.attributes.unit_of_measurement || ""
    };
  }

  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;

    return html`
      <ha-card style="height:${c.card_height || 650}px;">

        ${c.bg_url
          ? html`<div class="bg" style="
            background-image:url('${c.bg_url}');
            opacity:${c.bg_opacity || 0.3};
            filter:blur(${c.bg_blur || 0}px);
          "></div>`
          : ""}

        <div class="content">

          ${this._tab === "SOLAIRE"
            ? this._renderSolar()
            : this._tab === "BATTERIE"
            ? this._renderBattery()
            : this._renderEco()}

          <div class="footer">
            <div @click=${() => this._tab = "SOLAIRE"}>SOLAIRE</div>
            <div @click=${() => this._tab = "BATTERIE"}>BATTERIES</div>
            <div @click=${() => this._tab = "ECONOMIE"}>ÉCO</div>
          </div>

        </div>
      </ha-card>
    `;
  }

  /* ================= SOLAIRE ================= */

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);

    return html`
      <div class="page">

        <div class="center">
          <div class="big">${prod.val}<small>W</small></div>
          <div>${c.total_now_label || "PRODUCTION"}</div>
        </div>

        <div class="grid">
          ${[4,5,6,7,8,9].map(i => {
            if (!c[`d${i}_entity`]) return "";
            const d = this._getVal(c[`d${i}_entity`]);
            return html`
              <div class="card">
                <div>${c[`d${i}_label`] || "D"+i}</div>
                <div>${d.val} ${d.unit}</div>
              </div>
            `;
          })}
        </div>

        <div class="circles">
          ${[1,2,3,4].map(i => {
            if (!c[`p${i}_w`]) return "";
            const s = this._getVal(c[`p${i}_w`]);
            return html`
              <div class="circle">${Math.round(s.val)}</div>
            `;
          })}
        </div>

      </div>
    `;
  }

  /* ================= BATTERY ================= */

  _renderBattery() {
    const c = this.config;

    return html`
      ${[1,2,3,4].map(i => {
        if (!c[`b${i}_s`]) return "";
        const soc = this._getVal(c[`b${i}_s`]);
        return html`
          <div class="battery">
            ${c[`b${i}_n`] || "BAT "+i} : ${soc.val}%
          </div>
        `;
      })}
    `;
  }

  /* ================= ECO ================= */

  _renderEco() {
    const c = this.config;

    return html`
      <div class="eco">
        ${this._getVal(c.eco_money).val} €
      </div>
    `;
  }

  static styles = css`
    ha-card { background:black; color:white; border-radius:20px; }

    .bg {
      position:absolute;
      width:100%;
      height:100%;
      background-size:cover;
    }

    .content {
      position:relative;
      padding:20px;
      height:100%;
      display:flex;
      flex-direction:column;
    }

    .center { text-align:center; }
    .big { font-size:60px; color:#ffc107; }

    .grid {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:10px;
      margin-top:20px;
    }

    .card {
      background:#111;
      padding:10px;
      border-radius:10px;
      text-align:center;
    }

    .circles {
      display:flex;
      justify-content:space-around;
      margin-top:20px;
    }

    .circle {
      width:60px;
      height:60px;
      border-radius:50%;
      background:#ffc107;
      display:flex;
      align-items:center;
      justify-content:center;
      color:black;
      font-weight:bold;
    }

    .footer {
      margin-top:auto;
      display:flex;
      justify-content:space-around;
      border-top:1px solid #333;
      padding-top:10px;
      cursor:pointer;
    }
  `;
}

customElements.define("solar-master-card", SolarMasterCard);

/* REGISTER */
window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master v4",
  description: "Carte solaire complète"
});
