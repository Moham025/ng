// --- generateRecu.js ---

// Import necessary data and functions
import { clients, projets, transactions as globalTransactions, getCurrentYearAA } from './app.js';
import { currentUserDetails } from './auth.js'; // Import current user details

// ============================================================================
// FONCTION DE CONVERSION NOMBRE EN LETTRES (FRANÇAIS) - COPIÉE DE generateFacture.js
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


// Accepts projetId (Firestore ID) and the pre-generated archiveId
export function generateRecu(projetId, archiveId) { 
    // --- Validation et Recherche (using global data loaded in app.js) ---
    let projet, client, transactionsForProject, totalPaye;

    if (!clients || !projets || !globalTransactions) {
       console.error("Données clients, projets ou transactions non disponibles globalement.");
       alert("Erreur: Données nécessaires non chargées. Veuillez rafraîchir la page.");
       return;
   }

    if (!projetId) {
        alert("Veuillez sélectionner un projet pour générer le reçu.");
        return;
    }
    projet = projets.find(p => p.id === projetId); // Find using Firestore ID
    if (!projet) {
        alert(`Projet avec ID ${projetId} non trouvé.`);
        return;
    }
    client = clients.find(c => c.id === projet.clientId); // Find using Firestore ID
    if (!client) {
        console.warn(`Client introuvable pour le projet ID ${projet.id}. Reçu généré avec 'Client N/A'.`);
        client = { nom: 'Client', prenom: 'N/A', telephone: '', structuredId: 'N/A' }; // Add structuredId placeholder
    }
    transactionsForProject = globalTransactions.filter(t => t.projetId === projetId); // Filter using Firestore ID
    totalPaye = transactionsForProject.reduce((sum, t) => sum + parseFloat(t.montant || 0), 0);

    // --- Calcul du reste à payer ---
    const projetCost = typeof projet.cout === 'number' && isFinite(projet.cout) ? projet.cout : 0;
    const resteAPayer = projetCost - totalPaye;

    // --- Préparation des données pour le template ---
    const formattedDate = new Date().toLocaleDateString('fr-FR', { // Format français JJ/MM/AAAA
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric'
    });

    // Calculer le montant total payé en lettres
    let totalPayeInWords;
    try {
        totalPayeInWords = numberToWordsFr(totalPaye);
    } catch (error) {
        console.error("Erreur lors de la conversion du total payé en lettres:", error);
        totalPayeInWords = "Erreur lors de la conversion du montant";
    }
    // Convertir le reste à payer en lettres pour la mention de clôture
    let resteAPayerInWords;
     try {
         resteAPayerInWords = numberToWordsFr(resteAPayer);
     } catch (error) {
         console.error("Erreur lors de la conversion du reste à payer en lettres:", error);
         resteAPayerInWords = "Erreur lors de la conversion du montant restant";
     }

    // Génération d'un ID de reçu placeholder pour affichage
    const recuReferenceProjet = projet.structuredId || projet.id; // Use structuredId if available
    // Use the passed archiveId for display
    const displayRecuId = archiveId || `R-${getCurrentYearAA()}-${recuReferenceProjet}-TEMP`;

    // Déterminer la signature de gauche
    let leftSignatureTitle = "La Comptabilité"; // Default if not Directeur
    let leftSignatureName = "&nbsp;"; // Default empty name
    if (currentUserDetails.isLoggedIn) {
        if (currentUserDetails.title === 'Directeur') {
            leftSignatureTitle = "Signature du Directeur";
        }
        // Add name if available
        if (currentUserDetails.name) {
             leftSignatureName = currentUserDetails.name;
        } else {
            console.warn("Nom de l'utilisateur connecté non trouvé pour la signature.");
        }
    } else {
        console.warn("Génération de reçu sans utilisateur connecté. Signature par défaut 'La Comptabilité' utilisée.");
    }


    const recuHTML = `
        <html>
        <head>
            <title>Reçu - ${projet?.nom || 'N/A'} (${displayRecuId})</title> <!-- Use displayRecuId -->
            <style>
                /* Keep existing styles */
                body { font-family: sans-serif; margin: 20px; }
                .doc-container { border: 1px solid #ccc; padding: 20px; max-width: 800px; margin: auto; background-color: #f9f9f9; }
                /* NOUVEAUX STYLES / MODIFIÉS POUR L'EN-TÊTE */
                .receipt-header-grid { /* Remplace .receipt-header */
                    display: flex; 
                    justify-content: space-between; 
                    align-items: flex-start; /* Aligne les éléments en haut */
                    border-bottom: 2px solid #000; 
                    padding-bottom: 10px; 
                    margin-bottom: 20px; 
                }
                .receipt-logo-title img { 
                    max-height: 70px; /* Ajustez la taille du logo si nécessaire */
                    display: block; /* Assure un bon espacement */
                    margin-bottom: 10px; /* Espace sous le logo */
                }
                .receipt-logo-title h2 {
                    margin: 0; 
                    font-size: 1.5em; /* Taille du titre "Reçu de Paiement" */
                    color: #333;
                }
                .receipt-company-info { 
                    text-align: right; 
                }
                .receipt-company-info h3 {
                    margin: 0 0 5px 0; /* Espace sous le nom de l'entreprise */
                    font-size: 1.2em; /* Taille du nom de l'entreprise */
                    color: #333;
                    position: relative; 
                    left: -60px; /* Pousse le nom vers la gauche */
                }
                .receipt-company-info hr { /* Style pour le trait demandé */
                    border: none;
                    border-top: 1px solid #555;
                    width:320px; /* Largeur du trait */	
                    margin-top: 3px;
                    margin-right: 8px; /* Espacement autour du trait */
                    margin-left: auto;  /* Pousse le trait vers la droite */
                    margin-right: 0;
                }
                .receipt-company-info p {
                    margin: 4px 0; /* Espacement des lignes service/date */
                    font-size: 0.9em;
                    color: #555;
                }
                /* FIN DES NOUVEAUX STYLES / MODIFIÉS POUR L'EN-TÊTE */
                /* Style pour le montant en lettres (copié de facture) */
                .amount-in-words { margin-top: 20px; padding-top: 15px; border-top: 1px dashed #aaa; font-size: 0.95em; color: #333; margin-bottom: 20px; }
                .amount-in-words p { margin: 5px 0; }
                .amount-in-words p.amount-text { font-style: italic; text-transform: capitalize; font-weight: 500; }
                .receipt-info { margin-bottom: 20px; }
                .receipt-info p { margin: 5px 0; }
                .transaction-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .transaction-table th, .transaction-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .transaction-table th { background-color: #f2f2f2; font-weight: bold; }
                .transaction-table td:last-child { text-align: right; }
                .total-paye { text-align: right; font-weight: bold; font-size: 1.1em; margin-top: 15px; padding-top: 10px; border-top: 1px solid #eee; }
                .reste-a-payer { text-align: right; font-weight: bold; font-size: 1.1em; margin-top: 5px; color: #c0392b; } /* Style pour le reste à payer */
                .closing-statement { margin-top: 20px; padding-top: 15px; border-top: 1px dashed #aaa; font-size: 0.95em; color: #333; margin-bottom: 20px; } /* Style pour la mention de clôture */
                .closing-statement p { margin: 5px 0; font-style: italic; }
                /* Styles pour la section signature (2 colonnes) */
                .signature-area { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 10px; }
                .signature-section { text-align: center; width: 45%; } /* Chaque section prend ~45% */
                .signature-section p { margin: 0; font-size: 0.95em; }
                .signature-section .signature-title { margin-bottom: 35px; font-weight: bold; } /* Espace pour la signature */
                .signature-section .signature-line { display: block; width: 80%; margin: 0 auto 5px auto; border-bottom: 1px solid #555; height: 1px; } /* Ligne de signature */
                .signature-section .signature-name { font-weight: bold; }
                /* Styles pour le footer */
                .footer {
                    text-align: center; 
                    margin-top: 5px; /* Espace avant le footer */
                    padding-top: 15px; 
                    border-top: 1px solid #ccc; 
                    font-size: 0.8em; /* Texte plus petit pour le footer */
                    color: #555; 
                    /* Positionnement en bas si le contenu est court */
                     
                }
                .footer p {
                    margin: 5px 0; /* Espacement réduit entre les lignes du footer */
                }
            </style>
        </head>
        <body>
            <div class="doc-container">
            <!-- NOUVELLE STRUCTURE D'EN-TÊTE -->
                <div class="receipt-header-grid">
                    <div class="receipt-logo-title">
                        <!-- Assurez-vous que le chemin vers votre logo est correct -->
                        <img src="Image/ngnior logo-03.jpg" alt="Logo NGnior Conception">
                        <h2>Reçu de Paiement</h2>
                        <p>Reçu N°: ${displayRecuId}</p> <!-- Use displayRecuId -->
                        <p>Référence Projet: ${recuReferenceProjet}</p> 
                    </div>
                    <div class="receipt-company-info">
                        <h3>NGnior Conception</h3>
                        <hr> <!-- Trait demandé -->
                        <p>Conception - Etude - Suivi contrôle – construction</p>
                        <p>Date: ${formattedDate}</p>
                    </div>
                </div>

                <div class="receipt-info">
                    <p><strong>Client:</strong> ${client?.nom || 'N/A'} ${client?.prenom || ''} (${client?.structuredId || 'N/A'})</p> <!-- Added structuredId -->
                    <p><strong>Projet:</strong> ${projet?.nom || 'N/A'} (${projet?.structuredId || 'N/A'})</p> <!-- Added structuredId -->
                    <p><strong>Coût total à payer:</strong> ${projetCost.toLocaleString('fr-FR')} Fcfa</p> <!-- Added Total Cost -->
                </div>

                <h4>Détail des paiements reçus :</h4>
                <table class="transaction-table">
                    <thead>
                        <tr>
                                <th>Date</th>
                                <th>Référence Transaction</th> <!-- Changé libellé -->
                                <th>Montant</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${transactionsForProject.map(t => {
                            let formattedTransDate = 'N/A';
                            if (t.date) {
                                try { formattedTransDate = new Date(t.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch(e){}
                            }
                            return `
                            <tr>
                                <td>${formattedTransDate}</td>
                                <td>${t.structuredId || t.id}</td> <!-- Display structuredId -->
                                <td>${parseFloat(t.montant || 0).toLocaleString('fr-FR')} Fcfa</td>
                            </tr>
                        `;}).join('')}
                    </tbody>
                </table>
                <div class="total-paye">
                    Total reçu: ${totalPaye.toLocaleString('fr-FR')} Fcfa
                </div>
                 <div class="reste-a-payer"> <!-- Moved up -->
                    Reste à payer: ${resteAPayer.toLocaleString('fr-FR')} Fcfa
                 </div>

                 <!-- New "Arrêté..." section -->
                 <div class="closing-statement"> <!-- Reusing class for styling (includes dashed border) -->
                     <p><strong>Arrêté du présent reçu à la somme restante à payer de :</strong></p>
                     <p class="amount-text">${resteAPayerInWords}</p> <!-- Reusing class for styling -->
                 </div>

                <!-- Zone de Signatures (2 colonnes) -->
                <div class="signature-area">
                    <div class="signature-section left-signature">
                        <p class="signature-title">${leftSignatureTitle}</p>
                        <div class="signature-line"></div>
                        <p class="signature-name">${leftSignatureName}</p> <!-- Added dynamic name -->
                    </div>
                    <div class="signature-section right-signature">
                        <p class="signature-title">Signature du Client</p>
                        <div class="signature-line"></div>
                        <p class="signature-name">${client?.nom || 'N/A'} ${client?.prenom || ''}</p>
                    </div>
                </div>

                <div class="footer">
                    <p>Société à Responsabilité Limitée | ngniorconceptions@gmail.com | RCCM : BFOUA2019B1915 | IF : 00117306P</p>
                    <p>+226 56 88 65 05 | +226 71 35 33 75 | +226 68 68 10 20</p>
                 </div>
            </div>
        </body>
        </html>
    `;

    // Display in iframe instead of new window
    const documentFrame = document.getElementById('documentFrame');
    const documentPreview = document.getElementById('documentPreview');
    const printBtn = document.getElementById('printDocument');

    if (documentFrame && documentPreview && printBtn) { // Check if elements exist
        documentFrame.srcdoc = recuHTML; // Use srcdoc
        printBtn.onclick = () => documentFrame.contentWindow?.print(); // Optional chaining
        documentPreview.style.display = 'block';
    } else {
        console.error("Erreur: Un ou plusieurs éléments du DOM pour l'aperçu du reçu sont introuvables (documentFrame, documentPreview, printDocument).");
        // Optionally, provide fallback behavior or alert the user
        // alert("Impossible d'afficher l'aperçu du reçu.");
    }

    // Return the generated HTML and the ID used
    return { html: recuHTML, id: displayRecuId };
} // Added the missing closing brace for the function
