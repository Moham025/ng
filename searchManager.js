// --- searchManager.js ---
// Gère la recherche globale et l'affichage des résultats

import { clients, projets, transactions, archives } from './dataManager.js';
import { debounce } from './utils.js'; // Import debounce

const searchInput = document.getElementById('searchInput');
const searchResultsList = document.getElementById('searchResultsList');
const noResultsMsgElement = searchResultsList?.querySelector('.no-results');

function displaySearchResults(results) {
    if (!searchResultsList || !noResultsMsgElement) return;

    // Vide les anciens résultats mais garde le message "aucun résultat"
    Array.from(searchResultsList.children).forEach(child => {
        if (child !== noResultsMsgElement) searchResultsList.removeChild(child);
    });

    if (results.length === 0) {
        noResultsMsgElement.style.display = 'block';
        return;
    }

    noResultsMsgElement.style.display = 'none';
    const fragment = document.createDocumentFragment();

    results.forEach(item => {
        const div = document.createElement('div');
        div.classList.add('item', 'search-result-item');
        let icon = '';
        let title = '';
        let details = '';

        switch (item.resultType) {
            case 'Client':
                icon = '<i class="fas fa-user"></i>';
                title = `Client: ${item.nom} ${item.prenom}`;
                details = `ID: ${item.structuredId || 'N/A'} | Tél: ${item.telephone || 'N/A'}`;
                break;
            case 'Projet':
                icon = '<i class="fas fa-project-diagram"></i>';
                const client = clients.find(c => c.id === item.clientId);
                title = `Projet: ${item.nom}`;
                details = `ID: ${item.structuredId || 'N/A'} | Client: ${client?.nom || 'N/A'} ${client?.prenom || ''} | Coût: ${parseFloat(item.cout || 0).toLocaleString('fr-FR')} Fcfa`;
                break;
            case 'Transaction':
                icon = '<i class="fas fa-exchange-alt"></i>';
                const projetTr = projets.find(p => p.id === item.projetId);
                let dateTr = item.date ? new Date(item.date + 'T00:00:00Z').toLocaleDateString('fr-FR') : 'N/A';
                title = `Transaction: ${parseFloat(item.montant || 0).toLocaleString('fr-FR')} Fcfa`;
                details = `ID: ${item.structuredId || 'N/A'} | Projet: ${projetTr?.nom || 'N/A'} | Date: ${dateTr}`;
                break;
            case 'Archive':
                icon = '<i class="fas fa-file-alt"></i>';
                const projetAr = projets.find(p => p.id === item.projetId);
                let dateAr = item.dateArchivage?.toDate ? item.dateArchivage.toDate().toLocaleString('fr-FR') : 'N/A';
                let docType = item.type === 'F' ? 'Facture' : 'Reçu';
                title = `${docType}: ${item.archiveId || 'N/A'}`;
                details = `Projet: ${projetAr?.nom || 'N/A'} | Date: ${dateAr}`;
                // Optional: Add view button logic here if needed directly from search
                break;
        }

        div.innerHTML = `
            <span class="result-type-icon">${icon}</span>
            <div class="result-info">
                <span class="result-title">${title}</span>
                <span class="result-details">${details}</span>
            </div>`;
        fragment.appendChild(div);
    });

    searchResultsList.appendChild(fragment);
}


function performSearch(query) {
    const searchTerm = query.toLowerCase().trim();
    if (!searchResultsList || !noResultsMsgElement) return;

    if (!searchTerm) {
        displaySearchResults([]); // Affiche une liste vide (cache msg "aucun résultat")
        return;
    }

    let results = [];
    // Search Clients
    clients.forEach(c => {
        if ((c.structuredId?.toLowerCase().includes(searchTerm)) ||
            (`${c.nom || ''} ${c.prenom || ''}`.toLowerCase().includes(searchTerm))) {
            results.push({ ...c, resultType: 'Client' });
        }
    });
    // Search Projets
    projets.forEach(p => {
        if ((p.structuredId?.toLowerCase().includes(searchTerm)) ||
            (p.nom?.toLowerCase().includes(searchTerm))) {
            results.push({ ...p, resultType: 'Projet' });
        }
    });
    // Search Transactions
    transactions.forEach(t => {
        if (t.structuredId?.toLowerCase().includes(searchTerm)) {
            results.push({ ...t, resultType: 'Transaction' });
        }
    });
    // Search Archives
    archives.forEach(a => {
        if (a.archiveId?.toLowerCase().includes(searchTerm)) {
            results.push({ ...a, resultType: 'Archive' });
        }
    });

    displaySearchResults(results);
}

// Initialise l'écouteur pour la recherche
export function initSearch() {
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            performSearch(e.target.value);
        }, 300));
    } else {
        console.warn("Search input element not found.");
    }
     // Ensure the no-results message is initially hidden
     if(noResultsMsgElement) noResultsMsgElement.style.display = 'none';
}