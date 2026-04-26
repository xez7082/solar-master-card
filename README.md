# ☀️ Solar Master Card (V40)

Une carte Home Assistant avancée et ultra-personnalisable pour le suivi de votre installation photovoltaïque. Ce projet offre un design de type "Cockpit" avec des effets de transparence (Glassmorphism), un support d'image de fond dynamique et une navigation par onglets fluide.

![Version](https://img.shields.io/badge/version-40.0-gold)
![Platform](https://img.shields.io/badge/platform-Home%20Assistant-blue)

---

## 📸 Aperçu du Design

Voici les différents onglets de la carte en action :

| Solaire (Production) | Détails Techniques |
|:---:|:---:|
| <img src="https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/spa10.png" width="400"> | <img src="https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/spa11.png" width="400"> |

| Gestion Batteries | Économie & Gains |
|:---:|:---:|
| <img src="https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/spa12.png" width="400"> | <img src="https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/spa13.png" width="400"> |

---

## ✨ Caractéristiques principales

* **🚀 Design Cockpit :** Interface futuriste avec jauges circulaires (HUD) et animations de scan en temps réel.
* **🖼️ Moteur Visuel :** Ajoutez votre propre image de fond avec réglage du **flou (blur)** et de l'**opacité** directement depuis l'éditeur.
* **🔋 Onglet Batteries :** Suivi précis de plusieurs batteries avec jauges à segments ultra-fins, température et flux (W).
* **💰 Onglet Économie :** Visualisez vos gains quotidiens, annuels et suivez votre objectif mensuel via une barre de progression dédiée.
* **📱 Navigation Intuitive :** Menu footer intégré pour basculer rapidement entre la production, le stockage et les statistiques financières.
* **🛠️ Éditeur Intégré :** Configuration facile via l'interface UI de Home Assistant (pas de YAML complexe nécessaire).

---

## 🛠️ Installation

### 1. Pré-requis
Assurez-vous d'avoir accès aux ressources externes dans votre configuration Home Assistant.

### 2. Ajout de la carte
1.  Copiez le code du fichier `solar-master-card.js`.
2.  Dans Home Assistant, allez dans **Configuration** -> **Tableaux de bord** -> **Ressources**.
3.  Ajoutez une nouvelle ressource avec le type `JavaScript Module`.
4.  Créez une nouvelle carte **Manuel** dans votre tableau de bord et collez le code.

---

## ⚙️ Configuration

L'éditeur visuel est divisé en 3 sections :
* **SOLAIRE :** Configuration des entités de production, de l'image de fond et de la météo.
* **BATTERIES :** Configuration des SOC, températures et flux de charge/décharge.
* **ÉCONOMIE :** Suivi des gains en euros, prix du kWh et objectifs mensuels.

---

## 📝 Changelog (v40.0)
* **Nouveau :** Ajout des jauges de batteries ultra-fines (25 segments).
* **Optimisation :** Réduction des espaces en hauteur dans l'onglet Économie.
* **Correction :** Restauration des barres de progression d'objectif solaire.
* **Visuel :** Support complet du flou d'arrière-plan configurable.

---

## 🤝 Contribution
Les contributions, rapports de bugs et suggestions sont les bienvenus ! N'hésitez pas à ouvrir une *Issue* ou une *Pull Request*.

---
Développé avec ❤️ pour la communauté Home Assistant.
