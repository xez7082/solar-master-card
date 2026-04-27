# ☀️ Solar Master Card (v1.4.4)

[![Version](https://img.shields.io/badge/version-1.4.4-gold.svg?style=for-the-badge)](https://github.com/xez7082/solar-master-card)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Home%20Assistant-blue.svg?style=for-the-badge)](https://www.home-assistant.io/)
[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg?style=for-the-badge)](https://hacs.xyz/)

Une interface de monitoring solaire futuriste pour **Home Assistant**. Cette carte transforme vos données photovoltaïques en un véritable tableau de bord haute performance (style Cockpit) avec gestion intelligente des unités, du stockage et des économies.

---

## 📸 Aperçu du Dashboard

| 🛰️ Vue Production (Solar) | 🔋 Stockage (Batteries) | 💰 Finances (Économie) |
|:---:|:---:|:---:|
| <img src="https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/asolar.png" width="300" alt="Solaire"> | <img src="https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/asolar1.png" width="300" alt="Batteries"> | <img src="https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/asolar2.png" width="300" alt="Économie"> |

---

## ✨ Points Forts

* **🎨 Design "Glassmorphism"** : Interface élégante avec effets de transparence et de flou (Blur) paramétrables dynamiquement via l'éditeur.
* **🖼️ Personnalisation Totale** : Support d'image de fond via URL (ou local) avec réglage de l'opacité et de la netteté en temps réel.
* **🧠 Intelligence des Unités** : Moteur "Smart Unit" qui sépare automatiquement les valeurs numériques des unités (W, kWh, V, A, €) pour un affichage toujours propre.
* **⚡ Temps Réel** : Animations de flux (Scan) et HUD circulaires pour une lecture instantanée de la puissance par panneau.
* **📊 Gestion Financière** : Suivi complet des gains en Euros (€), calcul basé sur le prix du kWh et barre de progression d'objectif financier.
* **🔋 Rack Batteries Pro** : Jauges à segments LED haute précision avec monitoring complet (SOC, Tension, Ampérage, Température, Capacité).
* **🌍 100% Localisé** : Interface et états météo intégralement traduits en français.

---

## 🛠️ Installation

### Option 1 : Via HACS (Recommandée)
1. Ouvrez **HACS** dans votre instance Home Assistant.
2. Allez dans la section **Interface**.
3. Cliquez sur les **trois points** en haut à droite et sélectionnez **Dépôts personnalisés**.
4. Collez l'URL de ce dépôt : `https://github.com/xez7082/solar-master-card`
5. Sélectionnez la catégorie **Lovelace**.
6. Cliquez sur **Ajouter**, puis installez la carte **Solar Master Card**.
7. Rechargez votre navigateur (F5).

### Option 2 : Installation Manuelle
1. Téléchargez le fichier `solar-master-card.js`.
2. Placez-le dans votre dossier `/config/www/`.
3. Dans Home Assistant, allez dans `Paramètres` -> `Tableaux de bord` -> `Ressources`.
4. Ajoutez `/local/solar-master-card.js?v=1.4.4` en tant que **Module JavaScript**.

---

## ⚙️ Configuration de l'Éditeur

La carte inclut un éditeur visuel divisé en 3 onglets pour une configuration sans YAML :

1. **SOLAIRE** : Hauteur de carte, Image de fond (URL/Blur/Opacity), Entités de production, Météo et 6 blocs de diagnostics personnalisables (UV, Température onduleur, etc.).
2. **BATTERIES** : Gestion de 4 racks indépendants avec suivi complet (Voltage, Ampérage, Température et Capacité Ah).
3. **ÉCONOMIE** : Configuration du prix du kWh, des gains journaliers/annuels et suivi de la consommation maison.

---

## 📝 Changelog (v1.4.4)

* **Smart Units Engine** : Séparation automatique valeur/unité pour éviter les cassures de design.
* **Background Controller** : Intégration des réglages de flou et d'opacité directement dans l'interface d'édition.
* **Correction Économie** : Restauration de la grille complète des statistiques financières.
* **Optimisation UI** : Affinement des jauges de batterie et amélioration de la réactivité mobile.

---
*Développé avec ❤️ pour la communauté Home Assistant par [xez7082](https://github.com/xez7082).*
