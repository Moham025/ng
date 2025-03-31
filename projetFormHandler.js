// --- projetFormHandler.js ---
// Gère les interactions avec le formulaire d'ajout/modification de projet

// Import Firestore functions and necessary items from app.js
import { db, projets, clients, generateProjetId, getCurrentYearAA, refreshUI } from './app.js'; // Added clients import
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// Récupération des éléments HTML spécifiques au formulaire projet
const newProjetBtn = document.getElementById('newProjetBtn');
const projetFormContainer = document.getElementById('projetFormContainer');
const cancelProjetBtn = document.getElementById('cancelProjetBtn');
const projetForm = document.getElementById('projetForm');
const dateDebutInput = document.getElementById('dateDebut'); // Pour pré-remplir la date

// --- Gestion du formulaire projet ---

// Afficher le formulaire et pré-remplir la date
if (newProjetBtn && projetFormContainer && dateDebutInput) {
    newProjetBtn.addEventListener('click', () => {
        projetFormContainer.style.display = 'block';

        // Pré-remplir la date du jour
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        dateDebutInput.value = formattedDate;

        // S'assurer que la liste des clients est à jour dans le select du projet
        // Note: updateClientSelect est définie et appelée à l'initialisation dans app.js
        // if (typeof updateClientSelect === 'function') updateClientSelect();

        window.scrollTo({ top: projetFormContainer.offsetTop - 20, behavior: 'smooth' });
    });
} else {
    console.warn("Éléments pour le bouton 'Nouveau Projet' ou champ date non trouvés.");
}

// Masquer et réinitialiser le formulaire
if (cancelProjetBtn && projetFormContainer && projetForm) {
     cancelProjetBtn.addEventListener('click', () => {
        projetFormContainer.style.display = 'none';
        projetForm.reset();
     });
} else {
     console.warn("Éléments pour le bouton 'Annuler Projet' non trouvés.");
}

// Gérer la soumission du formulaire (make async for Firestore)
if (projetForm && projetFormContainer) {
    projetForm.addEventListener('submit', async (e) => { // Make async
        e.preventDefault(); // Toujours en premier

        // --- Vérifications des dépendances et des inputs ---
        if (typeof generateProjetId !== 'function' || typeof getCurrentYearAA !== 'function' || typeof projets === 'undefined' || !db) {
            alert("Erreur critique : fonctions ou données globales manquantes pour l'ajout de projet.");
            console.error("generateProjetId, getCurrentYearAA, projets ou db non définis");
            return;
        }

        const clientSelectElement = e.target.elements.clientSelect;
        const selectedClientOption = clientSelectElement.options[clientSelectElement.selectedIndex];
        const selectedClientId = clientSelectElement.value; // Firestore ID of the client
        const selectedClientStructuredId = selectedClientOption?.dataset?.structuredId; // Get structuredId from data attribute

        if (!selectedClientId) {
            alert("Veuillez sélectionner un client pour ce projet.");
            return;
        }
        if (!selectedClientStructuredId) {
             alert("Erreur : Impossible de récupérer l'ID structuré du client sélectionné.");
             console.error("selectedClientStructuredId est manquant pour l'option sélectionnée:", selectedClientOption);
             return;
         }


        const nomProjetValue = e.target.elements.nomProjet.value.trim();
        const typeProjetValue = e.target.elements.typeProjet.value;
        const dateDebutValue = e.target.elements.dateDebut.value;
        const coutValue = parseFloat(e.target.elements.coutProjet.value);

        if (!nomProjetValue || !typeProjetValue || !dateDebutValue) {
             alert("Veuillez remplir tous les champs obligatoires du projet (Nom, Type, Date de début).");
             return;
        }
        if (isNaN(coutValue) || coutValue < 0) {
            alert("Veuillez entrer un coût de projet valide (nombre positif) en Fcfa.");
            return;
        }
        // --- FIN VÉRIFICATIONS ---

        // Generate structured ID
        const currentYearAA = getCurrentYearAA();
        const newStructuredId = generateProjetId(currentYearAA, selectedClientStructuredId, projets);

        // --- Création de l'objet projet pour Firestore ---
        const newProjectData = {
            structuredId: newStructuredId, // Store structured ID
            clientId: selectedClientId, // Store Firestore ID of the client
            nom: nomProjetValue,
            type: typeProjetValue,
            dateDebut: dateDebutValue, // Store as string 'YYYY-MM-DD'
            cout: coutValue,
            statut: 'En cours', // Default status
            dateCreation: serverTimestamp() // Use Firestore server timestamp
        };

        try {
            // Add a new document with a generated ID to Firestore
            const docRef = await addDoc(collection(db, "projets"), newProjectData);
            console.log("Projet ajouté avec l'ID Firestore: ", docRef.id);

            // Add the new project (with Firestore ID) to the local array
            projets.push({ id: docRef.id, ...newProjectData });

            // Refresh the UI
            refreshUI();

            // --- Nettoyage final ---
            projetForm.reset();
            projetFormContainer.style.display = 'none';

        } catch (error) {
            console.error("Erreur lors de l'ajout du projet: ", error);
            alert("Une erreur s'est produite lors de l'enregistrement du projet. Vérifiez la console.");
        }
    }); // Fin du listener submit
} else {
   console.warn("Formulaire projet ou son conteneur non trouvés.");
}
