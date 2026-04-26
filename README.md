# ☀️ Solar Master Card V27

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://github.com/hacs/integration)
![version](https://img.shields.io/badge/version-1.0.0-blue.svg?style=for-the-badge)
![license](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)

Une carte Home Assistant avancée et ultra-personnalisable pour le suivi de vos kits solaires. Conçue spécifiquement pour les écosystèmes **Beem**, **Marstek** (Venus) et **Storcube**.

---

## ✨ Caractéristiques

* 🎨 **Interface "Glassmorphism"** : Un design moderne avec flou d'arrière-plan et dégradés dynamiques.
* 🛠️ **Éditeur Visuel Intégré** : Configurez vos entités sans toucher au code YAML grâce à l'interface à onglets.
* 🔄 **Animations Dynamiques** : Effet de balayage tournant (scan) et pulsation selon la puissance de production.
* 📊 **Multi-Vues** : Navigation par onglets (Statut, Batterie, Chimie/Détails, Switchs).
* 🌡️ **Monitoring Complet** : Support des températures (eau/air), humidité, pH, ORP et consommation instantanée.

---

## 📸 Aperçu

| Vue Principale | Éditeur de Configuration |
| :--- | :--- |
| ![Vue Home](https://raw.githubusercontent.com/VOTRE_NOM/solar-master-card/main/images/preview.png) | ![Éditeur](https://raw.githubusercontent.com/VOTRE_NOM/solar-master-card/main/images/editor.png) |

*(Remplacez les liens ci-dessus par vos captures d'écran une fois uploadées dans le dossier /images)*

---

## 🚀 Installation

### Via HACS (Recommandé)
1. Ouvrez **HACS** dans Home Assistant.
2. Cliquez sur les **3 points** en haut à droite et sélectionnez **Dépôts personnalisés**.
3. Collez l'URL de ce dépôt : `https://github.com/VOTRE_NOM/solar-master-card`
4. Sélectionnez la catégorie **Lovelace** et cliquez sur **Ajouter**.
5. Recherchez "Solar Master Card" et cliquez sur **Installer**.

### Installation Manuelle
1. Téléchargez le fichier `solar-master-card.js` depuis le dossier `dist`.
2. Copiez-le dans votre dossier `www/community/solar-master-card/`.
3. Ajoutez la ressource dans vos paramètres de tableau de bord :
   ```yaml
   url: /local/community/solar-master-card/solar-master-card.js
   type: module
