import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/* =========================================================
   🧠 ÉDITEUR (CONFIG UI)
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

    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true
      })
    );
  }

  /* ---------- Sections ---------- */

  _section(title) {
    return {
      type: "grid",
      schema: [
        {
          type: "markdown",
          content: `## ${title}`
        }
      ]
    };
  }

  render() {
    if (!this.hass || !this._config) return html``;

    const schemas = {
      tab_solar: [
        this._section("🎨 Apparence"),

        { name: "card_height", label: "Hauteur (px)", selector: { number: { min: 400, max: 1200 } } },
        { name: "bg_url", label: "Image de fond", selector: { text: {} } },
        { name: "bg_opacity", label: "Opacité", selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "bg_blur", label: "Flou", selector: { number: { min: 0, max: 20 } } },

        this._section("⚡ Production"),
        { name: "total_now_label", label: "Titre", selector: { text: {} } },
        { name: "total_now", label: "Entité (W)", selector: { entity: {} } },

        this._section("📡 Capteurs D4 → D9"),
        ...[4, 5, 6, 7, 8, 9].flatMap(i => [
          { name: `d${i}_label`, label: `Nom D${i}`, selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité D${i}`, selector: { entity: {} } }
        ]),

        this._section("🔵 Cercles"),
        ...[1, 2, 3, 4].flatMap(i => [
          { name: `p${i}_name`, label: `Nom P${i}`, selector: { text: {} } },
          { name: `p${i}_w`, label: `Watts`, selector: { entity: {} } },
          { name: `p${i}_sub_label`, label: `Sous-label`, selector: { text: {} } },
          { name: `p${i}_sub`, label: `Valeur basse`, selector: { entity: {} } }
        ])
      ],

      tab_batt: [
        this._section("🔋 Batteries"),
        ...[1, 2, 3, 4].flatMap(i => [
          { name: `b${i}_n`, label: `Nom`, selector: { text: {} } },
          { name: `b${i}_s`, label: `SOC %`, selector: { entity: {} } },
          { name: `b${i}_cap_label`, label: `Capacité`, selector: { text: {} } },
          { name: `b${i}_cap`, selector: { entity: {} } },
          { name: `b${i}_temp_label`, label: `Température`, selector: { text: {} } },
          { name: `b${i}_temp`, selector: { entity: {} } },
          { name: `b${i}_v_label`, label: `Voltage`, selector: { text: {} } },
          { name: `b${i}_v`, selector: { entity: {} } },
          { name: `b${i}_a_label`, label: `Ampérage`, selector: { text: {} } },
          { name: `b${i}_a`, selector: { entity: {} } }
        ])
      ],

      tab_eco: [
        this._section("💰 Économie"),
        { name: "eco_money_label", label: "Total", selector: { text: {} } },
        { name: "eco_money", selector: { entity: {} } },

        this._section("📅 Gains"),
        { name: "eco_day_label", label: "Jour", selector: { text: {} } },
        { name: "eco_day_euro", selector: { entity: {} } },
        { name: "eco_year_label", label: "Année", selector: { text: {} } },
        { name: "eco_year_euro", selector: { entity: {} } },

        this._section("⚙️ Paramètres"),
        { name: "kwh_price_label", label: "Prix kWh", selector: { text: {} } },
        { name: "kwh_price", selector: { entity: {} } },
        { name: "main_cons_label", label: "Conso maison", selector: { text: {} } },
        { name: "main_cons_entity", selector: { entity: {} } }
      ]
    };

    return html`
      <div class="tabs">
        <button class=${this._selectedTab === "tab_solar" ? "active" : ""} @click=${() => this._selectedTab = "tab_solar"}>SOLAIRE</button>
        <button class=${this._selectedTab === "tab_batt" ? "active" : ""} @click=${() => this._selectedTab = "tab_batt"}>BATTERIES</button>
        <button class=${this._selectedTab === "tab_eco" ? "active" : ""} @click=${() => this._selectedTab = "tab_eco"}>ÉCONOMIE</button>
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
    .tabs {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    button {
      flex: 1;
      padding: 10px;
      background: #2c2c2c;
      color: white;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-weight: bold;
    }
    button.active {
      background: #ffc107;
      color: black;
    }
  `;
}

customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/* =========================================================
   ⚡ CARTE PRINCIPALE
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
          ? html`<div class="bg" style="background-image:url('${c.bg_url}')"></div>`
          : ""}

        <div class="content">
          ${this._tab === "SOLAIRE"
            ? this._renderSolar()
            : this._tab === "BATTERIE"
            ? this._renderBattery()
            : this._renderEco()}

          <div class="footer">
            ${["SOLAIRE", "BATTERIE", "ECONOMIE"].map(t => html`
              <div class="btn ${this._tab === t ? "active" : ""}" @click=${() => this._tab = t}>
                ${t}
              </div>
            `)}
          </div>
        </div>
      </ha-card>
    `;
  }

  _renderSolar() {
    const c = this.config;
    const prod = this._getVal(c.total_now);

    return html`
      <div class="center">
        <div class="big">${prod.val} W</div>
        <div>${c.total_now_label || "PRODUCTION"}</div>
      </div>
    `;
  }

  _renderBattery() {
    return html`<div>Batteries</div>`;
  }

  _renderEco() {
    return html`<div>Économie</div>`;
  }

  static styles = css`
    ha-card {
      background: black;
      color: white;
      border-radius: 20px;
      overflow: hidden;
    }

    .bg {
      position: absolute;
      width: 100%;
      height: 100%;
      background-size: cover;
      opacity: 0.3;
    }

    .content {
      position: relative;
      padding: 20px;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .center {
      text-align: center;
      margin-top: 40px;
    }

    .big {
      font-size: 60px;
      font-weight: bold;
      color: #ffc107;
    }

    .footer {
      margin-top: auto;
      display: flex;
      justify-content: space-around;
      border-top: 1px solid #333;
      padding-top: 10px;
    }

    .btn {
      opacity: 0.5;
      cursor: pointer;
    }

    .btn.active {
      opacity: 1;
      color: #ffc107;
    }
  `;
}

customElements.define("solar-master-card", SolarMasterCard);

/* =========================================================
   📦 REGISTER
========================================================= */

window.customCards = window.customCards || [];
window.customCards.push({
  type: "solar-master-card",
  name: "Solar Master v4",
  description: "Carte solaire avancée (édition structurée)"
});
