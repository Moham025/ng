// --- clientFormHandler.js ---
// Gère les interactions avec le formulaire d'ajout/modification de client

// Import Firestore functions and necessary items from app.js
import { db, clients, generateClientId, getCurrentYearAA, refreshUI } from './app.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Récupération des éléments HTML spécifiques au formulaire client
const newClientBtn = document.getElementById('newClientBtn');
const clientFormContainer = document.getElementById('clientFormContainer');
const cancelClientBtn = document.getElementById('cancelClientBtn');
const clientForm = document.getElementById('clientForm');

// --- Gestion du formulaire client ---

// Afficher le formulaire
if (newClientBtn && clientFormContainer) {
    newClientBtn.addEventListener('click', () => {
        clientFormContainer.style.display = 'block';
        window.scrollTo({ top: clientFormContainer.offsetTop - 20, behavior: 'smooth' });
    });
} else {
    console.warn("Éléments pour le bouton 'Nouveau Client' non trouvés.");
}

// Masquer et réinitialiser le formulaire
if (cancelClientBtn && clientFormContainer && clientForm) {
    cancelClientBtn.addEventListener('click', () => {
        clientFormContainer.style.display = 'none';
        clientForm.reset();
    });
} else {
    console.warn("Éléments pour le bouton 'Annuler Client' non trouvés.");
}

// Gérer la soumission du formulaire (make async for Firestore)
if (clientForm && clientFormContainer) {
    clientForm.addEventListener('submit', async (e) => { // Make async
        e.preventDefault();

        // Vérifier si les dépendances globales existent (app.js exports)
        if (typeof generateClientId !== 'function' || typeof getCurrentYearAA !== 'function' || typeof clients === 'undefined' || !db) {
            alert("Erreur critique : fonctions ou données globales manquantes pour l'ajout de client.");
            console.error("generateClientId, getCurrentYearAA, clients ou db non définis");
            return;
        }

        const nomValue = e.target.elements.nom.value.trim();
        const prenomValue = e.target.elements.prenom.value.trim();
        const telephoneValue = e.target.elements.telephone.value.trim();

        if (!nomValue || !prenomValue) {
            alert("Veuillez renseigner le nom et le prénom du client.");
            return;
        }

        // Generate structured ID using data loaded in app.js
        const currentYearAA = getCurrentYearAA();
        const newStructuredId = generateClientId(currentYearAA, clients);

        const newClientData = {
            structuredId: newStructuredId, // Store structured ID
            nom: nomValue,
            prenom: prenomValue,
            telephone: telephoneValue,
            dateCreation: serverTimestamp() // Use Firestore server timestamp
        };

        try {
            // Add a new document with a generated ID to Firestore
            const docRef = await addDoc(collection(db, "clients"), newClientData);
            console.log("Client ajouté avec l'ID Firestore: ", docRef.id);

            // Add the new client (with Firestore ID) to the local array for immediate UI update
            // Note: dateCreation will be a Firestore Timestamp object locally until next full load
            clients.push({ id: docRef.id, ...newClientData });

            // Refresh the UI using the function from app.js
            refreshUI();

            clientForm.reset();
            clientFormContainer.style.display = 'none';

        } catch (error) {
            console.error("Erreur lors de l'ajout du client: ", error);
            alert("Une erreur s'est produite lors de l'enregistrement du client. Vérifiez la console.");
        }
    });
} else {
    console.warn("Formulaire client ou son conteneur non trouvés.");
}
