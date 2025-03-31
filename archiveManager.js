// --- archiveManager.js ---
// Gère la génération, la sauvegarde, l'affichage et la suppression des archives

import { db, archives, projets } from './dataManager.js'; // Import data arrays
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { generateFacture } from './generateFacture.js';
import { generateRecu } from './generateRecu.js';
import { generateArchiveId, getCurrentYearAA } from './utils.js';
import { refreshUI } from './main.js'; // Import refreshUI pour mettre à jour après action

let lastGeneratedDocDetails = null; // Stocke les détails pour la sauvegarde

const projetDocSelect = document.getElementById('projetDocument');
const factureBtn = document.getElementById('generateFactureBtn');
const recuBtn = document.getElementById('generateRecuBtn');
const saveArchiveBtn = document.getElementById('saveToArchiveBtn');
const documentFrame = document.getElementById('documentFrame');
const documentPreview = document.getElementById('documentPreview');
const printBtn = document.getElementById('printDocument');

// --- Génération et Préparation pour l'Archivage ---
async function handleGenerate(type) {
    const selectedProjetId = projetDocSelect?.value;
    if (!selectedProjetId) {
        alert(`Veuillez sélectionner un projet pour générer ${type === 'F' ? 'la facture' : 'le reçu'}.`);
        return;
    }

    const projet = projets.find(p => p.id === selectedProjetId);
    if (!projet || !projet.structuredId) {
         alert("Erreur: Projet sélectionné invalide ou ID structuré manquant.");
         return;
    }

    const currentYearAA = getCurrentYearAA();
    const newArchiveId = generateArchiveId(type, currentYearAA, projet.structuredId, archives);

    let generatedData;
    try {
        if (type === 'F') {
            generatedData = generateFacture(selectedProjetId, newArchiveId);
        } else {
            generatedData = generateRecu(selectedProjetId, newArchiveId);
        }
    } catch (error) {
        console.error(`Erreur lors de la génération du document (${type}):`, error);
        alert(`Erreur lors de la génération ${type === 'F' ? 'de la facture' : 'du reçu'}.`);
        return;
    }


    if (generatedData && generatedData.html && documentFrame && documentPreview && saveArchiveBtn) {
         documentFrame.srcdoc = generatedData.html;
         documentPreview.style.display = 'block';
         saveArchiveBtn.style.display = 'inline-block';

         lastGeneratedDocDetails = {
             type: type,
             archiveId: generatedData.id,
             projetId: selectedProjetId,
             projetStructuredId: projet.structuredId,
             htmlContent: generatedData.html,
             dateArchivage: serverTimestamp()
         };
         console.log("Document généré, prêt pour archivage:", lastGeneratedDocDetails.archiveId);
          // Make sure print button works after generation
          if(printBtn) {
              printBtn.onclick = () => documentFrame.contentWindow?.print();
          }
    } else {
         console.error("Échec de la génération ou éléments DOM manquants pour l'aperçu/sauvegarde.");
         if(saveArchiveBtn) saveArchiveBtn.style.display = 'none';
         lastGeneratedDocDetails = null;
    }
}

// --- Sauvegarde de l'Archive ---
async function saveArchive() {
    if (!lastGeneratedDocDetails) {
        alert("Aucun document n'a été généré pour l'archivage.");
        return;
    }

    if (archives.some(a => a.archiveId === lastGeneratedDocDetails.archiveId)) {
         alert(`Le document ${lastGeneratedDocDetails.archiveId} semble déjà archivé.`);
         return;
    }

    console.log("Tentative d'archivage:", lastGeneratedDocDetails.archiveId);
    if(saveArchiveBtn) saveArchiveBtn.disabled = true; // Prevent double click

    try {
        const docDataToSave = { ...lastGeneratedDocDetails }; // Copy data
        const docRef = await addDoc(collection(db, "archives"), docDataToSave);
        console.log("Document archivé avec l'ID Firestore:", docRef.id);

        // Ajoute au tableau local AVEC l'ID Firestore
        // Note: dateArchivage sera un ServerTimestamp ici, la lecture le convertira
        archives.push({ id: docRef.id, ...docDataToSave });

        refreshUI(); // Rafraîchit l'UI (y compris la liste des archives)

        alert(`Document ${lastGeneratedDocDetails.archiveId} archivé avec succès.`);
        lastGeneratedDocDetails = null;
        if(saveArchiveBtn) saveArchiveBtn.style.display = 'none';
        if(documentPreview) documentPreview.style.display = 'none'; // Hide preview after save

    } catch (error) {
        console.error("Erreur lors de l'archivage du document:", error);
        alert("Erreur lors de l'archivage. Vérifiez la console.");
    } finally {
         if(saveArchiveBtn) saveArchiveBtn.disabled = false; // Re-enable button
    }
}

// --- Visualisation d'une Archive ---
export async function viewArchivedDocument(archiveId) { // Exportée car appelée par listener
    const archive = archives.find(a => a.id === archiveId);
    if (!archive || !archive.htmlContent) {
        alert("Contenu de l'archive introuvable.");
        return;
    }

    if (documentFrame && documentPreview && printBtn && saveArchiveBtn) {
        documentFrame.srcdoc = archive.htmlContent;
        printBtn.onclick = () => documentFrame.contentWindow?.print();
        documentPreview.style.display = 'block';
        saveArchiveBtn.style.display = 'none'; // Hide save button
        // Switch to the "Factures/Reçus" tab
        document.querySelector('.tab[data-target="#factures"]')?.click();
        // Scroll to preview
         window.scrollTo({ top: documentPreview.offsetTop - 20, behavior: 'smooth' });
    } else {
        console.error("Éléments DOM pour l'aperçu non trouvés.");
    }
}

// --- Suppression d'une Archive ---
export async function deleteArchivedDocument(archiveId) { // Exportée car appelée par listener
     const archive = archives.find(a => a.id === archiveId);
     if (!archive) return;

     if (confirm(`Êtes-vous sûr de vouloir supprimer l'archive ${archive.archiveId} ?`)) {
         try {
             await deleteDoc(doc(db, "archives", archiveId));
             console.log("Archive supprimée:", archiveId);
             // Supprime du tableau local
             const index = archives.findIndex(a => a.id === archiveId);
             if (index > -1) archives.splice(index, 1);

             refreshUI();
         } catch (error) {
             console.error("Erreur lors de la suppression de l'archive:", error);
             alert("Erreur lors de la suppression de l'archive.");
         }
     }
}

// --- Ajout des Écouteurs d'Événements ---
export function initArchiveButtons() {
    if (factureBtn) factureBtn.addEventListener('click', () => handleGenerate('F'));
    if (recuBtn) recuBtn.addEventListener('click', () => handleGenerate('R'));
    if (saveArchiveBtn) saveArchiveBtn.addEventListener('click', saveArchive);

    // Listener pour les boutons de filtre (Facture/Reçu)
    document.querySelectorAll('.archive-filter-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const filterType = event.target.dataset.filter;
            document.querySelectorAll('.archive-filter-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            // Import displayArchives from uiDisplay.js and call it
             import('./uiDisplay.js').then(module => module.displayArchives(filterType));
        });
    });
}

// Attach listeners for dynamically created view/delete buttons
export function attachArchiveListeners(container) {
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('view-archive-btn')) {
            const archiveId = e.target.dataset.archiveId;
            viewArchivedDocument(archiveId);
        } else if (e.target.classList.contains('delete-archive-btn')) {
            const archiveId = e.target.dataset.archiveId;
            deleteArchivedDocument(archiveId);
        }
    });
}