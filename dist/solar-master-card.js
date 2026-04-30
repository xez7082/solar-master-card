import {
  LitElement,
  html,
  css
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

/**
 * ==========================================
 * 🧠 ÉDITEUR VISUEL — SOLAR MASTER CARD
 * ==========================================
 */
class SolarMasterCardEditor extends LitElement {
  static get properties() {
    return { hass: {}, _config: {}, _tab: { type: String }, _open: { type: Object } };
  }
  constructor() {
    super();
    this._tab  = 'solar';
    this._open = { apparence: true, reseau: true, production: true };
  }
  setConfig(config) { this._config = { ...config }; }

  /* ── dispatch config change ── */
  _set(key, value) {
    if (!this._config) return;
    this._config = { ...this._config, [key]: value };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  _formChanged(ev) {
    if (!this._config) return;
    this._config = { ...this._config, ...ev.detail.value };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  _toggle(section) {
    this._open = { ...this._open, [section]: !this._open[section] };
    this.requestUpdate();
  }

  /* ── helpers ── */
  _form(schema) {
    return html`<ha-form .hass=${this.hass} .data=${this._config} .schema=${schema} @value-changed=${this._formChanged}></ha-form>`;
  }

  _section(key, icon, title, desc, color, content) {
    const open = this._open[key] !== false;
    return html`
      <div class="section" style="--sc:${color}">
        <div class="section-head" @click=${() => this._toggle(key)}>
          <div class="section-icon">${icon}</div>
          <div class="section-info">
            <div class="section-title">${title}</div>
            <div class="section-desc">${desc}</div>
          </div>
          <div class="section-chevron">${open ? '▲' : '▼'}</div>
        </div>
        ${open ? html`<div class="section-body">${content}</div>` : ''}
      </div>`;
  }

  _panelSection(i, color, icon) {
    const colors = ['', '#ffc107', '#00e5ff', '#00e676', '#f048a8'];
    return this._section(
      `panel${i}`, icon,
      `Panneau ${i} — ${this._config[`p${i}_name`] || 'non configuré'}`,
      `Entité watts + puissance crête installée`,
      colors[i],
      html`
        ${this._form([{ name: `p${i}_name`, label: 'Nom affiché',         selector: { text: {} } }])}
        ${this._form([{ name: `p${i}_w`,    label: 'Entité — Watts actuels (W)',  selector: { entity: {} } }])}
        ${this._form([{ name: `p${i}_max`,  label: 'Puissance max installée (Wc)', selector: { number: { min: 100, max: 5000, step: 10 } } }])}
        <div class="hint">💡 L'arc du cercle sera plein à ${this._config[`p${i}_max`] || 500} Wc</div>
      `
    );
  }

  _battSection(i) {
    const colors = ['', '#00e5ff', '#ffc107', '#00e676', '#f048a8'];
    return this._section(
      `batt${i}`, '🔋',
      `Batterie ${i} — ${this._config[`b${i}_n`] || 'non configurée'}`,
      'SOC, puissance et température',
      colors[i],
      html`
        ${this._form([{ name: `b${i}_n`, label: 'Nom affiché', selector: { text: {} } }])}
        ${this._form([{ name: `b${i}_s`, label: 'Entité — État de charge SOC (%)', selector: { entity: {} } }])}
        ${this._form([{ name: `b${i}_out`, label: 'Entité — Puissance (W, négatif = charge)', selector: { entity: {} } }])}
        ${this._form([{ name: `b${i}_t`, label: 'Entité — Température (°C)', selector: { entity: {} } }])}
      `
    );
  }

  /* ── TABS ── */
  _renderSolar() {
    return html`
      ${this._section('apparence', '🖼', 'Apparence', 'Image de fond, opacité, hauteur de la carte', '#888', html`
        ${this._form([{ name: 'bg_url',     label: 'URL de l\'image de fond (laisser vide = aucune)', selector: { text: {} } }])}
        ${this._form([{ name: 'bg_opacity', label: 'Opacité de l\'image (0.1 = transparent → 1 = opaque)', selector: { number: { min: 0.1, max: 1, step: 0.05 } } }])}
        ${this._form([{ name: 'card_height', label: 'Hauteur de la carte (px)', selector: { number: { min: 400, max: 1000, step: 10 } } }])}
      `)}

      ${this._section('reseau', '🔌', 'Réseau électrique', 'Valeur positive = import, négative = export vers le réseau', '#ff5252', html`
        ${this._form([{ name: 'conso_entity', label: 'Entité Import / Export réseau (W)', selector: { entity: {} } }])}
        <div class="hint">💡 Valeur positive = vous achetez du réseau · Négative = vous revendez</div>
      `)}

      ${this._section('production', '☀️', 'Production solaire', 'Production totale du mois et objectif pour calculer la progression', '#ffc107', html`
        ${this._form([{ name: 'total_now',    label: 'Entité — Production totale du mois (kWh)', selector: { entity: {} } }])}
        ${this._form([{ name: 'solar_target', label: 'Entité — Objectif mensuel (kWh)', selector: { entity: {} } }])}
        ${this._form([{ name: 'solar_pct_sensor', label: 'Entité — Capteur % optionnel (ignoré si objectif configuré)', selector: { entity: {} } }])}
        <div class="hint">💡 Configurez les deux entités ci-dessus · Le % est calculé automatiquement et peut dépasser 100%</div>
      `)}

      <div class="group-title">⚡ Panneaux solaires</div>
      ${[1, 2, 3, 4].map(i => this._panelSection(i))}

      ${this._section('infos', '📊', 'Informations supplémentaires', '6 cases libres affichées en bas de la page solaire', '#00e5ff', html`
        <div class="grid-2">
          ${[4, 5, 6, 7, 8, 9].map(i => html`
            <div class="info-group">
              <div class="info-num">#${i - 3}</div>
              ${this._form([{ name: `d${i}_label`,  label: 'Label affiché',   selector: { text: {} } }])}
              ${this._form([{ name: `d${i}_entity`, label: 'Entité associée', selector: { entity: {} } }])}
            </div>
          `)}
        </div>
      `)}
    `;
  }

  _renderWeather() {
    return html`
      ${this._section('meteo_main', '🌍', 'Sources météo', 'Entité météo principale et phase de lune', '#00e5ff', html`
        ${this._form([{ name: 'weather_entity', label: 'Entité météo principale (domaine weather)', selector: { entity: { domain: 'weather' } } }])}
        ${this._form([{ name: 'moon_entity',    label: 'Entité phase de lune', selector: { entity: {} } }])}
      `)}

      ${this._section('meteo_data', '📡', 'Données météo — 9 cases', 'Remplissez les cases que vous voulez afficher (label + entité + icône mdi:)', '#ffc107', html`
        <div class="grid-2">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => html`
            <div class="info-group">
              <div class="info-num">#${i}</div>
              ${this._form([{ name: `w${i}_l`, label: 'Label',         selector: { text: {} } }])}
              ${this._form([{ name: `w${i}_e`, label: 'Entité',        selector: { entity: {} } }])}
              ${this._form([{ name: `w${i}_i`, label: 'Icône mdi:...', selector: { text: {} } }])}
            </div>
          `)}
        </div>
      `)}
    `;
  }

  _renderBattery() {
    return html`
      <div class="hint top">💡 Configurez uniquement les batteries que vous possédez · Les cases vides sont ignorées</div>
      ${[1, 2, 3, 4].map(i => this._battSection(i))}
    `;
  }

  _renderEco() {
    return html`
      ${this._section('eco_main', '💰', 'Économies', 'Capteurs principaux affichés en héros et dans les cartes mises en avant', '#00e676', html`
        ${this._form([{ name: 'eco_money',    label: 'Entité — Économies totales cumulées (€)', selector: { entity: {} } }])}
        ${this._form([{ name: 'eco_day_euro', label: 'Entité — Gain du jour (€)',               selector: { entity: {} } }])}
        ${this._form([{ name: 'main_cons',    label: 'Entité — Consommation maison (W)',         selector: { entity: {} } }])}
      `)}

      ${this._section('eco_data', '📋', 'Données libres — 6 cases', 'Cases supplémentaires affichées dans la grille économies', '#ffc107', html`
        <div class="grid-2">
          ${[1, 2, 3, 4, 5, 6].map(i => html`
            <div class="info-group">
              <div class="info-num">#${i}</div>
              ${this._form([{ name: `e${i}_l`, label: 'Label',  selector: { text: {} } }])}
              ${this._form([{ name: `e${i}_e`, label: 'Entité', selector: { entity: {} } }])}
            </div>
          `)}
        </div>
      `)}
    `;
  }

  render() {
    if (!this.hass || !this._config) return html``;
    const tabs = [
      { key: 'solar',   icon: '☀️', label: 'Solaire'  },
      { key: 'weather', icon: '🌤', label: 'Météo'    },
      { key: 'battery', icon: '🔋', label: 'Batterie' },
      { key: 'eco',     icon: '💰', label: 'Économie' },
    ];
    return html`
      <div class="editor-root">
        <div class="editor-header">
          <div class="editor-logo">🌞</div>
          <div>
            <div class="editor-title">Solar Master Card</div>
            <div class="editor-subtitle">Configuration de la carte</div>
          </div>
        </div>

        <div class="tab-bar">
          ${tabs.map(t => html`
            <button class="tab ${this._tab === t.key ? 'active' : ''}"
              @click=${() => { this._tab = t.key; this.requestUpdate(); }}>
              <span class="tab-icon">${t.icon}</span>
              <span class="tab-label">${t.label}</span>
            </button>
          `)}
        </div>

        <div class="tab-content">
          ${this._tab === 'solar'   ? this._renderSolar()   : ''}
          ${this._tab === 'weather' ? this._renderWeather() : ''}
          ${this._tab === 'battery' ? this._renderBattery() : ''}
          ${this._tab === 'eco'     ? this._renderEco()     : ''}
        </div>
      </div>
    `;
  }

  static styles = css`
    .editor-root { font-family: 'Segoe UI', system-ui, sans-serif; }

    /* ── Header ── */
    .editor-header {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; margin-bottom: 12px;
      background: linear-gradient(135deg, #0d1f0d, #0a1a2e);
      border-radius: 14px; border: 1px solid rgba(255,193,7,.2);
    }
    .editor-logo { font-size: 28px; }
    .editor-title { font-size: 15px; font-weight: 800; color: #ffc107; letter-spacing: .5px; }
    .editor-subtitle { font-size: 11px; color: #666; margin-top: 1px; }

    /* ── Tab bar ── */
    .tab-bar {
      display: flex; gap: 6px; margin-bottom: 14px;
      background: rgba(0,0,0,0.04); padding: 5px;
      border-radius: 12px; border: 1px solid rgba(0,0,0,0.08);
    }
    .tab {
      flex: 1; display: flex; flex-direction: column; align-items: center;
      gap: 3px; padding: 8px 4px; cursor: pointer;
      background: transparent; border: none; border-radius: 9px;
      transition: all .18s; color: #888;
    }
    .tab:hover { background: rgba(255,193,7,.08); color: #bbb; }
    .tab.active { background: linear-gradient(135deg, #ffc107, #ff8f00); color: #000; box-shadow: 0 2px 8px rgba(255,193,7,.35); }
    .tab-icon { font-size: 16px; }
    .tab-label { font-size: 9px; font-weight: 700; letter-spacing: .5px; }

    /* ── Sections ── */
    .section {
      margin-bottom: 10px;
      border-radius: 12px;
      border: 1px solid rgba(0,0,0,0.1);
      overflow: hidden;
      border-left: 3px solid var(--sc, #444);
    }
    .section-head {
      display: flex; align-items: center; gap: 10px;
      padding: 11px 14px; cursor: pointer;
      background: rgba(0,0,0,0.03);
      user-select: none;
      transition: background .15s;
    }
    .section-head:hover { background: rgba(0,0,0,0.06); }
    .section-icon { font-size: 18px; flex-shrink: 0; }
    .section-info { flex: 1; }
    .section-title { font-size: 13px; font-weight: 700; color: var(--primary-text-color, #212121); }
    .section-desc  { font-size: 10px; color: #888; margin-top: 1px; }
    .section-chevron { font-size: 9px; color: #aaa; }
    .section-body { padding: 10px 14px 14px; border-top: 1px solid rgba(0,0,0,0.07); }

    /* ── Group title (outside section) ── */
    .group-title {
      font-size: 11px; font-weight: 700; color: #888;
      letter-spacing: 1px; text-transform: uppercase;
      padding: 10px 4px 6px; margin-top: 4px;
    }

    /* ── 2-col grid for info cases ── */
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .info-group {
      background: rgba(0,0,0,0.03); border-radius: 10px;
      padding: 10px; border: 1px solid rgba(0,0,0,0.07);
    }
    .info-num {
      font-size: 10px; font-weight: 800; color: #ffc107;
      margin-bottom: 6px; letter-spacing: .5px;
    }

    /* ── Hint boxes ── */
    .hint {
      margin-top: 8px; padding: 8px 10px;
      background: rgba(255,193,7,.07);
      border: 1px solid rgba(255,193,7,.2);
      border-radius: 8px; font-size: 10px; color: #888; line-height: 1.5;
    }
    .hint.top { margin-bottom: 10px; margin-top: 0; }
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
  static getStubConfig()    { return { card_height: 550, bg_opacity: 0.25 }; }
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
    const prodKwh   = parseFloat(prod.val)   || 0;

    // Toujours calculer depuis les entités brutes → peut dépasser 100%
    // Le solar_pct_sensor n'est utilisé qu'en dernier recours (entité cible absente)
    let progress = 0;
    if (targetKwh > 0) {
      progress = (prodKwh / targetKwh) * 100;          // ex: 1.06 kWh / 1.00 kWh = 106%
    } else if (c.solar_pct_sensor) {
      progress = parseFloat(this._getVal(c.solar_pct_sensor).val) || 0;
    }

    const progressCapped = Math.min(100, progress);    // uniquement pour la barre visuelle

    const isImport = consoVal > 0;
    const monthName = new Date().toLocaleDateString('fr-FR', { month: 'long' }).toUpperCase();
    const filledSegs = Math.floor(progressCapped / 5);

    return html`
      <div class="page page-solar">

        <!-- ── TOP ROW ── -->
        <div class="top-row">
          <div class="net-box ${isImport ? 'import' : 'export'}">
            <ha-icon icon="${isImport ? 'mdi:transmission-tower' : 'mdi:transmission-tower-export'}"></ha-icon>
            <span>${Math.abs(consoVal).toFixed(0)} <em>W</em></span>
            <small>${isImport ? 'IMPORT' : 'EXPORT'}</small>
          </div>

          <div class="center-prod">
            <div class="month-label">${monthName}</div>
            <div class="big-w">${prodKwh.toFixed(1)}<em class="unit-w"> kWh</em></div>
            <div class="target-info">
              OBJECTIF <b class="unit-kwh">${targetKwh} kWh</b>
            </div>
          </div>

          <div class="net-box transparent">
            <ha-icon icon="mdi:sun-compass" style="color:#ffc107;"></ha-icon>
            <span style="font-size:10px;color:#999;">PROD</span>
          </div>
        </div>

        <!-- ── PROGRESS + % inline ── -->
        <div class="progress-row">
          <div class="progress-bar">
            ${Array(20).fill(0).map((_, i) => html`
              <div class="seg ${i < filledSegs ? 'on' : i === filledSegs && (progressCapped % 5 > 0) ? 'half' : ''}"></div>
            `)}
          </div>
          <span class="progress-pct ${progress > 100 ? 'over' : ''}">${Math.round(progress)}<em>%</em></span>
        </div>

        <!-- ── PANNEAUX ── -->
        <div class="neon-grid">
          ${[1, 2, 3, 4].map(i => {
            if (!c[`p${i}_w`]) return '';
            const w    = parseFloat(this._getVal(c[`p${i}_w`]).val) || 0;
            const maxW = parseFloat(c[`p${i}_max`]) || 500;
            const pct  = Math.min(100, (w / maxW) * 100);
            const circ = 2 * Math.PI * 26;
            return html`
              <div class="neon-item">
                <div class="neon-ring">
                  <svg class="ring-svg" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="4"/>
                    <circle cx="30" cy="30" r="26" fill="none" stroke-width="4"
                      class="ring-arc arc-${i}"
                      stroke-dasharray="${circ * pct / 100} ${circ}"
                      stroke-dashoffset="${circ * 0.25}"
                      stroke-linecap="round"/>
                  </svg>
                  <div class="ring-inner">
                    <span class="nv">${Math.round(w)}</span>
                    <span class="nu arc-color-${i}">W</span>
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
                <b class="ic-val">${d.val}<em class="ic-unit">${d.unit}</em></b>
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
    const isAboveHorizon = elevation > 0;

    /* SVG viewBox 0 0 200 40 — horizon at y=34 */
    const sx = Math.round(10 + ((azimuth % 360) / 360) * 180);
    const sy = Math.round(Math.max(4, 34 - Math.max(0, elevation) * 0.32));

    const moonState = this.hass.states[c.moon_entity]?.state;
    const moonMap = {
      new_moon: '🌑 Nouvelle lune',        waxing_crescent: '🌒 Croissant croissant',
      first_quarter: '🌓 Premier quartier', waxing_gibbous: '🌔 Gibbeuse croissante',
      full_moon: '🌕 Pleine lune',          waning_gibbous: '🌖 Gibbeuse décroissante',
      last_quarter: '🌗 Dernier quartier',  waning_crescent: '🌘 Dernier croissant'
    };

    return html`
      <div class="page page-weather">

        <!-- ── Sun arc ── -->
        <div class="sun-arc-box">
          <svg viewBox="0 0 200 30" xmlns="http://www.w3.org/2000/svg" style="width:100%;display:block;overflow:visible;">
            <line x1="8" y1="26" x2="192" y2="26" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
            <path d="M 10,26 A 90,20 0 0 1 190,26" fill="none"
              stroke="${isAboveHorizon ? 'rgba(255,193,7,0.18)' : 'rgba(255,255,255,0.05)'}"
              stroke-width="1.5" stroke-dasharray="5,3"/>
            <circle cx="${sx}" cy="${Math.max(3, sy - 8)}" r="5"
              fill="${isAboveHorizon ? '#ffc107' : '#334'}"
              style="filter:${isAboveHorizon ? 'drop-shadow(0 0 5px #ffc107)' : 'none'}"/>
            ${isAboveHorizon ? html`<circle cx="${sx}" cy="${Math.max(3, sy - 8)}" r="10" fill="rgba(255,193,7,0.12)"/>` : ''}
          </svg>
          <div class="sun-times">
            <span>🌅 ${this._fmtTime(sun.attributes.next_rising)}</span>
            <span class="sun-elev">${elevation.toFixed(1)}°</span>
            <span>🌇 ${this._fmtTime(sun.attributes.next_setting)}</span>
          </div>
        </div>

        <!-- ── Moon ── -->
        <div class="moon-row">
          <span class="moon-icon">🌙</span>
          <span class="moon-text">${moonMap[moonState] || moonState || 'Phase inconnue'}</span>
        </div>

        <!-- ── Weather entities grid ── -->
        <div class="w-grid">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => {
            const eId = c[`w${i}_e`];
            if (!eId || !this.hass.states[eId]) return '';
            const s = this.hass.states[eId];
            return html`
              <div class="w-card">
                <ha-icon icon="${c[`w${i}_i`] || 'mdi:information-outline'}" class="w-icon"></ha-icon>
                <span class="w-label">${c[`w${i}_l`] || ''}</span>
                <span class="w-val">${s.state}<em class="w-unit">${s.attributes.unit_of_measurement || ''}</em></span>
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
    .big-w .unit-w { font-size: 16px; font-weight: 400; color: var(--clr-amber); opacity: .7; }
    .target-info {
      font-size: 11px; color: #999; margin-top: 3px;
    }
    .unit-kwh { color: var(--clr-cyan); font-style: normal; }

    /* Progress row — bar + % side by side */
    .progress-row { display: flex; align-items: center; gap: 8px; }
    .progress-bar { flex: 1; display: flex; gap: 3px; height: 6px; }
    .progress-pct {
      font-size: 14px; font-weight: 900; color: var(--clr-amber);
      white-space: nowrap; min-width: 42px; text-align: right;
    }
    .progress-pct em { font-size: 10px; font-style: normal; color: #888; }
    .progress-pct.over { color: var(--clr-green); text-shadow: 0 0 8px var(--clr-green); }
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
    .nu { font-size: 10px; font-weight: 700; }
    .arc-color-1 { color: var(--clr-amber); }
    .arc-color-2 { color: var(--clr-cyan);  }
    .arc-color-3 { color: var(--clr-green); }
    .arc-color-4 { color: var(--clr-pink);  }
    .nlabel { font-size: 10px; color: #aaa; font-weight: 600; letter-spacing: .5px; }

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
    .ic-label { font-size: 8px; color: #aaa; font-weight: 600; letter-spacing: .4px; text-align: center; }
    .ic-val { font-size: 15px; font-weight: 800; color: var(--clr-text); text-align: center; font-style: normal; }
    .ic-unit { font-size: 9px; font-weight: 400; color: var(--clr-cyan); font-style: normal; }

    /* ── WEATHER ── */
    .page-weather { height: 100%; }
    .sun-arc-box {
      background: var(--clr-panel);
      border: 1px solid var(--clr-border);
      border-radius: 14px;
      padding: 6px 12px 5px;
      flex-shrink: 0;
    }
    .sun-times {
      display: flex; justify-content: space-between;
      font-size: 11px; color: #bbb; font-weight: 600;
      margin-top: 3px;
    }
    .sun-elev { color: var(--clr-amber); font-weight: 800; }
    .moon-row {
      display: flex; align-items: center; gap: 10px;
      background: var(--clr-panel);
      border: 1px solid var(--clr-border);
      border-radius: 10px; padding: 6px 14px;
      flex-shrink: 0;
    }
    .moon-icon { font-size: 15px; }
    .moon-text { font-size: 12px; color: #ddd; }
    .w-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 5px; flex: 1; min-height: 0;
    }
    .w-card {
      background: var(--clr-panel);
      border: 1px solid var(--clr-border);
      border-radius: 10px;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 2px;
    }
    .w-icon { color: var(--clr-cyan); --mdc-icon-size: 15px; }
    .w-label { font-size: 8px; color: #aaa; font-weight: 600; letter-spacing: .4px; text-align: center; line-height: 1.1; }
    .w-val { font-size: 15px; font-weight: 900; color: white; }
    .w-unit { font-size: 9px; font-weight: 400; color: var(--clr-cyan); font-style: normal; }

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
      color: #bbb;
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
    .e-card span { font-size: 8px; color: #aaa; font-weight: 600; letter-spacing: .5px; }
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

// ── Enregistrement dans le picker Home Assistant ──
window.customCards = window.customCards || [];
window.customCards.push({
  type:        "solar-master-card",
  name:        "Solar Master Card",
  description: "Tableau de bord solaire : production, météo, batterie, économies",
  preview:     false,
  documentationURL: "https://github.com/"
});
