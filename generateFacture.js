
// --- generateFacture.js ---

// Import necessary data and functions
import { clients, projets, getCurrentYearAA } from './app.js'; // Data from app.js
import { currentUserDetails } from './auth.js'; // Import current user details

// ============================================================================
// FONCTION DE CONVERSION NOMBRE EN LETTRES (FRANÇAIS) - VÉRIFIÉE
// (Keep the existing numberToWordsFr function as is)
// ============================================================================
function numberToWordsFr(number) {
    // Input Validation
    if (typeof number !== 'number' || !isFinite(number)) {
        console.error("numberToWordsFr: Input non valide -", number);
        return "Montant invalide";
    }

    const unites = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf"];
    const dizainesSpec = ["dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"]; // 10-16
    const dizaines = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

    function convertBelowThousand(n) {
        let chunkResult = "";
        if (n === 0) return "";

        // --- Hundreds ---
        if (n >= 100) {
            const hundredDigit = Math.floor(n / 100);
            chunkResult += (hundredDigit > 1 ? unites[hundredDigit] + "-" : "") + "cent";
            if (hundredDigit > 1 && (n % 100 === 0)) {
                chunkResult += "s"; // Accord 'cents'
            }
            n %= 100;
            if (n > 0) {
                chunkResult += " "; // Espace avant la suite
            } else {
                return chunkResult; // Ex: "deux cents"
            }
        }

        // --- Tens and Units ---
        if (n === 0) return chunkResult;

        if (n < 10) {
            chunkResult += unites[n];
        } else if (n < 17) {
            chunkResult += dizainesSpec[n - 10];
        } else {
            const tenDigit = Math.floor(n / 10);
            const unitDigit = n % 10;

            if (tenDigit === 7 || tenDigit === 9) { // Cases 70s, 90s
                 // ex: 71 = soixante-et-onze, 92 = quatre-vingt-douze
                let base = dizaines[tenDigit-1]; // soixante, quatre-vingt
                 // Handle cases like 71 (onze), 91 (onze) vs 72 (douze), 92 (douze)
                 let specialUnitIndex = n - (tenDigit-1)*10 - 10;
                 chunkResult += base + (unitDigit === 1 && tenDigit === 7 ? "-et-" : "-") + dizainesSpec[specialUnitIndex];
             }
              else {
                chunkResult += dizaines[tenDigit];
                if (n === 80) {
                     chunkResult += "s";
                }
                if (unitDigit > 0) {
                    chunkResult += (unitDigit === 1 && tenDigit !== 8 && tenDigit !== 9 ? "-et-" : "-") + unites[unitDigit];
                }
            }
        }
        return chunkResult;
    } // -- End convertBelowThousand --

    // --- Main Conversion Logic ---
    if (number === 0) {
        // Format Zéro: "Zéro (0) Francs CFA"
        return unites[0].charAt(0).toUpperCase() + unites[0].slice(1) + " (0) Francs CFA";
    }

    const numInt = Math.floor(Math.abs(number));
    // const numDec = Math.round((Math.abs(number) - numInt) * 100); // On ignore les décimales pour CFA

    let words = "";
    const milliards = Math.floor(numInt / 1000000000);
    const millions = Math.floor((numInt % 1000000000) / 1000000);
    const milliers = Math.floor((numInt % 1000000) / 1000);
    const reste = numInt % 1000;

    if (milliards > 0) {
        words += convertBelowThousand(milliards) + " milliard" + (milliards > 1 ? "s" : "");
        if (numInt % 1000000000 > 0) words += " ";
    }
    if (millions > 0) {
        words += convertBelowThousand(millions) + " million" + (millions > 1 ? "s" : "");
        if (numInt % 1000000 > 0) words += " ";
    }
    if (milliers > 0) {
        if (milliers === 1) {
            words += "mille"; // Mille invariable
        } else {
            // Éviter "un-mille", juste "mille"
             let prefix = convertBelowThousand(milliers);
             words += (prefix === "un" ? "" : prefix + "-") + "mille"; // Ex: deux-mille
        }
         if (numInt % 1000 > 0) words += " ";
    }
    if (reste > 0) {
        words += convertBelowThousand(reste);
    }

    // --- Assemblage Final ---
    words = words.trim();
    if (words === "") words = "Zéro"; // Fallback si seul des décimales étaient présentes (ne devrait pas arriver)

    // *** MODIFICATION ICI ***
    // Ajoute le montant numérique entre parenthèses, formaté pour le français
    // Utilise numInt pour n'afficher que la partie entière
    words += " (" + numInt.toLocaleString('fr-FR') + ")";

    // *** MODIFICATION ICI ***
    // Ajoute la devise "Francs CFA" (invariable)
    words += " Francs CFA";

    // La logique pour les centimes a été supprimée

    // --- Nettoyage et Capitalisation ---
    words = words.replace(/- /g, '-').replace(/ -/g, '-'); // Nettoie espaces autour des tirets
    words = words.replace(/\s+/g, ' ').trim(); // Consolide espaces multiples
    words = words.charAt(0).toUpperCase() + words.slice(1); // Met la première lettre en majuscule

    return words;
}
// ============================================================================
// FIN FONCTION DE CONVERSION
// ============================================================================


// --- Début de la fonction generateFacture (Exported for use in app.js) ---
// Accepts projetId (Firestore ID) and the pre-generated archiveId
export function generateFacture(projetId, archiveId) { 

    // Use the imported global arrays populated by app.js

    let projet, client;

    // --- Étape 1: Validation des données (déjà chargées dans app.js) ---
     if (!clients || !projets || clients.length === 0 || projets.length === 0) {
        console.error("Données clients ou projets non disponibles globalement.");
        alert("Erreur: Données nécessaires non chargées. Veuillez rafraîchir la page.");
        return;
    }


    // --- Étape 2: Trouver le projet spécifique (using Firestore ID) ---
    if (!projetId) {
        alert("Aucun projet sélectionné. Veuillez sélectionner un projet pour générer la facture.");
        return;
    }
    projet = projets.find(p => p.id === projetId);
    if (!projet) {
        alert(`Le projet avec l'ID ${projetId} n'a pas été trouvé.`);
        return;
    }

    // --- Étape 3: Trouver le client associé ---
    client = clients.find(c => c.id === projet.clientId);
    if (!client) {
        console.warn(`Client introuvable pour le projet ID ${projet.id}. La facture sera générée avec 'Client N/A'.`);
        // Créer un client placeholder pour éviter les erreurs plus loin
        client = { nom: 'Client', prenom: 'N/A', telephone: '' };
        // Ou vous pourriez choisir d'arrêter :
        // alert(`Client associé au projet ${projet.nom} introuvable.`);
        // return;
    }

    // --- Étape 4: Préparer les données pour le template ---
    // Vérifier si projet.cout est un nombre valide
    const totalAmount = typeof projet.cout === 'number' && isFinite(projet.cout) ? projet.cout : 0;
     if (totalAmount === 0 && projet.cout !== 0) {
        console.warn(`Le coût du projet ${projet.id} n'est pas un nombre valide (${projet.cout}). Utilisation de 0.`);
        alert(`Attention : Le coût du projet "${projet.nom}" est invalide. La facture indiquera 0 Fcfa. Veuillez corriger le projet.`); // Changed currency
     }

    let amountInWords;
    try {
         amountInWords = numberToWordsFr(totalAmount);
    } catch (error) {
         console.error("Erreur lors de la conversion du montant en lettres:", error);
         amountInWords = "Erreur lors de la conversion du montant";
    }

    const formattedDate = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const dateDebutProjetFormatted = projet.dateDebut ? new Date(projet.dateDebut).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A';
    // Utilise l'ID complet du projet comme référence pour la facture pour l'instant
    // Pour un vrai numéro de facture séquentiel (F-AA-...), il faudrait une logique de stockage/génération séparée.
    const factureReferenceProjet = projet.structuredId || projet.id; // Use structuredId if available
    // Use the passed archiveId for display
    const displayFactureId = archiveId || `F-${getCurrentYearAA()}-${factureReferenceProjet}-TEMP`; 

    // --- Étape 5: Générer le Template HTML ---
    const factureHTML = `
        <html>
        <head>
            <title>Facture - ${projet.nom} (${displayFactureId})</title> <!-- Use displayFactureId in title -->
            <style>
                /* --- Styles CSS (Keep existing styles) --- */
                body { font-family: sans-serif; margin: 20px; color: #333; }
                .doc-container { border: 1px solid #ccc; padding: 25px; max-width: 800px; margin: auto; background-color: #fff; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                .invoice-header-grid { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #333; padding-bottom: 15px; margin-bottom: 30px; }
                .invoice-logo-title img { max-height: 75px; display: block; margin-bottom: 10px; }
                .invoice-logo-title h2 { margin: 0; font-size: 1.8em; color: #333; font-weight: bold; }
                .invoice-logo-title p { margin: 5px 0 0 0; font-size: 0.9em; color: #555; }
                .invoice-company-info h3 { margin: 0 0 8px 0; font-size: 1.3em; color: #333; font-weight: bold; }
                .invoice-company-info hr { border: none; border-top: 1px solid #555; width: 80%; margin: 5px 0 10px 0; }
                .invoice-company-info p { margin: 4px 0; font-size: 0.95em; color: #444; text-align: right; }
                .invoice-details { display: flex; justify-content: space-between; margin-bottom: 35px; background-color: #f9f9f9; padding: 15px; border: 1px solid #eee; border-radius: 4px; }
                .invoice-details div { width: 48%; }
                .invoice-details h4 { margin-top: 0; margin-bottom: 10px; color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; font-size: 1.1em; }
                .invoice-details p { margin: 5px 0; font-size: 1em; line-height: 1.4; }
                .invoice-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 12px 10px; text-align: left; vertical-align: top; }
                .invoice-table th { background-color: #f0f0f0; font-weight: bold; color: #333; font-size: 0.9em; text-transform: uppercase; }
                .invoice-table td.col-description { width: 50%; }
                .invoice-table td.col-quantity { text-align: center; }
                .invoice-table td.col-price, .invoice-table td.col-total { text-align: right; }
                .invoice-table tr.total-row td { border-top: 2px solid #555; font-weight: bold; }
                .invoice-table tr.grand-total-row td { background-color: #e9e9e9; font-size: 1.1em; color: #000; }
                .invoice-table tr.total-row td:first-child, .invoice-table tr.grand-total-row td:first-child { border-left: none; border-bottom: none; }
                .invoice-table tr.total-row td:nth-child(2), .invoice-table tr.total-row td:nth-child(3), .invoice-table tr.grand-total-row td:nth-child(2), .invoice-table tr.grand-total-row td:nth-child(3){ border-bottom: none; }
                .amount-in-words { margin-top: 30px; padding-top: 15px; border-top: 1px dashed #aaa; font-size: 0.95em; color: #333; margin-bottom: 30px; }
                .amount-in-words p { margin: 5px 0; }
                .amount-in-words p.amount-text { font-style: italic; text-transform: capitalize; font-weight: 500; }
                .signature-section { text-align: right; margin-top: 60px; padding-right: 10px; margin-bottom: 30px; }
                .signature-line { display: inline-block; width: 220px; height: 50px; border-bottom: 1px solid #333; margin-bottom: 8px; }
                .signature-section p { margin: 0; }
                .signature-section p.signature-title { margin-bottom: 25px; font-size: 1em; }
                .signature-section p.director-name { font-weight: bold; margin-top: 8px; font-size: 1.05em; }
                .footer { text-align: center; margin-top: 40px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 0.8em; color: #555; }
                .footer p { margin: 4px 0; }
            </style>
        </head>
        <body>
            <div class="doc-container">
                <!-- Section En-tête -->
                <div class="invoice-header-grid">
                    <div class="invoice-logo-title">
                        <img src="Image/ngnior logo-03.jpg" alt="Logo NGnior Conception">
                        <h2>FACTURE</h2>
                        <p>Facture N°: ${displayFactureId}</p> <!-- Use displayFactureId -->
                        <p>Référence Projet: ${factureReferenceProjet}</p> 
                    </div>
                    <div class="invoice-company-info">
                        <h3>NGnior Conception</h3>
                        <hr> 
                        <p>Service : Conception - Etude - Suivi contrôle – construction</p>
                        <p>Date: ${formattedDate}</p>
                    </div>
                </div>

                <!-- Section Détails Client & Projet -->
                <div class="invoice-details">
                    <div>
                        <h4>Client</h4>
                        <p><strong>${client.nom} ${client.prenom}</strong></p>
                        ${client.telephone ? `<p>Tél: ${client.telephone}</p>` : ''}
                        {/* Ajoutez d'autres détails client ici si nécessaire */}
                    </div>
                    <div>
                        <h4>Projet</h4>
                        <p><strong>${projet.nom}</strong> (${projet.type})</p>
                        <p>Date de début: ${dateDebutProjetFormatted}</p>
                        <p>Référence Projet: ${factureReferenceProjet}</p> <!-- Changé le libellé -->
                    </div>
                </div>
                
                <!-- Section Tableau des Prestations -->
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th class="col-description">Description</th>
                            <th class="col-quantity">Qté</th>
                            <th class="col-price">Prix Unitaire (Fcfa)</th> <!-- Changed currency -->
                            <th class="col-total">Total (Fcfa)</th> <!-- Changed currency -->
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="col-description">Prestation de ${projet.type.toLowerCase()} pour projet "${projet.nom}"</td>
                            <td class="col-quantity">1</td>
                            <td class="col-price">${totalAmount.toLocaleString('fr-FR')}</td> <!-- Changed formatting -->
                            <td class="col-total">${totalAmount.toLocaleString('fr-FR')}</td> <!-- Changed formatting -->
                        </tr>
                        
                    </tbody>
                    <tfoot>
                        <tr class="total-row">
                            <td colspan="3">Total HT</td>
                            <td class="col-total">${totalAmount.toLocaleString('fr-FR')}</td> <!-- Changed formatting -->
                        </tr>
                        
                        <tr class="grand-total-row">
                            <td colspan="3">Total TTC</td>
                            <td class="col-total">${totalAmount.toLocaleString('fr-FR')}</td> <!-- Changed formatting -->
                        </tr>
                    </tfoot>
                </table>

                <!-- Section Montant en Lettres -->
                <div class="amount-in-words">
                    <p><strong>Arrêtée la présente facture à la somme de :</strong></p>
                    <p class="amount-text">${amountInWords}</p>
                </div>

                <!-- Section Signature (Dynamique) -->
                <div class="signature-section">
                    ${(() => {
                        // Determine signature based on logged-in user
                        let signatureTitle = "Signature Du Directeur"; // Default
                        let signatureName = "SANOU Mohamed Yacine"; // Default

                        if (currentUserDetails.isLoggedIn) {
                            if (currentUserDetails.title === 'Directeur') {
                                signatureTitle = "Signature du Directeur";
                                signatureName = currentUserDetails.name || signatureName; // Use logged-in name or default
                            } else if (currentUserDetails.title === 'Comptable') {
                                signatureTitle = "Le Comptable";
                                signatureName = currentUserDetails.name || signatureName; // Use logged-in name or default
                            }
                            // For other titles, it keeps the default Directeur signature
                        } else {
                             // Not logged in, keep default Directeur signature (or could hide it)
                             console.warn("Génération de facture sans utilisateur connecté. Signature par défaut utilisée.");
                        }

                        return `
                            <p class="signature-title">${signatureTitle}</p>
                            <div class="signature-line"></div>
                            <p class="director-name">${signatureName}</p>
                        `;
                    })()}
                </div>

                <!-- Section Footer -->
                <div class="footer">
                     <p>Société à Responsabilité Limitée | ngniorconceptions@gmail.com |
                     RCCM : BFOUA2019B1915 | IF : 00117306P 
                     <p>+226 56 88 65 05 | +226 71 35 33 75 | +226 68 68 10 20</p>
                </div>
            </div>
        </body>
        </html>
    `; // --- Fin du Template HTML ---
    
    // --- Étape 6: Affichage dans l'Iframe ---
    const documentFrame = document.getElementById('documentFrame');
    const documentPreview = document.getElementById('documentPreview');
    const printBtn = document.getElementById('printDocument');

    if (documentFrame && documentPreview && printBtn) {
         try {
            documentFrame.srcdoc = factureHTML; // Utilise srcdoc pour sécurité et rendu
            printBtn.onclick = () => {
                if (documentFrame.contentWindow) {
                    documentFrame.contentWindow.print();
                } else {
                    console.error("Impossible d'accéder à la fenêtre de l'iframe pour imprimer.");
                    alert("Erreur: impossible d'imprimer l'aperçu.");
                }
            };
            documentPreview.style.display = 'block';
         } catch(error) {
             console.error("Erreur lors de l'affichage de la facture dans l'iframe:", error);
             alert("Une erreur s'est produite lors de l'affichage de l'aperçu.");
             documentPreview.style.display = 'none'; // Masquer l'aperçu en cas d'erreur
         }
    } else {
         console.error("Éléments DOM pour l'aperçu (documentFrame, documentPreview, ou printDocument) non trouvés.");
            alert("Erreur d'interface : Impossible de trouver la zone d'aperçu.");
            return null; // Return null on failure to display
    }

    // Return the generated HTML and the ID used
    return { html: factureHTML, id: displayFactureId };

} // --- Fin de generateFacture ---
