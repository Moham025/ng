// --- headerUpdater.js ---
// Gère l'horloge, le message d'accueil, le thème sombre et l'effet neige

// Import des détails utilisateur depuis auth.js
import { currentUserDetails } from './auth.js';
// Import de la fonction de mise à jour du thème du graphique
import { updateChartTheme } from './uiUpdater.js';

const timeElement = document.querySelector('.current-time');
const dateElement = document.querySelector('.current-date');
const greetingElement = document.querySelector('.greeting-text');
const quoteElement = document.querySelector('.inspiration-quote p');
const themeToggle = document.querySelector('.theme-toggle');
const body = document.body;
let snowStyleAdded = false;

// Motivations (peut être dans un fichier séparé si ça grandit)
const motivationsByTime = {
    lateNight: ["Nuit blanche ?", "Les idées brillantes naissent la nuit.", "Votre projet avance !"],
    earlyMorning: ["Le monde vous appartient !", "Prêt à coder ?", "Nouvelle journée, nouvelles opportunités !"],
    morning: ["Concentration maximale !", "En pleine lancée !", "Chaque tâche est une victoire."],
    lunch: ["Petite pause ?", "Rechargez les batteries !", "Esprit reposé, esprit productif."],
    afternoon: ["Gardez le rythme !", "La ligne d'arrivée approche !", "Votre détermination fait la différence."],
    evening: ["Journée productive.", "Moment de décompresser.", "Reposez-vous bien."]
};
const quotesByTime = {
     lateNight: ["Même la nuit la plus sombre prendra fin.", "Le succès est la somme de petits efforts.", "La persévérance n'est pas une longue course."],
     earlyMorning: ["Le meilleur moment est maintenant.", "Votre avenir se crée aujourd'hui.", "Le bonheur est la clé du succès."],
     morning: ["Aimez ce que vous faites.", "Créez l'opportunité.", "L'imagination vous mènera partout."],
     lunch: ["Prendre une pause fait aller plus vite.", "Le travail acharné mérite récompense.", "Équilibrez travail et repos."],
     afternoon: ["Faites comme l'horloge, continuez.", "La différence est ce petit 'extra'.", "Le travail d'équipe gagne."],
     evening: ["Soyez satisfait de votre journée.", "Le soir révèle.", "La réflexion est la clé."]
};


function getRandomElement(arr) {
    return arr && arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : null;
}

function getTimeBasedGreetingIntro() {
    const hour = new Date().getHours();
    if (hour < 5) return "Bonne nuit";
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
}

export function updateClockAndGreeting() {
    if (!timeElement || !dateElement || !greetingElement || !quoteElement) return;

    const now = new Date();
    const hour = now.getHours();

    // Update Time/Date
    timeElement.textContent = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    dateElement.textContent = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Determine time period
    let period = 'evening'; // Default
    if (hour >= 2 && hour < 5) period = 'lateNight';
    else if (hour >= 5 && hour < 9) period = 'earlyMorning';
    else if (hour >= 9 && hour < 12) period = 'morning';
    else if (hour >= 12 && hour < 14) period = 'lunch';
    else if (hour >= 14 && hour < 18) period = 'afternoon';

    // Select random motivation and quote
    const randomMotivation = getRandomElement(motivationsByTime[period]) || "Prêt à travailler!";
    const randomQuote = getRandomElement(quotesByTime[period]) || "Chaque jour est une nouvelle opportunité.";

    // Update Greeting (handles logged in/out via currentUserDetails)
    const intro = getTimeBasedGreetingIntro();
    const userNamePart = currentUserDetails.isLoggedIn ? ` ${currentUserDetails.firstName || 'Utilisateur'},` : ','; // Add space and comma if logged in
    const motivationSpan = greetingElement.querySelector('span');
    // Update only the motivation part if the span exists, otherwise rebuild
    if (motivationSpan) {
         greetingElement.childNodes[0].nodeValue = `${intro}${userNamePart}`; // Update text before <br>
         motivationSpan.textContent = randomMotivation;
    } else {
         greetingElement.innerHTML = `${intro}${userNamePart}<br><span>${randomMotivation}</span>`;
    }


    // Update Sidebar Quote
    quoteElement.textContent = randomQuote;
}

function createSnow() {
    if (document.querySelector('.snowflakes')) return;

    const snowflakes = document.createElement('div');
    snowflakes.className = 'snowflakes';
    snowflakes.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:999;'; // Combined styles

    for (let i = 0; i < 50; i++) {
        const sf = document.createElement('div');
        sf.innerHTML = '❄';
        const size = Math.random() * 10 + 10;
        const opacity = Math.random() * 0.7 + 0.3;
        const duration = Math.random() * 5 + 5;
        const delay = Math.random() * 5;
        sf.style.cssText = `position:absolute; color:#fff; opacity:${opacity}; font-size:${size}px; animation:fall ${duration}s linear infinite; animation-delay:${delay}s; left:${Math.random()*100}vw; top:-20px;`;
        snowflakes.appendChild(sf);
    }

    if (!snowStyleAdded) {
        const style = document.createElement('style');
        style.textContent = `@keyframes fall { to { transform: translateY(100vh) rotate(360deg); opacity: 0; } }`;
        document.head.appendChild(style);
        snowStyleAdded = true;
    }
    body.appendChild(snowflakes);
}

function removeSnow() {
    const snow = document.querySelector('.snowflakes');
    if (snow) snow.remove();
}

export function toggleDarkMode() {
    body.classList.toggle('dark-mode');
    const isDarkMode = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);

    // Animation et effet neige
    if (themeToggle) {
        themeToggle.style.transform = 'rotate(360deg) scale(1.2)';
        setTimeout(() => themeToggle.style.transform = '', 500);
    }
    isDarkMode ? createSnow() : removeSnow();
    updateChartTheme(); // Met à jour le thème du graphique
}

export function initTheme() {
     const savedDarkMode = localStorage.getItem('darkMode') === 'true';
     if (savedDarkMode) {
         body.classList.add('dark-mode');
         createSnow();
     }
}

export function startClock() {
     updateClockAndGreeting(); // Call immediately
     setInterval(updateClockAndGreeting, 60000); // Then update every minute
}