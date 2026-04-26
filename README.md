# ☀️ Solar Master Card by xez7082

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
![version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)
![license](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)
![maintained](https://img.shields.io/badge/Maintained%3F-yes-brightgreen.svg?style=for-the-badge)

Une carte **Home Assistant** ultra-complète et dynamique pour piloter et surveiller vos installations solaires (Beem, Marstek, Storcube) et vos équipements de loisirs (Spa). 

---

## 🚀 Pourquoi cette carte ?

Plutôt que d'empiler des dizaines de cartes individuelles, la **Solar Master Card** centralise tout dans une interface élégante et interactive basée sur **LitElement**. Elle intègre un éditeur visuel pour que vous n'ayez plus jamais à modifier de YAML manuellement.

### 🌟 Points forts
- **Éditeur Visuel (UI)** : Configuration simplifiée par onglets directement dans l'interface Home Assistant.
- **Design Glassmorphism** : Effets de transparence, flou (blur) et animations néon.
- **Animations de Flux** : Effet "Scan" tournant et pulsations dont l'intensité varie selon votre production réelle.
- **Optimisé pour le Solaire** : Gestion native des SOC batteries, températures de cellules et production journalière.
- **Module Spa Intégré** : Suivi de la chimie (pH, ORP, Sel) et contrôle des pompes/bulles.

---

## 📸 Aperçu du Dashboard

| Vue Statut Solaire | Éditeur de Configuration | Vue Chimie / Spa |
| :--- | :--- | :--- |
| ![Preview](https://raw.githubusercontent.com/xez7082/solar-master-card/main/images/preview.png) | ![Editor](https://raw.githubusercontent.com/xez7082/solar-master-card/main/images/editor.png) | ![Chemistry](https://raw.githubusercontent.com/xez7082/solar-master-card/main/images/spa_view.png) |

---

## 🛠️ Installation

### Option 1 : Via HACS (Recommandé)
1. Dans Home Assistant, allez dans **HACS** > **Interface**.
2. Cliquez sur les **3 points** (en haut à droite) > **Dépôts personnalisés**.
3. Ajoutez l'URL : `https://github.com/xez7082/solar-master-card`
4. Sélectionnez la catégorie **Lovelace**.
5. Cliquez sur **Installer**.

### Option 2 : Manuelle
1. Téléchargez `dist/solar-master-card.js`.
2. Placez-le dans `/config/www/community/solar-master-card/`.
3. Ajoutez la ressource dans votre tableau de bord :
   - Type : `module`
   - URL : `/local/community/solar-master-card/solar-master-card.js`

---

## ⚙️ Configuration rapide (YAML)

Bien que la carte dispose d'un éditeur visuel, voici un exemple de configuration de base :

```yaml
type: custom:solar-master-card
title: "MA STATION BEEM"
beem_power: sensor.beem_maison_puissance
beem_day: sensor.beem_maison_production_aujourd_hui
marstek_soc: sensor.marstek_venus_soc
background_image: "/local/img/solar_bg.jpg"
