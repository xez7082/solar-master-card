/* Conteneur principal du cercle */
.center-gauge { 
  position: relative; 
  width: 150px; 
  height: 150px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
}

/* L'anneau extérieur avec l'animation de rotation */
.outer-ring { 
  position: absolute; 
  width: 100%; 
  height: 100%; 
  border-radius: 50%; 
  border: 2px solid transparent; 
  border-top: 2px solid var(--accent); 
  border-bottom: 2px solid var(--accent); 
  animation: rotate 5s linear infinite; 
  opacity: 0.4; 
}

/* Le cercle intérieur fixe */
.inner-circle { 
  width: 125px; 
  height: 125px; 
  background: rgba(255,255,255,0.03); 
  border-radius: 50%; 
  border: 1px solid rgba(255,255,255,0.1); 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
}

/* Style de la valeur numérique (Température) */
.water-val { 
  font-size: 48px; 
  font-weight: 100; 
  color: var(--accent); 
  text-shadow: 0 0 15px rgba(0,249,249,0.4); 
}

/* L'animation qui fait tourner l'anneau */
@keyframes rotate { 
  from { transform: rotate(0deg); } 
  to { transform: rotate(360deg); } 
}
