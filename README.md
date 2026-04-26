# ☀️ Solar Master Card (V40)

[![Version](https://img.shields.io/badge/version-40.0.0-gold.svg?style=for-the-badge)](https://github.com/xez7082/solar-master-card)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Platform](https://img.shields.io/badge/Platform-Home%20Assistant-blue.svg?style=for-the-badge)](https://www.home-assistant.io/)
[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg?style=for-the-badge)](https://github.com/xez7082/solar-master-card/graphs/commit-activity)

Une interface de monitoring solaire futuriste pour **Home Assistant**. Cette carte transforme vos données photovoltaïques en un véritable tableau de bord haute performance (style Cockpit) avec gestion des économies et du stockage.

---

## 📸 Aperçu du Dashboard

| 🛰️ Vue Production (Solar) | 🔋 Stockage (Batteries) | 💰 Finances (Économie) |
|:---:|:---:|:---:|
| <img src="https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/asolar.png" width="300"> | <img src="https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/asolar1.png" width="300"> | <img src="https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/asolar2.png" width="300"> |

---

## ✨ Points Forts

* **🎨 Design "Glassmorphism"** : Interface élégante avec effets de transparence et de flou (Blur) paramétrables.
* **🖼️ Personnalisation Totale** : Support d'image de fond personnalisée via URL avec contrôle de l'opacité directement dans l'éditeur.
* **⚡ Temps Réel** : Animations de flux (Scan) et HUD circulaires pour une lecture instantanée de la puissance.
* **📊 Gestion Financière** : Suivi des gains en Euros (€), calcul de rentabilité basé sur le prix du kWh et objectifs mensuels.
* **🔋 Rack Batteries Pro** : Jauges à segments ultra-fins (25 niveaux) avec monitoring de température et de flux.
* **🌍 100% Localisé** : Interface et états météo intégralement traduits en français.

---

## 🛠️ Installation Rapide

1. **Copier le code** : Récupérez le contenu du fichier `solar-master-card.js`.
2. **Ajouter la ressource** : 
   - Allez dans `Paramètres` -> `Tableaux de bord` -> `Ressources`.
   - Cliquez sur `Ajouter une ressource`.
   - Collez le chemin de votre fichier et sélectionnez `Module JavaScript`.
3. **Créer la carte** : 
   - Ajoutez une carte `Manuel` sur votre tableau de bord.
   - Collez la configuration de base (ou utilisez l'éditeur visuel inclus).

---

## ⚙️ Configuration de l'Éditeur

La carte inclut un éditeur visuel divisé en 3 onglets pour une configuration sans YAML :

1. **SOLAIRE** : Hauteur de carte, Image de fond (Blur/Opacity), Entités de production et Météo.
2. **BATTERIES** : Noms, SOC (%), Températures et flux de charge pour jusqu'à 4 batteries.
3. **ÉCONOMIE** : Gains journaliers/annuels, prix du kWh et barre de progression d'objectif financier.

---

## 📝 Dernières mises à jour (v40.0)

* **Refonte visuelle** : Optimisation des espaces en hauteur pour un look plus compact.
* **Jauges Ultra-Slim** : Affinement des segments de batterie pour une esthétique moderne.
* **Moteur de flou** : Correction du rendu de l'image de fond sur les différents onglets.

---
*Développé pour la communauté Home Assistant par [xez7082](https://github.com/xez7082).*
