// --- main.js ---
// Point d'entrée principal, initialisation, orchestration

// Imports fondamentaux
import { initAuth } from './auth.js'; // Initialisation de l'observateur Auth
import { loadData } from './dataManager.js';
import { initTheme, startClock, toggleDarkMode } from './headerUpdater.js';
import { displayClients, displayProjets, displayTransactions, displayArchives } from './uiDisplay.js';
import { updateClientSelect, updateProjetSelect, updateDocProjetSelects, updateStatProjetsCount, updateChiffreAffairesPeriode, displayMonthlyIncomeChart } from './uiUpdater.js';
import { initArchiveButtons } from './archiveManager.js';
import { initSearch } from './searchManager.js';
// Note: Les Form Handlers s'auto-initialisent ou sont déclenchés par des boutons

// --- Fonction de Rafraîchissement Global ---
// Doit être exportée car utilisée par les form handlers après ajout/modif
export function refreshUI() {
    console.log("Rafraîchissement UI...");
    // Affichages des listes
    displayClients();
    displayProjets();
    displayTransactions();
    displayArchives(); // Affiche les archives (Factures par défaut)

    // Mises à jour des sélecteurs
    updateClientSelect();
    updateProjetSelect();
    updateDocProjetSelects();

    // Mises à jour des statistiques
    updateStatProjetsCount();
    updateChiffreAffairesPeriode();

    // Mise à jour du graphique
    displayMonthlyIncomeChart();
    console.log("UI Rafraîchie.");
}


// --- Gestion des Onglets ---
function initTabs() {
    const tabs = document.querySelectorAll('.sidebar .tab'); // Plus spécifique
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.target;
            if (!targetId) return;
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                document.querySelectorAll('.tab-content.active, .sidebar .tab.active').forEach(el => el.classList.remove('active'));
                tab.classList.add('active');
                targetElement.classList.add('active');
                 // Si on va sur Archives, s'assurer que la sous-tab Factures est active et affichée
                 if (targetId === '#archives') {
                    const factureFilterBtn = document.querySelector('.archive-filter-btn[data-filter="F"]');
                    if (factureFilterBtn && !factureFilterBtn.classList.contains('active')) {
                         document.querySelectorAll('.archive-filter-btn').forEach(btn => btn.classList.remove('active'));
                         factureFilterBtn.classList.add('active');
                         displayArchives('F'); // Réaffiche les factures
                    }
                 }

            } else {
                console.error(`Élément cible ${targetId} non trouvé.`);
            }
        });
    });

    // Activer l'onglet Accueil par défaut
    const accueilTabButton = document.querySelector('.sidebar .tab[data-target="#accueil"]');
    const accueilContent = document.querySelector('#accueil');
    if (accueilTabButton && accueilContent) {
        document.querySelectorAll('.tab-content.active, .sidebar .tab.active').forEach(el => el.classList.remove('active'));
        accueilTabButton.classList.add('active');
        accueilContent.classList.add('active');
    } else {
        console.error("Onglet/Contenu Accueil non trouvé pour l'initialisation.");
    }
}


// --- Initialisation au chargement de la page ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("DOM chargé, initialisation de main.js...");

    // 1. Initialiser le thème AVANT de charger les données (pour éviter le flash blanc)
    initTheme();

    // 2. Initialiser l'authentification (met à jour l'UI selon l'état connecté/déconnecté)
    // Note: initAuth (anciennement onAuthStateChanged) mettra à jour l'accueil etc.
    initAuth(); // Défini dans auth.js, s'assure que l'état est connu

    // 3. Charger les données depuis Firestore
    await loadData();

    // 4. Initialiser l'UI principale (onglets, affichages, stats, etc.)
    initTabs();
    refreshUI(); // Affichage initial basé sur les données chargées

    // 5. Démarrer l'horloge et le message d'accueil
    startClock(); // Géré dans headerUpdater.js

    // 6. Initialiser les boutons d'archive et la recherche
    initArchiveButtons(); // Géré dans archiveManager.js
    initSearch(); // Géré dans searchManager.js

    // 7. Ajouter écouteur pour le bouton Thème
    const themeToggle = document.querySelector('.theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleDarkMode); // toggleDarkMode est dans headerUpdater.js
    }

    // Effet de fondu général (peut être gardé ou retiré)
    document.body.style.opacity = '0';
    document.body.style.transition = 'opacity 0.5s ease-in-out';
    requestAnimationFrame(() => {
         document.body.style.opacity = '1';
    });


    console.log("Initialisation de main.js terminée.");

}); // Fin DOMContentLoaded