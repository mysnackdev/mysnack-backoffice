import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyB0b4Xr_GhY7szpqdcTbNnei2awQM4J2FA",
  authDomain: "my-snack-e52ae.firebaseapp.com",
  databaseURL: "https://my-snack-e52ae-default-rtdb.firebaseio.com",
  projectId: "my-snack-e52ae",
  storageBucket: "my-snack-e52ae.firebasestorage.app",
  messagingSenderId: "413629389861",
  appId: "1:413629389861:web:934d80fb847698f514f3cc",
  measurementId: "G-PRWKXHJJVM"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);
const auth = getAuth();

export { app, db, auth, storage };
