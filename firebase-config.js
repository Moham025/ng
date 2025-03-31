// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"; // Import getAuth
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCxTI_SPOugSPBVEJjyu59Dhcs1wgod3V0",
  authDomain: "fairebaseteste.firebaseapp.com",
  projectId: "fairebaseteste",
  storageBucket: "fairebaseteste.appspot.com", // Corrected storage bucket domain
  messagingSenderId: "219125181965",
  appId: "1:219125181965:web:2616954b11752685d2ef44",
  measurementId: "G-TR7SWYEHZ8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Export the database and auth instances for use in other files
export { db, auth };
