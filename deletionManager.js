// --- deletionManager.js ---
// Gère la logique de suppression des éléments (Clients, Projets, Transactions)

import { db, clients, projets, transactions } from './dataManager.js'; // Data arrays
import { collection, query, where, getDocs, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { refreshUI } from './main.js'; // Import refreshUI

const transactionsCollection = collection(db, "transactions"); // Ref needed here

async function handleDeleteClient(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const clientHasProjects = projets.some(p => p.clientId === clientId);
    if (clientHasProjects) {
        alert(`Impossible de supprimer le client "${client.nom} ${client.prenom}" (${client.structuredId || clientId}) car il a des projets.`);
        return;
    }

    if (confirm(`Supprimer le client "${client.nom} ${client.prenom}" (${client.structuredId || clientId}) ?`)) {
        try {
            await deleteDoc(doc(db, "clients", clientId));
            console.log("Client supprimé de Firestore:", clientId);
            // Supprime du tableau local
            const index = clients.findIndex(c => c.id === clientId);
            if (index > -1) clients.splice(index, 1);
            refreshUI();
        } catch (error) {
            console.error("Erreur suppression client:", error);
            alert("Erreur lors de la suppression du client.");
        }
    }
}

async function handleDeleteProjet(projetId) {
    const projet = projets.find(p => p.id === projetId);
    if (!projet) return;

    if (confirm(`Supprimer le projet "${projet.nom}" (${projet.structuredId || projetId}) ET ses transactions ?`)) {
        try {
            // Supprimer le projet
            await deleteDoc(doc(db, "projets", projetId));
            console.log("Projet supprimé de Firestore:", projetId);

            // Supprimer les transactions associées
            const q = query(transactionsCollection, where("projetId", "==", projetId));
            const transactionSnapshot = await getDocs(q);
            const deletePromises = transactionSnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            console.log(`${deletePromises.length} transaction(s) supprimée(s) pour le projet ${projetId}.`);

            // Mettre à jour les tableaux locaux
            const projetIndex = projets.findIndex(p => p.id === projetId);
            if (projetIndex > -1) projets.splice(projetIndex, 1);
            // Filtrer les transactions locales
            const initialTransactionLength = transactions.length;
            transactions = transactions.filter(t => t.projetId !== projetId);
            console.log(`${initialTransactionLength - transactions.length} transaction(s) locale(s) supprimée(s).`);


            refreshUI();

        } catch (error) {
            console.error("Erreur suppression projet/transactions:", error);
            alert("Erreur lors de la suppression du projet.");
        }
    }
}

async function handleDeleteTransaction(transactionId) {
    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) return;

    const formattedMontant = parseFloat(transaction.montant || 0).toLocaleString('fr-FR');
    if (confirm(`Supprimer la transaction ${transaction.structuredId || transactionId} de ${formattedMontant} Fcfa ?`)) {
        try {
            await deleteDoc(doc(db, "transactions", transactionId));
            console.log("Transaction supprimée de Firestore:", transactionId);
            // Supprime du tableau local
            const index = transactions.findIndex(t => t.id === transactionId);
            if (index > -1) transactions.splice(index, 1);
            refreshUI();
        } catch (error) {
            console.error("Erreur suppression transaction:", error);
            alert("Erreur lors de la suppression de la transaction.");
        }
    }
}

// Fonction pour attacher les écouteurs aux conteneurs de liste
export function attachDeletionListeners(container, type) {
    if (!container) return;

    // Supprime les anciens écouteurs pour éviter les doublons (simple approche)
    // Une meilleure approche utiliserait AbortController ou une gestion plus fine
    container.replaceWith(container.cloneNode(true)); // Clone et remplace pour enlever les écouteurs
    container = document.getElementById(container.id); // Récupère la nouvelle référence
    if (!container) return; // Vérifie si la récupération a fonctionné

    container.addEventListener('click', (e) => {
        if (type === 'client' && e.target.classList.contains('delete-client-btn')) {
            handleDeleteClient(e.target.dataset.clientId);
        } else if (type === 'projet' && e.target.classList.contains('delete-projet-btn')) {
            handleDeleteProjet(e.target.dataset.projetId);
        } else if (type === 'transaction' && e.target.classList.contains('delete-transaction-btn')) {
            handleDeleteTransaction(e.target.dataset.transactionId);
        }
         // Note: La suppression d'archive est gérée dans archiveManager.js/uiDisplay.js
    });
}