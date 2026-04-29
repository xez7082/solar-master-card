# ☀️ Solar Master Card

Une carte personnalisée pour **Home Assistant** conçue pour offrir un suivi visuel complet et élégant de votre production solaire et des données météo. L'interface utilise un style "Glassmorphism" avec des accents néon pour une intégration parfaite dans n'importe quel tableau de bord moderne.

## 📸 Aperçu

| Production Solaire & Objectifs | Météo & Éléments |
| :---: | :---: |
| ![Solaire Principal](https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/asolar.png) | ![Météo et Lune](https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/asolar1.png) |

| Détails des Panneaux | Vue Globale Interface |
| :---: | :---: |
| ![Détails Panneaux](https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/asolar2.png) | ![Interface Complète](https://raw.githubusercontent.com/xez7082/solar-master-card/main/img/asolar3.png) |

---

## ✨ Fonctionnalités clés

### 🔋 Gestion Solaire (Onglet 1)
- **Monitoring en temps réel** : Affichage massif de la production (W) avec indicateur de consommation réseau ou d'exportation.
- **Suivi des Objectifs** : Calcul automatique du pourcentage de réalisation de l'objectif mensuel avec barre de progression segmentée.
- **Cercles Néon XL** : Visualisation de jusqu'à 4 chaînes de panneaux avec des diamètres de 82px pour une lecture parfaite.
- **Grille de Données** : 6 emplacements pour des capteurs de performance (Énergie totale, Intensité, Volts, etc.).

### ☁️ Station Météo (Onglet 2)
- **Arc Solaire Dynamique** : Visualisation de la course du soleil, de l'élévation en degrés et des heures précises de lever/coucher.
- **Phase Lunaire Intelligente** : Traduction automatique des phases de la lune en français (ex: "Gibbeuse croissante").
- **Grille 3x3 de Capteurs** : 9 icônes et valeurs agrandies pour la température, l'humidité, le vent, les UV, etc.

---

## 🚀 Installation

### Méthode 1 : Via HACS (Recommandé)

1. Ouvrez **HACS** dans votre instance Home Assistant.
2. Cliquez sur les **trois petits points** en haut à droite et choisissez **Dépôts personnalisés**.
3. Copiez l'URL de ce dépôt GitHub : `https://github.com/xez7082/solar-master-card`
4. Sélectionnez la catégorie **Lovelace** et cliquez sur **Ajouter**.
5. Recherchez la carte `Solar Master Card` dans l'interface HACS et cliquez sur **Télécharger**.
6. Une fois le téléchargement terminé, cliquez sur **Recharger** (ou videz le cache de votre navigateur).

---

### Méthode 2 : Installation Manuelle

1. Téléchargez le fichier `solar-master-card.js` depuis ce dépôt.
2. Copiez le fichier dans votre dossier `/config/www/`.
3. Ajoutez la ressource dans votre tableau de bord Home Assistant :
   - **Paramètres** > **Tableaux de bord** > **Ressources**.
   - URL : `/local/solar-master-card.js`
   - Type : `JavaScript Module`.

---

## ⚙️ Configuration YAML (Exemple)

```yaml
type: custom:solar-master-card
title: "Mon Énergie"
# --- Solaire ---
total_now: sensor.production_actuelle_w
solar_target: sensor.objectif_mensuel_kwh
conso_entity: sensor.compteur_linky_power # + pour import, - pour export
# Panneaux (Cercles)
p1_w: sensor.panneaux_sud_watts
p1_name: "SUD"
p2_w: sensor.panneaux_ouest_watts
p2_name: "OUEST"
# --- Météo ---
moon_entity: sensor.moon_phase
w1_e: sensor.ext_temp
w1_l: "Temp"
w1_i: "mdi:thermometer"
w2_e: sensor.ext_hum
w2_l: "Humidité"
w2_i: "mdi:water-percent"
