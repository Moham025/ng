// --- transactionFormHandler.js ---
// Gère les interactions avec le formulaire d'ajout/modification de transaction

// Import Firestore functions and necessary items from app.js
import { db, transactions, projets, generateTransactionId, getCurrentYearAA, refreshUI } from './app.js'; // Added projets import
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Récupération des éléments HTML spécifiques au formulaire transaction
const newTransactionBtn = document.getElementById('newTransactionBtn');
const transactionFormContainer = document.getElementById('transactionFormContainer');
const cancelTransactionBtn = document.getElementById('cancelTransactionBtn');
const transactionForm = document.getElementById('transactionForm');
const transactionDateInput = document.getElementById('dateTransaction'); // Pour pré-remplir

// --- Gestion du formulaire transaction ---

// Afficher le formulaire et pré-remplir la date
if (newTransactionBtn && transactionFormContainer && transactionDateInput) {
    newTransactionBtn.addEventListener('click', () => {
        transactionFormContainer.style.display = 'block';

        // Pré-remplir la date du jour
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        transactionDateInput.value = formattedDate;

        // S'assurer que la liste des projets est à jour dans le select
        if (typeof updateProjetSelect === 'function') updateProjetSelect(); else console.error("updateProjetSelect non défini");

        window.scrollTo({ top: transactionFormContainer.offsetTop - 20, behavior: 'smooth' });
    });
} else {
     console.warn("Éléments pour le bouton 'Nouvelle Transaction' ou champ date non trouvés.");
}

// Masquer et réinitialiser le formulaire
if (cancelTransactionBtn && transactionFormContainer && transactionForm) {
    cancelTransactionBtn.addEventListener('click', () => {
        transactionFormContainer.style.display = 'none';
        transactionForm.reset();
    });
} else {
     console.warn("Éléments pour le bouton 'Annuler Transaction' non trouvés.");
}

// Gérer la soumission du formulaire (make async for Firestore)
if (transactionForm && transactionFormContainer) {
    transactionForm.addEventListener('submit', async (e) => { // Make async
        e.preventDefault();

        // Vérifier si les dépendances globales existent
        if (typeof generateTransactionId !== 'function' || typeof getCurrentYearAA !== 'function' || typeof transactions === 'undefined' || !db) {
            alert("Erreur critique : fonctions ou données globales manquantes pour l'ajout de transaction.");
            console.error("generateTransactionId, getCurrentYearAA, transactions ou db non définis");
            return;
        }

        const projetSelectElement = e.target.elements.projetSelect;
        const selectedProjetOption = projetSelectElement.options[projetSelectElement.selectedIndex];
        const selectedProjetId = projetSelectElement.value; // Firestore ID of the project
        const selectedProjetStructuredId = selectedProjetOption?.dataset?.structuredId; // Get structuredId from data attribute

        if (!selectedProjetId) {
             alert("Veuillez sélectionner un projet pour cette transaction.");
             return;
        }
         if (!selectedProjetStructuredId) {
             alert("Erreur : Impossible de récupérer l'ID structuré du projet sélectionné.");
             console.error("selectedProjetStructuredId est manquant pour l'option sélectionnée:", selectedProjetOption);
             return;
         }

        const montantValue = parseFloat(e.target.elements.montant.value);
        const dateValue = e.target.elements.dateTransaction.value;

        if (isNaN(montantValue) || montantValue <= 0) {
            alert("Veuillez entrer un montant valide (nombre positif) en Fcfa.");
            return;
        }
         if (!dateValue) {
             alert("Veuillez sélectionner une date pour la transaction.");
             return;
         }

        // Generate structured ID
        const currentYearAA = getCurrentYearAA();
        const newStructuredId = generateTransactionId(currentYearAA, selectedProjetStructuredId, transactions);

        // --- Création de l'objet transaction pour Firestore ---
        const newTransactionData = {
            structuredId: newStructuredId, // Store structured ID
            projetId: selectedProjetId, // Store Firestore ID of the project
            montant: montantValue,
            date: dateValue, // Store as string 'YYYY-MM-DD'
            dateCreation: serverTimestamp() // Use Firestore server timestamp
        };

        try {
            // Add a new document with a generated ID to Firestore
            const docRef = await addDoc(collection(db, "transactions"), newTransactionData);
            console.log("Transaction ajoutée avec l'ID Firestore: ", docRef.id);

            // Add the new transaction (with Firestore ID) to the local array
            transactions.push({ id: docRef.id, ...newTransactionData });

            // Refresh the UI
            refreshUI();

            transactionForm.reset();
            transactionFormContainer.style.display = 'none';

        } catch (error) {
            console.error("Erreur lors de l'ajout de la transaction: ", error);
            alert("Une erreur s'est produite lors de l'enregistrement de la transaction. Vérifiez la console.");
        }
    });
} else {
    console.warn("Formulaire transaction ou son conteneur non trouvés.");
}
