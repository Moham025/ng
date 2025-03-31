// --- dataManager.js ---
// Gère le chargement et le stockage des données

import { db } from './firebase-config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Données Principales (exportées pour être utilisées/modifiées par d'autres modules) ---
export let clients = [];
export let projets = [];
export let transactions = [];
export let archives = [];

// --- Firestore Collection References ---
const clientsCollection = collection(db, "clients");
const projetsCollection = collection(db, "projets");
const transactionsCollection = collection(db, "transactions");
const archivesCollection = collection(db, "archives");

// --- Fonction pour charger toutes les données ---
export async function loadData() {
    console.log("Chargement des données depuis Firestore...");
    try {
        // Utilise Promise.all pour charger en parallèle
        const [clientSnapshot, projetSnapshot, transactionSnapshot, archiveSnapshot] = await Promise.all([
            getDocs(query(clientsCollection, orderBy("dateCreation", "asc"))),
            getDocs(query(projetsCollection, orderBy("dateCreation", "asc"))),
            getDocs(query(transactionsCollection, orderBy("dateCreation", "asc"))),
            getDocs(query(archivesCollection, orderBy("dateArchivage", "desc")))
        ]);

        // Remplace les tableaux locaux avec les nouvelles données
        clients = clientSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        projets = projetSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        transactions = transactionSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        archives = archiveSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`Clients: ${clients.length}, Projets: ${projets.length}, Transactions: ${transactions.length}, Archives: ${archives.length}`);
        console.log("Données chargées avec succès depuis Firestore.");

    } catch (error) {
        console.error("Erreur lors du chargement des données depuis Firestore:", error);
        alert("Erreur de chargement des données. Vérifiez la console.");
        // Réinitialiser en cas d'erreur
        clients = [];
        projets = [];
        transactions = [];
        archives = [];
    }
}

// Fonction pour réinitialiser les données locales (utile à la déconnexion)
export function clearLocalData() {
    clients = [];
    projets = [];
    transactions = [];
    archives = [];
    console.log("Données locales effacées.");
}