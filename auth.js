// --- auth.js ---
// Handles Firebase Authentication (Sign Up, Sign In, Sign Out), Firestore user data, and UI updates

import { auth, db } from './firebase-config.js'; // Import auth and db instances
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    GoogleAuthProvider, // Import Google Auth Provider
    signInWithPopup,    // Import Popup Sign In method
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js"; // Import Firestore functions

// --- Exportable User State ---
export let currentUserDetails = {
    uid: null,
    name: null,
    firstName: null, // Added first name
    email: null,
    title: null,
    isLoggedIn: false
};

// --- DOM Elements ---
const authIcon = document.getElementById('authIcon');
const authModal = document.getElementById('authModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const signInForm = document.getElementById('signInForm');
const signUpForm = document.getElementById('signUpForm');
const showSignUpLink = document.getElementById('showSignUp');
const showSignInLink = document.getElementById('showSignIn');
const signInEmailInput = document.getElementById('signInEmail');
const signInPasswordInput = document.getElementById('signInPassword');
const signUpNameInput = document.getElementById('signUpName'); // Added Name input
const signUpEmailInput = document.getElementById('signUpEmail');
const signUpTitleInput = document.getElementById('signUpTitle'); // Added Title select
const signUpPasswordInput = document.getElementById('signUpPassword');
const signUpConfirmPasswordInput = document.getElementById('signUpConfirmPassword');
const signInError = document.getElementById('signInError');
const signUpError = document.getElementById('signUpError');
const googleSignInBtn = document.getElementById('googleSignInBtn'); // Added Google button
const signOutBtn = document.getElementById('signOutBtn');
const userInfoDisplay = document.getElementById('userInfoDisplay'); // Container for user info
const userNameDisplay = document.getElementById('userNameDisplay');
const userTitleDisplay = document.getElementById('userTitleDisplay');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// --- Modal Visibility ---
if (authIcon && authModal && closeAuthModal) {
    authIcon.addEventListener('click', () => {
        authModal.style.display = 'block';
        signInError.style.display = 'none'; // Hide errors on open
        signUpError.style.display = 'none';
    });

    closeAuthModal.addEventListener('click', () => {
        authModal.style.display = 'none';
    });

    // Close modal if clicked outside the content
    window.addEventListener('click', (event) => {
        if (event.target === authModal) {
            authModal.style.display = 'none';
        }
    });
} else {
    console.error("Auth modal elements not found.");
}

// --- Form Switching ---
if (showSignUpLink && showSignInLink && signInForm && signUpForm) {
    showSignUpLink.addEventListener('click', (e) => {
        e.preventDefault();
        signInForm.style.display = 'none';
        signUpForm.style.display = 'block';
        signInError.style.display = 'none';
    });

    showSignInLink.addEventListener('click', (e) => {
        e.preventDefault();
        signUpForm.style.display = 'none';
        signInForm.style.display = 'block';
        signUpError.style.display = 'none';
    });
} else {
    console.error("Form switching elements not found.");
}

// --- Error Display ---
function displayError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
}

function hideError(element) {
    element.textContent = '';
    element.style.display = 'none';
}

// --- Helper for Greeting ---
function getTimeBasedGreetingIntro() {
    const hour = new Date().getHours();
    if (hour < 5) {
        return "Bonne nuit";
    } else if (hour < 12) {
        return "Bonjour";
    } else if (hour < 18) {
        return "Bon après-midi";
    } else {
        return "Bonsoir";
    }
}

// --- Sign Up ---
if (signUpForm) {
    signUpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(signUpError);

        const name = signUpNameInput.value.trim(); // Get name
        const email = signUpEmailInput.value.trim();
        const title = signUpTitleInput.value; // Get title
        const password = signUpPasswordInput.value;
        const confirmPassword = signUpConfirmPasswordInput.value;

        if (!name) {
            displayError(signUpError, "Veuillez entrer votre nom complet.");
            return;
        }
        if (!title) {
             displayError(signUpError, "Veuillez sélectionner un titre.");
             return;
        }
        if (password !== confirmPassword) {
            displayError(signUpError, "Les mots de passe ne correspondent pas.");
            return;
        }

        try {
            // 1. Create user in Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            console.log("Compte Auth créé:", user.uid);

            // 2. Save user details to Firestore
            const userDocRef = doc(db, "users", user.uid);
            await setDoc(userDocRef, {
                name: name,
                email: email,
                title: title,
                createdAt: new Date() // Optional: add creation timestamp
            });
            console.log("Données utilisateur enregistrées dans Firestore");

            authModal.style.display = 'none'; // Close modal on success
            signUpForm.reset(); // Clear form

        } catch (error) {
            console.error("Erreur création compte / Firestore:", error);
            // Provide user-friendly error messages (Auth errors)
            let message = "Erreur lors de la création du compte.";
            if (error.code === 'auth/email-already-in-use') {
                message = "Cet email est déjà utilisé.";
            } else if (error.code === 'auth/weak-password') {
                message = "Le mot de passe doit contenir au moins 6 caractères.";
            } else if (error.code === 'auth/invalid-email') {
                message = "L'adresse email n'est pas valide.";
            }
            // Could add Firestore error handling here too if needed
            displayError(signUpError, message);
        }
    });
}

// --- Sign In ---
if (signInForm) {
    signInForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(signInError);

        const email = signInEmailInput.value.trim();
        const password = signInPasswordInput.value;

        if (!email || !password) {
            displayError(signInError, "Veuillez entrer l'email et le mot de passe.");
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log("Utilisateur connecté (Email/Pass):", userCredential.user.uid);
            authModal.style.display = 'none'; // Close modal on success
            signInForm.reset(); // Clear form
        } catch (error) {
            console.error("Erreur connexion (Email/Pass):", error);
             let message = "Erreur lors de la connexion.";
             if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                 message = "Email ou mot de passe incorrect.";
             } else if (error.code === 'auth/invalid-email') {
                 message = "L'adresse email n'est pas valide.";
             }
            displayError(signInError, message);
        }
    });
}

// --- Google Sign In ---
if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', async () => {
        hideError(signInError); // Hide previous errors
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            console.log("Utilisateur connecté (Google):", user.uid);

            // Check if user exists in Firestore, if not, create them
            const userDocRef = doc(db, "users", user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (!userDocSnap.exists()) {
                console.log("Nouvel utilisateur Google, création dans Firestore...");
                await setDoc(userDocRef, {
                    name: user.displayName || "Utilisateur Google", // Use Google display name
                    email: user.email,
                    title: "Utilisateur", // Default title for Google sign-up
                    createdAt: new Date()
                });
                console.log("Utilisateur Google enregistré dans Firestore.");
            } else {
                console.log("Utilisateur Google existant trouvé dans Firestore.");
            }

            authModal.style.display = 'none'; // Close modal on success

        } catch (error) {
            console.error("Erreur connexion Google:", error);
            let message = "Erreur lors de la connexion avec Google.";
            // Handle specific Google sign-in errors if needed
            if (error.code === 'auth/popup-closed-by-user') {
                message = "La fenêtre de connexion Google a été fermée.";
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                message = "Un compte existe déjà avec cet email mais une méthode de connexion différente.";
            }
            displayError(signInError, message); // Display error in the sign-in form area
        }
    });
}


// --- Sign Out ---
if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
        try {
            await signOut(auth);
            console.log("Utilisateur déconnecté.");
            // UI updates handled by onAuthStateChanged
        } catch (error) {
            console.error("Erreur déconnexion:", error);
            alert("Erreur lors de la déconnexion.");
        }
    });
}

// --- Auth State Observer ---
onAuthStateChanged(auth, async (user) => { // Make async to fetch Firestore data
    const greetingElement = document.querySelector('.greeting-text'); // Get greeting element

    if (user) {
        // User is signed in
        console.log("Auth state changed: User signed in", user.uid);
        if (authModal) authModal.style.display = 'none'; // Ensure modal is closed

        // Fetch user data from Firestore
        const userDocRef = doc(db, "users", user.uid);
        try {
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                console.log("User data from Firestore:", userData);
                // Update global state
                currentUserDetails.uid = user.uid;
                currentUserDetails.name = userData.name || 'Nom inconnu';
                // Extract and store first name
                const userFirstName = currentUserDetails.name ? currentUserDetails.name.split(' ')[0] : 'Utilisateur';
                currentUserDetails.firstName = userFirstName;
                currentUserDetails.title = userData.title || 'Titre inconnu';
                currentUserDetails.email = user.email;
                currentUserDetails.isLoggedIn = true;

                // Update UI
                if (userNameDisplay) userNameDisplay.textContent = currentUserDetails.name; // Keep full name here
                if (userTitleDisplay) userTitleDisplay.textContent = currentUserDetails.title;
                if (userEmailDisplay) userEmailDisplay.textContent = currentUserDetails.email;
                if (userInfoDisplay) userInfoDisplay.style.display = 'block';
                if (authIcon) authIcon.style.display = 'none'; // Hide login trigger
                if (signOutBtn) signOutBtn.style.display = 'inline-block';

                // Update greeting with FIRST name
                if (greetingElement) {
                    const intro = getTimeBasedGreetingIntro();
                    const motivationSpan = greetingElement.querySelector('span'); // Keep existing motivation span
                    const motivationText = motivationSpan ? motivationSpan.outerHTML : '<span>Prêt à travailler!</span>'; // Fallback
                    greetingElement.innerHTML = `${intro} ${currentUserDetails.firstName},<br>${motivationText}`; // Use firstName
                }

            } else {
                // User exists in Auth but not Firestore (e.g., Google sign-in before Firestore write completed?)
                console.warn("User document not found in Firestore for UID:", user.uid);
                 // Update global state with defaults
                currentUserDetails.uid = user.uid;
                currentUserDetails.name = user.displayName || 'Utilisateur';
                 // Extract and store first name from display name
                const googleFirstName = currentUserDetails.name ? currentUserDetails.name.split(' ')[0] : 'Utilisateur';
                currentUserDetails.firstName = googleFirstName;
                currentUserDetails.title = 'Utilisateur'; // Default title
                currentUserDetails.email = user.email;
                currentUserDetails.isLoggedIn = true;

                // Update UI with defaults
                if (userNameDisplay) userNameDisplay.textContent = currentUserDetails.name; // Keep full name here
                if (userTitleDisplay) userTitleDisplay.textContent = currentUserDetails.title;
                if (userEmailDisplay) userEmailDisplay.textContent = currentUserDetails.email;
                if (userInfoDisplay) userInfoDisplay.style.display = 'block';
                if (authIcon) authIcon.style.display = 'none'; // Hide login trigger
                if (signOutBtn) signOutBtn.style.display = 'inline-block';

                 // Update greeting with default FIRST name
                if (greetingElement) {
                    const intro = getTimeBasedGreetingIntro();
                    const motivationSpan = greetingElement.querySelector('span');
                    const motivationText = motivationSpan ? motivationSpan.outerHTML : '<span>Prêt à travailler!</span>';
                    greetingElement.innerHTML = `${intro} ${currentUserDetails.firstName},<br>${motivationText}`; // Use firstName
                }
            }
        } catch (error) {
            console.error("Error fetching user data from Firestore:", error);
             // Update global state with error indication
            currentUserDetails.uid = user.uid; // Still have UID and email from auth
            currentUserDetails.name = 'Erreur chargement nom';
            currentUserDetails.firstName = 'Utilisateur'; // Default first name on error
            currentUserDetails.title = '';
            currentUserDetails.email = user.email || 'Erreur chargement email';
            currentUserDetails.isLoggedIn = true; // Technically logged in to Auth

            // Update UI with error indication
            if (userNameDisplay) userNameDisplay.textContent = currentUserDetails.name; // Keep full name here
            if (userTitleDisplay) userTitleDisplay.textContent = currentUserDetails.title;
            if (userEmailDisplay) userEmailDisplay.textContent = currentUserDetails.email;
            if (userInfoDisplay) userInfoDisplay.style.display = 'block';
            if (authIcon) authIcon.style.display = 'none'; // Hide login trigger
            if (signOutBtn) signOutBtn.style.display = 'inline-block';

            // Update greeting indicating error
            if (greetingElement) {
                 const intro = getTimeBasedGreetingIntro();
                 const motivationSpan = greetingElement.querySelector('span');
                 const motivationText = motivationSpan ? motivationSpan.outerHTML : '<span>...</span>';
                 greetingElement.innerHTML = `${intro} ${currentUserDetails.firstName},<br>${motivationText}`; // Use default firstName
            }
        }

    } else {
        // User is signed out
        console.log("Auth state changed: User signed out");
        // Reset global state
        currentUserDetails.uid = null;
        currentUserDetails.name = null;
        currentUserDetails.firstName = null; // Reset first name
        currentUserDetails.email = null;
        currentUserDetails.title = null;
        currentUserDetails.isLoggedIn = false;

        // Update UI
        if (authIcon) authIcon.style.display = 'inline-block'; // Show login trigger
        if (authModal) authModal.style.display = 'block'; // Show the modal when logged out
        if (signOutBtn) signOutBtn.style.display = 'none';
        if (userInfoDisplay) userInfoDisplay.style.display = 'none';
        if (userNameDisplay) userNameDisplay.textContent = ''; // Clear full name display
        if (userTitleDisplay) userTitleDisplay.textContent = '';
        if (userEmailDisplay) userEmailDisplay.textContent = '';

        // Reset greeting to default (no name)
        if (greetingElement) {
            const intro = getTimeBasedGreetingIntro();
            const motivationSpan = greetingElement.querySelector('span');
            const motivationText = motivationSpan ? motivationSpan.outerHTML : '<span>Prêt à travailler!</span>'; // Keep motivation part
            greetingElement.innerHTML = `${intro},<br>${motivationText}`; // Reset to intro only
        }

        // Clear user-specific data if necessary
        // clearUserData();
    }
});
