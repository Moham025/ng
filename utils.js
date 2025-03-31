// --- utils.js ---
// Fonctions utilitaires

export function getCurrentYearAA() {
    return new Date().getFullYear().toString().slice(-2);
}

// Prend les tableaux locaux chargés en argument
export function generateClientId(yearAA, existingClients) {
    const prefix = `CL-${yearAA}-`;
    let maxNN = 0;
    existingClients.forEach(client => {
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

export function generateProjetId(yearAA, clientStructuredId, existingProjets) {
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

export function generateTransactionId(yearAA, projetStructuredId, existingTransactions) {
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

export function generateArchiveId(type, yearAA, projetStructuredId, existingArchives) {
    const prefix = `${type}-${yearAA}-${projetStructuredId}-`;
    let maxXXX = 0;
    existingArchives.forEach(archive => {
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


// Debounce function
export function debounce(func, wait) {
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