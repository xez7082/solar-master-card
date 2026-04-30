import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 ÉDITEUR DE CONFIGURATION
 * ==========================================
 */
class SolarMasterCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {}, _selectedTab: { type: String } };
  }
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
        { name: "bg_url",         label: "Image de fond (URL)",         selector: { text: {} } },
        { name: "bg_opacity",     label: "Opacité (0.1 à 1)",           selector: { number: { min: 0.1, max: 1, step: 0.1 } } },
        { name: "conso_entity",   label: "Import/Export Réseau (W)",    selector: { entity: {} } },
        { name: "total_now",      label: "Production Totale (W)",        selector: { entity: {} } },
        { name: "solar_target",   label: "Objectif Jour (kWh)",          selector: { entity: {} } },
        { name: "solar_pct_sensor", label: "Capteur % (Optionnel)",     selector: { entity: {} } },
        { name: "card_height",    label: "Hauteur (px)",                 selector: { number: { min: 400, max: 1000 } } },
        ...[1, 2, 3, 4].flatMap(i => [
          { name: `p${i}_name`, label: `Nom Panneau ${i}`,   selector: { text: {} } },
          { name: `p${i}_w`,   label: `Watts Panneau ${i}`, selector: { entity: {} } }
        ]),
        ...[4, 5, 6, 7, 8, 9].flatMap(i => [
          { name: `d${i}_label`,  label: `Label Info ${i}`,  selector: { text: {} } },
          { name: `d${i}_entity`, label: `Entité Info ${i}`, selector: { entity: {} } }
        ])
      ],
      tab_weather: [
        { name: "weather_entity", label: "Météo Principale",  selector: { entity: { domain: "weather" } } },
        { name: "moon_entity",    label: "Phase de Lune",     selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap(i => [
          { name: `w${i}_l`, label: `Label ${i}`,        selector: { text: {} } },
          { name: `w${i}_e`, label: `Entité ${i}`,       selector: { entity: {} } },
          { name: `w${i}_i`, label: `Icône (mdi:...) ${i}`, selector: { text: {} } }
        ])
      ],
      tab_batt: [
        ...[1, 2, 3, 4].flatMap(i => [
          { name: `b${i}_n`,   label: `Nom Bat ${i}`,       selector: { text: {} } },
          { name: `b${i}_s`,   label: `SOC % ${i}`,         selector: { entity: {} } },
          { name: `b${i}_out`, label: `Puissance W ${i}`,   selector: { entity: {} } },
          { name: `b${i}_t`,   label: `Température ${i}`,   selector: { entity: {} } }
        ])
      ],
      tab_eco: [
        { name: "eco_money",    label: "Total Économies (€)", selector: { entity: {} } },
        { name: "eco_day_euro", label: "Gain Jour (€)",       selector: { entity: {} } },
        { name: "main_cons",    label: "Conso Maison (W)",    selector: { entity: {} } },
        ...[1, 2, 3, 4, 5, 6].flatMap(i => [
          { name: `e${i}_l`, label: `Label ${i}`,  selector: { text: {} } },
          { name: `e${i}_e`, label: `Entité ${i}`, selector: { entity: {} } }
        ])
      ]
    };

    const tabLabels = { tab_solar: '☀️ Solar', tab_weather: '🌤 Météo', tab_batt: '🔋 Batt', tab_eco: '💰 Éco' };

    return html`
      <div class="edit-tabs">
        ${Object.keys(tabLabels).map(t => html`
          <button class="${this._selectedTab === t ? 'active' : ''}" @click=${() => { this._selectedTab = t; this.requestUpdate(); }}>
            ${tabLabels[t]}
          </button>
        `)}
      </div>
      <ha-form .hass=${this.hass} .data=${this._config} .schema=${schemas[this._selectedTab]} @value-changed=${this._valueChanged}></ha-form>
    `;
  }

  static styles = css`
    .edit-tabs { display: flex; gap: 6px; margin-bottom: 16px; }
    button { flex: 1; padding: 9px 4px; font-size: 11px; cursor: pointer; background: #111; color: #666; border: 1px solid #333; border-radius: 8px; transition: all .2s; }
    button.active { background: linear-gradient(135deg, #ffc107, #ff8f00); color: #000; font-weight: bold; border-color: transparent; }
  `;
}
customElements.define("solar-master-card-editor", SolarMasterCardEditor);

/**
 * ==========================================
 * ⚡ SOLAR MASTER CARD — V9 ENHANCED
 * ==========================================
 */
class SolarMasterCard extends LitElement {
  static getConfigElement() { return document.createElement("solar-master-card-editor"); }
  static get properties() { return { hass: {}, config: {}, _tab: { type: String } }; }

  constructor() { super(); this._tab = 'SOLAIRE'; }
  setConfig(config) { this.config = config; }

  /* ── Helpers ─────────────────────────────────── */
  _getVal(id) {
    if (!this.hass || !id || !this.hass.states[id]) return { val: '0', unit: '', attr: {} };
    const s = this.hass.states[id];
    return { val: s.state, unit: s.attributes.unit_of_measurement || '', attr: s.attributes };
  }

  /** Parse ISO datetime string → "HH:MM" safely */
  _fmtTime(iso) {
    if (!iso) return '--:--';
    try { return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false }); }
    catch { return '--:--'; }
  }

  /* ── Root render ─────────────────────────────── */
  render() {
    if (!this.config || !this.hass) return html``;
    const c = this.config;
    const h = c.card_height || 570;
    return html`
      <ha-card style="height:${h}px;">
        <div class="main-container">
          ${c.bg_url ? html`<div class="bg-img" style="background-image:url('${c.bg_url}');opacity:${c.bg_opacity ?? 0.25};"></div>` : ''}
          <div class="content-area">
            ${this._tab === 'SOLAIRE'  ? this._renderSolar()   : ''}
            ${this._tab === 'METEO'    ? this._renderWeather() : ''}
            ${this._tab === 'BATTERIE' ? this._renderBattery() : ''}
            ${this._tab === 'ECONOMIE' ? this._renderEco()     : ''}
          </div>
          <nav class="bottom-nav">
            ${[
              { key: 'SOLAIRE',  icon: 'mdi:solar-power',    label: 'SOLAR' },
              { key: 'METEO',    icon: 'mdi:weather-cloudy', label: 'MÉTÉO' },
              { key: 'BATTERIE', icon: 'mdi:battery-high',   label: 'BATT'  },
              { key: 'ECONOMIE', icon: 'mdi:cash-multiple',  label: 'ÉCO'   }
            ].map(n => html`
              <div class="nav-item ${this._tab === n.key ? 'active' : ''}" @click=${() => this._tab = n.key}>
                <ha-icon icon="${n.icon}"></ha-icon>
                <span>${n.label}</span>
              </div>
            `)}
          </nav>
        </div>
      </ha-card>`;
  }

  /* ── Tab: SOLAIRE ────────────────────────────── */
  _renderSolar() {
    const c = this.config;
    const prod     = this._getVal(c.total_now);
    const target   = this._getVal(c.solar_target);
    const consoVal = parseFloat(this._getVal(c.conso_entity).val) || 0;

    const targetKwh = parseFloat(target.val) || 0;
    const prodW     = parseFloat(prod.val)   || 0;
    const progress  = c.solar_pct_sensor
      ? Math.min(100, parseFloat(this._getVal(c.solar_pct_sensor).val) || 0)
      : (targetKwh > 0 ? Math.min(100, (prodW / (targetKwh * 1000)) * 100) : 0);

    const isImport = consoVal > 0;
    const monthName = new Date().toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();

    return html`
      <div class="page page-solar">

        <!-- ── TOP ROW ── -->
        <div class="top-row">
          <div class="net-box ${isImport ? 'import' : 'export'}">
            <ha-icon icon="${isImport ? 'mdi:transmission-tower' : 'mdi:transmission-tower-export'}"></ha-icon>
            <span>${Math.abs(consoVal).toFixed(0)} W</span>
            <small>${isImport ? 'IMPORT' : 'EXPORT'}</small>
          </div>

          <div class="center-prod">
            <div class="month-label">${monthName}</div>
            <div class="big-w">${prodW.toFixed(0)}<small> W</small></div>
            <div class="target-info">OBJ ${targetKwh} kWh · <b>${Math.round(progress)}%</b></div>
          </div>

          <div class="net-box transparent">
            <ha-icon icon="mdi:sun-compass" style="color:#ffc107;"></ha-icon>
            <span style="font-size:10px;color:#888;">PROD</span>
          </div>
        </div>

        <!-- ── PROGRESS BAR ── -->
        <div class="progress-bar">
          ${Array(20).fill(0).map((_, i) => html`
            <div class="seg ${i < Math.floor(progress / 5) ? 'on' : i === Math.floor(progress / 5) && (progress % 5 > 0) ? 'half' : ''}"></div>
          `)}
        </div>

        <!-- ── PANNEAUX ── -->
        <div class="neon-grid">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`p${i}_w`]) return '';
            const w = parseFloat(this._getVal(c[`p${i}_w`]).val) || 0;
            const maxW = 500;
            const pct = Math.min(100, (w / maxW) * 100);
            return html`
              <div class="neon-item">
                <div class="neon-ring color-${i}" style="--pct:${pct}">
                  <svg class="ring-svg" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="4"/>
                    <circle cx="30" cy="30" r="26" fill="none" stroke-width="4"
                      class="ring-arc arc-${i}"
                      stroke-dasharray="${2 * Math.PI * 26 * pct / 100} ${2 * Math.PI * 26}"
                      stroke-dashoffset="${2 * Math.PI * 26 * 0.25}"
                      stroke-linecap="round"/>
                  </svg>
                  <div class="ring-inner">
                    <span class="nv">${Math.round(w)}</span>
                    <span class="nu">W</span>
                  </div>
                </div>
                <div class="nlabel">${c[`p${i}_name`] || 'P' + i}</div>
              </div>`;
          })}
        </div>

        <!-- ── INFO CARDS ── -->
        <div class="info-grid">
          ${[4, 5, 6, 7, 8, 9].map(i => {
            if (!c[`d${i}_entity`]) return '';
            const d = this._getVal(c[`d${i}_entity`]);
            return html`
              <div class="info-card">
                <span class="ic-label">${c[`d${i}_label`] || '—'}</span>
                <b class="ic-val">${d.val}<small>${d.unit}</small></b>
              </div>`;
          })}
        </div>
      </div>`;
  }

  /* ── Tab: MÉTÉO ──────────────────────────────── */
  _renderWeather() {
    const c   = this.config;
    const sun = this.hass.states['sun.sun'];
    if (!sun) return html`<div class="err">☀️ Entité <code>sun.sun</code> introuvable.</div>`;

    const elevation = sun.attributes.elevation ?? 0;
    const azimuth   = sun.attributes.azimuth   ?? 180;

    /* Map azimuth 0-360 → x 15-185 in SVG viewBox 0 0 200 55 */
    const sunX = 15 + ((azimuth % 360) / 360) * 170;
    /* Map elevation: 0° → y=45, 90° → y=8 (clamped) */
    const sunY = Math.max(5, 45 - Math.max(0, elevation) * 0.42);
    const isAboveHorizon = elevation > 0;

    const moonState = this.hass.states[c.moon_entity]?.state;
    const moonMap = {
      new_moon: '🌑 Nouvelle lune',      waxing_crescent: '🌒 Croissant croissant',
      first_quarter: '🌓 Premier quartier', waxing_gibbous: '🌔 Gibbeuse croissante',
      full_moon: '🌕 Pleine lune',       waning_gibbous: '🌖 Gibbeuse décroissante',
      last_quarter: '🌗 Dernier quartier',  waning_crescent: '🌘 Dernier croissant'
    };

    return html`
      <div class="page page-weather">

        <!-- Sun arc -->
        <div class="sun-arc-box">
          <svg viewBox="0 0 200 32" class="sun-svg">
            <!-- Horizon -->
            <line x1="8" y1="28" x2="192" y2="28" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
            <!-- Dashed reference arc -->
            <path d="M 12,28 A 94,22 0 0 1 188,28" fill="none"
              stroke="rgba(255,193,7,0.12)" stroke-width="1.5" stroke-dasharray="4,3"/>
            <!-- Sun dot — remapped to smaller viewBox -->
            ${isAboveHorizon ? html`
              <circle cx="${12 + ((azimuth % 360) / 360) * 176}" cy="${Math.max(3, 28 - Math.max(0, elevation) * 0.26)}" r="4" fill="#ffc107" style="filter:drop-shadow(0 0 4px #ffc107)">
                <animate attributeName="r" values="3.5;5;3.5" dur="3s" repeatCount="indefinite"/>
              </circle>
              <circle cx="${12 + ((azimuth % 360) / 360) * 176}" cy="${Math.max(3, 28 - Math.max(0, elevation) * 0.26)}" r="8" fill="rgba(255,193,7,0.12)"/>
            ` : html`
              <circle cx="${12 + ((azimuth % 360) / 360) * 176}" cy="${Math.max(3, 28 - Math.max(0, elevation) * 0.26)}" r="4" fill="#444"/>
            `}
          </svg>
          <div class="sun-times">
            <span>🌅 ${this._fmtTime(sun.attributes.next_rising)}</span>
            <span style="color:#ffc107;font-weight:bold;">${elevation.toFixed(1)}°</span>
            <span>🌇 ${this._fmtTime(sun.attributes.next_setting)}</span>
          </div>
        </div>

        <!-- Moon -->
        <div class="moon-row">
          <span class="moon-icon">🌙</span>
          <span class="moon-text">${moonMap[moonState] || moonState || 'Phase inconnue'}</span>
        </div>

        <!-- Weather entities grid -->
        <div class="w-grid">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
            const eId = c[`w${i}_e`];
            if (!eId || !this.hass.states[eId]) return '';
            const s = this.hass.states[eId];
            return html`
              <div class="w-card">
                <ha-icon icon="${c[`w${i}_i`] || 'mdi:information-outline'}" class="w-icon"></ha-icon>
                <span class="w-label">${c[`w${i}_l`] || ''}</span>
                <span class="w-val">${s.state}<small>${s.attributes.unit_of_measurement || ''}</small></span>
              </div>`;
          })}
        </div>
      </div>`;
  }

  /* ── Tab: BATTERIE ───────────────────────────── */
  _renderBattery() {
    const c = this.config;
    return html`
      <div class="page page-batt">
        <div class="rack-list">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`b${i}_s`]) return '';
            const soc   = parseFloat(this._getVal(c[`b${i}_s`]).val)   || 0;
            const power = parseFloat(this._getVal(c[`b${i}_out`]).val) || 0;
            const temp  = this._getVal(c[`b${i}_t`]).val;
            const color = soc < 20 ? 'var(--clr-red)' : soc < 50 ? 'var(--clr-amber)' : 'var(--clr-cyan)';
            const isCharging = power < 0;
            const segments = 18;

            return html`
              <div class="rack-unit">
                <div class="rack-head">
                  <span class="rack-name">${c[`b${i}_n`] || 'BAT ' + i}</span>
                  <div class="rack-badges">
                    ${temp !== '0' ? html`<span class="badge"><ha-icon icon="mdi:thermometer"></ha-icon>${temp}°C</span>` : ''}
                    <span class="badge ${isCharging ? 'charge' : 'discharge'}">
                      <ha-icon icon="${isCharging ? 'mdi:flash' : 'mdi:flash-outline'}"></ha-icon>
                      ${Math.abs(power)} W
                    </span>
                  </div>
                </div>
                <div class="seg-bar">
                  ${Array(segments).fill(0).map((_, idx) => html`
                    <div class="seg-slot ${idx < Math.round(soc / (100 / segments)) ? 'on' : ''}"
                         style="--clr:${color}"></div>
                  `)}
                </div>
                <div class="soc-row">
                  <div class="soc-pct" style="color:${color}">${soc.toFixed(1)}<small>%</small></div>
                  <div class="soc-bar-wrap">
                    <div class="soc-bar-fill" style="width:${soc}%;background:${color};box-shadow:0 0 8px ${color};"></div>
                  </div>
                </div>
              </div>`;
          })}
        </div>
      </div>`;
  }

  /* ── Tab: ÉCONOMIE ───────────────────────────── */
  _renderEco() {
    const c       = this.config;
    const savings = this._getVal(c.eco_money);
    const dayEuro = this._getVal(c.eco_day_euro);
    const conso   = this._getVal(c.main_cons);

    return html`
      <div class="page page-eco">
        <div class="eco-hero">
          <div class="eco-label">ÉCONOMIES TOTALES</div>
          <div class="eco-amount">${parseFloat(savings.val).toFixed(2)}<span>€</span></div>
          <div class="eco-shine"></div>
        </div>

        <div class="eco-grid">
          <div class="e-card highlight">
            <ha-icon icon="mdi:calendar-today" class="e-icon"></ha-icon>
            <span>GAIN JOUR</span>
            <b>${parseFloat(dayEuro.val).toFixed(2)} €</b>
          </div>
          <div class="e-card highlight">
            <ha-icon icon="mdi:home-lightning-bolt" class="e-icon"></ha-icon>
            <span>CONSO MAISON</span>
            <b>${parseFloat(conso.val).toFixed(0)} W</b>
          </div>

          ${[1, 2, 3, 4, 5, 6].map(i => {
            if (!c[`e${i}_e`]) return '';
            const e = this._getVal(c[`e${i}_e`]);
            return html`
              <div class="e-card">
                <span>${c[`e${i}_l`] || '—'}</span>
                <b>${e.val}<small>${e.unit}</small></b>
              </div>`;
          })}
        </div>
      </div>`;
  }

  /* ── Styles ──────────────────────────────────── */
  static styles = css`
    /* ── CSS Variables ── */
    :host {
      --clr-bg:      #050a0e;
      --clr-panel:   rgba(255,255,255,0.04);
      --clr-border:  rgba(255,255,255,0.08);
      --clr-amber:   #ffc107;
      --clr-cyan:    #00e5ff;
      --clr-green:   #00e676;
      --clr-red:     #ff5252;
      --clr-pink:    #f048a8;
      --clr-text:    #e0e0e0;
      --clr-muted:   #555;
      --nav-h:       62px;
    }

    /* ── ha-card shell ── */
    ha-card {
      background: var(--clr-bg);
      color: var(--clr-text);
      border-radius: 22px;
      overflow: hidden;
      border: 1px solid var(--clr-border);
      box-shadow: 0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06);
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .main-container {
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .bg-img {
      position: absolute; inset: 0;
      background-size: cover; background-position: center;
      z-index: 0;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,0.6) 60%, transparent 100%);
    }

    .content-area {
      flex: 1;
      padding: 14px 14px 6px;
      z-index: 1;
      overflow-y: auto;
      overflow-x: hidden;
      scrollbar-width: none;
    }
    .content-area::-webkit-scrollbar { display: none; }

    /* ── Bottom nav ── */
    .bottom-nav {
      display: flex;
      height: var(--nav-h);
      background: rgba(0,0,0,0.85);
      border-top: 1px solid var(--clr-border);
      backdrop-filter: blur(12px);
      z-index: 2;
    }
    .nav-item {
      flex: 1; display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 3px; cursor: pointer;
      color: var(--clr-muted);
      transition: color .2s, transform .15s;
      border-top: 2px solid transparent;
    }
    .nav-item:hover { color: #888; transform: translateY(-1px); }
    .nav-item.active {
      color: var(--clr-amber);
      border-top-color: var(--clr-amber);
    }
    .nav-item ha-icon { --mdc-icon-size: 22px; }
    .nav-item span { font-size: 8px; font-weight: 700; letter-spacing: .8px; }

    /* ── Generic page ── */
    .page { display: flex; flex-direction: column; gap: 10px; height: 100%; }

    /* ── SOLAR ── */
    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .net-box {
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      padding: 10px 8px; border-radius: 14px;
      min-width: 62px; gap: 3px;
      border: 1px solid var(--clr-border);
      background: var(--clr-panel);
      font-weight: 700; font-size: 14px;
    }
    .net-box ha-icon { --mdc-icon-size: 20px; }
    .net-box small { font-size: 8px; font-weight: 600; letter-spacing: .6px; opacity: .7; }
    .net-box.transparent { background: transparent; border-color: transparent; }
    .import { color: var(--clr-red);   background: rgba(255,82,82,.08)!important;  border-color: rgba(255,82,82,.2)!important; }
    .export { color: var(--clr-green); background: rgba(0,230,118,.08)!important; border-color: rgba(0,230,118,.2)!important; }

    .center-prod {
      flex: 1; text-align: center;
    }
    .month-label {
      font-size: 9px; letter-spacing: 2px; color: var(--clr-muted);
      font-weight: 600; margin-bottom: 2px;
    }
    .big-w {
      font-size: 38px; font-weight: 900;
      color: var(--clr-amber);
      line-height: 1;
      text-shadow: 0 0 20px rgba(255,193,7,.5);
    }
    .big-w small { font-size: 16px; font-weight: 400; color: #888; }
    .target-info {
      font-size: 11px; color: #777; margin-top: 3px;
    }
    .target-info b { color: var(--clr-amber); }

    /* Progress bar */
    .progress-bar { display: flex; gap: 3px; height: 6px; }
    .seg {
      flex: 1; border-radius: 3px;
      background: rgba(255,255,255,0.07);
      transition: background .3s;
    }
    .seg.on {
      background: var(--clr-amber);
      box-shadow: 0 0 6px var(--clr-amber);
    }
    .seg.half {
      background: linear-gradient(90deg, var(--clr-amber) 50%, rgba(255,255,255,0.07) 50%);
    }

    /* Neon rings */
    .neon-grid {
      display: flex;
      justify-content: space-around;
      align-items: center;
      gap: 6px;
    }
    .neon-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .neon-ring { position: relative; width: 90px; height: 90px; }
    .ring-svg { position: absolute; inset: 0; width: 100%; height: 100%; transform: rotate(-90deg); }
    .arc-1 { stroke: var(--clr-amber); filter: drop-shadow(0 0 4px var(--clr-amber)); }
    .arc-2 { stroke: var(--clr-cyan);  filter: drop-shadow(0 0 4px var(--clr-cyan)); }
    .arc-3 { stroke: var(--clr-green); filter: drop-shadow(0 0 4px var(--clr-green)); }
    .arc-4 { stroke: var(--clr-pink);  filter: drop-shadow(0 0 4px var(--clr-pink)); }
    .ring-inner {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
    }
    .nv { font-size: 20px; font-weight: 900; line-height: 1; }
    .nu { font-size: 10px; color: var(--clr-muted); font-weight: 600; }
    .nlabel { font-size: 10px; color: #777; font-weight: 600; letter-spacing: .5px; }

    /* Info cards */
    .info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
    .info-card {
      background: var(--clr-panel);
      border: 1px solid var(--clr-border);
      border-radius: 10px;
      padding: 8px 6px;
      display: flex; flex-direction: column;
      align-items: center; gap: 3px;
    }
    .ic-label { font-size: 8px; color: var(--clr-muted); font-weight: 600; letter-spacing: .4px; text-align: center; }
    .ic-val { font-size: 15px; font-weight: 800; color: var(--clr-text); text-align: center; }
    .ic-val small { font-size: 9px; font-weight: 400; color: #777; }

    /* ── WEATHER ── */
    .sun-arc-box {
      background: var(--clr-panel);
      border: 1px solid var(--clr-border);
      border-radius: 14px;
      padding: 10px 12px 8px;
    }
    .sun-svg { width: 100%; display: block; }
    .sun-times {
      display: flex; justify-content: space-between;
      font-size: 11px; color: #aaa; font-weight: 600;
      margin-top: 6px;
    }
    .moon-row {
      display: flex; align-items: center; gap: 10px;
      background: var(--clr-panel);
      border: 1px solid var(--clr-border);
      border-radius: 10px; padding: 10px 14px;
    }
    .moon-icon { font-size: 18px; }
    .moon-text { font-size: 13px; color: #ddd; }
    .w-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
    .w-card {
      background: var(--clr-panel);
      border: 1px solid var(--clr-border);
      border-radius: 10px;
      padding: 10px 6px;
      display: flex; flex-direction: column;
      align-items: center; gap: 3px;
    }
    .w-icon { color: var(--clr-cyan); --mdc-icon-size: 18px; }
    .w-label { font-size: 8px; color: var(--clr-muted); font-weight: 600; letter-spacing: .4px; }
    .w-val { font-size: 17px; font-weight: 900; color: white; }
    .w-val small { font-size: 9px; font-weight: 400; color: #777; }

    /* ── BATTERY ── */
    .rack-list { display: flex; flex-direction: column; gap: 10px; }
    .rack-unit {
      background: var(--clr-panel);
      border: 1px solid var(--clr-border);
      border-radius: 14px; padding: 12px 14px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .rack-head { display: flex; justify-content: space-between; align-items: center; }
    .rack-name { font-size: 12px; font-weight: 700; color: var(--clr-text); letter-spacing: .5px; }
    .rack-badges { display: flex; gap: 6px; align-items: center; }
    .badge {
      display: flex; align-items: center; gap: 3px;
      font-size: 10px; font-weight: 700;
      padding: 3px 8px; border-radius: 20px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .badge ha-icon { --mdc-icon-size: 12px; }
    .badge.charge   { color: var(--clr-green); border-color: rgba(0,230,118,.25); }
    .badge.discharge { color: var(--clr-red);  border-color: rgba(255,82,82,.25); }

    .seg-bar { display: flex; gap: 3px; height: 8px; }
    .seg-slot {
      flex: 1; border-radius: 3px;
      background: rgba(255,255,255,0.07);
      transition: background .3s, box-shadow .3s;
    }
    .seg-slot.on {
      background: var(--clr);
      box-shadow: 0 0 5px var(--clr);
    }

    .soc-row { display: flex; align-items: center; gap: 10px; }
    .soc-pct { font-size: 24px; font-weight: 900; line-height: 1; min-width: 60px; }
    .soc-pct small { font-size: 12px; font-weight: 400; }
    .soc-bar-wrap {
      flex: 1; height: 6px; border-radius: 3px;
      background: rgba(255,255,255,0.07); overflow: hidden;
    }
    .soc-bar-fill { height: 100%; border-radius: 3px; transition: width .5s ease; }

    /* ── ECONOMY ── */
    .eco-hero {
      position: relative; overflow: hidden;
      text-align: center;
      padding: 22px 16px;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(0,230,118,.08), rgba(0,229,255,.05));
      border: 1px solid rgba(0,230,118,.2);
    }
    .eco-label {
      font-size: 9px; letter-spacing: 2.5px;
      color: var(--clr-green); font-weight: 700; margin-bottom: 4px;
    }
    .eco-amount {
      font-size: 46px; font-weight: 900; color: #fff;
      text-shadow: 0 0 30px rgba(0,230,118,.4);
      line-height: 1;
    }
    .eco-amount span { font-size: 24px; color: var(--clr-green); }
    .eco-shine {
      position: absolute; top: -20px; right: -20px;
      width: 100px; height: 100px;
      background: radial-gradient(circle, rgba(0,230,118,.15), transparent 70%);
      pointer-events: none;
    }
    .eco-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .e-card {
      background: var(--clr-panel);
      border: 1px solid var(--clr-border);
      border-radius: 12px; padding: 12px 10px;
      display: flex; flex-direction: column;
      align-items: center; gap: 4px; text-align: center;
    }
    .e-card.highlight { border-color: rgba(0,230,118,.2); background: rgba(0,230,118,.04); }
    .e-icon { color: var(--clr-green); --mdc-icon-size: 20px; margin-bottom: 2px; }
    .e-card span { font-size: 8px; color: var(--clr-muted); font-weight: 600; letter-spacing: .5px; }
    .e-card b { font-size: 18px; font-weight: 900; color: white; }
    .e-card b small { font-size: 10px; font-weight: 400; color: #777; }

    /* ── Misc ── */
    .err {
      padding: 20px; color: var(--clr-red);
      background: rgba(255,82,82,.08); border-radius: 12px;
      font-size: 13px; border: 1px solid rgba(255,82,82,.2);
    }
  `;
}
customElements.define("solar-master-card", SolarMasterCard);
