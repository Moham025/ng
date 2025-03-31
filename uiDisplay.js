// --- uiDisplay.js ---
// Fonctions d'affichage des listes

// Import des données nécessaires
import { clients, projets, transactions, archives } from './dataManager.js';
// Import des fonctions de suppression pour attacher les écouteurs
import { attachDeletionListeners } from './deletionManager.js';
// Import des fonctions d'archive pour attacher les écouteurs
import { attachArchiveListeners } from './archiveManager.js';

// --- Fonctions d'Affichage ---
export function displayClients() {
    const container = document.getElementById('clientsList');
    if (!container) return;
    const sortedClients = [...clients].sort((a, b) => (a.dateCreation?.toDate?.() || 0) - (b.dateCreation?.toDate?.() || 0));

    container.innerHTML = sortedClients.map((client, index) => {
        let formattedDate = 'N/A';
        if (client.dateCreation?.toDate) {
            formattedDate = client.dateCreation.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        return `
        <div class="item client-card" data-client-id="${client.id}">
            <span class="client-info client-number">${index + 1}</span>
            <span class="client-info client-id">${client.structuredId || 'ID Manquant'}</span>
            <span class="client-info client-nom">${client.nom}</span>
            <span class="client-info client-prenom">${client.prenom}</span>
            <span class="client-info client-tel">${client.telephone || 'N/A'}</span>
            <span class="client-info client-date">${formattedDate}</span>
            <button class="delete-client-btn" data-client-id="${client.id}" title="Supprimer client">🗑️</button>
        </div>`;
    }).join('');
    attachDeletionListeners(container, 'client'); // Attacher les écouteurs après le rendu
}

export function displayProjets() {
    const container = document.getElementById('projetsList');
    if (!container) return;
    const sortedProjets = [...projets].sort((a, b) => (a.dateCreation?.toDate?.() || 0) - (b.dateCreation?.toDate?.() || 0));

    container.innerHTML = sortedProjets.map((projet, index) => {
        const client = clients.find(c => c.id === projet.clientId);
        const projetTransactions = transactions.filter(t => t.projetId === projet.id);
        const totalPaye = projetTransactions.reduce((sum, t) => sum + parseFloat(t.montant || 0), 0);
        const resteAPayer = (projet.cout || 0) - totalPaye;
        let formattedDate = 'N/A';
        if (projet.dateCreation?.toDate) {
            formattedDate = projet.dateCreation.toDate().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        }
        // Note: dateDebut is already YYYY-MM-DD string
        // let formattedDateDebut = projet.dateDebut ? new Date(projet.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';

        return `
        <div class="item projet-card" data-projet-id="${projet.id}">
            <span class="projet-info projet-number">${index + 1}</span>
            <span class="projet-info projet-id">${projet.structuredId || 'ID Manquant'}</span>
            <span class="projet-info projet-nom">${projet.nom}</span>
            <span class="projet-info projet-client">${client?.nom || 'N/A'} ${client?.prenom || ''}</span>
            <span class="projet-info projet-cout">${parseFloat(projet.cout || 0).toLocaleString('fr-FR')} Fcfa</span>
            <span class="projet-info projet-reste ${resteAPayer > 0 ? 'reste-positif' : ''}">${resteAPayer.toLocaleString('fr-FR')} Fcfa</span>
            <span class="projet-info projet-date">${formattedDate}</span>
            <button class="delete-projet-btn" data-projet-id="${projet.id}" title="Supprimer projet">🗑️</button>
        </div>`;
    }).join('');
    attachDeletionListeners(container, 'projet');
}

export function displayTransactions() {
    const container = document.getElementById('transactionsList');
    if (!container) return;
    const sortedTransactions = [...transactions].sort((a, b) => (a.dateCreation?.toDate?.() || 0) - (b.dateCreation?.toDate?.() || 0));

    container.innerHTML = sortedTransactions.map((transaction, index) => {
        const projet = projets.find(p => p.id === transaction.projetId);
        const client = clients.find(c => c.id === projet?.clientId);
        let formattedDate = 'N/A';
         if (transaction.date) { // Assuming date is stored as 'YYYY-MM-DD' string
             try { formattedDate = new Date(transaction.date + 'T00:00:00Z').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch(e){}
         }

        return `
        <div class="item transaction-card" data-transaction-id="${transaction.id}">
            <span class="transaction-info transaction-number">${index + 1}</span>
            <span class="transaction-info transaction-id">${transaction.structuredId || 'ID Manquant'}</span>
            <span class="transaction-info transaction-projet">${projet?.nom || 'Projet Supprimé'}</span>
            <span class="transaction-info transaction-client">${client?.nom || 'Client Supprimé'} ${client?.prenom || ''}</span>
            <span class="transaction-info transaction-montant">${parseFloat(transaction.montant || 0).toLocaleString('fr-FR')} Fcfa</span>
            <span class="transaction-info transaction-date">${formattedDate}</span>
            <button class="delete-transaction-btn" data-transaction-id="${transaction.id}" title="Supprimer transaction">🗑️</button>
        </div>`;
    }).join('');
    attachDeletionListeners(container, 'transaction');
}

export function displayArchives(filterType = 'F') {
    const container = document.getElementById('archivesList');
    const factureCountSpan = document.getElementById('factureCount');
    const recuCountSpan = document.getElementById('recuCount');

    if (!container || !factureCountSpan || !recuCountSpan) return;

    const factureCount = archives.filter(a => a.type === 'F').length;
    const recuCount = archives.filter(a => a.type === 'R').length;
    factureCountSpan.textContent = `(${factureCount})`;
    recuCountSpan.textContent = `(${recuCount})`;

    const filteredArchives = archives.filter(archive => archive.type === filterType);
    const sortedArchives = [...filteredArchives].sort((a, b) => (b.dateArchivage?.toDate?.() || 0) - (a.dateArchivage?.toDate?.() || 0));

    container.innerHTML = sortedArchives.map((archive, index) => {
        let formattedDate = 'N/A';
        if (archive.dateArchivage?.toDate) {
            formattedDate = archive.dateArchivage.toDate().toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        const docType = archive.type === 'F' ? 'Facture' : 'Reçu';
        const projet = projets.find(p => p.id === archive.projetId);

        return `
        <div class="item archive-card" data-archive-id="${archive.id}">
            <span class="archive-info archive-number">${index + 1}</span>
            <span class="archive-info archive-id">${archive.archiveId || 'ID Manquant'}</span>
            <span class="archive-info archive-type">${docType}</span>
            <span class="archive-info archive-projet">${projet?.nom || 'Projet Supprimé'} (${projet?.structuredId || 'N/A'})</span>
            <span class="archive-info archive-date">${formattedDate}</span>
            <button class="view-archive-btn" data-archive-id="${archive.id}" title="Voir Archive">👁️</button>
            <button class="delete-archive-btn" data-archive-id="${archive.id}" title="Supprimer Archive">🗑️</button>
        </div>`;
    }).join('');

    attachArchiveListeners(container); // Attach view/delete listeners for archives
}