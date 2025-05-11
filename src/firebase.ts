import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAPPTjAptS5O3pQcOzFx2SkoVKrfac65Rs",
    authDomain: "mgtscorecard.firebaseapp.com",
    projectId: "mgtscorecard",
    storageBucket: "mgtscorecard.appspot.com",
    messagingSenderId: "1057263872888",
    appId: "1:1057263872888:web:3b2ff7669ce764bdfbf68d",
    measurementId: "G-NXE72J2QFZ"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app); // This is Firestore, our database

export { app, auth, db };
