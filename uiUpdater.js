// --- uiUpdater.js ---
// Fonctions de mise à jour d'éléments spécifiques de l'UI (stats, selects, chart)

import { clients, projets, transactions } from './dataManager.js';
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js/+esm'; // Import Chart.js explicitement

// --- Sélecteurs ---
export function updateClientSelect() {
    const select = document.getElementById('clientSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Choisir un client...</option>';
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = `${client.nom} ${client.prenom} (${client.structuredId || 'N/A'})`;
        option.dataset.structuredId = client.structuredId;
        select.appendChild(option);
    });
}

export function updateProjetSelect() {
    const select = document.getElementById('projetSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Choisir un projet...</option>';
    if (clients.length === 0) console.warn("Tentative de mise à jour du sélecteur de projets sans clients chargés.");

    projets.forEach(projet => {
        const client = clients.find(c => c.id === projet.clientId);
        const option = document.createElement('option');
        option.value = projet.id;
        option.textContent = `${projet.nom} (${client?.nom || 'Client inconnu'}) - ${projet.structuredId || 'N/A'}`;
        option.dataset.structuredId = projet.structuredId;
        select.appendChild(option);
    });
}

export function updateDocProjetSelects() {
    const select = document.getElementById('projetDocument');
    if (!select) return;
    select.innerHTML = '<option value="">Choisir un projet...</option>';
    if (clients.length === 0) console.warn("Tentative de mise à jour du sélecteur de documents sans clients chargés.");

    projets.forEach(projet => {
        const client = clients.find(c => c.id === projet.clientId);
        const option = document.createElement('option');
        option.value = projet.id;
        option.textContent = `${projet.nom} (${client?.nom || 'Client inconnu'}) - ${projet.structuredId || 'N/A'}`;
        select.appendChild(option);
    });
}

// --- Statistiques ---
export function updateStatProjetsCount() {
    const statElement = document.getElementById('projetsEnCoursCount');
    if (statElement) {
        statElement.textContent = projets.length;
    } else {
        console.warn("L'élément 'projetsEnCoursCount' n'a pas été trouvé.");
    }
}

export function updateChiffreAffairesPeriode() {
    const caMoisValueElement = document.getElementById('chiffreAffairesMoisValue');
    const caAnneeValueElement = document.getElementById('chiffreAffairesAnneeValue');
    const caMoisLabelElement = document.getElementById('caMoisLabel');
    const caAnneeLabelElement = document.getElementById('caAnneeLabel');

    if (!caMoisValueElement || !caAnneeValueElement || !caMoisLabelElement || !caAnneeLabelElement) {
        console.warn("Un ou plusieurs éléments pour le chiffre d'affaires non trouvés.");
        return;
    }

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentMonthName = now.toLocaleDateString('fr-FR', { month: 'long' });
    const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

    caMoisLabelElement.textContent = `Chiffre d'affaires de ${capitalizedMonth}`;
    caAnneeLabelElement.textContent = `Chiffre d'affaires de ${currentYear}`;

    let totalMois = 0;
    let totalAnnee = 0;

    transactions.forEach(t => {
        if (t.date) {
            try {
                const transactionDate = new Date(t.date + 'T00:00:00Z'); // Use UTC
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
                console.error(`Erreur de parsing de date transaction ${t.id || t.structuredId}: ${t.date}`, e);
            }
        }
    });

    caMoisValueElement.textContent = `${totalMois.toLocaleString('fr-FR')} Fcfa`;
    caAnneeValueElement.textContent = `${totalAnnee.toLocaleString('fr-FR')} Fcfa`;
}

// --- Graphique ---
let monthlyChartInstance = null; // Garde l'instance du graphique

export function displayMonthlyIncomeChart() {
    const ctx = document.getElementById('monthlyIncomeChart')?.getContext('2d');
    if (!ctx) {
        console.warn("Canvas 'monthlyIncomeChart' non trouvé.");
        return;
    }

    const currentYear = 2025; // Année fixe
    const monthlyIncome = Array(12).fill(0);

    transactions.forEach(t => {
        if (t.date) {
            try {
                const transactionDate = new Date(t.date + 'T00:00:00Z');
                if (transactionDate.getUTCFullYear() === currentYear) {
                    monthlyIncome[transactionDate.getUTCMonth()] += parseFloat(t.montant || 0);
                }
            } catch (e) {
                console.error(`Erreur parsing date graphique ${t.id || t.structuredId}: ${t.date}`, e);
            }
        }
    });

    const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

    if (monthlyChartInstance) {
        monthlyChartInstance.destroy();
    }

    monthlyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthLabels,
            datasets: [{
                label: `Revenus Mensuels ${currentYear} (Fcfa)`,
                data: monthlyIncome,
                backgroundColor: 'rgba(46, 204, 113, 0.7)',
                borderColor: 'rgba(46, 204, 113, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: value => value.toLocaleString('fr-FR') + ' Fcfa' }
                },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: true, position: 'top' },
                tooltip: {
                    callbacks: {
                        label: context => `${context.dataset.label || ''}: ${context.parsed.y.toLocaleString('fr-FR')} Fcfa`
                    }
                }
            }
        }
    });
}

export function updateChartTheme() {
     if (monthlyChartInstance) {
        // Chart.js 3+ s'adapte souvent via CSS. Si des mises à jour spécifiques sont nécessaires :
        // Exemple : Adapter la couleur des ticks
        // const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');
        // monthlyChartInstance.options.scales.y.ticks.color = textColor;
        // monthlyChartInstance.options.scales.x.ticks.color = textColor;
        // monthlyChartInstance.update();
        console.log("Mise à jour du thème du graphique (si nécessaire).");
    }
}