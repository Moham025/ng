// --- app.js ---
// Fichier principal : gestion des données, affichage, onglets, suppressions, initialisation

// Import Firestore functions and db instance
import { db } from './firebase-config.js';
import {
    collection, getDocs, doc, deleteDoc, query, where, orderBy, serverTimestamp, getDoc, addDoc // Added addDoc here
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Import document generation functions
import { generateFacture } from './generateFacture.js';
import { generateRecu } from './generateRecu.js';

// --- Gestion des onglets ---
// (Keep existing tab management code)
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetElement = document.querySelector(tab.dataset.target);
        if (targetElement) {
            document.querySelectorAll('.tab-content, .tab').forEach(el => el.classList.remove('active'));
            tab.classList.add('active');
            targetElement.classList.add('active');
        } else {
            console.error(`Élément cible ${tab.dataset.target} non trouvé pour l'onglet.`);
        }
    });
});
const accueilTabButton = document.querySelector('[data-target="#accueil"]');
if (accueilTabButton) {
     document.querySelectorAll('.tab-content, .tab').forEach(el => el.classList.remove('active'));
     accueilTabButton.classList.add('active');
     const accueilContent = document.querySelector('#accueil');
     if(accueilContent) accueilContent.classList.add('active');
} else {
    console.error("Onglet Accueil non trouvé pour l'initialisation.");
}


// --- Données Principales (will be populated from Firestore) ---
let clients = [];
let projets = [];
let transactions = [];
let archives = []; // New array for archives

// --- Firestore Collection References ---
const clientsCollection = collection(db, "clients");
const projetsCollection = collection(db, "projets");
const transactionsCollection = collection(db, "transactions");
const archivesCollection = collection(db, "archives"); // New collection ref

// --- Fonction pour charger les données depuis Firestore ---
async function loadData() {
    console.log("Chargement des données depuis Firestore...");
    try {
        // Fetch Clients, order by creation date if available, otherwise by structuredId
        const clientQuery = query(clientsCollection, orderBy("dateCreation", "asc")); // Assuming dateCreation exists
        const clientSnapshot = await getDocs(clientQuery);
        clients = clientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Clients chargés:", clients.length);

        // Fetch Projets
        const projetQuery = query(projetsCollection, orderBy("dateCreation", "asc"));
        const projetSnapshot = await getDocs(projetQuery);
        projets = projetSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Projets chargés:", projets.length);

        // Fetch Transactions
        const transactionQuery = query(transactionsCollection, orderBy("dateCreation", "asc"));
        const transactionSnapshot = await getDocs(transactionQuery);
        transactions = transactionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Transactions chargées:", transactions.length);

        // Fetch Archives
        const archiveQuery = query(archivesCollection, orderBy("dateArchivage", "desc")); // Order by archive date
        const archiveSnapshot = await getDocs(archiveQuery);
        archives = archiveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log("Archives chargées:", archives.length);


        console.log("Données chargées avec succès depuis Firestore.");

    } catch (error) {
        console.error("Erreur lors du chargement des données depuis Firestore:", error);
        alert("Erreur de chargement des données. Vérifiez la console.");
        // Initialize with empty arrays to prevent further errors
        clients = [];
        projets = [];
        transactions = [];
    }
}

// --- Utilitaires - Fonctions de génération d'ID structuré ---
// (Keep existing structured ID generation functions: getCurrentYearAA, generateClientId, generateProjetId, generateTransactionId)
function getCurrentYearAA() {
    return new Date().getFullYear().toString().slice(-2);
}
// IMPORTANT: These functions now operate on the local arrays (clients, projets, transactions)
// which must be loaded *before* these functions are called to generate a *new* ID.
function generateClientId(yearAA, existingClients) {
    const prefix = `CL-${yearAA}-`;
    let maxNN = 0;
    existingClients.forEach(client => {
        // Use structuredId for comparison
        if (client.structuredId && client.structuredId.startsWith(prefix)) {
            const nn = parseInt(client.structuredId.substring(prefix.length), 10);
            if (!isNaN(nn) && nn > maxNN) {
                maxNN = nn;
            }
        }
    });
    const nextNN = (maxNN + 1).toString().padStart(2, '0');
    return `${prefix}${nextNN}`;
}
function generateProjetId(yearAA, clientStructuredId, existingProjets) { // Takes clientStructuredId
    const prefix = `P-${yearAA}-${clientStructuredId}-`;
    let maxPP = 0;
    existingProjets.forEach(projet => {
        if (projet.structuredId && projet.structuredId.startsWith(prefix)) {
            const parts = projet.structuredId.split('-');
            const pp = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(pp) && pp > maxPP) {
                maxPP = pp;
            }
        }
    });
    const nextPP = (maxPP + 1).toString().padStart(2, '0');
    return `${prefix}${nextPP}`;
}
function generateTransactionId(yearAA, projetStructuredId, existingTransactions) { // Takes projetStructuredId
    const prefix = `TR-${yearAA}-${projetStructuredId}-`;
    let maxXXX = 0;
    existingTransactions.forEach(transaction => {
        if (transaction.structuredId && transaction.structuredId.startsWith(prefix)) {
            const parts = transaction.structuredId.split('-');
            const xxx = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(xxx) && xxx > maxXXX) {
                maxXXX = xxx;
            }
        }
    });
    const nextXXX = (maxXXX + 1).toString().padStart(3, '0');
    return `${prefix}${nextXXX}`;
}

// Génère le prochain ID Archive (Facture/Reçu) pour l'année et le projet donnés
function generateArchiveId(type, yearAA, projetStructuredId, existingArchives) { // type is 'F' or 'R'
    const prefix = `${type}-${yearAA}-${projetStructuredId}-`;
    let maxXXX = 0;
    existingArchives.forEach(archive => {
        // Check if the archive ID starts with the correct prefix for the *same project* and *same type*
        if (archive.archiveId && archive.archiveId.startsWith(prefix)) {
             const parts = archive.archiveId.split('-');
             const xxx = parseInt(parts[parts.length - 1], 10);
             if (!isNaN(xxx) && xxx > maxXXX) {
                 maxXXX = xxx;
             }
        }
    });
    const nextXXX = (maxXXX + 1).toString().padStart(3, '0');
    return `${prefix}${nextXXX}`;
}


// --- Fonctions de Mise à Jour des Sélecteurs ---
// Update selects to use Firestore ID as value and store structuredId
function updateClientSelect() {
    const select = document.getElementById('clientSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Choisir un client...</option>';
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id; // Firestore auto-ID
        option.textContent = `${client.nom} ${client.prenom} (${client.structuredId || 'N/A'})`; // Display name + structured ID
        option.dataset.structuredId = client.structuredId; // Store structuredId in data attribute
        select.appendChild(option);
    });
}

async function updateProjetSelect() { // Made async as it might need client data
    const select = document.getElementById('projetSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Choisir un projet...</option>';

    // Ensure clients are loaded if needed, or assume they are from global scope
    if (clients.length === 0) {
        console.warn("Tentative de mise à jour du sélecteur de projets sans clients chargés.");
        // Optionally, await loadData() here if this function could be called before initial load
    }

    projets.forEach(projet => {
        // Find client in the globally loaded array using Firestore client ID
        const client = clients.find(c => c.id === projet.clientId); // Match Firestore IDs
        const option = document.createElement('option');
        option.value = projet.id; // Firestore auto-ID
        option.textContent = `${projet.nom} (${client?.nom || 'Client inconnu'}) - ${projet.structuredId || 'N/A'}`; // Display name + structured ID
        option.dataset.structuredId = projet.structuredId; // Store structuredId
        select.appendChild(option);
    });
}

async function updateDocProjetSelects() { // Made async
    const select = document.getElementById('projetDocument');
    if (!select) return;
    select.innerHTML = '<option value="">Choisir un projet...</option>';

    if (clients.length === 0) {
        console.warn("Tentative de mise à jour du sélecteur de documents sans clients chargés.");
    }

    projets.forEach(projet => {
        const client = clients.find(c => c.id === projet.clientId); // Match Firestore IDs
        const option = document.createElement('option');
        option.value = projet.id; // Firestore auto-ID
        option.textContent = `${projet.nom} (${client?.nom || 'Client inconnu'}) - ${projet.structuredId || 'N/A'}`; // Display name + structured ID
        // No need for structuredId dataset here unless generateFacture/Recu needs it directly from the option
        select.appendChild(option);
    });
}

// --- Fonctions de Mise à Jour des Stats (Keep existing, they use the global arrays) ---
function updateStatProjetsCount() {
    const statElement = document.getElementById('projetsEnCoursCount');
    if (statElement) {
        statElement.textContent = projets.length;
    } else {
        console.warn("L'élément avec l'ID 'projetsEnCoursCount' n'a pas été trouvé dans le DOM.");
    }
}

// Renamed function for Total Revenue
function updateChiffreAffairesTotal() {
    const caElement = document.getElementById('chiffreAffairesTotalValue'); // Updated ID
    if (caElement) {
        const totalTransactions = transactions.reduce((sum, t) => sum + parseFloat(t.montant || 0), 0);
        const formattedTotal = totalTransactions.toLocaleString('fr-FR');
        caElement.textContent = `${formattedTotal} Fcfa`;
    } else {
        console.warn("L'élément avec l'ID 'chiffreAffairesTotalValue' n'a pas été trouvé dans le DOM.");
    }
}

// New function for Monthly and Yearly Revenue
function updateChiffreAffairesPeriode() {
    const caMoisValueElement = document.getElementById('chiffreAffairesMoisValue');
    const caAnneeValueElement = document.getElementById('chiffreAffairesAnneeValue');
    const caMoisLabelElement = document.getElementById('caMoisLabel'); // Get label element
    const caAnneeLabelElement = document.getElementById('caAnneeLabel'); // Get label element

    // Check if all elements exist
    if (!caMoisValueElement || !caAnneeValueElement || !caMoisLabelElement || !caAnneeLabelElement) {
        console.warn("Un ou plusieurs éléments pour le chiffre d'affaires (valeur ou libellé) non trouvés.");
        return;
    }

    const now = new Date();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentYear = now.getFullYear();
    const currentMonthName = now.toLocaleDateString('fr-FR', { month: 'long' });
    const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

    // Update Labels
    caMoisLabelElement.textContent = `Chiffre d'affaires du mois de ${capitalizedMonth}`;
    caAnneeLabelElement.textContent = `Chiffre d'affaires de l'année ${currentYear}`;


    let totalMois = 0;
    let totalAnnee = 0;

    transactions.forEach(t => {
        if (t.date) { // Check if date exists
            try {
                // Important: Create date in UTC to avoid timezone issues with YYYY-MM-DD
                const transactionDate = new Date(t.date + 'T00:00:00Z');
                const transactionMonth = transactionDate.getUTCMonth();
                const transactionYear = transactionDate.getUTCFullYear();
                const montant = parseFloat(t.montant || 0);

                if (transactionYear === currentYear) {
                    totalAnnee += montant;
                    if (transactionMonth === currentMonth) {
                        totalMois += montant;
                    }
                }
            } catch (e) {
                console.error(`Erreur de parsing de date pour la transaction ${t.id || t.structuredId}: ${t.date}`, e);
            }
        }
    });

    const formattedMois = totalMois.toLocaleString('fr-FR');
    const formattedAnnee = totalAnnee.toLocaleString('fr-FR');

    // Update Values
    caMoisValueElement.textContent = `${formattedMois} Fcfa`;
    caAnneeValueElement.textContent = `${formattedAnnee} Fcfa`;
}

// --- Fonctions d'Affichage (Update to use structuredId for display, id for data attributes) ---
function displayClients() {
    const container = document.getElementById('clientsList');
    if (!container) return;
    // Sorting might need adjustment if dateCreation isn't always set reliably at first
    const sortedClients = [...clients].sort((a, b) => (a.dateCreation?.toDate?.() || 0) - (b.dateCreation?.toDate?.() || 0));

    container.innerHTML = sortedClients.map((client, index) => {
        // Handle Firestore Timestamp for dateCreation
        let formattedDate = 'N/A';
        if (client.dateCreation && typeof client.dateCreation.toDate === 'function') {
            formattedDate = client.dateCreation.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else if (client.dateCreation) { // Fallback if it's already a string/date object somehow
             try { formattedDate = new Date(client.dateCreation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch(e){}
        }

        return `
        <div class="item client-card" data-client-id="${client.id}"> <!-- Use Firestore ID -->
            <span class="client-info client-number">${index + 1}</span>
            <span class="client-info client-id">${client.structuredId || 'ID Manquant'}</span> <!-- Display Structured ID -->
            <span class="client-info client-nom">${client.nom}</span>
            <span class="client-info client-prenom">${client.prenom}</span>
            <span class="client-info client-tel">${client.telephone || 'N/A'}</span>
            <span class="client-info client-date">${formattedDate}</span>
            <button class="delete-client-btn" data-client-id="${client.id}" title="Supprimer client">🗑️</button> <!-- Use Firestore ID -->
        </div>
        `;
    }).join('');
}

function displayProjets() {
    const container = document.getElementById('projetsList');
    if (!container) return;
    const sortedProjets = [...projets].sort((a, b) => (a.dateCreation?.toDate?.() || 0) - (b.dateCreation?.toDate?.() || 0));

    container.innerHTML = sortedProjets.map((projet, index) => {
        const client = clients.find(c => c.id === projet.clientId); // Match Firestore IDs
        const projetTransactions = transactions.filter(t => t.projetId === projet.id); // Match Firestore IDs
        const totalPaye = projetTransactions.reduce((sum, t) => sum + parseFloat(t.montant || 0), 0);
        const resteAPayer = (projet.cout || 0) - totalPaye;

        let formattedDate = 'N/A';
        if (projet.dateCreation && typeof projet.dateCreation.toDate === 'function') {
            formattedDate = projet.dateCreation.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } else if (projet.dateCreation) {
             try { formattedDate = new Date(projet.dateCreation).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch(e){}
        }
        let formattedDateDebut = 'N/A';
         if (projet.dateDebut) { // Assuming dateDebut is stored as 'YYYY-MM-DD' string
             try { formattedDateDebut = new Date(projet.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch(e){}
         }


        return `
        <div class="item projet-card" data-projet-id="${projet.id}"> <!-- Use Firestore ID -->
            <span class="projet-info projet-number">${index + 1}</span>
            <span class="projet-info projet-id">${projet.structuredId || 'ID Manquant'}</span> <!-- Display Structured ID -->
            <span class="projet-info projet-nom">${projet.nom}</span>
            <span class="projet-info projet-client">${client?.nom || 'N/A'} ${client?.prenom || ''}</span>
            <span class="projet-info projet-cout">${parseFloat(projet.cout || 0).toLocaleString('fr-FR')} Fcfa</span>
            <span class="projet-info projet-reste ${resteAPayer > 0 ? 'reste-positif' : ''}">${resteAPayer.toLocaleString('fr-FR')} Fcfa</span>
            <span class="projet-info projet-date">${formattedDate}</span>
            <button class="delete-projet-btn" data-projet-id="${projet.id}" title="Supprimer projet">🗑️</button> <!-- Use Firestore ID -->
        </div>
        `;
    }).join('');
}

function displayTransactions() {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    const sortedTransactions = [...transactions].sort((a, b) => (a.dateCreation?.toDate?.() || 0) - (b.dateCreation?.toDate?.() || 0));

    container.innerHTML = sortedTransactions.map((transaction, index) => {
        const projet = projets.find(p => p.id === transaction.projetId); // Match Firestore IDs
        const client = clients.find(c => c.id === projet?.clientId); // Match Firestore IDs

        let formattedDate = 'N/A';
         if (transaction.date) { // Assuming date is stored as 'YYYY-MM-DD' string
             try { formattedDate = new Date(transaction.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch(e){}
         }

        return `
        <div class="item transaction-card" data-transaction-id="${transaction.id}"> <!-- Use Firestore ID -->
            <span class="transaction-info transaction-number">${index + 1}</span>
            <span class="transaction-info transaction-id">${transaction.structuredId || 'ID Manquant'}</span> <!-- Display Structured ID -->
            <span class="transaction-info transaction-projet">${projet?.nom || 'Projet Supprimé'}</span>
            <span class="transaction-info transaction-client">${client?.nom || 'Client Supprimé'} ${client?.prenom || ''}</span>
            <span class="transaction-info transaction-montant">${parseFloat(transaction.montant || 0).toLocaleString('fr-FR')} Fcfa</span>
            <span class="transaction-info transaction-date">${formattedDate}</span>
            <button class="delete-transaction-btn" data-transaction-id="${transaction.id}" title="Supprimer transaction">🗑️</button> <!-- Use Firestore ID -->
        </div>
        `;
    }).join('');
}

// --- Fonction d'Affichage des Archives (avec filtre et compte) ---
function displayArchives(filterType = 'F') { // Default to Factures ('F')
    const container = document.getElementById('archivesList');
    const factureCountSpan = document.getElementById('factureCount');
    const recuCountSpan = document.getElementById('recuCount');

    if (!container || !factureCountSpan || !recuCountSpan) {
        console.warn("Éléments pour l'affichage des archives ou des comptes non trouvés.");
        return;
    }

    // Calculate counts BEFORE filtering for display
    const factureCount = archives.filter(a => a.type === 'F').length;
    const recuCount = archives.filter(a => a.type === 'R').length;

    // Update count display
    factureCountSpan.textContent = `(${factureCount})`;
    recuCountSpan.textContent = `(${recuCount})`;

    // Filter archives based on the selected type for display
    const filteredArchives = archives.filter(archive => archive.type === filterType);

    // Sort filtered archives, e.g., by archive date descending
    const sortedArchives = [...filteredArchives].sort((a, b) => (b.dateArchivage?.toDate?.() || 0) - (a.dateArchivage?.toDate?.() || 0));

    container.innerHTML = sortedArchives.map((archive, index) => {
        // Keep the existing mapping logic
        let formattedDate = 'N/A';
        if (archive.dateArchivage && typeof archive.dateArchivage.toDate === 'function') {
            formattedDate = archive.dateArchivage.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        const docType = archive.type === 'F' ? 'Facture' : (archive.type === 'R' ? 'Reçu' : 'Document');
        const projet = projets.find(p => p.id === archive.projetId); // Find project by Firestore ID

        return `
        <div class="item archive-card" data-archive-id="${archive.id}">
            <span class="archive-info archive-number">${index + 1}</span>
            <span class="archive-info archive-id">${archive.archiveId || 'ID Manquant'}</span>
            <span class="archive-info archive-type">${docType}</span>
            <span class="archive-info archive-projet">${projet?.nom || 'Projet Supprimé'} (${projet?.structuredId || 'N/A'})</span>
            <span class="archive-info archive-date">${formattedDate}</span>
            <button class="view-archive-btn" data-archive-id="${archive.id}" title="Voir Archive">👁️</button>
            <button class="delete-archive-btn" data-archive-id="${archive.id}" title="Supprimer Archive">🗑️</button>
        </div>
        `;
    }).join('');

    // Add event listeners for view/delete archive buttons after rendering
    addArchiveButtonListeners();
}

// --- Gestion des Suppressions (Update to use Firestore deleteDoc and async) ---

// Helper function to refresh UI after deletion or addition
function refreshUI() {
    displayClients();
    displayProjets();
    displayTransactions();
    displayArchives('F'); // Default to showing Factures on refresh
    updateClientSelect();
    updateProjetSelect();
    updateDocProjetSelects();
    updateStatProjetsCount();
    updateChiffreAffairesTotal(); // Updated function call (though element might be hidden)
    updateChiffreAffairesPeriode(); // Added function call
    displayMonthlyIncomeChart(); // Add chart display call
}


// --- Clock, Greeting, and Theme Toggle Logic (from code.js) ---

// Function to update clock and greeting
function updateClockAndGreeting() { // Keep this function as defined
    const now = new Date();
    const timeElement = document.querySelector('.current-time');
    const dateElement = document.querySelector('.current-date');
    const greetingElement = document.querySelector('.greeting-text'); // Target the container
    const quoteElement = document.querySelector('.inspiration-quote p'); // Target the quote paragraph

    if (!timeElement || !dateElement || !greetingElement || !quoteElement) {
        // console.warn("Clock, date, greeting, or quote element not found.");
        return; // Don't run if elements aren't ready
    }

    // Formatting options
    const timeOptions = {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };

    // Update time and date
    timeElement.textContent = now.toLocaleTimeString('fr-FR', timeOptions);
    dateElement.textContent = now.toLocaleDateString('fr-FR', dateOptions);

    // Motivational messages based on time
    const hour = now.getHours();
    // let greetingIntro = "Bonjour,"; // Intro is now handled by auth.js
    let motivations = []; // Header motivation
    let quoteMotivations = []; // Sidebar quote

    // --- Creative & Time-Specific Messages ---
    if (hour >= 2 && hour < 5) { // Late Night / Early Morning (2am - 4:59am)
        motivations = [
            "Nuit blanche ? Le repos prépare les victoires de demain.",
            "Les idées les plus brillantes naissent souvent dans le calme de la nuit.",
            "Chaque ligne de code vous rapproche du succès.",
            "Le monde dort, mais votre projet avance !",
            "Courage pour ces dernières heures de travail !"
        ];
        quoteMotivations = [
            "Même la nuit la plus sombre prendra fin et le soleil se lèvera.",
            "Le succès est la somme de petits efforts répétés jour après jour... et nuit après nuit.",
            "La persévérance n'est pas une longue course, c'est beaucoup de petites courses les unes après les autres.",
            "Les grands esprits ont toujours rencontré une opposition farouche des esprits médiocres."
        ];
    } else if (hour >= 5 && hour < 9) { // Early Morning (5am - 8:59am)
        motivations = [
            "Le monde vous appartient !",
            "Prêt à transformer le café en code ?",
            "Une nouvelle journée, de nouvelles opportunités !",
            "Que l'inspiration soit avec vous ce matin !",
            "Commencez fort, terminez fier !"
        ];
        quoteMotivations = [
            "Le meilleur moment pour planter un arbre était il y a 20 ans. Le deuxième meilleur moment est maintenant.",
            "Votre avenir est créé par ce que vous faites aujourd'hui, pas demain.",
            "Le succès n'est pas la clé du bonheur. Le bonheur est la clé du succès.",
            "Fixez vos objectifs haut et ne vous arrêtez pas avant d'y être arrivé."
        ];
    } else if (hour >= 9 && hour < 12) { // Morning (9am - 11:59am)
        motivations = [
            "Concentration maximale !",
            "En pleine lancée vers le succès !",
            "Chaque tâche accomplie est une victoire.",
            "Continuez sur cette belle dynamique !",
            "Votre potentiel est illimité."
        ];
        quoteMotivations = [
            "La seule façon de faire du bon travail est d'aimer ce que vous faites.",
            "N'attendez pas l'opportunité. Créez-la.",
            "La logique vous mènera d'un point A à un point B. L'imagination vous mènera partout.",
            "Il n'y a qu'une seule façon d'échouer, c'est d'abandonner avant d'avoir réussi."
        ];
    } else if (hour >= 12 && hour < 14) { // Lunch Time (12pm - 1:59pm)
        motivations = [
            "Petite pause bien méritée ?",
            "Rechargez les batteries pour l'après-midi !",
            "Un esprit reposé est un esprit productif.",
            "Bon appétit si c'est l'heure !",
            "Prenez un moment pour souffler."
        ];
        quoteMotivations = [
            "Prendre une pause peut vous faire aller plus vite.",
            "Le travail acharné mérite une récompense.",
            "Équilibrez travail et repos pour une performance durable.",
            "Le succès, c'est d'aller d'échec en échec sans perdre son enthousiasme."
        ];
    } else if (hour >= 14 && hour < 18) { // Afternoon (2pm - 5:59pm)
         motivations = [
            "Gardez le rythme cet après-midi !",
            "La ligne d'arrivée approche !",
            "Restez concentré sur vos objectifs.",
            "Votre détermination fait la différence.",
            "Terminez la journée en beauté !"
        ];
        quoteMotivations = [
            "Ne regardez pas l'horloge ; faites ce qu'elle fait. Continuez.",
            "La différence entre ordinaire et extraordinaire est ce petit 'extra'.",
            "Le talent gagne des matchs, mais le travail d'équipe et l'intelligence gagnent les championnats.",
            "Le seul endroit où le succès précède le travail est dans le dictionnaire."
        ];
    } else { // Evening/Night (6pm onwards, including 0am-1:59am)
        motivations = [
            "Une journée productive se termine.",
            "Le moment de décompresser est arrivé.",
            "Reposez-vous bien pour attaquer demain !",
            "Félicitations pour le travail accompli !",
            "Préparez déjà les succès de demain."
        ];
        quoteMotivations = [
            "Terminez chaque journée et soyez-en satisfait.",
            "Le soir révèle ce que la journée a caché.",
            "La réflexion est la clé de la progression.",
            "Le repos fait partie de l'entraînement.",
            "Ne rêvez pas votre vie, vivez vos rêves."
        ];
    }

    // Randomly select a motivation phrase for the header
    const randomMotivation = motivations.length > 0 ? motivations[Math.floor(Math.random() * motivations.length)] : "Prêt à travailler!";
    // Randomly select a quote for the sidebar
    const randomQuote = quoteMotivations.length > 0 ? quoteMotivations[Math.floor(Math.random() * quoteMotivations.length)] : "Chaque jour est une nouvelle opportunité.";

    // Removed duplicate declaration of randomQuote

    // Update greeting text (auth.js handles the intro + name part)
    const motivationSpan = greetingElement.querySelector('span');
    if (motivationSpan) {
        motivationSpan.textContent = randomMotivation;
    } else {
        // Fallback if span doesn't exist (shouldn't happen with current HTML)
        console.warn("Motivation span not found in greeting element.");
        // Optionally recreate it: greetingElement.innerHTML = `Bonjour,<br><span>${randomMotivation}</span>`; // Use a default intro if recreating
    }

    // Update the quote in the sidebar
    quoteElement.textContent = randomQuote;


    // Text animation (optional, can be added if desired)
    // greetingElement.style.animation = 'none';
    // void greetingElement.offsetWidth; // Trigger reflow
    // greetingElement.style.animation = 'textPop 0.5s ease';
}

// CSS animation for text pop (optional)
/*
const style = document.createElement('style');
style.textContent = `
    @keyframes textPop {
        0% { transform: scale(0.95); opacity: 0.8; }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); opacity: 1; }
    }
`;
document.head.appendChild(style);
*/

// updateClockAndGreeting(); // Initial call is handled in DOMContentLoaded

// Dark mode management
const themeToggle = document.querySelector('.theme-toggle'); // Keep selector
const body = document.body; // Keep selector

function toggleDarkMode() { // Keep this function as defined
    body.classList.toggle('dark-mode');

    // Save preference
    const isDarkMode = body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);

    // Special animation for the toggle button
    if (themeToggle) {
        themeToggle.style.transform = 'rotate(360deg) scale(1.2)';
        // themeToggle.style.boxShadow = '0 0 0 15px rgba(255, 215, 0, 0.3)'; // Optional shadow effect

        setTimeout(() => {
            themeToggle.style.transform = 'rotate(0) scale(1)';
            // themeToggle.style.boxShadow = 'none';
        }, 500);
    }

    // Update chart theme if chart instance exists
    if (monthlyChartInstance) {
        // Chart.js 3+ automatically adapts to CSS changes for colors usually.
        // If specific updates are needed based on theme:
        // monthlyChartInstance.options.scales.y.ticks.color = getComputedStyle(document.body).getPropertyValue('--text-color');
        // monthlyChartInstance.options.scales.x.ticks.color = getComputedStyle(document.body).getPropertyValue('--text-color');
        // monthlyChartInstance.update();
    }

    // Optional Snow Effect Trigger
    if (isDarkMode) {
        createSnow();
    } else {
        const snow = document.querySelector('.snowflakes');
        if (snow) snow.remove();
    }
}

// Event listener for theme toggle button - Moved to DOMContentLoaded

// Optional Snow Effect (from code.js)
let snowStyleAdded = false; // Keep flag
function createSnow() { // Keep this function as defined
    if (document.querySelector('.snowflakes')) return; // Don't create if already exists

    const snowflakes = document.createElement('div');
    snowflakes.className = 'snowflakes';
    snowflakes.style.position = 'fixed';
    snowflakes.style.top = '0';
    snowflakes.style.left = '0';
    snowflakes.style.width = '100%';
    snowflakes.style.height = '100%';
    snowflakes.style.pointerEvents = 'none';
    snowflakes.style.zIndex = '999'; // Below modal but above content

    for (let i = 0; i < 50; i++) {
        const snowflake = document.createElement('div');
        snowflake.innerHTML = '❄';
        snowflake.style.position = 'absolute';
        snowflake.style.color = '#ffffff';
        snowflake.style.opacity = Math.random() * 0.7 + 0.3;
        snowflake.style.fontSize = Math.random() * 10 + 10 + 'px';
        snowflake.style.animation = `fall ${Math.random() * 5 + 5}s linear infinite`;
        snowflake.style.animationDelay = Math.random() * 5 + 's';
        snowflake.style.left = Math.random() * 100 + 'vw';
        snowflake.style.top = '-20px'; // Start above screen
        snowflakes.appendChild(snowflake);
    }

    if (!snowStyleAdded) {
        const snowStyle = document.createElement('style');
        snowStyle.textContent = `
            @keyframes fall {
                to { transform: translateY(100vh) rotate(360deg); opacity: 0; }
            }
        `;
        document.head.appendChild(snowStyle);
        snowStyleAdded = true;
    }

    document.body.appendChild(snowflakes);
}


// --- Chart Generation ---
let monthlyChartInstance = null; // To hold the chart instance

function displayMonthlyIncomeChart() {
    const ctx = document.getElementById('monthlyIncomeChart')?.getContext('2d');
    if (!ctx) {
        console.warn("Canvas element 'monthlyIncomeChart' not found.");
        return;
    }

    const currentYear = 2025; // As requested
    const monthlyIncome = Array(12).fill(0); // Initialize 12 months with 0 income

    transactions.forEach(t => {
        if (t.date) { // Check if date exists
            try {
                // Create date in UTC to avoid timezone issues with YYYY-MM-DD
                const transactionDate = new Date(t.date + 'T00:00:00Z');
                const transactionYear = transactionDate.getUTCFullYear();
                const transactionMonth = transactionDate.getUTCMonth(); // 0-indexed (Jan=0, Dec=11)
                const montant = parseFloat(t.montant || 0);

                if (transactionYear === currentYear) {
                    monthlyIncome[transactionMonth] += montant;
                }
            } catch (e) {
                console.error(`Erreur de parsing de date pour la transaction ${t.id || t.structuredId}: ${t.date}`, e);
            }
        }
    });

    const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    // Destroy previous chart instance if it exists
    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
    }

    // Create new chart instance
    monthlyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [{
                label: `Revenus Mensuels ${currentYear} (Fcfa)`,
                data: monthlyIncome,
                backgroundColor: 'rgba(46, 204, 113, 0.7)', // Green bars with some transparency
                borderColor: 'rgba(46, 204, 113, 1)', // Solid green border
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, // Allow chart to fill container height
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value.toLocaleString('fr-FR') + ' Fcfa'; // Format Y-axis labels
                        }
                    }
                },
                x: {
                    grid: {
                        display: false // Hide vertical grid lines
                    }
                }
            },
            plugins: {
                legend: {
                    display: true, // Show legend
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toLocaleString('fr-FR') + ' Fcfa';
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}


// Suppression Client
const clientsListContainer = document.getElementById('clientsList');
if (clientsListContainer) {
    clientsListContainer.addEventListener('click', async (e) => { // Make async
        if (e.target.classList.contains('delete-client-btn')) {
            const clientId = e.target.dataset.clientId; // Firestore ID
            await handleDeleteClient(clientId); // Await deletion
        }
    });
}

async function handleDeleteClient(clientId) { // Make async
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    // Check if client has projects (using Firestore IDs)
    const clientHasProjects = projets.some(p => p.clientId === clientId);
    if (clientHasProjects) {
        alert(`Impossible de supprimer le client "${client.nom} ${client.prenom}" (${client.structuredId || clientId}) car il est associé à un ou plusieurs projets.`);
        return;
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer le client "${client.nom} ${client.prenom}" (${client.structuredId || clientId}) ?`)) {
        try {
            console.log(`Tentative de suppression du client Firestore ID: ${clientId}`);
            await deleteDoc(doc(db, "clients", clientId));
            console.log("Client supprimé de Firestore.");
            // Remove from local array
            clients = clients.filter(c => c.id !== clientId);
            // Refresh UI
            refreshUI();
        } catch (error) {
            console.error("Erreur lors de la suppression du client:", error);
            alert("Erreur lors de la suppression du client. Vérifiez la console.");
        }
    }
}

// Suppression Projet
const projetsListContainer = document.getElementById('projetsList');
if(projetsListContainer) {
    projetsListContainer.addEventListener('click', async (e) => { // Make async
        if (e.target.classList.contains('delete-projet-btn')) {
            const projetId = e.target.dataset.projetId; // Firestore ID
            await handleDeleteProjet(projetId); // Await deletion
        }
    });
}

async function handleDeleteProjet(projetId) { // Make async
    const projet = projets.find(p => p.id === projetId);
    if (!projet) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer le projet "${projet.nom}" (${projet.structuredId || projetId}) et toutes ses transactions associées ?`)) {
        try {
            console.log(`Tentative de suppression du projet Firestore ID: ${projetId}`);
            // 1. Delete the project document
            await deleteDoc(doc(db, "projets", projetId));
            console.log("Projet supprimé de Firestore.");

            // 2. Delete associated transactions (Query Firestore)
            console.log(`Recherche des transactions associées au projet ID: ${projetId}`);
            const q = query(transactionsCollection, where("projetId", "==", projetId));
            const transactionSnapshot = await getDocs(q);
            const deletePromises = [];
            transactionSnapshot.forEach((doc) => {
                console.log(`Suppression de la transaction Firestore ID: ${doc.id}`);
                deletePromises.push(deleteDoc(doc.ref));
            });
            await Promise.all(deletePromises);
            console.log(`${deletePromises.length} transaction(s) associée(s) supprimée(s).`);

            // 3. Update local arrays
            projets = projets.filter(p => p.id !== projetId);
            transactions = transactions.filter(t => t.projetId !== projetId); // Filter using Firestore ID

            // 4. Refresh UI
            refreshUI();

        } catch (error) {
            console.error("Erreur lors de la suppression du projet et/ou des transactions:", error);
            alert("Erreur lors de la suppression du projet. Vérifiez la console.");
        }
    }
}

// Suppression Transaction
const transactionsListContainer = document.getElementById('transactionsList');
if (transactionsListContainer) {
    transactionsListContainer.addEventListener('click', async (e) => { // Make async
        if (e.target.classList.contains('delete-transaction-btn')) {
            const transactionId = e.target.dataset.transactionId; // Firestore ID
            await handleDeleteTransaction(transactionId); // Await deletion
        }
    });
}

async function handleDeleteTransaction(transactionId) { // Make async
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    const formattedMontant = parseFloat(transaction.montant || 0).toLocaleString('fr-FR');
    if (confirm(`Êtes-vous sûr de vouloir supprimer la transaction ${transaction.structuredId || transactionId} d'un montant de ${formattedMontant} Fcfa ?`)) {
        try {
            console.log(`Tentative de suppression de la transaction Firestore ID: ${transactionId}`);
            await deleteDoc(doc(db, "transactions", transactionId));
            console.log("Transaction supprimée de Firestore.");
            // Remove from local array
            transactions = transactions.filter(t => t.id !== transactionId);
            // Refresh UI
            refreshUI();
        } catch (error) {
            console.error("Erreur lors de la suppression de la transaction:", error);
            alert("Erreur lors de la suppression de la transaction. Vérifiez la console.");
        }
    }
}

// --- Gestion des Archives ---
let lastGeneratedDocDetails = null; // To store details for saving

async function viewArchivedDocument(archiveId) {
    const archive = archives.find(a => a.id === archiveId);
    if (!archive || !archive.htmlContent) {
        alert("Contenu de l'archive introuvable.");
        return;
    }
    // Display in iframe (similar to generation)
    const documentFrame = document.getElementById('documentFrame');
    const documentPreview = document.getElementById('documentPreview');
    const printBtn = document.getElementById('printDocument'); // Maybe rename this button?
    const saveBtn = document.getElementById('saveToArchiveBtn');

    if (documentFrame && documentPreview && printBtn && saveBtn) {
        documentFrame.srcdoc = archive.htmlContent;
        printBtn.onclick = () => documentFrame.contentWindow?.print();
        documentPreview.style.display = 'block';
        saveBtn.style.display = 'none'; // Hide save button when viewing archive
        // Switch to the "Factures/Reçus" tab to show the preview
        document.querySelector('.tab[data-target="#factures"]')?.click();
    } else {
        console.error("Éléments DOM pour l'aperçu non trouvés.");
    }
}

async function deleteArchivedDocument(archiveId) {
     const archive = archives.find(a => a.id === archiveId);
     if (!archive) return;

     if (confirm(`Êtes-vous sûr de vouloir supprimer l'archive ${archive.archiveId} ?`)) {
         try {
             await deleteDoc(doc(db, "archives", archiveId));
             console.log("Archive supprimée:", archiveId);
             archives = archives.filter(a => a.id !== archiveId);
             refreshUI(); // Refresh the archives list
         } catch (error) {
             console.error("Erreur lors de la suppression de l'archive:", error);
             alert("Erreur lors de la suppression de l'archive.");
         }
     }
}

function addArchiveButtonListeners() {
    document.querySelectorAll('.view-archive-btn').forEach(btn => {
        btn.removeEventListener('click', handleViewArchiveClick); // Prevent duplicates
        btn.addEventListener('click', handleViewArchiveClick);
    });
    document.querySelectorAll('.delete-archive-btn').forEach(btn => {
         btn.removeEventListener('click', handleDeleteArchiveClick); // Prevent duplicates
         btn.addEventListener('click', handleDeleteArchiveClick);
    });
}

function handleViewArchiveClick(e) {
    const archiveId = e.target.closest('button').dataset.archiveId;
    viewArchivedDocument(archiveId);
}
function handleDeleteArchiveClick(e) {
    const archiveId = e.target.closest('button').dataset.archiveId;
    deleteArchivedDocument(archiveId);
}


// --- Initialisation au chargement de la page ---
document.addEventListener('DOMContentLoaded', async () => { // Make async
    console.log("DOM chargé, initialisation de l'application...");

    // --- Theme Check & Initial Setup ---
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        body.classList.add('dark-mode');
        createSnow(); // Trigger snow effect immediately if dark mode is saved
    }
    updateClockAndGreeting(); // Initial clock/greeting update

    // Start Clock Interval (Update every minute)
    setInterval(updateClockAndGreeting, 60000);

    // Add Theme Toggle Listener
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleDarkMode);
    } else {
        console.warn("Theme toggle button not found.");
    }

    // Fade-in effect (Keep existing)
    body.style.opacity = '0';
    body.style.animation = 'fadeInApp 1s forwards';
    const fadeStyle = document.createElement('style');
    fadeStyle.textContent = `
        @keyframes fadeInApp { /* Renamed animation */
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
    `;
    document.head.appendChild(fadeStyle);
    // --- End Theme Check ---


    await loadData(); // Charger TOUTES les données (y compris archives)

    refreshUI(); // Mettre à jour tous les affichages initiaux

    console.log("Initialisation terminée.");

    // --- Add Archive Filter Button Listeners ---
    document.querySelectorAll('.archive-filter-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const filterType = event.target.dataset.filter;
            // Update active state for buttons
            document.querySelectorAll('.archive-filter-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            // Display filtered archives
            displayArchives(filterType);
        });
    });

    // --- Event Listeners for Document Generation & Archiving ---
    const factureBtn = document.getElementById('generateFactureBtn');
    const recuBtn = document.getElementById('generateRecuBtn');
    const projetDocSelect = document.getElementById('projetDocument');
    const saveArchiveBtn = document.getElementById('saveToArchiveBtn');
    const documentFrame = document.getElementById('documentFrame'); // Needed to get HTML content

    // Function to handle document generation and prepare for archiving
    const handleGenerate = async (type) => {
        const selectedProjetId = projetDocSelect.value; // Firestore ID
        if (!selectedProjetId) {
            alert(`Veuillez sélectionner un projet pour générer ${type === 'F' ? 'la facture' : 'le reçu'}.`);
            return;
        }

        const projet = projets.find(p => p.id === selectedProjetId);
        if (!projet || !projet.structuredId) {
             alert("Erreur: Projet sélectionné invalide ou ID structuré manquant.");
             return;
        }

        // Generate the specific archive ID *before* generating content
        const currentYearAA = getCurrentYearAA();
        const newArchiveId = generateArchiveId(type, currentYearAA, projet.structuredId, archives);

        // Generate HTML content (Facture or Recu)
        // The generate functions now return the HTML content and the ID used
        let generatedData;
        if (type === 'F') {
            generatedData = generateFacture(selectedProjetId, newArchiveId); // Pass the new ID
        } else {
            generatedData = generateRecu(selectedProjetId, newArchiveId); // Pass the new ID
        }

        if (generatedData && generatedData.html) {
             // Display in iframe
             documentFrame.srcdoc = generatedData.html;
             document.getElementById('documentPreview').style.display = 'block';
             saveArchiveBtn.style.display = 'inline-block'; // Show save button

             // Store details needed for saving
             lastGeneratedDocDetails = {
                 type: type,
                 archiveId: generatedData.id, // Use the ID returned by the generator
                 projetId: selectedProjetId, // Firestore project ID
                 projetStructuredId: projet.structuredId,
                 htmlContent: generatedData.html,
                 dateArchivage: serverTimestamp() // Prepare timestamp for saving
             };
             console.log("Document généré, prêt pour archivage:", lastGeneratedDocDetails.archiveId);
        } else {
             console.error("La génération du document a échoué ou n'a pas retourné de contenu HTML.");
             saveArchiveBtn.style.display = 'none';
             lastGeneratedDocDetails = null;
        }
    };

    if (factureBtn) {
        factureBtn.addEventListener('click', () => handleGenerate('F'));
    } else {
        console.warn("Bouton 'Générer Facture' non trouvé.");
    }

    if (recuBtn) {
        recuBtn.addEventListener('click', () => handleGenerate('R'));
    } else {
         console.warn("Bouton 'Générer Reçu' non trouvé.");
    }

    // Event Listener for Save Archive Button
    if (saveArchiveBtn) {
        saveArchiveBtn.addEventListener('click', async () => {
            if (!lastGeneratedDocDetails) {
                alert("Aucun document n'a été généré pour l'archivage.");
                return;
            }

            // Prevent double-saving? Check if ID already exists in local archives array
            if (archives.some(a => a.archiveId === lastGeneratedDocDetails.archiveId)) {
                 alert(`Le document ${lastGeneratedDocDetails.archiveId} semble déjà archivé.`);
                 // Optionally hide button again or clear details
                 // saveArchiveBtn.style.display = 'none';
                 // lastGeneratedDocDetails = null;
                 return;
            }


            console.log("Tentative d'archivage:", lastGeneratedDocDetails.archiveId);
            try {
                // Save to Firestore 'archives' collection
                const docRef = await addDoc(archivesCollection, lastGeneratedDocDetails);
                console.log("Document archivé avec l'ID Firestore:", docRef.id);

                // Add to local archives array and refresh UI
                archives.push({ id: docRef.id, ...lastGeneratedDocDetails });
                refreshUI(); // Update the archives list display

                alert(`Document ${lastGeneratedDocDetails.archiveId} archivé avec succès.`);
                lastGeneratedDocDetails = null; // Clear details after saving
                saveArchiveBtn.style.display = 'none'; // Hide button after saving

            } catch (error) {
                console.error("Erreur lors de l'archivage du document:", error);
                alert("Erreur lors de l'archivage. Vérifiez la console.");
            }
        });
    } else {
        console.warn("Bouton 'Enregistrer Archive' non trouvé.");
    }


}); // End DOMContentLoaded listener


// Export functions needed by other modules (form handlers)
// Note: Global variables (clients, projets, transactions, db) are accessible
// because all scripts are loaded as modules in the same scope in index.html
export {
    db, // Export db instance
    clients, // Export data arrays (might be modified by handlers)
    projets,
    transactions,
    getCurrentYearAA, // Export ID generation utils
    generateClientId,
    generateProjetId,
    generateTransactionId,
    refreshUI, // Export UI refresh helper
    // No need to export display/update/doc generation functions if called via listeners/refreshUI

    // --- Search Functionality ---
    performSearch, // Export search function if needed elsewhere, maybe not
    displaySearchResults // Export display function if needed elsewhere, maybe not
};

// --- Search Implementation ---

// Get search elements once
const searchResultsList = document.getElementById('searchResultsList');
const noResultsMsgElement = searchResultsList ? searchResultsList.querySelector('.no-results') : null;
if (!searchResultsList) console.error("Search results container (#searchResultsList) not found!");
if (!noResultsMsgElement) console.error("No results message element (.no-results) not found within #searchResultsList!");


// Debounce function to limit how often search is performed
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


function performSearch(query) {
    const searchTerm = query.toLowerCase().trim();

    // Use the globally selected elements
    if (!searchResultsList || !noResultsMsgElement) {
         console.error("Search elements not available in performSearch.");
         return;
    }

    if (!searchTerm) {
        searchResultsList.innerHTML = ''; // Clear results if query is empty
        // Ensure the no-results message itself isn't cleared if it's inside
        searchResultsList.appendChild(noResultsMsgElement); // Make sure it's there
        noResultsMsgElement.style.display = 'none'; // Hide message
        return;
    }

    let results = [];

    // Search Clients (by ID or Name)
    clients.forEach(client => {
        const clientName = `${client.nom || ''} ${client.prenom || ''}`.toLowerCase();
        if ((client.structuredId && client.structuredId.toLowerCase().includes(searchTerm)) || clientName.includes(searchTerm)) {
            results.push({ ...client, resultType: 'Client' });
        }
    });

    // Search Projets (by ID or Name)
    projets.forEach(projet => {
        if ((projet.structuredId && projet.structuredId.toLowerCase().includes(searchTerm)) || (projet.nom && projet.nom.toLowerCase().includes(searchTerm))) {
            results.push({ ...projet, resultType: 'Projet' });
        }
    });

    // Search Transactions (by ID)
    transactions.forEach(transaction => {
        if (transaction.structuredId && transaction.structuredId.toLowerCase().includes(searchTerm)) {
            results.push({ ...transaction, resultType: 'Transaction' });
        }
    });

    // Search Archives (by ID)
    archives.forEach(archive => {
        if (archive.archiveId && archive.archiveId.toLowerCase().includes(searchTerm)) {
            results.push({ ...archive, resultType: 'Archive' });
        }
    });

    displaySearchResults(results);
}

function displaySearchResults(results) {
    // Use the globally selected elements
     if (!searchResultsList || !noResultsMsgElement) {
         console.error("Search elements not available in displaySearchResults.");
         return;
     }

    // Clear only previous result items, keep the no-results message element structure
    // Find all direct children that are result items and remove them
    Array.from(searchResultsList.children).forEach(child => {
        if (child !== noResultsMsgElement) {
            searchResultsList.removeChild(child);
        }
    });


    if (results.length === 0) {
        noResultsMsgElement.style.display = 'block'; // Show message
        return;
    }

    noResultsMsgElement.style.display = 'none'; // Hide message

    // Create a document fragment to batch append
    const fragment = document.createDocumentFragment();

    results.forEach(item => {
        const div = document.createElement('div');
        div.classList.add('item', 'search-result-item'); // Add classes

        let innerHTML = '';
        // Generate innerHTML based on resultType
        innerHTML = `
            <span class="result-type-icon">
                ${item.resultType === 'Client' ? '<i class="fas fa-user"></i>' : ''}
                ${item.resultType === 'Projet' ? '<i class="fas fa-project-diagram"></i>' : ''}
                ${item.resultType === 'Transaction' ? '<i class="fas fa-exchange-alt"></i>' : ''}
                ${item.resultType === 'Archive' ? '<i class="fas fa-file-alt"></i>' : ''}
            </span>
            <div class="result-info">
        `;

        switch (item.resultType) {
            case 'Client':
                innerHTML += `
                    <span class="result-title">Client: ${item.nom} ${item.prenom}</span>
                    <span class="result-details">ID: ${item.structuredId || 'N/A'} | Tél: ${item.telephone || 'N/A'}</span>
                `;
                break;
            case 'Projet':
                 const client = clients.find(c => c.id === item.clientId);
                 innerHTML += `
                    <span class="result-title">Projet: ${item.nom}</span>
                    <span class="result-details">ID: ${item.structuredId || 'N/A'} | Client: ${client?.nom || 'N/A'} ${client?.prenom || ''} | Coût: ${parseFloat(item.cout || 0).toLocaleString('fr-FR')} Fcfa</span>
                 `;
                break;
            case 'Transaction':
                 const projetTr = projets.find(p => p.id === item.projetId);
                 let dateTr = item.date ? new Date(item.date + 'T00:00:00Z').toLocaleDateString('fr-FR') : 'N/A';
                 innerHTML += `
                    <span class="result-title">Transaction: ${parseFloat(item.montant || 0).toLocaleString('fr-FR')} Fcfa</span>
                    <span class="result-details">ID: ${item.structuredId || 'N/A'} | Projet: ${projetTr?.nom || 'N/A'} | Date: ${dateTr}</span>
                 `;
                break;
            case 'Archive':
                 const projetAr = projets.find(p => p.id === item.projetId);
                 let dateAr = item.dateArchivage?.toDate ? item.dateArchivage.toDate().toLocaleString('fr-FR') : 'N/A';
                 let docType = item.type === 'F' ? 'Facture' : 'Reçu';
                 innerHTML += `
                    <span class="result-title">${docType}: ${item.archiveId || 'N/A'}</span>
                    <span class="result-details">Projet: ${projetAr?.nom || 'N/A'} | Date: ${dateAr}</span>
                 `;
                 // Optionally add view button: <button class="view-archive-btn" data-archive-id="${item.id}">Voir</button>
                break;
        }

        innerHTML += `
                </div>
        `;
        div.innerHTML = innerHTML;
        fragment.appendChild(div); // Append item to fragment
    });

    searchResultsList.appendChild(fragment); // Append all items at once
}


// Add debounced event listener to search input in DOMContentLoaded
document.addEventListener('DOMContentLoaded', async () => {
    // ... (existing DOMContentLoaded code) ...

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Use debounce to wait 300ms after user stops typing
        searchInput.addEventListener('input', debounce((e) => {
            performSearch(e.target.value);
        }, 300));
    } else {
        console.warn("Search input element not found.");
    }

    // ... (rest of existing DOMContentLoaded code) ...
});
